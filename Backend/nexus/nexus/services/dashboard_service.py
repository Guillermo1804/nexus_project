"""
Dashboard aggregation service for HU-24.
Provides executive KPIs, distributions, and alert listings for program coordinators.
"""
from datetime import timedelta

from django.db.models import Avg, Count, OuterRef, Q, Subquery
from django.utils import timezone

from ..models import (
    Student,
    Agreement,
    TutoringSession,
    ThesisProgress,
    Semester,
    CustomUser,
)


class DashboardService:
    """Aggregates global academic metrics for the coordinator dashboard."""

    TUTORING_RECENCY_DAYS = 21

    @classmethod
    def _active_students(cls):
        return Student.objects.filter(
            estatus_activo=True,
            semesters__isnull=False,
        ).distinct()

    @classmethod
    def _overdue_agreements(cls, today):
        return Agreement.objects.filter(
            estado__in=[
                Agreement.Status.PENDING,
                Agreement.Status.IN_PROGRESS,
                Agreement.Status.OVERDUE,
            ],
            fecha_limite__lt=today,
        )

    @staticmethod
    def _user_name(user):
        return f'{user.first_name} {user.last_name}'.strip()

    @classmethod
    def get_kpis(cls):
        """Return the five core KPIs for the dashboard."""
        today = timezone.localdate()
        cutoff_date = today - timedelta(days=cls.TUTORING_RECENCY_DAYS)

        # Total estudiantes activos (que tienen semestre actual asignado)
        total_estudiantes_activos = cls._active_students().count()

        # Total acuerdos pendientes (PENDIENTE + EN_PROCESO)
        total_acuerdos_pendientes = Agreement.objects.exclude(
            estado=Agreement.Status.COMPLETED
        ).count()

        # Total acuerdos vencidos (no concluidos y fecha_limite < today)
        total_acuerdos_vencidos = cls._overdue_agreements(today).count()

        students_with_recent_tutoring = Student.objects.filter(
            Q(tutoring_sessions__fecha_sesion__gte=cutoff_date)
            | Q(
                tutoring_sessions__proxima_reunion_fecha__gte=today,
                tutoring_sessions__proxima_reunion_fecha__lte=today + timedelta(days=cls.TUTORING_RECENCY_DAYS),
            )
        ).distinct()

        estudiantes_sin_tutoria_reciente = cls._active_students().exclude(
            pk__in=students_with_recent_tutoring.values('pk')
        ).count()

        # Promedio global de avance de tesis (últimos registros por estudiante)
        latest_thesis = ThesisProgress.objects.filter(
            student=OuterRef('pk')
        ).order_by('-fecha_registro')

        thesis_avg = cls._active_students().annotate(
            latest_avance=Subquery(latest_thesis.values('porcentaje_avance')[:1])
        ).aggregate(
            avg_avance=Avg('latest_avance')
        )['avg_avance'] or 0

        return {
            'total_estudiantes_activos': total_estudiantes_activos,
            'total_acuerdos_pendientes': total_acuerdos_pendientes,
            'total_acuerdos_vencidos': total_acuerdos_vencidos,
            'estudiantes_sin_tutoria_reciente': estudiantes_sin_tutoria_reciente,
            'promedio_avance_tesis': round(float(thesis_avg), 1),
        }

    @classmethod
    def get_estudiantes_sin_tutoria_reciente(cls):
        """Return active students without a recent or scheduled tutoring session."""
        today = timezone.localdate()
        cutoff_date = today - timedelta(days=cls.TUTORING_RECENCY_DAYS)
        students_with_recent_or_scheduled_tutoring = Student.objects.filter(
            Q(tutoring_sessions__fecha_sesion__gte=cutoff_date)
            | Q(
                tutoring_sessions__proxima_reunion_fecha__gte=today,
                tutoring_sessions__proxima_reunion_fecha__lte=today + timedelta(days=cls.TUTORING_RECENCY_DAYS),
            )
        ).distinct()
        students = cls._active_students().exclude(
            pk__in=students_with_recent_or_scheduled_tutoring.values('pk')
        ).select_related('user').prefetch_related(
            'academic_committee__memberships__user',
        ).order_by('matricula')

        result = []
        for student in students:
            latest = TutoringSession.objects.filter(student=student).order_by('-fecha_sesion').first()
            days_without_tutoring = (today - latest.fecha_sesion).days if latest else None
            committee = getattr(student, 'academic_committee', None)
            advisor = next(
                (
                    membership.user
                    for membership in committee.memberships.all()
                    if membership.role == 'ASESOR'
                ),
                None,
            ) if committee else None
            result.append({
                'student_id': student.id,
                'matricula': student.matricula,
                'nombre_completo': cls._user_name(student.user) if student.user else student.nombre_completo,
                'motivo_rezago': (
                    f'{days_without_tutoring} días sin tutoría registrada'
                    if days_without_tutoring is not None
                    else 'Sin tutorías registradas'
                ),
                'asesor_principal': cls._user_name(advisor) if advisor else '—',
            })
        return result

    @classmethod
    def get_distribucion_semestres(cls):
        """Return distribution of active students by current semester (1-6)."""
        # Obtener el semestre actual de cada estudiante activo
        students = cls._active_students().prefetch_related('semesters')

        # Agrupar por semestre actual
        from django.db.models import F

        dist = students.annotate(
            current_sem=F('semesters__numero')
        ).values('current_sem').annotate(
            total=Count('id')
        ).order_by('current_sem')

        result = []
        for d in dist:
            sem_num = d['current_sem']
            if sem_num and 1 <= sem_num <= 6:
                result.append({
                    'semestre': sem_num,
                    'total_alumnos': d['total']
                })

        # Asegurar que todos los semestres 1-6 estén presentes
        existing = {r['semestre'] for r in result}
        for i in range(1, 7):
            if i not in existing:
                result.append({'semestre': i, 'total_alumnos': 0})

        return sorted(result, key=lambda x: x['semestre'])

    @classmethod
    def get_distribucion_avance_tesis(cls):
        """Return histogram of thesis progress in 4 ranges."""
        # Último avance por estudiante activo
        latest_thesis = ThesisProgress.objects.filter(
            student=OuterRef('pk')
        ).order_by('-fecha_registro')

        students_with_avance = cls._active_students().annotate(
            latest_avance=Subquery(latest_thesis.values('porcentaje_avance')[:1])
        ).exclude(latest_avance__isnull=True)

        rango_0_25 = students_with_avance.filter(latest_avance__lte=25).count()
        rango_26_50 = students_with_avance.filter(latest_avance__gte=26, latest_avance__lte=50).count()
        rango_51_75 = students_with_avance.filter(latest_avance__gte=51, latest_avance__lte=75).count()
        rango_76_100 = students_with_avance.filter(latest_avance__gte=76).count()

        return {
            'rango_0_25': rango_0_25,
            'rango_26_50': rango_26_50,
            'rango_51_75': rango_51_75,
            'rango_76_100': rango_76_100,
        }

    @classmethod
    def get_estudiantes_activos(cls):
        """Return list of active students with details."""
        estudiantes = cls._active_students().select_related('user').prefetch_related(
            'semesters',
            'academic_committee__memberships__user',
        ).order_by('matricula')

        result = []
        for student in estudiantes:
            current_semester = max(student.semesters.all(), key=lambda semester: semester.numero, default=None)
            committee = getattr(student, 'academic_committee', None)
            advisor = next(
                (
                    membership.user
                    for membership in committee.memberships.all()
                    if membership.role == 'ASESOR'
                ),
                None,
            ) if committee else None
            result.append({
                'id': student.id,
                'matricula': student.matricula,
                'nombre': cls._user_name(student.user) if student.user else student.nombre_completo,
                'nombre_completo': cls._user_name(student.user) if student.user else student.nombre_completo,
                'programa_doctoral': student.programa_doctoral,
                'cohorte': student.cohorte,
                'estatus_activo': student.estatus_activo,
                'semestre': current_semester.numero if current_semester else 'N/A',
                'asesor': cls._user_name(advisor) if advisor else 'N/A',
            })
        return result

    @classmethod
    def get_tutorias_periodo(cls):
        """Return list of tutoring sessions for the current period."""
        today = timezone.localdate()
        # Assuming current period is the last 3 months
        start_date = today - timedelta(days=90)
        tutorias = TutoringSession.objects.filter(
            fecha_sesion__gte=start_date
        ).select_related('student', 'student__user', 'semester').order_by('-fecha_sesion')

        return [{
            'id': ts.id,
            'fecha': ts.fecha_sesion,
            'modalidad': ts.get_modalidad_display(),
            'estudiante': cls._user_name(ts.student.user) if ts.student.user else ts.student.nombre_completo,
            'matricula': ts.student.matricula,
            'semestre': ts.semester.numero,
            'resumen': ts.resumen,
        } for ts in tutorias]

    @classmethod
    def get_acuerdos_segumiento(cls):
        """Return list of agreements in progress or pending."""
        acuerdos = Agreement.objects.exclude(
            estado=Agreement.Status.COMPLETED
        ).select_related('student', 'student__user', 'responsable').order_by('fecha_limite')

        return [{
            'id': a.id,
            'descripcion': a.descripcion,
            'estado': a.get_estado_display(),
            'fecha_limite': a.fecha_limite,
            'responsable': cls._user_name(a.responsable),
            'estudiante': cls._user_name(a.student.user) if a.student.user else a.student.nombre_completo,
            'matricula': a.student.matricula,
        } for a in acuerdos]

    @classmethod
    def get_acuerdos_vencidos(cls):
        """Return list of overdue agreements."""
        today = timezone.localdate()
        acuerdos = cls._overdue_agreements(today).select_related(
            'student', 'student__user', 'responsable'
        ).order_by('fecha_limite')

        return [{
            'id': a.id,
            'descripcion': a.descripcion,
            'estado': a.get_estado_display(),
            'fecha_limite': a.fecha_limite,
            'fecha_conclusion': a.fecha_conclusion,
            'responsable': cls._user_name(a.responsable),
            'estudiante': cls._user_name(a.student.user) if a.student.user else a.student.nombre_completo,
            'matricula': a.student.matricula,
            'dias_vencido': (today - a.fecha_limite).days,
        } for a in acuerdos]

    @classmethod
    def get_estudiantes_en_rezago(cls):
        """Return list of students with alerts: overdue agreements or no recent tutoring."""
        today = timezone.localdate()
        cutoff_date = today - timedelta(days=cls.TUTORING_RECENCY_DAYS)

        # Estudiantes con acuerdos vencidos
        students_with_overdue = cls._active_students().filter(
            agreements__in=cls._overdue_agreements(today),
        ).distinct().select_related('user').prefetch_related(
            'academic_committee__memberships__user',
        )

        # Estudiantes sin tutoría reciente
        students_with_recent_or_scheduled_tutoring = Student.objects.filter(
            Q(tutoring_sessions__fecha_sesion__gte=cutoff_date)
            | Q(
                tutoring_sessions__proxima_reunion_fecha__gte=today,
                tutoring_sessions__proxima_reunion_fecha__lte=today + timedelta(days=cls.TUTORING_RECENCY_DAYS),
            )
        ).distinct()
        students_without_recent_tutoring = cls._active_students().exclude(
            pk__in=students_with_recent_or_scheduled_tutoring.values('pk')
        ).select_related('user').prefetch_related(
            'academic_committee__memberships__user',
        )

        # Combinar y deduplicar
        rezagados = {}
        for s in students_with_overdue:
            overdue_count = cls._overdue_agreements(today).filter(student=s).count()
            committee = getattr(s, 'academic_committee', None)
            advisor = next(
                (
                    membership.user
                    for membership in committee.memberships.all()
                    if membership.role == 'ASESOR'
                ),
                None,
            ) if committee else None
            rezagados[s.id] = {
                'student_id': s.id,
                'matricula': s.matricula,
                'nombre_completo': cls._user_name(s.user) if s.user else s.nombre_completo,
                'motivo_rezago': f'{overdue_count} acuerdo(s) vencido(s)',
                'asesor_principal': cls._user_name(advisor) if advisor else '—',
            }

        for s in students_without_recent_tutoring:
            if s.id in rezagados:
                latest = TutoringSession.objects.filter(student=s).order_by('-fecha_sesion').first()
                dias = (today - latest.fecha_sesion).days if latest else None
                motivo = f'{dias} días sin tutoría registrada' if dias is not None else 'Sin tutorías registradas'
                rezagados[s.id]['motivo_rezago'] += f'; {motivo}'
            else:
                # Calcular días desde última tutoría
                latest = TutoringSession.objects.filter(student=s).order_by('-fecha_sesion').first()
                dias = (today - latest.fecha_sesion).days if latest else None
                committee = getattr(s, 'academic_committee', None)
                advisor = next(
                    (
                        membership.user
                        for membership in committee.memberships.all()
                        if membership.role == 'ASESOR'
                    ),
                    None,
                ) if committee else None
                rezagados[s.id] = {
                    'student_id': s.id,
                    'matricula': s.matricula,
                    'nombre_completo': cls._user_name(s.user) if s.user else s.nombre_completo,
                    'motivo_rezago': f'{dias} días sin tutoría registrada' if dias is not None else 'Sin tutorías registradas',
                    'asesor_principal': cls._user_name(advisor) if advisor else '—',
                }

        return list(rezagados.values())
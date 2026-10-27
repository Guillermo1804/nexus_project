"""
Dashboard aggregation service for HU-24.
Provides executive KPIs, distributions, and alert listings for program coordinators.
"""
from datetime import timedelta

from django.db.models import Avg, Count, Q
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

    TUTORING_RECENCY_DAYS = 45

    @classmethod
    def get_kpis(cls):
        """Return the five core KPIs for the dashboard."""
        today = timezone.localdate()
        cutoff_date = today - timedelta(days=cls.TUTORING_RECENCY_DAYS)

        # Total estudiantes activos (que tienen semestre actual asignado)
        total_estudiantes_activos = Student.objects.filter(
            semesters__isnull=False
        ).distinct().count()

        # Total acuerdos pendientes (PENDIENTE + EN_PROCESO)
        total_acuerdos_pendientes = Agreement.objects.exclude(
            estado=Agreement.Status.COMPLETED
        ).count()

        # Total acuerdos vencidos (no concluidos y fecha_limite < today)
        total_acuerdos_vencidos = Agreement.objects.filter(
            is_vencido=True
        ).count()

        # Estudiantes sin tutoría reciente (> 45 días sin sesión)
        # Subconsulta: última tutoría por estudiante
        from django.db.models import OuterRef, Subquery, Max

        latest_tutoring = TutoringSession.objects.filter(
            student=OuterRef('pk')
        ).order_by('-fecha_sesion')

        students_with_recent_tutoring = Student.objects.filter(
            tutoring_sessions__fecha_sesion__gte=cutoff_date
        ).distinct()

        estudiantes_sin_tutoria_reciente = Student.objects.exclude(
            pk__in=students_with_recent_tutoring.values('pk')
        ).filter(
            semesters__isnull=False
        ).distinct().count()

        # Promedio global de avance de tesis (últimos registros por estudiante)
        latest_thesis = ThesisProgress.objects.filter(
            student=OuterRef('pk')
        ).order_by('-fecha_registro')

        thesis_avg = Student.objects.filter(
            semesters__isnull=False
        ).annotate(
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
    def get_distribucion_semestres(cls):
        """Return distribution of active students by current semester (1-6)."""
        # Obtener el semestre actual de cada estudiante activo
        students = Student.objects.filter(
            semesters__isnull=False
        ).select_related('semesters').distinct()

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

        students_with_avance = Student.objects.filter(
            semesters__isnull=False
        ).annotate(
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
        estudiantes = Student.objects.filter(
            semesters__isnull=False
        ).select_related('user', 'current_semester', 'asesor_principal').order_by('matricula')

        return [{
            'id': s.id,
            'matricula': s.matricula,
            'nombre': s.user.get_full_name(),
            'semestre': s.current_semester.numero if s.current_semester else 'N/A',
            'asesor': s.asesor_principal.user.get_full_name() if s.asesor_principal else 'N/A'
        } for s in estudiantes]

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
            'estudiante': ts.student.user.get_full_name(),
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
            'responsable': a.responsable.get_full_name(),
            'estudiante': a.student.user.get_full_name(),
            'matricula': a.student.matricula,
        } for a in acuerdos]

    @classmethod
    def get_acuerdos_vencidos(cls):
        """Return list of overdue agreements."""
        today = timezone.localdate()
        acuerdos = Agreement.objects.filter(
            is_vencido=True
        ).select_related('student', 'student__user', 'responsable').order_by('fecha_limite')

        return [{
            'id': a.id,
            'descripcion': a.descripcion,
            'estado': a.get_estado_display(),
            'fecha_limite': a.fecha_limite,
            'fecha_conclusion': a.fecha_conclusion,
            'responsable': a.responsable.get_full_name(),
            'estudiante': a.student.user.get_full_name(),
            'matricula': a.student.matricula,
            'dias_vencido': (today - a.fecha_limite).days,
        } for a in acuerdos]

    @classmethod
    def get_estudiantes_en_rezago(cls):
        """Return list of students with alerts: overdue agreements or no recent tutoring."""
        today = timezone.localdate()
        cutoff_date = today - timedelta(days=cls.TUTORING_RECENCY_DAYS)

        # Estudiantes con acuerdos vencidos
        students_with_overdue = Student.objects.filter(
            agreements__is_vencido=True,
            semesters__isnull=False
        ).distinct().select_related('user', 'current_semester')

        # Estudiantes sin tutoría reciente
        students_without_recent_tutoring = Student.objects.exclude(
            tutoring_sessions__fecha_sesion__gte=cutoff_date
        ).filter(
            semesters__isnull=False
        ).distinct().select_related('user', 'current_semester')

        # Combinar y deduplicar
        rezagados = {}
        for s in students_with_overdue:
            overdue_count = Agreement.objects.filter(
                student=s, is_vencido=True
            ).count()
            rezagados[s.id] = {
                'student_id': s.id,
                'matricula': s.matricula,
                'nombre_completo': s.user.get_full_name(),
                'motivo_rezago': f'{overdue_count} acuerdo(s) vencido(s)',
                'asesor_principal': s.asesor_principal.user.get_full_name() if s.asesor_principal else '—',
            }

        for s in students_without_recent_tutoring:
            if s.id in rezagados:
                rezagados[s.id]['motivo_rezago'] += f'; {cls.TUTORING_RECENCY_DAYS} días sin tutoría'
            else:
                # Calcular días desde última tutoría
                latest = TutoringSession.objects.filter(student=s).order_by('-fecha_sesion').first()
                dias = (today - latest.fecha_sesion).days if latest else 'N/A'
                rezagados[s.id] = {
                    'student_id': s.id,
                    'matricula': s.matricula,
                    'nombre_completo': s.user.get_full_name(),
                    'motivo_rezago': f'{dias} días sin tutoría registrada' if isinstance(dias, int) else 'Sin tutorías registradas',
                    'asesor_principal': s.asesor_principal.user.get_full_name() if s.asesor_principal else '—',
                }

        return list(rezagados.values())
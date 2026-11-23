from datetime import date, timedelta

from django.conf import settings
from django.db.models import Q
from django.utils import timezone

from ..models import Evidence, Student, TutoringSession
from ..permissions import permissions_for_user


DEFAULT_CONFIG = {
    'DIAS_MAX_SIN_TUTORIA': 45,
    'DIAS_MAX_SIN_EVIDENCIA_TUTORIA': 15,
    'DIAS_ANTICIPACION_PROXIMA_REUNION': 3,
}


class SupervisionRulesEngine:
    """Centralized rules for detecting incomplete academic supervision."""

    @classmethod
    def config(cls):
        return {**DEFAULT_CONFIG, **getattr(settings, 'SUPERVISION_CONFIG', {})}

    @staticmethod
    def _business_days_from(start, count):
        current = start
        remaining = count
        while remaining:
            current += timedelta(days=1)
            if current.weekday() < 5:
                remaining -= 1
        return current

    @classmethod
    def _advisor_for(cls, student):
        committee = getattr(student, 'academic_committee', None)
        if committee is None:
            return None
        return next(
            (
                membership.user
                for membership in committee.memberships.all()
                if membership.role == 'ASESOR'
            ),
            None,
        )

    @staticmethod
    def _user_name(user):
        if user is None:
            return '—'
        return f'{user.first_name} {user.last_name}'.strip() or user.email

    @classmethod
    def _student_payload(cls, student, advisor, semester):
        return {
            'student_id': student.id,
            'matricula': student.matricula,
            'nombre_completo': student.nombre_completo,
            'cohorte': student.cohorte,
            'semestre': semester.numero if semester else None,
            'asesor_principal': cls._user_name(advisor),
        }

    @classmethod
    def _alert(cls, student, advisor, semester, alert_type, severity, **details):
        return {
            **cls._student_payload(student, advisor, semester),
            'tipo_alerta': alert_type,
            'severidad': severity,
            **details,
        }

    @classmethod
    def _visible_students(cls, user):
        students = Student.objects.filter(estatus_activo=True).select_related(
            'user',
        ).prefetch_related(
            'semesters',
            'academic_committee__memberships__user',
        ).order_by('matricula')
        if 'academic.read.global' in permissions_for_user(user):
            return students
        return students.filter(
            academic_committee__memberships__user=user,
            academic_committee__memberships__role='ASESOR',
        ).distinct()

    @classmethod
    def get_alerts(cls, user, today=None):
        today = today or timezone.localdate()
        config = cls.config()
        max_tutoring_gap = config['DIAS_MAX_SIN_TUTORIA']
        max_evidence_age = config['DIAS_MAX_SIN_EVIDENCIA_TUTORIA']
        next_meeting_limit = cls._business_days_from(
            today,
            config['DIAS_ANTICIPACION_PROXIMA_REUNION'],
        )
        students = cls._visible_students(user)
        alerts = []

        for student in students:
            semester = max(student.semesters.all(), key=lambda item: item.numero, default=None)
            advisor = cls._advisor_for(student)
            sessions = list(
                TutoringSession.objects.filter(student=student)
                .select_related('semester')
                .order_by('-fecha_sesion', '-id')
            )
            latest = sessions[0] if sessions else None
            days_without_tutoring = (today - latest.fecha_sesion).days if latest else None
            if latest is None or days_without_tutoring > max_tutoring_gap:
                alerts.append(cls._alert(
                    student,
                    advisor,
                    semester,
                    'SIN_TUTORIA_PROLONGADA',
                    'ALTA',
                    tutoria_id=latest.id if latest else None,
                    dias_transcurridos=days_without_tutoring,
                    ultimo_registro_fecha=latest.fecha_sesion if latest else None,
                    detalle=(
                        f'El estudiante acumula {days_without_tutoring} días sin registrar sesión de tutoría.'
                        if latest
                        else 'El estudiante no tiene sesiones de tutoría registradas.'
                    ),
                ))

            for session in sessions:
                meeting_date = session.proxima_reunion_fecha
                if meeting_date and today < meeting_date <= next_meeting_limit:
                    alerts.append(cls._alert(
                        student,
                        advisor,
                        semester,
                        'REUNION_PROXIMA',
                        'BAJA',
                        tutoria_id=session.id,
                        dias_transcurridos=(meeting_date - today).days,
                        ultimo_registro_fecha=session.fecha_sesion,
                        proxima_reunion_fecha=meeting_date,
                        detalle=f'Hay una tutoría programada para el {meeting_date}.',
                    ))

                age = (today - session.fecha_sesion).days
                if age <= max_evidence_age:
                    continue
                has_evidence = Evidence.objects.filter(
                    student=student,
                    actividad_tipo=Evidence.ActivityType.TUTORING,
                    actividad_id=session.id,
                ).exists()
                if not has_evidence:
                    alerts.append(cls._alert(
                        student,
                        advisor,
                        semester,
                        'EVIDENCIA_FALTANTE',
                        'MEDIA',
                        tutoria_id=session.id,
                        dias_transcurridos=age,
                        ultimo_registro_fecha=session.fecha_sesion,
                        detalle=(
                            f'Tutoría del {session.fecha_sesion} sin evidencia documental '
                            f'después de {age} días.'
                        ),
                    ))

        return alerts

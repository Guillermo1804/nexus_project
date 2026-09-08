"""
Motor de Reglas de Supervisión Activa (N.E.X.U.S. - Sprint 5 / HU-26).

Centraliza las reglas de negocio para la detección proactiva de anomalías y seguimiento
académico en el ciclo de tutorías del posgrado.
"""

from datetime import timedelta
from django.utils import timezone
from django.db.models import Q

from apps.students.models import Student, Semester
from apps.tutoring.models import TutoringSession
from apps.agreements.models import Agreement
from apps.evidence.models import Evidence


class SupervisionRulesEngine:
    """
    Motor centralizado de reglas de supervisión activa.
    
    Reglas implementadas:
    - REGLA 1 (FALTA_TUTORIA_ACTIVA): Alumnos >45 días sin tutoría en semestre activo
      (Severidad ALTA si >60 días o sin registro, MEDIA si >45 días).
    - REGLA 2 (ACUERDO_SIN_EVIDENCIA): Acuerdos CONCLUIDOS sin evidencia documental
      adjunta registrada en el módulo de evidencias (Severidad MEDIA).
    - REGLA 3 (PROXIMA_TUTORIA_CERCANA): Próximas tutorías calendarizadas en <= 7 días
      en el rango [hoy, hoy + 7 días] (Severidad INFORMATIVA).
    """

    def __init__(self, user=None, student_id=None, reference_date=None):
        self.user = user
        self.student_id = student_id
        self.today = reference_date or timezone.now().date()

    def get_scoped_students(self):
        """
        Aplica RBAC al conjunto de estudiantes evaluados.
        """
        qs = Student.objects.filter(estatus_activo=True)

        if self.student_id:
            qs = qs.filter(id=self.student_id)

        if not self.user or self.user.is_superuser:
            return qs

        role = getattr(self.user, 'role', None)
        if role in ['COORDINADOR', 'ADMIN']:
            return qs
        elif role == 'ASESOR':
            return qs.filter(
                committee_members__user=self.user,
                committee_members__is_active=True
            ).distinct()
        elif role == 'ESTUDIANTE':
            return qs.filter(user=self.user)
        
        return Student.objects.none()

    def check_rule_1_falta_tutoria(self, students_qs=None):
        """
        Regla 1: Alumnos >45 días sin tutoría en semestre activo.
        - Severidad ALTA si >60 días o sin sesiones de tutoría.
        - Severidad MEDIA si >45 y <= 60 días.
        """
        if students_qs is None:
            students_qs = self.get_scoped_students()

        students = students_qs.prefetch_related('tutoring_sessions', 'semesters').all()
        alerts = []

        for student in students:
            sessions = sorted(
                student.tutoring_sessions.all(),
                key=lambda s: s.fecha_sesion,
                reverse=True
            )
            latest_session = sessions[0] if sessions else None

            if latest_session:
                dias_sin_tutoria = (self.today - latest_session.fecha_sesion).days
                if dias_sin_tutoria > 60:
                    alerts.append({
                        "regla_id": "REGLA_1",
                        "tipo": "FALTA_TUTORIA_ACTIVA",
                        "severidad": "ALTA",
                        "titulo": "Estudiante sin tutoría reciente (>60 días)",
                        "mensaje": f"El estudiante {student.nombre_completo} lleva {dias_sin_tutoria} días sin tutoría registrada.",
                        "student_id": student.id,
                        "student_nombre": student.nombre_completo,
                        "student_matricula": student.matricula,
                        "dias_sin_tutoria": dias_sin_tutoria,
                        "ultima_tutoria_fecha": str(latest_session.fecha_sesion)
                    })
                elif dias_sin_tutoria > 45:
                    alerts.append({
                        "regla_id": "REGLA_1",
                        "tipo": "FALTA_TUTORIA_ACTIVA",
                        "severidad": "MEDIA",
                        "titulo": "Estudiante sin tutoría reciente",
                        "mensaje": f"El estudiante {student.nombre_completo} lleva {dias_sin_tutoria} días sin tutoría registrada.",
                        "student_id": student.id,
                        "student_nombre": student.nombre_completo,
                        "student_matricula": student.matricula,
                        "dias_sin_tutoria": dias_sin_tutoria,
                        "ultima_tutoria_fecha": str(latest_session.fecha_sesion)
                    })
            else:
                # Sin sesiones registradas
                active_sem = student.semesters.filter(is_active=True).first()
                if active_sem and active_sem.fecha_inicio:
                    dias_sin_tutoria = (self.today - active_sem.fecha_inicio).days
                else:
                    dias_sin_tutoria = (self.today - student.created_at.date()).days

                if dias_sin_tutoria > 45:
                    severidad = "ALTA" if dias_sin_tutoria > 60 else "MEDIA"
                    alerts.append({
                        "regla_id": "REGLA_1",
                        "tipo": "FALTA_TUTORIA_ACTIVA",
                        "severidad": severidad,
                        "titulo": "Estudiante sin ninguna tutoría registrada",
                        "mensaje": f"El estudiante {student.nombre_completo} no tiene tutorías registradas ({dias_sin_tutoria} días acumulados).",
                        "student_id": student.id,
                        "student_nombre": student.nombre_completo,
                        "student_matricula": student.matricula,
                        "dias_sin_tutoria": dias_sin_tutoria,
                        "ultima_tutoria_fecha": None
                    })

        return alerts

    def check_rule_2_acuerdos_sin_evidencia(self, students_qs=None):
        """
        Regla 2: Acuerdos CONCLUIDOS sin evidencia adjunta vinculada.
        Severidad: MEDIA.
        """
        if students_qs is None:
            students_qs = self.get_scoped_students()

        concluded_agreements = Agreement.objects.filter(
            student__in=students_qs,
            estado=Agreement.STATUS_CONCLUIDO
        ).select_related('student', 'responsable').order_by('-fecha_conclusion', '-id')

        agreement_ids = [ag.id for ag in concluded_agreements]
        if not agreement_ids:
            return []

        # Obtener IDs de acuerdos que sí tienen evidencia vinculada
        evidences_with_agreements = set(
            Evidence.objects.filter(
                actividad_tipo=Evidence.ACTIVIDAD_ACUERDO,
                actividad_id__in=agreement_ids
            ).values_list('actividad_id', flat=True)
        )

        alerts = []
        for ag in concluded_agreements:
            if ag.id not in evidences_with_agreements:
                responsable_name = (
                    ag.responsable.get_full_name()
                    if hasattr(ag.responsable, 'get_full_name') and ag.responsable.get_full_name()
                    else getattr(ag.responsable, 'email', str(ag.responsable))
                )
                alerts.append({
                    "regla_id": "REGLA_2",
                    "tipo": "ACUERDO_SIN_EVIDENCIA",
                    "severidad": "MEDIA",
                    "titulo": "Acuerdo concluido sin evidencia",
                    "mensaje": f"El acuerdo '{ag.descripcion}' fue concluido pero no cuenta con evidencia documental adjunta.",
                    "student_id": ag.student_id,
                    "student_nombre": ag.student.nombre_completo,
                    "student_matricula": ag.student.matricula,
                    "agreement_id": ag.id,
                    "agreement_descripcion": ag.descripcion,
                    "responsable_nombre": responsable_name,
                    "fecha_conclusion": str(ag.fecha_conclusion) if ag.fecha_conclusion else None
                })

        return alerts

    def check_rule_3_proximas_tutorias(self, students_qs=None):
        """
        Regla 3: Próximas tutorías calendarizadas en <= 7 días.
        Rango: [hoy, hoy + 7 días].
        Severidad: INFORMATIVA.
        """
        if students_qs is None:
            students_qs = self.get_scoped_students()

        max_date = self.today + timedelta(days=7)

        upcoming_sessions = TutoringSession.objects.filter(
            student__in=students_qs,
            proxima_reunion_fecha__isnull=False,
            proxima_reunion_fecha__gte=self.today,
            proxima_reunion_fecha__lte=max_date
        ).select_related('student').order_by('proxima_reunion_fecha')

        alerts = []
        for session in upcoming_sessions:
            dias_restantes = (session.proxima_reunion_fecha - self.today).days
            if dias_restantes == 0:
                tiempo_str = "hoy"
            elif dias_restantes == 1:
                tiempo_str = "mañana"
            else:
                tiempo_str = f"en {dias_restantes} días"

            alerts.append({
                "regla_id": "REGLA_3",
                "tipo": "PROXIMA_TUTORIA_CERCANA",
                "severidad": "INFORMATIVA",
                "titulo": "Próxima tutoría programada",
                "mensaje": f"Tutoría calendarizada para {session.student.nombre_completo} el {session.proxima_reunion_fecha} ({tiempo_str}).",
                "student_id": session.student_id,
                "student_nombre": session.student.nombre_completo,
                "student_matricula": session.student.matricula,
                "session_id": session.id,
                "fecha_proxima_reunion": str(session.proxima_reunion_fecha),
                "dias_restantes": dias_restantes,
                "modalidad": session.modalidad,
                "notas": session.proxima_reunion_notas or ""
            })

        return alerts

    def run_all_rules(self):
        """
        Ejecuta las 3 reglas de supervisión activa y consolida el resultado.
        """
        students_qs = self.get_scoped_students()

        alertas_falta_tutoria = self.check_rule_1_falta_tutoria(students_qs)
        alertas_acuerdo_sin_evidencia = self.check_rule_2_acuerdos_sin_evidencia(students_qs)
        alertas_proxima_tutoria = self.check_rule_3_proximas_tutorias(students_qs)

        all_alerts = alertas_falta_tutoria + alertas_acuerdo_sin_evidencia + alertas_proxima_tutoria

        # Ordenar: Severidad (ALTA -> MEDIA -> INFORMATIVA), luego por student_matricula
        severity_weight = {
            "ALTA": 0,
            "MEDIA": 1,
            "INFORMATIVA": 2
        }
        all_alerts.sort(
            key=lambda x: (severity_weight.get(x.get("severidad"), 99), x.get("student_matricula", ""))
        )

        return {
            "total_alertas": len(all_alerts),
            "alertas_por_tipo": {
                "falta_tutoria": len(alertas_falta_tutoria),
                "acuerdo_sin_evidencia": len(alertas_acuerdo_sin_evidencia),
                "proxima_tutoria": len(alertas_proxima_tutoria)
            },
            "alertas": all_alerts
        }

from datetime import date, timedelta

from django.test import TestCase, override_settings
from unittest.mock import patch
from rest_framework.test import APIClient

from nexus.models import (
    AcademicCommittee,
    CommitteeMembership,
    CustomUser,
    Evidence,
    Semester,
    Student,
    TutoringSession,
)


class SupervisionAlertsApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.today = date(2026, 11, 6)
        self.coordinator = CustomUser.objects.create_user(
            email='coordinator-hu26@example.com',
            password='password',
            role=CustomUser.Role.PROGRAM_COORDINATOR,
        )
        self.advisor = CustomUser.objects.create_user(
            email='advisor-hu26@example.com',
            password='password',
            first_name='Ada',
            last_name='Asesora',
            role=CustomUser.Role.TUTOR,
        )
        self.other_advisor = CustomUser.objects.create_user(
            email='other-advisor-hu26@example.com',
            password='password',
            role=CustomUser.Role.TUTOR,
        )
        self.student = self._create_student('HU260001', 'Cohorte A')
        committee = AcademicCommittee.objects.create(student=self.student)
        CommitteeMembership.objects.create(
            committee=committee,
            user=self.advisor,
            role=CommitteeMembership.Role.ADVISOR,
        )
        semester = Semester.objects.create(
            student=self.student,
            numero=1,
            fecha_inicio=self.today - timedelta(days=100),
            fecha_fin=self.today + timedelta(days=100),
        )
        self.semester = semester

    def _create_student(self, matricula, cohorte):
        user = CustomUser.objects.create_user(
            email=f'{matricula.lower()}@example.com',
            password='password',
            role=CustomUser.Role.STUDENT,
        )
        return Student.objects.create(
            user=user,
            matricula=matricula,
            nombre_completo=matricula,
            cohorte=cohorte,
            estatus_activo=True,
        )

    def _session(self, student=None, days_ago=0, next_meeting=None):
        return TutoringSession.objects.create(
            student=student or self.student,
            semester=self.semester,
            fecha_sesion=self.today - timedelta(days=days_ago),
            proxima_reunion_fecha=next_meeting,
            resumen='Seguimiento HU-26',
        )

    @override_settings(
        SUPERVISION_CONFIG={
            'DIAS_MAX_SIN_TUTORIA': 45,
            'DIAS_MAX_SIN_EVIDENCIA_TUTORIA': 15,
            'DIAS_ANTICIPACION_PROXIMA_REUNION': 3,
        }
    )
    @patch('nexus.services.supervision_rules.timezone.localdate')
    def test_returns_long_gap_upcoming_meeting_and_missing_evidence(self, localdate):
        localdate.return_value = self.today
        long_gap = self._session(days_ago=46)
        upcoming = self._session(
            days_ago=2,
            next_meeting=self.today + timedelta(days=2),
        )
        missing_evidence = self._session(days_ago=16)
        long_gap_student = self._create_student('HU260003', 'Cohorte C')
        long_gap_semester = Semester.objects.create(
            student=long_gap_student,
            numero=1,
            fecha_inicio=self.today - timedelta(days=100),
            fecha_fin=self.today + timedelta(days=100),
        )
        TutoringSession.objects.create(
            student=long_gap_student,
            semester=long_gap_semester,
            fecha_sesion=self.today - timedelta(days=46),
            resumen='Seguimiento prolongadamente atrasado',
        )
        Evidence.objects.create(
            student=self.student,
            semester=self.semester,
            actividad_tipo=Evidence.ActivityType.TUTORING,
            actividad_id=long_gap.id,
            titulo='Minuta de tutoría',
        )

        with override_settings(TIME_ZONE='UTC'):
            self.client.force_authenticate(self.coordinator)
            response = self.client.get('/api/v1/monitoring/supervision-alerts/')

        self.assertEqual(response.status_code, 200)
        alert_types = {alert['tipo_alerta'] for alert in response.data['alertas']}
        self.assertEqual(
            alert_types,
            {'SIN_TUTORIA_PROLONGADA', 'REUNION_PROXIMA', 'EVIDENCIA_FALTANTE'},
        )
        self.assertEqual(response.data['total_casos_rezago'], 4)
        self.assertEqual(response.data['alertas'][0]['cohorte'], 'Cohorte A')
        self.assertEqual(response.data['alertas'][0]['semestre'], 1)

    @patch('nexus.services.supervision_rules.timezone.localdate')
    def test_does_not_alert_evidence_before_configured_age(self, localdate):
        localdate.return_value = self.today
        session = self._session(days_ago=15)
        self.client.force_authenticate(self.coordinator)

        response = self.client.get(
            '/api/v1/monitoring/supervision-alerts/',
        )

        self.assertEqual(response.status_code, 200)
        self.assertNotIn(
            'EVIDENCIA_FALTANTE',
            {alert['tipo_alerta'] for alert in response.data['alertas']},
        )

    @override_settings(
        SUPERVISION_CONFIG={
            'DIAS_MAX_SIN_TUTORIA': 10,
            'DIAS_MAX_SIN_EVIDENCIA_TUTORIA': 5,
            'DIAS_ANTICIPACION_PROXIMA_REUNION': 1,
        }
    )
    @patch('nexus.services.supervision_rules.timezone.localdate')
    def test_uses_centralized_thresholds(self, localdate):
        localdate.return_value = self.today
        self._session(days_ago=11)
        self.client.force_authenticate(self.coordinator)

        response = self.client.get('/api/v1/monitoring/supervision-alerts/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['configuracion']['DIAS_MAX_SIN_TUTORIA'], 10)
        self.assertIn(
            'SIN_TUTORIA_PROLONGADA',
            {alert['tipo_alerta'] for alert in response.data['alertas']},
        )

    @patch('nexus.services.supervision_rules.timezone.localdate')
    def test_advisor_only_receives_assigned_students(self, localdate):
        localdate.return_value = self.today
        assigned_session = self._session(days_ago=46)
        other_student = self._create_student('HU260002', 'Cohorte B')
        other_semester = Semester.objects.create(
            student=other_student,
            numero=1,
            fecha_inicio=self.today - timedelta(days=100),
            fecha_fin=self.today + timedelta(days=100),
        )
        TutoringSession.objects.create(
            student=other_student,
            semester=other_semester,
            fecha_sesion=self.today - timedelta(days=46),
            resumen='Seguimiento de otro asesor',
        )
        other_committee = AcademicCommittee.objects.create(student=other_student)
        CommitteeMembership.objects.create(
            committee=other_committee,
            user=self.other_advisor,
            role=CommitteeMembership.Role.ADVISOR,
        )

        self.client.force_authenticate(self.advisor)
        response = self.client.get(
            '/api/v1/monitoring/supervision-alerts/',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            {alert['student_id'] for alert in response.data['alertas']},
            {self.student.id},
        )
        self.assertEqual(response.data['alertas'][0]['tutoria_id'], assigned_session.id)

    def test_unauthorized_user_cannot_read_supervision_alerts(self):
        student_user = self.student.user
        self.client.force_authenticate(student_user)

        response = self.client.get('/api/v1/monitoring/supervision-alerts/')

        self.assertEqual(response.status_code, 403)

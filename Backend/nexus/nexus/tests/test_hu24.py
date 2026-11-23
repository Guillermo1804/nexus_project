from datetime import date, timedelta
from unittest.mock import patch

from django.test import TestCase

from nexus.models import CustomUser, Semester, Student, TutoringSession
from nexus.services.dashboard_service import DashboardService


class DashboardTutoringRecencyTests(TestCase):
    def setUp(self):
        self.today = date(2026, 10, 29)
        self.user = CustomUser.objects.create_user(
            email='student@example.com',
            password='password',
            first_name='Ana',
            last_name='Pérez',
        )
        self.student = Student.objects.create(
            user=self.user,
            matricula='DOC000001',
            nombre_completo='Ana Pérez',
            cohorte='2026',
        )
        self.semester = Semester.objects.create(
            student=self.student,
            numero=1,
            fecha_inicio=self.today - timedelta(days=30),
            fecha_fin=self.today + timedelta(days=150),
        )

    @patch('nexus.services.dashboard_service.timezone.localdate')
    def test_marks_student_without_recorded_or_scheduled_tutoring_in_three_weeks(self, localdate):
        localdate.return_value = self.today
        TutoringSession.objects.create(
            student=self.student,
            semester=self.semester,
            fecha_sesion=self.today - timedelta(days=22),
            resumen='Seguimiento anterior',
        )

        kpis = DashboardService.get_kpis()
        alerts = DashboardService.get_estudiantes_en_rezago()
        students_without_recent_tutoring = DashboardService.get_estudiantes_sin_tutoria_reciente()

        self.assertEqual(kpis['estudiantes_sin_tutoria_reciente'], 1)
        self.assertIn('22 días sin tutoría', alerts[0]['motivo_rezago'])
        self.assertEqual(len(students_without_recent_tutoring), 1)
        self.assertEqual(students_without_recent_tutoring[0]['matricula'], 'DOC000001')

    @patch('nexus.services.dashboard_service.timezone.localdate')
    def test_upcoming_tutoring_within_three_weeks_prevents_recency_alert(self, localdate):
        localdate.return_value = self.today
        TutoringSession.objects.create(
            student=self.student,
            semester=self.semester,
            fecha_sesion=self.today - timedelta(days=30),
            proxima_reunion_fecha=self.today + timedelta(days=7),
            resumen='Seguimiento anterior con próxima cita',
        )

        kpis = DashboardService.get_kpis()
        alerts = DashboardService.get_estudiantes_en_rezago()

        self.assertEqual(kpis['estudiantes_sin_tutoria_reciente'], 0)
        self.assertEqual(alerts, [])

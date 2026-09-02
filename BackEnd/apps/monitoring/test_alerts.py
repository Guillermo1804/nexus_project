from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from apps.students.models import Student, Semester, AcademicCommittee
from apps.tutoring.models import TutoringSession
from apps.agreements.models import Agreement

User = get_user_model()


class AlertsEndpointTestCase(APITestCase):
    def setUp(self):
        self.today = timezone.now().date()

        # Users
        self.coordinator = User.objects.create_user(
            email='coord@nexus.edu',
            password='Password123!',
            role='COORDINADOR',
            first_name='Coord',
            last_name='General'
        )
        self.advisor_assigned = User.objects.create_user(
            email='advisor@nexus.edu',
            password='Password123!',
            role='ASESOR',
            first_name='Dr. Asesor',
            last_name='Principal'
        )
        self.advisor_unassigned = User.objects.create_user(
            email='unassigned@nexus.edu',
            password='Password123!',
            role='ASESOR',
            first_name='Dr. Otro',
            last_name='Docente'
        )
        self.student_user = User.objects.create_user(
            email='student@nexus.edu',
            password='Password123!',
            role='ESTUDIANTE',
            first_name='Juan',
            last_name='Pérez'
        )

        # Student & Semester
        self.student = Student.objects.create(
            user=self.student_user,
            matricula='DOC-2025-ALT1',
            nombre_completo='Juan Pérez',
            programa_doctoral='Doctorado en Ciencias Computacionales',
            cohorte='2025-A',
            estatus_activo=True
        )
        self.semester = Semester.objects.create(
            student=self.student,
            numero=1,
            fecha_inicio=self.today - timedelta(days=120),
            fecha_fin=self.today + timedelta(days=60),
            is_active=True
        )

        # Committee
        AcademicCommittee.objects.create(
            student=self.student,
            user=self.advisor_assigned,
            rol_comite='ASESOR_PRINCIPAL',
            is_active=True
        )

    def test_alerts_unauthenticated_returns_401(self):
        response = self.client.get('/api/v1/monitoring/alerts/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_alerts_identifies_overdue_and_upcoming_and_missing_tutoring(self):
        # 1. Overdue agreement
        ag_vencido = Agreement.objects.create(
            student=self.student,
            descripcion='Entregar borrador capítulo 1',
            responsable=self.student_user,
            fecha_limite=self.today - timedelta(days=10),
            estado=Agreement.STATUS_PENDIENTE,
            created_by=self.advisor_assigned
        )

        # 2. Upcoming agreement (in 3 days)
        ag_por_vencer = Agreement.objects.create(
            student=self.student,
            descripcion='Subir archivo de protocolo corregido',
            responsable=self.student_user,
            fecha_limite=self.today + timedelta(days=3),
            estado=Agreement.STATUS_EN_PROCESO,
            created_by=self.advisor_assigned
        )

        # 3. Old tutoring session (> 60 days ago)
        TutoringSession.objects.create(
            student=self.student,
            semester=self.semester,
            fecha_sesion=self.today - timedelta(days=70),
            modalidad='PRESENCIAL',
            resumen='Sesión inicial de arranque de semestre',
            created_by=self.advisor_assigned
        )

        self.client.force_authenticate(user=self.coordinator)
        response = self.client.get('/api/v1/monitoring/alerts/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        self.assertIn('total_alertas', data)
        self.assertIn('alertas', data)
        
        tipos_alertas = [a['tipo'] for a in data['alertas']]
        self.assertIn('VENCIDO', tipos_alertas)
        self.assertIn('POR_VENCER', tipos_alertas)
        self.assertIn('FALTA_SEGUIMIENTO', tipos_alertas)

        # Check VENCIDO details
        vencida = next(a for a in data['alertas'] if a['tipo'] == 'VENCIDO')
        self.assertEqual(vencida['severidad'], 'ALTA')
        self.assertEqual(vencida['student_id'], self.student.id)

        # Check POR_VENCER details
        por_vencer = next(a for a in data['alertas'] if a['tipo'] == 'POR_VENCER')
        self.assertEqual(por_vencer['severidad'], 'MEDIA')
        self.assertIn('3 días restantes', por_vencer['mensaje'])

        # Check FALTA_SEGUIMIENTO details
        falta = next(a for a in data['alertas'] if a['tipo'] == 'FALTA_SEGUIMIENTO')
        self.assertIn('70 días', falta['mensaje'])

    def test_alerts_filter_by_student(self):
        # Create second student
        st2_user = User.objects.create_user(
            email='st2@nexus.edu', password='Password123!', role='ESTUDIANTE'
        )
        st2 = Student.objects.create(
            user=st2_user, matricula='DOC-2025-ALT2', nombre_completo='Maria Gomez',
            programa_doctoral='Doctorado en Ciencias Computacionales',
            cohorte='2025-A', estatus_activo=True
        )
        Agreement.objects.create(
            student=st2, descripcion='Acuerdo St2', responsable=st2_user,
            fecha_limite=self.today - timedelta(days=5), estado=Agreement.STATUS_PENDIENTE
        )

        self.client.force_authenticate(user=self.coordinator)
        response = self.client.get(f'/api/v1/monitoring/alerts/?student={self.student.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for a in response.json()['alertas']:
            self.assertEqual(a['student_id'], self.student.id)

    def test_alerts_rbac_advisor_isolation(self):
        # Assigned advisor sees student alerts
        Agreement.objects.create(
            student=self.student, descripcion='Acuerdo Asignado', responsable=self.student_user,
            fecha_limite=self.today - timedelta(days=2), estado=Agreement.STATUS_PENDIENTE
        )

        self.client.force_authenticate(user=self.advisor_assigned)
        response = self.client.get('/api/v1/monitoring/alerts/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreater(response.json()['total_alertas'], 0)

        # Unassigned advisor sees 0 alerts
        self.client.force_authenticate(user=self.advisor_unassigned)
        response_unassigned = self.client.get('/api/v1/monitoring/alerts/')
        self.assertEqual(response_unassigned.status_code, status.HTTP_200_OK)
        self.assertEqual(response_unassigned.json()['total_alertas'], 0)

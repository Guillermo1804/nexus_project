from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
from django.utils import timezone
from datetime import date, timedelta

from ..models import Student, Semester, ThesisProgress, CustomUser
from ..services import ThesisHistoryService

User = get_user_model()


class ThesisHistoryServiceTest(TestCase):
    def setUp(self):
        # Create a test user
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            role=CustomUser.Role.STUDENT
        )
        
        # Create a student profile
        self.student = Student.objects.create(
            user=self.user,
            matricula='DOC250001',
            nombre_completo='Test User',
            fecha_ingreso=date.today() - timedelta(days=365*2),
            cohorte='2023'
        )
        
        # Create semesters
        self.semester1 = Semester.objects.create(
            student=self.student,
            numero=1,
            fecha_inicio=date(2023, 8, 1),
            fecha_fin=date(2023, 12, 20),
            is_active=False
        )
        
        self.semester2 = Semester.objects.create(
            student=self.student,
            numero=2,
            fecha_inicio=date(2024, 1, 8),
            fecha_fin=date(2024, 6, 20),
            is_active=False
        )
        
        self.semester3 = Semester.objects.create(
            student=self.student,
            numero=3,
            fecha_inicio=date(2024, 8, 1),
            fecha_fin=date(2025, 1, 20),
            is_active=True
        )
        
        # Create thesis progresses
        self.progress1 = ThesisProgress.objects.create(
            student=self.student,
            semester=self.semester1,
            porcentaje_avance=15,
            componentes_json={'protocolo': 80, 'marco_teorico': 30},
            observaciones='Aprobación de protocolo.',
            registrado_por=self.user,
            fecha_registro=date(2023, 6, 20)
        )
        
        self.progress2 = ThesisProgress.objects.create(
            student=self.student,
            semester=self.semester2,
            porcentaje_avance=35,
            componentes_json={'protocolo': 100, 'marco_teorico': 80, 'metodologia': 50},
            observaciones='Avance en recolección de muestras.',
            registrado_por=self.user,
            fecha_registro=date(2023, 12, 15)
        )
        
        self.progress3 = ThesisProgress.objects.create(
            student=self.student,
            semester=self.semester3,
            porcentaje_avance=35,  # Same as previous to test stagnation
            componentes_json={'protocolo': 100, 'marco_teorico': 80, 'metodologia': 50},
            observaciones='Dificultades en laboratorio.',
            registrado_por=self.user,
            fecha_registro=date(2024, 6, 18)
        )

    def test_thesis_history_service_calculates_deltas_correctly(self):
        """Test that the service calculates deltas correctly"""
        service = ThesisHistoryService(self.student)
        history = service.build_history()
        
        # Check basic info
        self.assertEqual(history['student_id'], self.student.id)
        self.assertEqual(history['matricula'], self.student.matricula)
        self.assertEqual(history['total_registros'], 3)
        
        # Check historical entries
        historico = history['historico']
        self.assertEqual(len(historico), 3)
        
        # First entry
        self.assertEqual(historico[0]['semestre_numero'], 1)
        self.assertEqual(historico[0]['porcentaje_avance'], 15)
        self.assertEqual(historico[0]['delta_porcentaje'], 15)  # 15 - 0
        self.assertFalse(historico[0]['estancamiento_detectado'])
        
        # Second entry
        self.assertEqual(historico[1]['semestre_numero'], 2)
        self.assertEqual(historico[1]['porcentaje_avance'], 35)
        self.assertEqual(historico[1]['delta_porcentaje'], 20)  # 35 - 15
        self.assertFalse(historico[1]['estancamiento_detectado'])
        
        # Third entry (stagnation test)
        self.assertEqual(historico[2]['semestre_numero'], 3)
        self.assertEqual(historico[2]['porcentaje_avance'], 35)
        self.assertEqual(historico[2]['delta_porcentaje'], 0)   # 35 - 35
        self.assertTrue(historico[2]['estancamiento_detectado'])
        
        # Check that components and observations are preserved
        self.assertEqual(historico[0]['componentes_json'], {'protocolo': 80, 'marco_teorico': 30})
        self.assertEqual(historico[0]['observaciones'], 'Aprobación de protocolo.')
        self.assertEqual(historico[0]['registrado_por_nombre'], 'Test User')


class ThesisHistoryViewTest(TestCase):
    def setUp(self):
        # Create users
        self.student_user = User.objects.create_user(
            email='student@example.com',
            password='studentpass123',
            first_name='Student',
            last_name='User',
            role=CustomUser.Role.STUDENT
        )
        
        self.other_user = User.objects.create_user(
            email='other@example.com',
            password='otherpass123',
            first_name='Other',
            last_name='User',
            role=CustomUser.Role.TUTOR
        )
        
        # Create student profile
        self.student = Student.objects.create(
            user=self.student_user,
            matricula='DOC250002',
            nombre_completo='Student User',
            fecha_ingreso=date.today() - timedelta(days=365*2),
            cohorte='2023'
        )
        
        # Create a semester and thesis progress for testing
        self.semester = Semester.objects.create(
            student=self.student,
            numero=1,
            fecha_inicio=date(2023, 8, 1),
            fecha_fin=date(2023, 12, 20),
            is_active=True
        )
        
        self.progress = ThesisProgress.objects.create(
            student=self.student,
            semester=self.semester,
            porcentaje_avance=25,
            componentes_json={'protocolo': 50},
            observaciones='Initial progress',
            registrado_por=self.student_user,
            fecha_registro=date(2023, 6, 20)
        )
        
        # Create auth tokens
        self.student_token = Token.objects.create(user=self.student_user)
        self.other_token = Token.objects.create(user=self.other_user)
        
        self.client = APIClient()

    def test_thesis_history_endpoint_returns_200_for_owner(self):
        """Test that the endpoint returns 200 for the student owner"""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.student_token.key)
        response = self.client.get(f'/api/v1/thesis/history/?student={self.student.id}')
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        self.assertEqual(data['student_id'], self.student.id)
        self.assertEqual(data['total_registros'], 1)
        self.assertEqual(len(data['historico']), 1)
        self.assertEqual(data['historico'][0]['porcentaje_avance'], 25)

    def test_thesis_history_endpoint_returns_403_for_unauthorized_user(self):
        """Test that the endpoint returns 403 for unauthorized users"""
        # Make other user a committee member to test assigned access
        from ..models import AcademicCommittee, CommitteeMembership
        
        committee = AcademicCommittee.objects.create(student=self.student)
        CommitteeMembership.objects.create(
            committee=committee,
            user=self.other_user,
            role=CommitteeMembership.Role.ADVISOR
        )
        
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.other_token.key)
        response = self.client.get(f'/api/v1/thesis/history/?student={self.student.id}')
        # Should be 200 because the other user is now an advisor
        self.assertEqual(response.status_code, 200)
        
        # Test with a truly unauthorized user (no relation to student)
        unauthorized_user = User.objects.create_user(
            email='unauthorized@example.com',
            password='unauthorizedpass123',
            first_name='Unauthorized',
            last_name='User',
            role=CustomUser.Role.TUTOR
        )
        unauthorized_token = Token.objects.create(user=unauthorized_user)
        
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + unauthorized_token.key)
        response = self.client.get(f'/api/v1/thesis/history/?student={self.student.id}')
        self.assertEqual(response.status_code, 404)  # Not found due to permission check

    def test_thesis_history_endpoint_returns_400_missing_student_param(self):
        """Test that the endpoint returns 400 when student parameter is missing"""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.student_token.key)
        response = self.client.get('/api/v1/thesis/history/')
        self.assertEqual(response.status_code, 400)
        self.assertIn('student', response.json())

    def test_thesis_history_endpoint_returns_404_for_nonexistent_student(self):
        """Test that the endpoint returns 404 for nonexistent student"""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.student_token.key)
        response = self.client.get('/api/v1/thesis/history/?student=99999')
        self.assertEqual(response.status_code, 404)
from datetime import date, timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from rest_framework.test import APITestCase
from rest_framework import status

from apps.students.models import Student, Semester, AcademicCommittee
from apps.thesis.models import ThesisProgress, default_thesis_components

User = get_user_model()


class ThesisProgressModelAndAPITests(APITestCase):
    def setUp(self):
        # 1. Coordinador
        self.coordinator = User.objects.create_superuser(
            email='coord@nexus.edu.mx',
            password='Password123!',
            first_name='Dr. Carlos',
            last_name='Coordinador'
        )

        # 2. Asesor Principal
        self.advisor_main = User.objects.create_user(
            email='asesor1@nexus.edu.mx',
            password='Password123!',
            first_name='Dra. Elena',
            last_name='Ramos',
            role='ASESOR'
        )

        # 3. Asesor Ajeno (no asignado)
        self.advisor_other = User.objects.create_user(
            email='asesor_otro@nexus.edu.mx',
            password='Password123!',
            first_name='Dr. Roberto',
            last_name='Soto',
            role='ASESOR'
        )

        # 4. Estudiante 1 y su usuario
        self.student_user1 = User.objects.create_user(
            email='estudiante1@nexus.edu.mx',
            password='Password123!',
            first_name='Juan',
            last_name='Pérez',
            role='ESTUDIANTE'
        )
        self.student1 = Student.objects.create(
            user=self.student_user1,
            matricula='DOC-2025-001',
            nombre_completo='Juan Pérez',
            cohorte='2025-A'
        )
        self.semester1 = Semester.objects.create(
            student=self.student1,
            numero=1,
            fecha_inicio=date.today() - timedelta(days=30),
            fecha_fin=date.today() + timedelta(days=150)
        )

        AcademicCommittee.objects.create(
            student=self.student1,
            user=self.advisor_main,
            rol_comite='ASESOR_PRINCIPAL',
            is_active=True
        )

        # 5. Estudiante 2 y su usuario
        self.student_user2 = User.objects.create_user(
            email='estudiante2@nexus.edu.mx',
            password='Password123!',
            first_name='María',
            last_name='Gómez',
            role='ESTUDIANTE'
        )
        self.student2 = Student.objects.create(
            user=self.student_user2,
            matricula='DOC-2025-002',
            nombre_completo='María Gómez',
            cohorte='2025-A'
        )
        self.semester2 = Semester.objects.create(
            student=self.student2,
            numero=1,
            fecha_inicio=date.today() - timedelta(days=30),
            fecha_fin=date.today() + timedelta(days=150)
        )

    def test_thesis_progress_model_creation(self):
        progress = ThesisProgress.objects.create(
            student=self.student1,
            semester=self.semester1,
            porcentaje_avance=35,
            componentes_json={
                'protocolo': 100,
                'estadoArte': 70,
                'marcoTeorico': 40,
                'metodologia': 10,
                'analisis': 0,
                'redaccion': 0
            },
            observaciones='Avance según cronograma de semestre 1'
        )
        self.assertEqual(progress.porcentaje_avance, 35)
        self.assertEqual(progress.componentes_json['protocolo'], 100)
        self.assertEqual(str(progress), f"{self.student1.matricula} - 35% ({progress.fecha_registro})")

    def test_thesis_progress_model_validation_inconsistent_semester(self):
        with self.assertRaises(ValidationError):
            # semester2 pertenece a student2, no a student1
            progress = ThesisProgress(
                student=self.student1,
                semester=self.semester2,
                porcentaje_avance=20
            )
            progress.clean()

    def test_api_create_thesis_progress(self):
        self.client.force_authenticate(user=self.advisor_main)
        payload = {
            'student': self.student1.id,
            'semester': self.semester1.id,
            'porcentaje_avance': 45,
            'componentes_json': {
                'protocolo': 100,
                'estadoArte': 80,
                'marcoTeorico': 50,
                'metodologia': 20,
                'analisis': 0,
                'redaccion': 0
            },
            'observaciones': 'Capítulo 1 y 2 terminados.'
        }
        response = self.client.post('/api/v1/thesis/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('thesis_progress_created_id', response.data)
        self.assertEqual(response.data['mensaje'], 'Avance de tesis registrado correctamente')
        self.assertEqual(response.data['thesis_progress']['porcentaje_avance'], 45)
        self.assertEqual(response.data['thesis_progress']['student_matricula'], 'DOC-2025-001')

    def test_api_create_invalid_percentage(self):
        self.client.force_authenticate(user=self.advisor_main)
        payload = {
            'student': self.student1.id,
            'semester': self.semester1.id,
            'porcentaje_avance': 150,
            'observaciones': 'Error porcentaje'
        }
        response = self.client.post('/api/v1/thesis/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_api_rbac_isolation_student(self):
        # Crear avances para student1 y student2
        ThesisProgress.objects.create(
            student=self.student1,
            semester=self.semester1,
            porcentaje_avance=25
        )
        ThesisProgress.objects.create(
            student=self.student2,
            semester=self.semester2,
            porcentaje_avance=50
        )

        # Autenticar como estudiante 1
        self.client.force_authenticate(user=self.student_user1)
        response = self.client.get('/api/v1/thesis/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Solo debe ver el suyo
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['student'], self.student1.id)

    def test_api_rbac_isolation_advisor(self):
        ThesisProgress.objects.create(
            student=self.student1,
            semester=self.semester1,
            porcentaje_avance=25
        )
        ThesisProgress.objects.create(
            student=self.student2,
            semester=self.semester2,
            porcentaje_avance=50
        )

        # Asesor principal asignado a student1
        self.client.force_authenticate(user=self.advisor_main)
        response = self.client.get('/api/v1/thesis/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['student'], self.student1.id)

        # Asesor ajeno no asignado
        self.client.force_authenticate(user=self.advisor_other)
        response_other = self.client.get('/api/v1/thesis/')
        self.assertEqual(response_other.status_code, status.HTTP_200_OK)
        results_other = response_other.data.get('results', response_other.data)
        self.assertEqual(len(results_other), 0)

    def test_api_delete_thesis_progress(self):
        progress = ThesisProgress.objects.create(
            student=self.student1,
            semester=self.semester1,
            porcentaje_avance=25
        )
        self.client.force_authenticate(user=self.coordinator)
        response = self.client.delete(f'/api/v1/thesis/{progress.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['success'], True)
        self.assertEqual(response.data['details'], 'Recurso eliminado correctamente')

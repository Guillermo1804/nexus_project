import io
from datetime import date, timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.exceptions import ValidationError
from rest_framework.test import APITestCase
from rest_framework import status

from apps.students.models import Student, Semester, AcademicCommittee
from apps.evidence.models import Evidence, validate_evidence_file, MAX_FILE_SIZE_BYTES

User = get_user_model()


class EvidenceModelAndAPITests(APITestCase):
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

        # 3. Asesor Ajeno
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

    def test_create_file_evidence_success(self):
        self.client.force_authenticate(user=self.advisor_main)
        pdf_file = SimpleUploadedFile("reporte.pdf", b"%PDF-1.4 test content", content_type="application/pdf")
        
        payload = {
            'student': self.student1.id,
            'semester': self.semester1.id,
            'tipo': Evidence.TIPO_ARCHIVO,
            'actividad_tipo': Evidence.ACTIVIDAD_TESIS,
            'actividad_id': 10,
            'titulo': 'Capítulo 1 Revisado',
            'descripcion': 'Borrador con correcciones del asesor',
            'archivo_adjunto': pdf_file
        }
        response = self.client.post('/api/v1/evidence/', payload, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('evidence_created_id', response.data)
        self.assertEqual(response.data['mensaje'], 'Evidencia registrada correctamente')
        self.assertEqual(response.data['evidence']['titulo'], 'Capítulo 1 Revisado')
        self.assertEqual(response.data['evidence']['student_matricula'], 'DOC-2025-001')
        self.assertEqual(response.data['evidence']['mime_type'], 'application/pdf')

    def test_file_size_exceeds_15mb_rejected(self):
        self.client.force_authenticate(user=self.advisor_main)
        # Simular archivo grande > 15MB
        big_content = b"0" * (16 * 1024 * 1024)
        big_file = SimpleUploadedFile("grande.pdf", big_content, content_type="application/pdf")
        
        payload = {
            'student': self.student1.id,
            'tipo': Evidence.TIPO_ARCHIVO,
            'titulo': 'Archivo Excesivo',
            'archivo_adjunto': big_file
        }
        response = self.client.post('/api/v1/evidence/', payload, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('archivo_adjunto', response.data)

    def test_invalid_mime_type_rejected(self):
        self.client.force_authenticate(user=self.advisor_main)
        exe_file = SimpleUploadedFile("script.exe", b"MZ...", content_type="application/x-msdownload")
        
        payload = {
            'student': self.student1.id,
            'tipo': Evidence.TIPO_ARCHIVO,
            'titulo': 'Ejecutable no permitido',
            'archivo_adjunto': exe_file
        }
        response = self.client.post('/api/v1/evidence/', payload, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('archivo_adjunto', response.data)

    def test_create_doi_evidence_success(self):
        self.client.force_authenticate(user=self.advisor_main)
        payload = {
            'student': self.student1.id,
            'semester': self.semester1.id,
            'tipo': Evidence.TIPO_DOI,
            'actividad_tipo': Evidence.ACTIVIDAD_TESIS,
            'titulo': 'Artículo Publicado en Journal',
            'descripcion': 'Publicación indexada en Scopus',
            'enlace_url': '10.1016/j.jneumeth.2020.108920'
        }
        response = self.client.post('/api/v1/evidence/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['evidence']['tipo'], Evidence.TIPO_DOI)
        self.assertEqual(response.data['evidence']['enlace_url'], '10.1016/j.jneumeth.2020.108920')

    def test_create_url_evidence_success(self):
        self.client.force_authenticate(user=self.student_user1)
        payload = {
            'student': self.student1.id,
            'tipo': Evidence.TIPO_DOI,
            'actividad_tipo': Evidence.ACTIVIDAD_OTRO,
            'titulo': 'Repositorio GitHub con Código Fuente',
            'enlace_url': 'https://github.com/posgrado/nexus-research'
        }
        response = self.client.post('/api/v1/evidence/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_invalid_doi_format_rejected(self):
        self.client.force_authenticate(user=self.student_user1)
        payload = {
            'student': self.student1.id,
            'tipo': Evidence.TIPO_DOI,
            'titulo': 'DOI Inválido',
            'enlace_url': 'doi-invalido-sin-formato-correcto'
        }
        response = self.client.post('/api/v1/evidence/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('enlace_url', response.data)

    def test_rbac_isolation_evidence(self):
        # Evidencia para estudiante 1
        Evidence.objects.create(
            student=self.student1,
            tipo=Evidence.TIPO_DOI,
            titulo='Evidencia Juan',
            enlace_url='10.1000/182'
        )
        # Evidencia para estudiante 2
        Evidence.objects.create(
            student=self.student2,
            tipo=Evidence.TIPO_DOI,
            titulo='Evidencia María',
            enlace_url='10.1000/183'
        )

        # 1. Estudiante 1 solo ve la suya
        self.client.force_authenticate(user=self.student_user1)
        resp1 = self.client.get('/api/v1/evidence/')
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)
        results1 = resp1.data.get('results', resp1.data)
        self.assertEqual(len(results1), 1)
        self.assertEqual(results1[0]['student'], self.student1.id)

        # 2. Asesor de Juan ve la de Juan
        self.client.force_authenticate(user=self.advisor_main)
        resp_adv = self.client.get('/api/v1/evidence/')
        self.assertEqual(resp_adv.status_code, status.HTTP_200_OK)
        results_adv = resp_adv.data.get('results', resp_adv.data)
        self.assertEqual(len(results_adv), 1)
        self.assertEqual(results_adv[0]['student'], self.student1.id)

        # 3. Asesor ajeno ve 0
        self.client.force_authenticate(user=self.advisor_other)
        resp_other = self.client.get('/api/v1/evidence/')
        self.assertEqual(resp_other.status_code, status.HTTP_200_OK)
        results_other = resp_other.data.get('results', resp_other.data)
        self.assertEqual(len(results_other), 0)

        # 4. Coordinador ve todas
        self.client.force_authenticate(user=self.coordinator)
        resp_coord = self.client.get('/api/v1/evidence/')
        self.assertEqual(resp_coord.status_code, status.HTTP_200_OK)
        results_coord = resp_coord.data.get('results', resp_coord.data)
        self.assertEqual(len(results_coord), 2)

    def test_delete_evidence(self):
        ev = Evidence.objects.create(
            student=self.student1,
            tipo=Evidence.TIPO_DOI,
            titulo='Evidencia a borrar',
            enlace_url='10.1000/182'
        )
        self.client.force_authenticate(user=self.coordinator)
        response = self.client.delete(f'/api/v1/evidence/{ev.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['success'], True)
        self.assertEqual(response.data['details'], 'Recurso eliminado correctamente')

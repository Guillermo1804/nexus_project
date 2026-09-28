from datetime import date

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase

from .models import Evidence, Semester, Student, ThesisProgress
from .tests import jwt_for


class EvidenceLinkHu22Tests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.student_user = user_model.objects.create_user(email='student22@example.com', password='x')
        self.other_user = user_model.objects.create_user(email='other22@example.com', password='x')
        self.student = Student.objects.create(
            user=self.student_user, matricula='HU22', nombre_completo='Student', cohorte='2026'
        )
        self.semester = Semester.objects.create(
            student=self.student, numero=1, fecha_inicio=date(2026, 1, 1), fecha_fin=date(2026, 6, 30)
        )
        self.progress = ThesisProgress.objects.create(
            student=self.student, semester=self.semester, porcentaje_avance=25
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(self.student_user)}')

    def payload(self, **changes):
        data = {
            'student': self.student.id,
            'semester': self.semester.id,
            'tipo': Evidence.EvidenceType.DOI_LINK,
            'actividad_tipo': Evidence.ActivityType.THESIS,
            'actividad_id': self.progress.id,
            'titulo': 'Repositorio de datos',
            'descripcion': 'Datos reproducibles.',
            'enlace_url': 'https://doi.org/10.5281/zenodo.1234567',
        }
        data.update(changes)
        return data

    def test_creates_https_link(self):
        response = self.client.post('/api/v1/evidence/', self.payload(), format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['tipo'], Evidence.EvidenceType.DOI_LINK)
        self.assertEqual(response.data['enlace_url'], 'https://doi.org/10.5281/zenodo.1234567')
        self.assertIsNone(response.data['archivo_adjunto'])
        self.assertEqual(response.data['mime_type'], '')
        self.assertEqual(response.data['file_size_bytes'], 0)

    def test_creates_direct_doi_without_normalizing_it(self):
        doi = '10.1000/182'
        response = self.client.post('/api/v1/evidence/', self.payload(enlace_url=doi), format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['enlace_url'], doi)

    def test_rejects_unsafe_schemes_and_arbitrary_text(self):
        for link in ('javascript:alert(1)', 'file:///etc/passwd', 'data:text/plain,test', 'not a link'):
            with self.subTest(link=link):
                response = self.client.post('/api/v1/evidence/', self.payload(enlace_url=link), format='json')
                self.assertEqual(response.status_code, 400)
                self.assertIn('enlace_url', response.data)

    def test_rejects_missing_link_for_link_evidence(self):
        data = self.payload()
        data.pop('enlace_url')
        response = self.client.post('/api/v1/evidence/', data, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('enlace_url', response.data)

    def test_rejects_file_for_link_evidence(self):
        data = self.payload()
        data['archivo_adjunto'] = SimpleUploadedFile('evidence.pdf', b'%PDF-test', content_type='application/pdf')
        response = self.client.post('/api/v1/evidence/', data, format='multipart')
        self.assertEqual(response.status_code, 400)
        self.assertIn('archivo_adjunto', response.data)

    def test_rejects_local_evidence_without_file(self):
        response = self.client.post(
            '/api/v1/evidence/',
            self.payload(tipo=Evidence.EvidenceType.LOCAL_FILE, enlace_url=''),
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('archivo_adjunto', response.data)

    def test_rejects_unrelated_user(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(self.other_user)}')
        response = self.client.post('/api/v1/evidence/', self.payload(), format='json')
        self.assertEqual(response.status_code, 403)

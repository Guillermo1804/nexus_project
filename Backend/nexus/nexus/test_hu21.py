import tempfile
from datetime import date
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APITestCase

from .models import AcademicCommittee, CommitteeMembership, Evidence, Semester, Student
from .tests import jwt_for


TEST_MEDIA_ROOT = tempfile.mkdtemp()


@override_settings(MEDIA_ROOT=TEST_MEDIA_ROOT)
class EvidenceUploadHu21Tests(APITestCase):
    @classmethod
    def tearDownClass(cls):
        import shutil
        super().tearDownClass()
        shutil.rmtree(TEST_MEDIA_ROOT, ignore_errors=True)

    def setUp(self):
        user_model = Evidence._meta.get_field('created_by').related_model
        self.student_user = user_model.objects.create_user(email='student21@example.com', password='x')
        self.other_user = user_model.objects.create_user(email='other21@example.com', password='x')
        self.student = Student.objects.create(user=self.student_user, matricula='HU21', nombre_completo='Student', cohorte='2026')
        self.semester = Semester.objects.create(student=self.student, numero=1, fecha_inicio=date(2026, 1, 1), fecha_fin=date(2026, 6, 30))
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(self.student_user)}')

    def payload(self, size=100, content_type='application/pdf', name='evidence.pdf'):
        return {'student': self.student.id, 'semester': self.semester.id, 'actividad_tipo': 'TESIS',
                'titulo': 'Protocolo', 'archivo_adjunto': SimpleUploadedFile(name, b'%PDF-' + b'x' * (size - 5), content_type=content_type)}

    def test_accepts_exactly_15_mib(self):
        response = self.client.post('/api/v1/evidence/', self.payload(15 * 1024 * 1024), format='multipart')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['file_size_bytes'], 15 * 1024 * 1024)

    def test_rejects_15_mib_plus_one(self):
        response = self.client.post('/api/v1/evidence/', self.payload(15 * 1024 * 1024 + 1), format='multipart')
        self.assertEqual(response.status_code, 400)
        self.assertIn('15 MiB', str(response.data['archivo_adjunto']))

    def test_rejects_mime_and_extension_mismatch(self):
        self.assertEqual(self.client.post('/api/v1/evidence/', self.payload(content_type='image/png'), format='multipart').status_code, 400)
        self.assertEqual(self.client.post('/api/v1/evidence/', self.payload(name='fake.png'), format='multipart').status_code, 400)

    def test_rejects_unrelated_user_and_foreign_semester(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(self.other_user)}')
        self.assertEqual(self.client.post('/api/v1/evidence/', self.payload(), format='multipart').status_code, 403)
        other = Student.objects.create(matricula='HU21B', nombre_completo='Other', cohorte='2026')
        semester = Semester.objects.create(student=other, numero=1, fecha_inicio=date(2026, 1, 1), fecha_fin=date(2026, 6, 30))
        data = self.payload(); data['semester'] = semester.id
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(self.student_user)}')
        self.assertEqual(self.client.post('/api/v1/evidence/', data, format='multipart').status_code, 400)

    def test_committee_member_can_upload(self):
        committee_user = Evidence._meta.get_field('created_by').related_model.objects.create_user(email='tutor21@example.com', password='x', role='TUTOR')
        CommitteeMembership.objects.create(committee=AcademicCommittee.objects.create(student=self.student), user=committee_user, role='ASESOR')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(committee_user)}')
        self.assertEqual(self.client.post('/api/v1/evidence/', self.payload(), format='multipart').status_code, 201)

    def test_removes_file_when_database_save_fails(self):
        upload = self.payload()['archivo_adjunto']
        with patch('nexus.models.Evidence.save', side_effect=RuntimeError('db failed')):
            with self.assertRaises(RuntimeError):
                self.client.post('/api/v1/evidence/', {**self.payload(), 'archivo_adjunto': upload}, format='multipart')
        self.assertFalse(any(Evidence._meta.get_field('archivo_adjunto').storage.listdir('evidence')[1]))

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from .models import Publication, PublicationStatus, Evidence, Student, CustomUser, Semester
from .serializers import PublicationSerializer

class PublicationTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(email='test@example.com', password='testpassword')
        self.student = Student.objects.create(user=self.user, matricula='12345', nombre_completo='Test Student')
        self.semester = Semester.objects.create(student=self.student, numero=1, fecha_inicio='2026-01-01', fecha_fin='2026-06-30')
        self.evidence = Evidence.objects.create(student=self.student, titulo='Test Evidence', tipo='ARCHIVO_LOCAL')
        self.client.force_authenticate(user=self.user)

    def test_create_publication(self):
        data = {
            'student': self.student.id,
            'semester': self.semester.id,
            'titulo': 'Deep Fuzzy Reinforcement Learning for Adaptive Robotics Control',
            'autores': 'Fuentes, D., Gómez, R., Soto, E.',
            'tipo': 'JCR',
            'revista': 'IEEE Transactions on Fuzzy Systems',
            'estado': 'PUBLICADO',
            'fecha_publicacion': '2026-05-12',
            'doi': 'https://doi.org/10.1109/TFUZZ.2026.123456',
            'evidencia': self.evidence.id
        }
        response = self.client.post('/api/v1/academic-output/publications/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Publication.objects.count(), 1)
        self.assertEqual(Publication.objects.get().titulo, 'Deep Fuzzy Reinforcement Learning for Adaptive Robotics Control')

    def test_create_publication_without_doi_or_evidence(self):
        data = {
            'student': self.student.id,
            'semester': self.semester.id,
            'titulo': 'Deep Fuzzy Reinforcement Learning for Adaptive Robotics Control',
            'autores': 'Fuentes, D., Gómez, R., Soto, E.',
            'tipo': 'JCR',
            'revista': 'IEEE Transactions on Fuzzy Systems',
            'estado': 'PUBLICADO',
            'fecha_publicacion': '2026-05-12'
        }
        response = self.client.post('/api/v1/academic-output/publications/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Publication.objects.count(), 0)

    def test_create_publication_with_future_date(self):
        data = {
            'student': self.student.id,
            'semester': self.semester.id,
            'titulo': 'Deep Fuzzy Reinforcement Learning for Adaptive Robotics Control',
            'autores': 'Fuentes, D., Gómez, R., Soto, E.',
            'tipo': 'JCR',
            'revista': 'IEEE Transactions on Fuzzy Systems',
            'estado': 'PUBLICADO',
            'fecha_publicacion': (timezone.now() + timezone.timedelta(days=1)).date().isoformat(),
            'doi': 'https://doi.org/10.1109/TFUZZ.2026.123456',
            'evidencia': self.evidence.id
        }
        response = self.client.post('/api/v1/academic-output/publications/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Publication.objects.count(), 0)
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from apps.students.models import Student, Semester
from datetime import date

User = get_user_model()


class StudentModelAndAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.coordinator = User.objects.create_superuser(
            email='coord@nexus.edu.mx',
            password='CoordPassword123!',
            first_name='Laura',
            last_name='Gomez'
        )
        self.client.force_authenticate(user=self.coordinator)

        self.student_data = {
            'matricula': 'DOC-2024-001',
            'nombre_completo': 'Mariana Morales Ruiz',
            'programa_doctoral': 'Doctorado en Ciencias Computacionales',
            'cohorte': '2024-A',
            'estatus_activo': True,
        }

    def test_create_student_api_v2_response(self):
        url = reverse('students:student-list')
        response = self.client.post(url, self.student_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('student_created_id', response.data)
        self.assertEqual(response.data['mensaje'], 'Estudiante registrado correctamente')
        self.assertIn('student', response.data)
        self.assertEqual(response.data['student']['matricula'], 'DOC-2024-001')

    def test_duplicate_matricula_raises_error(self):
        url = reverse('students:student-list')
        response1 = self.client.post(url, self.student_data, format='json')
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)

        response2 = self.client.post(url, self.student_data, format='json')
        self.assertEqual(response2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('matricula', response2.data)

    def test_get_students_list_and_detail(self):
        student = Student.objects.create(**self.student_data)
        list_url = reverse('students:student-list')
        detail_url = reverse('students:student-detail', kwargs={'pk': student.pk})

        response = self.client.get(list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)

        detail_resp = self.client.get(detail_url)
        self.assertEqual(detail_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_resp.data['matricula'], student.matricula)

    def test_create_semesters_range_1_to_6(self):
        student = Student.objects.create(**self.student_data)
        semesters_url = reverse('students:student-semesters', kwargs={'pk': student.pk})

        # Semestre 1
        sem1_data = {
            'numero': 1,
            'fecha_inicio': '2024-01-15',
            'fecha_fin': '2024-06-30',
            'is_active': True,
        }
        res1 = self.client.post(semesters_url, sem1_data, format='json')
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res1.data['semester']['numero'], 1)

        # Semestre 6
        sem6_data = {
            'numero': 6,
            'fecha_inicio': '2026-08-01',
            'fecha_fin': '2026-12-15',
            'is_active': False,
        }
        res6 = self.client.post(semesters_url, sem6_data, format='json')
        self.assertEqual(res6.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res6.data['semester']['numero'], 6)

        # List semesters
        res_list = self.client.get(semesters_url)
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_list.data), 2)

    def test_semester_invalid_number_fails(self):
        student = Student.objects.create(**self.student_data)
        semesters_url = reverse('students:student-semesters', kwargs={'pk': student.pk})

        # Semestre 7 (invalido)
        sem_invalid = {
            'numero': 7,
            'fecha_inicio': '2027-01-01',
            'fecha_fin': '2027-06-30',
        }
        res = self.client.post(semesters_url, sem_invalid, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('numero', res.data)

        # Semestre 0 (invalido)
        sem_zero = {
            'numero': 0,
            'fecha_inicio': '2024-01-01',
            'fecha_fin': '2024-06-30',
        }
        res_zero = self.client.post(semesters_url, sem_zero, format='json')
        self.assertEqual(res_zero.status_code, status.HTTP_400_BAD_REQUEST)

    def test_semester_invalid_date_range_fails(self):
        student = Student.objects.create(**self.student_data)
        semesters_url = reverse('students:student-semesters', kwargs={'pk': student.pk})

        invalid_dates = {
            'numero': 2,
            'fecha_inicio': '2024-06-30',
            'fecha_fin': '2024-01-01',  # fin antes de inicio
        }
        res = self.client.post(semesters_url, invalid_dates, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('fecha_fin', res.data)

    def test_delete_student_v2_response(self):
        student = Student.objects.create(**self.student_data)
        url = reverse('students:student-detail', kwargs={'pk': student.pk})

        res = self.client.delete(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['success'])
        self.assertEqual(res.data['details'], 'Recurso eliminado correctamente')
        self.assertFalse(Student.objects.filter(pk=student.pk).exists())

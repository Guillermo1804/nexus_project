from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase, APIRequestFactory
from apps.students.models import Student, AcademicCommittee
from apps.students.views import StudentViewSet


class StudentRBACRelationVisibilityTests(APITestCase):
    def setUp(self):
        self.user_model = get_user_model()
        self.factory = APIRequestFactory()

        # Users
        self.coordinator = self.user_model.objects.create_user(
            email='coord@test.edu', password='Password123!', role=self.user_model.Role.PROGRAM_COORDINATOR
        )
        self.admin = self.user_model.objects.create_user(
            email='admin@test.edu', password='Password123!', role=self.user_model.Role.SYSTEM_ADMIN
        )
        self.tutor_1 = self.user_model.objects.create_user(
            email='tutor1@test.edu', password='Password123!', role=self.user_model.Role.TUTOR
        )
        self.tutor_2 = self.user_model.objects.create_user(
            email='tutor2@test.edu', password='Password123!', role=self.user_model.Role.TUTOR
        )
        self.student_user_1 = self.user_model.objects.create_user(
            email='student1@test.edu', password='Password123!', role=self.user_model.Role.STUDENT
        )
        self.student_user_2 = self.user_model.objects.create_user(
            email='student2@test.edu', password='Password123!', role=self.user_model.Role.STUDENT
        )

        # Students
        self.student_1 = Student.objects.create(
            user=self.student_user_1, matricula='DOC-001', nombre_completo='Estudiante Uno', cohorte='2026-A'
        )
        self.student_2 = Student.objects.create(
            user=self.student_user_2, matricula='DOC-002', nombre_completo='Estudiante Dos', cohorte='2026-A'
        )

        # Assign tutor_1 to student_1
        self.assignment = AcademicCommittee.objects.create(
            student=self.student_1,
            user=self.tutor_1,
            rol_comite=AcademicCommittee.Role.PRINCIPAL_ADVISOR,
            is_active=True,
        )

    def test_coordinator_and_admin_see_all_students(self):
        token = Token.objects.create(user=self.coordinator)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        res = self.client.get('/api/v1/students/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 2)

        admin_token = Token.objects.create(user=self.admin)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {admin_token.key}')
        res = self.client.get('/api/v1/students/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 2)

    def test_tutor_sees_only_assigned_students(self):
        token = Token.objects.create(user=self.tutor_1)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        res = self.client.get('/api/v1/students/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['id'], self.student_1.id)
        self.assertEqual(res.data[0]['matricula'], 'DOC-001')

    def test_unassigned_tutor_sees_empty_list(self):
        token = Token.objects.create(user=self.tutor_2)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        res = self.client.get('/api/v1/students/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 0)

    def test_deactivated_assignment_not_visible_to_tutor(self):
        self.assignment.is_active = False
        self.assignment.save()

        token = Token.objects.create(user=self.tutor_1)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        res = self.client.get('/api/v1/students/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 0)

    def test_student_sees_only_own_record(self):
        token = Token.objects.create(user=self.student_user_1)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        res = self.client.get('/api/v1/students/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['id'], self.student_1.id)

    def test_get_queryset_direct_filtering(self):
        view = StudentViewSet()
        req = self.factory.get('/api/v1/students/')
        req.user = self.tutor_1
        view.request = req
        qs = view.get_queryset()
        self.assertEqual(list(qs), [self.student_1])

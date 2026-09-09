from django.contrib.auth import get_user_model
from datetime import date
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from .models import AcademicCommittee, Semester, Student, TutoringSession


class AuthenticationApiTests(APITestCase):
    def setUp(self):
        self.user_model = get_user_model()
        self.password = 'Correcta-12345'
        self.user = self.user_model.objects.create_user(
            email='alumno@example.com',
            password=self.password,
            first_name='Ana',
            last_name='Lopez',
            role=self.user_model.Role.STUDENT,
        )

    def test_login_returns_token_and_minimal_user_data(self):
        response = self.client.post(
            '/api/auth/login/',
            {'email': self.user.email, 'password': self.password},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn('token', response.data)
        self.assertEqual(response.data['role'], 'STUDENT')
        self.assertEqual(response.data['email'], self.user.email)
        self.assertNotIn('password', response.data)

    def test_session_profile_includes_effective_permissions(self):
        token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

        response = self.client.get('/api/auth/me/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['roles'], ['STUDENT'])
        self.assertEqual(response.data['permissions'], ['records.read.own'])

    def test_only_role_manager_can_list_and_assign_roles(self):
        token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        forbidden = self.client.get('/api/auth/users/')
        self.assertEqual(forbidden.status_code, 403)

        admin = self.user_model.objects.create_user(
            email='admin@example.com',
            password=self.password,
            first_name='Admin',
            last_name='Nexus',
            role=self.user_model.Role.ACADEMIC_ADMIN,
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {Token.objects.create(user=admin).key}')
        listed = self.client.get('/api/auth/users/')
        self.assertEqual(listed.status_code, 200)
        updated = self.client.patch(
            f'/api/auth/users/{self.user.id}/role/',
            {'role': self.user_model.Role.TUTOR},
            format='json',
        )

        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.data['role'], 'TUTOR')
        self.assertEqual(updated.data['permissions'], ['tutoring.create'])

    def test_invalid_credentials_use_generic_error(self):
        response = self.client.post(
            '/api/auth/login/',
            {'email': self.user.email, 'password': 'incorrecta'},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['non_field_errors'][0], 'Correo o contrasena incorrectos.')

    def test_inactive_user_cannot_login(self):
        self.user.is_active = False
        self.user.save(update_fields=['is_active'])

        response = self.client.post(
            '/api/auth/login/',
            {'email': self.user.email, 'password': self.password},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['non_field_errors'][0], 'Correo o contrasena incorrectos.')

    def test_me_requires_a_valid_token(self):
        token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

        response = self.client.get('/api/auth/me/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['email'], self.user.email)

    def test_logout_revokes_token(self):
        token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

        logout_response = self.client.post('/api/auth/logout/', {}, format='json')
        protected_response = self.client.get('/api/auth/me/')

        self.assertEqual(logout_response.status_code, 200)
        self.assertEqual(logout_response.data, {'logout': True})
        self.assertEqual(protected_response.status_code, 401)

    def test_register_creates_student_and_returns_authenticated_session(self):
        response = self.client.post(
            '/api/auth/register/',
            {
                'first_name': 'Luis',
                'last_name': 'Gomez',
                'email': 'luis@example.com',
                'password': 'Segura-12345',
                'matricula': 'DOC-001',
                'programa_doctoral': 'Doctorado en Ciencias',
                'cohorte': '2026',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['role'], 'STUDENT')
        self.assertIn('token', response.data)
        user = self.user_model.objects.get(email='luis@example.com')
        student = Student.objects.get(user=user)
        self.assertEqual(student.matricula, 'DOC-001')

    def test_register_rejects_duplicate_email_and_matricula(self):
        response = self.client.post(
            '/api/auth/register/',
            {
                'first_name': 'Otra',
                'last_name': 'Persona',
                'email': self.user.email,
                'password': 'Segura-12345',
                'matricula': 'DOC-001',
                'programa_doctoral': 'Doctorado en Ciencias',
                'cohorte': '2026',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('email', response.data)


class ScopeAuthorizationApiTests(APITestCase):
    def setUp(self):
        self.user_model = get_user_model()
        self.student_user = self.user_model.objects.create_user(
            email='student@example.com', password='Correcta-12345', first_name='Ana', last_name='Lopez',
            role=self.user_model.Role.STUDENT,
        )
        self.other_student_user = self.user_model.objects.create_user(
            email='other@example.com', password='Correcta-12345', first_name='Luis', last_name='Gomez',
            role=self.user_model.Role.STUDENT,
        )
        self.tutor = self.user_model.objects.create_user(
            email='tutor@example.com', password='Correcta-12345', first_name='Eva', last_name='Diaz',
            role=self.user_model.Role.TUTOR,
        )
        self.coordinator = self.user_model.objects.create_user(
            email='coordinator@example.com', password='Correcta-12345', first_name='Celia', last_name='Ruiz',
            role=self.user_model.Role.PROGRAM_COORDINATOR,
        )
        self.student = Student.objects.create(
            user=self.student_user,
            matricula='DOC-001',
            nombre_completo='Ana Lopez',
            cohorte='2026',
        )
        self.other_student = Student.objects.create(
            user=self.other_student_user,
            matricula='DOC-002',
            nombre_completo='Luis Gomez',
            cohorte='2026',
        )
        self.semester = Semester.objects.create(
            student=self.student,
            numero=1,
            fecha_inicio=date(2026, 1, 1),
            fecha_fin=date(2026, 6, 30),
        )
        self.other_semester = Semester.objects.create(
            student=self.other_student,
            numero=1,
            fecha_inicio=date(2026, 1, 1),
            fecha_fin=date(2026, 6, 30),
        )

    def authenticate(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {Token.objects.create(user=user).key}')

    def test_student_can_read_only_own_record(self):
        self.authenticate(self.student_user)
        own_response = self.client.get(f'/api/records/{self.student.id}/')
        other_response = self.client.get(f'/api/records/{self.other_student.id}/')

        self.assertEqual(own_response.status_code, 200)
        self.assertEqual(other_response.status_code, 404)

    def test_assigned_committee_member_and_coordinator_can_read_record(self):
        committee_member = self.user_model.objects.create_user(
            email='committee@example.com', password='Correcta-12345', first_name='Mia', last_name='Soto',
            role=self.user_model.Role.COMMITTEE_MEMBER,
        )
        AcademicCommittee.objects.create(
            student=self.student,
            user=committee_member,
            rol_comite=AcademicCommittee.Role.PRINCIPAL_ADVISOR,
        )

        self.authenticate(committee_member)
        self.assertEqual(self.client.get(f'/api/records/{self.student.id}/').status_code, 200)

        self.authenticate(self.coordinator)
        self.assertEqual(self.client.get(f'/api/records/{self.student.id}/').status_code, 200)

    def test_tutor_can_create_session_only_for_assigned_student(self):
        AcademicCommittee.objects.create(
            student=self.student,
            user=self.tutor,
            rol_comite=AcademicCommittee.Role.PRINCIPAL_ADVISOR,
        )
        self.authenticate(self.tutor)
        payload = {
            'student': self.student.id,
            'semester': self.semester.id,
            'fecha_sesion': '2026-02-15',
            'modalidad': 'VIRTUAL',
            'resumen': 'Seguimiento del avance.',
        }
        allowed = self.client.post('/api/tutoring/', payload, format='json')
        payload['student'] = self.other_student.id
        payload['semester'] = self.other_semester.id
        denied = self.client.post('/api/tutoring/', payload, format='json')

        self.assertEqual(allowed.status_code, 201)
        self.assertEqual(denied.status_code, 403)
        self.assertEqual(TutoringSession.objects.count(), 1)

    def test_tutor_cannot_use_another_students_semester(self):
        AcademicCommittee.objects.create(
            student=self.student,
            user=self.tutor,
            rol_comite=AcademicCommittee.Role.PRINCIPAL_ADVISOR,
        )
        self.authenticate(self.tutor)
        response = self.client.post('/api/tutoring/', {
            'student': self.student.id,
            'semester': self.other_semester.id,
            'fecha_sesion': '2026-02-15',
            'modalidad': 'VIRTUAL',
            'resumen': 'Seguimiento.',
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertEqual(TutoringSession.objects.count(), 0)

    def test_only_coordinator_can_read_global_academic_overview(self):
        self.authenticate(self.coordinator)
        allowed = self.client.get('/api/academic/overview/')
        self.assertEqual(allowed.status_code, 200)
        self.assertEqual(len(allowed.data), 2)

        self.authenticate(self.student_user)
        denied = self.client.get('/api/academic/overview/')
        self.assertEqual(denied.status_code, 403)
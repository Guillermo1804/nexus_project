from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from .models import Student


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
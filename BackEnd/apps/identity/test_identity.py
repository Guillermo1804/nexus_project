from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()


class IdentityModelTests(TestCase):
    def setUp(self):
        self.email = 'coordinador@nexus.edu.mx'
        self.password = 'NexusPass2025!'

    def test_create_regular_user(self):
        user = User.objects.create_user(
            email='estudiante@nexus.edu.mx',
            password=self.password,
            first_name='Juan',
            last_name='Perez'
        )
        self.assertEqual(user.email, 'estudiante@nexus.edu.mx')
        self.assertEqual(user.first_name, 'Juan')
        self.assertEqual(user.last_name, 'Perez')
        self.assertEqual(user.get_full_name(), 'Juan Perez')
        self.assertEqual(user.role, 'ESTUDIANTE')
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertTrue(user.check_password(self.password))

    def test_create_user_without_email_raises_error(self):
        with self.assertRaises(ValueError):
            User.objects.create_user(email='', password=self.password, first_name='Test', last_name='User')

    def test_create_superuser(self):
        superuser = User.objects.create_superuser(
            email='admin@nexus.edu.mx',
            password=self.password,
            first_name='Admin',
            last_name='Root'
        )
        self.assertEqual(superuser.email, 'admin@nexus.edu.mx')
        self.assertEqual(superuser.role, 'COORDINADOR')
        self.assertTrue(superuser.is_staff)
        self.assertTrue(superuser.is_superuser)
        self.assertTrue(superuser.is_active)


class IdentityAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.password = 'SuperSecret123!'
        self.user = User.objects.create_user(
            email='asesor@nexus.edu.mx',
            password=self.password,
            first_name='Carlos',
            last_name='Santana',
            role='ASESOR'
        )
        self.login_url = reverse('identity:auth_login')
        self.refresh_url = reverse('identity:token_refresh')
        self.me_url = reverse('identity:auth_me')

    def test_login_successful_returns_jwt_and_user_payload(self):
        payload = {
            'email': 'asesor@nexus.edu.mx',
            'password': self.password
        }
        response = self.client.post(self.login_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['email'], 'asesor@nexus.edu.mx')
        self.assertEqual(response.data['user']['role'], 'ASESOR')
        self.assertEqual(response.data['user']['full_name'], 'Carlos Santana')

    def test_login_invalid_credentials_returns_401(self):
        payload = {
            'email': 'asesor@nexus.edu.mx',
            'password': 'WrongPassword123'
        }
        response = self.client.post(self.login_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_refresh(self):
        login_resp = self.client.post(self.login_url, {'email': self.user.email, 'password': self.password}, format='json')
        refresh_token = login_resp.data['refresh']

        refresh_resp = self.client.post(self.refresh_url, {'refresh': refresh_token}, format='json')
        self.assertEqual(refresh_resp.status_code, status.HTTP_200_OK)
        self.assertIn('access', refresh_resp.data)

    def test_me_endpoint_authenticated(self):
        login_resp = self.client.post(self.login_url, {'email': self.user.email, 'password': self.password}, format='json')
        access_token = login_resp.data['access']

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], self.user.email)
        self.assertEqual(response.data['full_name'], 'Carlos Santana')
        self.assertEqual(response.data['role'], 'ASESOR')

    def test_me_endpoint_unauthenticated_returns_401(self):
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

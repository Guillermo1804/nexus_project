from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase
from apps.students.models import Student


class AuthenticationApiTests(APITestCase):
    password = 'correct-horse-battery-staple'

    def create_user(self, *, email='user@example.com', active=True, with_role=True):
        user = get_user_model().objects.create_user(
            email=email,
            password=self.password,
            first_name='Test',
            last_name='User',
            is_active=active,
        )
        if not with_role:
            user.role = ''
            user.save(update_fields=['role'])
        return user

    def test_active_user_can_log_in_with_email_and_log_out(self):
        user = self.create_user()
        login = self.client.post(
            reverse('auth-login'),
            {'email': user.email, 'password': self.password},
            format='json',
        )

        self.assertEqual(login.status_code, 200)
        self.assertEqual(login.data['email'], user.email)
        self.assertEqual(login.data['rol'], 'STUDENT')
        token = login.data['token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        self.assertEqual(self.client.get(reverse('auth-current-user')).status_code, 200)
        self.assertEqual(self.client.post(reverse('auth-logout')).status_code, 200)
        self.assertFalse(Token.objects.filter(key=token).exists())
        self.assertEqual(self.client.get(reverse('auth-current-user')).status_code, 401)

    def test_invalid_credentials_use_a_generic_response(self):
        self.create_user()
        response = self.client.post(
            reverse('auth-login'),
            {'email': 'user@example.com', 'password': 'incorrect'},
            format='json',
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data['detail'], 'Invalid credentials.')

    def test_inactive_user_is_indistinguishable_from_invalid_credentials(self):
        self.create_user(email='inactive@example.com', active=False)
        response = self.client.post(
            reverse('auth-login'),
            {'email': 'inactive@example.com', 'password': self.password},
            format='json',
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data['detail'], 'Invalid credentials.')

    def test_user_without_role_cannot_receive_a_token(self):
        user = self.create_user(email='no-role@example.com', with_role=False)
        response = self.client.post(
            reverse('auth-login'),
            {'email': user.email, 'password': self.password},
            format='json',
        )

        self.assertEqual(response.status_code, 403)
        self.assertFalse(Token.objects.filter(user=user).exists())

    def test_logout_requires_a_valid_token(self):
        self.assertEqual(self.client.post(reverse('auth-logout')).status_code, 401)

    def test_registration_creates_an_active_student_with_a_token(self):
        response = self.client.post(
            reverse('auth-register'),
            {
                'first_name': 'Ana',
                'last_name': 'Lopez',
                'email': 'ana@example.com',
                'password': self.password,
                'matricula': '20260001',
                'cohorte': '2026-A',
            },
            format='json',
        )

        user = get_user_model().objects.get(email='ana@example.com')
        self.assertEqual(response.status_code, 201)
        self.assertTrue(user.is_active)
        self.assertEqual(user.role, 'STUDENT')
        self.assertEqual(user.student_profile.matricula, '20260001')
        self.assertTrue(Token.objects.filter(user=user, key=response.data['token']).exists())

    def test_registration_rejects_an_existing_email(self):
        self.create_user()
        response = self.client.post(
            reverse('auth-register'),
            {
                'first_name': 'Test',
                'last_name': 'User',
                'email': 'user@example.com',
                'password': self.password,
                'matricula': '20260002',
                'cohorte': '2026-A',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(get_user_model().objects.filter(email__iexact='user@example.com').count(), 1)

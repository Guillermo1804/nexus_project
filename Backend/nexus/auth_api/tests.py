import json

from django.contrib.auth import get_user_model
from django.test import TestCase


class AuthenticationApiTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username='usuario.ejemplo',
            password='Contrasena-segura-123',
            is_staff=True,
        )

    def test_login_returns_minimum_user_and_creates_session(self):
        response = self.client.post(
            '/api/auth/login/',
            data=json.dumps({'username': 'usuario.ejemplo', 'password': 'Contrasena-segura-123'}),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {
            'authenticated': True,
            'user': {'id': self.user.id, 'username': 'usuario.ejemplo', 'is_staff': True},
        })
        self.assertTrue(response.wsgi_request.user.is_authenticated)

    def test_invalid_credentials_use_uniform_response(self):
        invalid_password = self.client.post(
            '/api/auth/login/',
            data=json.dumps({'username': 'usuario.ejemplo', 'password': 'incorrecta'}),
            content_type='application/json',
        )
        unknown_user = self.client.post(
            '/api/auth/login/',
            data=json.dumps({'username': 'no-existe', 'password': 'incorrecta'}),
            content_type='application/json',
        )

        self.assertEqual(invalid_password.status_code, 401)
        self.assertEqual(unknown_user.status_code, 401)
        self.assertEqual(invalid_password.json(), {'detail': 'Credenciales invalidas.'})
        self.assertEqual(unknown_user.json(), invalid_password.json())

    def test_inactive_user_cannot_login(self):
        self.user.is_active = False
        self.user.save(update_fields=['is_active'])

        response = self.client.post(
            '/api/auth/login/',
            data=json.dumps({'username': 'usuario.ejemplo', 'password': 'Contrasena-segura-123'}),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json(), {'detail': 'Credenciales invalidas.'})

    def test_session_and_logout_invalidate_access(self):
        self.client.force_login(self.user)

        session_response = self.client.get('/api/auth/session/')
        logout_response = self.client.post('/api/auth/logout/')
        after_logout = self.client.get('/api/auth/session/')

        self.assertEqual(session_response.status_code, 200)
        self.assertEqual(logout_response.status_code, 204)
        self.assertEqual(after_logout.status_code, 401)
        self.assertEqual(after_logout.json(), {'detail': 'No autenticado.'})
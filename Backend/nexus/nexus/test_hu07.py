from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import AcademicCommittee, CommitteeMembership, Semester, Student, TutoringSession
from .tests import jwt_for


class TutoringSessionHu07Tests(APITestCase):
    def setUp(self):
        users = get_user_model()
        self.tutor = users.objects.create_user(email='hu07-tutor@test.edu', password='x', role=users.Role.TUTOR)
        self.other = users.objects.create_user(email='hu07-other@test.edu', password='x', role=users.Role.TUTOR)
        self.student = Student.objects.create(matricula='HU07', nombre_completo='HU 07', cohorte='2026')
        self.semester = Semester.objects.create(student=self.student, numero=1, fecha_inicio=date(2026, 1, 1), fecha_fin=date(2026, 6, 30))
        CommitteeMembership.objects.create(committee=AcademicCommittee.objects.create(student=self.student), user=self.tutor, role=CommitteeMembership.Role.ADVISOR)
        self.url = '/api/v1/tutoring-sessions/'
        self.payload = {'student': self.student.id, 'semester': self.semester.id, 'fecha_sesion': '2026-02-01', 'modalidad': 'PRESENCIAL', 'resumen': 'Seguimiento'}

    def auth(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(user)}')

    def test_assigned_tutor_can_crud_session_on_real_v1_endpoint(self):
        self.auth(self.tutor)
        created = self.client.post(self.url, self.payload, format='json')
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.data['created_by'], self.tutor.id)
        self.assertIn('created_at', created.data)
        self.assertEqual(created.data['participants'], [])
        self.assertEqual(created.data['observations'], [])
        self.assertEqual(created.data['agreements'], [])
        detail = f"{self.url}{created.data['id']}/"
        self.assertEqual(self.client.get(detail).status_code, 200)
        self.assertEqual(self.client.patch(detail, {'resumen': 'Actualizado'}, format='json').status_code, 200)
        self.assertEqual(self.client.delete(detail).status_code, 204)
        self.assertFalse(TutoringSession.objects.exists())

    def test_rejects_foreign_or_inactive_semester(self):
        self.auth(self.tutor)
        other_student = Student.objects.create(matricula='HU07-2', nombre_completo='HU 07 2', cohorte='2026')
        foreign_semester = Semester.objects.create(student=other_student, numero=1, fecha_inicio=date(2026, 1, 1), fecha_fin=date(2026, 6, 30))
        response = self.client.post(self.url, {**self.payload, 'semester': foreign_semester.id}, format='json')
        self.assertEqual(response.status_code, 400)

        self.semester.is_active = False
        self.semester.save(update_fields=['is_active'])
        response = self.client.post(self.url, self.payload, format='json')
        self.assertEqual(response.status_code, 400)

    def test_rejects_invalid_session_date_and_summary(self):
        self.auth(self.tutor)
        cases = (
            {'fecha_sesion': (timezone.localdate() + timedelta(days=1)).isoformat()},
            {'fecha_sesion': '2025-12-31'},
            {'resumen': 'corto'},
            {'resumen': 'x' * 2001},
        )
        for changes in cases:
            with self.subTest(changes=changes):
                response = self.client.post(self.url, {**self.payload, **changes}, format='json')
                self.assertEqual(response.status_code, 400)

    def test_created_by_is_immutable_on_update(self):
        self.auth(self.tutor)
        created = self.client.post(self.url, self.payload, format='json')
        detail = f"{self.url}{created.data['id']}/"
        response = self.client.patch(
            detail,
            {'created_by': self.other.id, 'resumen': 'Resumen actualizado'},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        retrieved = self.client.get(detail)
        self.assertEqual(retrieved.data['created_by'], self.tutor.id)
        self.assertEqual(TutoringSession.objects.get().created_by_id, self.tutor.id)

    def test_unassigned_tutor_cannot_list_create_or_mutate_sessions(self):
        self.auth(self.tutor)
        session = TutoringSession.objects.create(created_by=self.tutor, **{**self.payload, 'student': self.student, 'semester': self.semester, 'fecha_sesion': date(2026, 2, 1)})
        self.auth(self.other)
        self.assertEqual(self.client.get(self.url).data['results'], [])
        self.assertEqual(self.client.post(self.url, self.payload, format='json').status_code, 403)
        for method in ('get', 'patch', 'delete'):
            with self.subTest(method=method):
                self.assertEqual(getattr(self.client, method)(f'{self.url}{session.id}/', {}, format='json').status_code, 404)

    def test_nested_actions_exist_only_below_canonical_v1_session_url(self):
        self.auth(self.tutor)
        session = TutoringSession.objects.create(created_by=self.tutor, student=self.student, semester=self.semester, fecha_sesion=date(2026, 2, 1), modalidad='VIRTUAL', resumen='R')
        for action in ('participants', 'observations', 'agreements'):
            self.assertEqual(self.client.get(f'{self.url}{session.id}/{action}/').status_code, 200)
        self.assertEqual(self.client.get(f'/api/tutoring-sessions/{session.id}/participants/').status_code, 404)

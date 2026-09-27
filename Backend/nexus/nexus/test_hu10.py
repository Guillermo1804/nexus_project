from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import AcademicCommittee, CommitteeMembership, Semester, Student
from .tests import jwt_for


class NextMeetingHu10Tests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(
            email='t10@x.co',
            password='x',
            role=user_model.Role.TUTOR,
        )
        self.student = Student.objects.create(
            matricula='HU10',
            nombre_completo='Estudiante HU-10',
            cohorte='26',
        )
        session_date = timezone.localdate() + timedelta(days=1)
        self.semester = Semester.objects.create(
            student=self.student,
            numero=1,
            fecha_inicio=timezone.localdate(),
            fecha_fin=session_date + timedelta(days=180),
        )
        CommitteeMembership.objects.create(
            committee=AcademicCommittee.objects.create(student=self.student),
            user=self.user,
            role='ASESOR',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(self.user)}')
        self.url = '/api/v1/tutoring-sessions/'
        self.session_date = session_date
        self.base = {
            'student': self.student.id,
            'semester': self.semester.id,
            'fecha_sesion': str(session_date),
            'modalidad': 'VIRTUAL',
            'resumen': 'Resumen válido de la sesión de tutoría.',
        }

    def test_next_meeting_must_be_after_session_and_notes_require_date(self):
        same_date = self.client.post(
            self.url,
            {**self.base, 'proxima_reunion_fecha': str(self.session_date)},
            format='json',
        )
        self.assertEqual(same_date.status_code, 400)

        notes_without_date = self.client.post(
            self.url,
            {**self.base, 'proxima_reunion_notas': 'Agenda'},
            format='json',
        )
        self.assertEqual(notes_without_date.status_code, 400)

        next_date = self.session_date + timedelta(days=1)
        ok = self.client.post(
            self.url,
            {
                **self.base,
                'proxima_reunion_fecha': str(next_date),
                'proxima_reunion_notas': 'Agenda',
            },
            format='json',
        )
        self.assertEqual(ok.status_code, 201)
        self.assertEqual(ok.data['proxima_reunion_fecha'], str(next_date))

    def test_next_meeting_can_be_added_and_updated_with_patch(self):
        created = self.client.post(self.url, self.base, format='json')
        self.assertEqual(created.status_code, 201)
        detail_url = f"{self.url}{created.data['id']}/"

        first_date = self.session_date + timedelta(days=7)
        added = self.client.patch(
            detail_url,
            {
                'proxima_reunion_fecha': str(first_date),
                'proxima_reunion_notas': 'Preparar el primer avance.',
            },
            format='json',
        )
        self.assertEqual(added.status_code, 200)
        self.assertEqual(added.data['proxima_reunion_fecha'], str(first_date))

        second_date = self.session_date + timedelta(days=14)
        updated = self.client.patch(
            detail_url,
            {
                'proxima_reunion_fecha': str(second_date),
                'proxima_reunion_notas': 'Preparar el segundo avance.',
            },
            format='json',
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.data['proxima_reunion_fecha'], str(second_date))

    def test_patch_rejects_invalid_date_notes_without_date_and_long_notes(self):
        created = self.client.post(self.url, self.base, format='json')
        self.assertEqual(created.status_code, 201)
        detail_url = f"{self.url}{created.data['id']}/"

        past_date = self.client.patch(
            detail_url,
            {'proxima_reunion_fecha': str(timezone.localdate() - timedelta(days=1))},
            format='json',
        )
        self.assertEqual(past_date.status_code, 400)
        self.assertIn('fecha futura', past_date.data['proxima_reunion_fecha'][0])

        today = self.client.patch(
            detail_url,
            {'proxima_reunion_fecha': str(timezone.localdate())},
            format='json',
        )
        self.assertEqual(today.status_code, 400)
        self.assertIn('fecha futura', today.data['proxima_reunion_fecha'][0])

        invalid_date = self.client.patch(
            detail_url,
            {'proxima_reunion_fecha': str(self.session_date)},
            format='json',
        )
        self.assertEqual(invalid_date.status_code, 400)

        notes_without_date = self.client.patch(
            detail_url,
            {'proxima_reunion_notas': 'Agenda'},
            format='json',
        )
        self.assertEqual(notes_without_date.status_code, 400)

        too_long = self.client.patch(
            detail_url,
            {
                'proxima_reunion_fecha': str(self.session_date + timedelta(days=1)),
                'proxima_reunion_notas': 'a' * 501,
            },
            format='json',
        )
        self.assertEqual(too_long.status_code, 400)
        self.assertIn('proxima_reunion_notas', too_long.data)

from datetime import date

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from .models import AcademicCommittee, CommitteeMembership, Semester, Student, ThesisProgress
from .tests import jwt_for


class ThesisProgressHu15Tests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.student_user = user_model.objects.create_user(email='student15@example.com', password='x', first_name='Ana', last_name='Pérez')
        self.other_user = user_model.objects.create_user(email='other15@example.com', password='x')
        self.student = Student.objects.create(user=self.student_user, matricula='HU15', nombre_completo='Ana Pérez', cohorte='2026')
        self.semester = Semester.objects.create(student=self.student, numero=1, fecha_inicio=date(2026, 1, 1), fecha_fin=date(2026, 6, 30), is_active=True)
        self.url = '/api/v1/thesis/'
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(self.student_user)}')

    def payload(self, **changes):
        data = {
            'student': self.student.id,
            'semester': self.semester.id,
            'porcentaje_avance': 35,
            'observaciones': 'Avance del semestre.',
            'componentes_json': {'protocolo': 100, 'marco_teorico': 80},
        }
        data.update(changes)
        return data

    def test_creates_progress_with_components(self):
        response = self.client.post(self.url, self.payload(), format='json')
        self.assertEqual(response.status_code, 201)
        # Global calculado: (100 + 80) / 6 componentes = 30.
        self.assertEqual(response.data['porcentaje_avance'], 30)
        self.assertEqual(response.data['componentes_json']['protocolo'], 100)
        self.assertEqual(response.data['registrado_por'], self.student_user.id)
        self.assertEqual(response.data['registrado_por_nombre'], 'Ana Pérez')

    def test_global_is_computed_and_client_value_is_ignored(self):
        for enviado in (-1, 35, 99, 101):
            with self.subTest(enviado=enviado):
                response = self.client.post(self.url, self.payload(porcentaje_avance=enviado), format='json')
                self.assertEqual(response.status_code, 201)
                self.assertEqual(response.data['porcentaje_avance'], 30)
        full = self.client.post(self.url, self.payload(componentes_json=dict.fromkeys(
            ('protocolo', 'marco_teorico', 'metodologia', 'recoleccion_datos', 'analisis_resultados', 'redaccion_capitulos'), 100)), format='json')
        self.assertEqual(full.data['porcentaje_avance'], 100)
        vacio = self.client.post(self.url, self.payload(componentes_json={}), format='json')
        self.assertEqual(vacio.data['porcentaje_avance'], 0)

    def test_rejects_invalid_component_values(self):
        for value in ('abc', 150):
            with self.subTest(value=value):
                response = self.client.post(self.url, self.payload(componentes_json={'protocolo': value}), format='json')
                self.assertEqual(response.status_code, 400)

    def test_rejects_foreign_semester(self):
        other_student = Student.objects.create(matricula='HU15B', nombre_completo='Otra', cohorte='2026')
        semester = Semester.objects.create(student=other_student, numero=1, fecha_inicio=date(2026, 1, 1), fecha_fin=date(2026, 6, 30))
        self.assertEqual(self.client.post(self.url, self.payload(semester=semester.id), format='json').status_code, 400)

    def test_rejects_unrelated_user_and_accepts_committee_member(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(self.other_user)}')
        self.assertEqual(self.client.post(self.url, self.payload(), format='json').status_code, 403)
        CommitteeMembership.objects.create(committee=AcademicCommittee.objects.create(student=self.student), user=self.other_user, role='ASESOR')
        self.assertEqual(self.client.post(self.url, self.payload(), format='json').status_code, 201)

    def test_latest_returns_null_then_most_recent_progress(self):
        latest_url = f'{self.url}latest/?student={self.student.id}'
        response = self.client.get(latest_url)
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data)
        first = self.client.post(self.url, self.payload(porcentaje_avance=20), format='json')
        segundo = self.payload()
        segundo['componentes_json'] = {'protocolo': 100, 'marco_teorico': 80, 'metodologia': 60}
        second = self.client.post(self.url, segundo, format='json')
        self.assertEqual(ThesisProgress.objects.filter(student=self.student).count(), 2)
        self.assertNotEqual(first.data['id'], second.data['id'])
        self.assertEqual(self.client.get(latest_url).data['id'], second.data['id'])
        # Global del segundo registro recalculado: (100 + 80 + 60) / 6 = 40.
        self.assertEqual(self.client.get(latest_url).data['porcentaje_avance'], 40)

    def test_uses_active_semester_when_omitted(self):
        payload = self.payload()
        del payload['semester']
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['semester'], self.semester.id)

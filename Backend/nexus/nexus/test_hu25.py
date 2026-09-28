from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import AcademicCommittee, Agreement, CommitteeMembership, Student
from .tests import jwt_for


class AgreementAlertsHu25Tests(APITestCase):
    url = '/api/v1/monitoring/alerts/agreements/'

    def setUp(self):
        users = get_user_model()
        self.owner = users.objects.create_user(
            email='student25@example.com', password='x', first_name='Ana', last_name='Pérez', role=users.Role.STUDENT,
        )
        self.other = users.objects.create_user(
            email='other25@example.com', password='x', first_name='Otro', last_name='Alumno', role=users.Role.STUDENT,
        )
        self.committee_user = users.objects.create_user(
            email='committee25@example.com', password='x', first_name='Roberto', last_name='Gómez', role=users.Role.TUTOR,
        )
        self.coordinator = users.objects.create_user(
            email='coordinator25@example.com', password='x', role=users.Role.PROGRAM_COORDINATOR,
        )
        self.student = Student.objects.create(
            user=self.owner, matricula='HU25', nombre_completo='Ana Pérez', cohorte='2026',
        )
        self.other_student = Student.objects.create(
            user=self.other, matricula='HU25B', nombre_completo='Otro Alumno', cohorte='2026',
        )
        committee = AcademicCommittee.objects.create(student=self.student)
        CommitteeMembership.objects.create(
            committee=committee, user=self.committee_user, role=CommitteeMembership.Role.ADVISOR,
        )
        self.today = timezone.localdate()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(self.owner)}')

    def create_agreement(self, *, student=None, days=0, status=Agreement.Status.PENDING, description='Acuerdo'):
        return Agreement.objects.create(
            student=student or self.student,
            descripcion=description,
            responsable=(student or self.student).user,
            fecha_limite=self.today + timedelta(days=days),
            estado=status,
        )

    def test_classifies_overdue_and_four_day_alert_and_returns_counts_in_order(self):
        overdue = self.create_agreement(days=-3, description='Vencido')
        upcoming = self.create_agreement(days=4, description='Próximo')

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['total_alertas'], 2)
        self.assertEqual(response.data['vencidos_count'], 1)
        self.assertEqual(response.data['proximos_vencer_count'], 1)
        self.assertEqual([item['agreement_id'] for item in response.data['alertas']], [overdue.id, upcoming.id])
        self.assertEqual(response.data['alertas'][0]['nivel'], 'CRITICO')
        self.assertEqual(response.data['alertas'][0]['dias_retraso'], 3)
        self.assertEqual(response.data['alertas'][1]['nivel'], 'ADVERTENCIA')
        self.assertEqual(response.data['alertas'][1]['dias_restantes'], 4)
        self.assertEqual(response.data['alertas'][0]['student_nombre'], 'Ana Pérez')
        self.assertEqual(response.data['alertas'][0]['responsable_nombre'], 'Ana Pérez')

    def test_excludes_fifteen_day_and_completed_agreements(self):
        self.create_agreement(days=15, description='Normal')
        self.create_agreement(days=-2, status=Agreement.Status.COMPLETED, description='Concluido vencido')
        self.create_agreement(days=2, status=Agreement.Status.COMPLETED, description='Concluido próximo')

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['total_alertas'], 0)
        self.assertEqual(response.data['alertas'], [])

    def test_owner_and_committee_see_related_alerts_but_unrelated_student_does_not(self):
        related = self.create_agreement(days=-1)
        unrelated = self.create_agreement(student=self.other_student, days=-2)
        self.assertEqual([item['agreement_id'] for item in self.client.get(self.url).data['alertas']], [related.id])

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(self.committee_user)}')
        self.assertEqual([item['agreement_id'] for item in self.client.get(self.url).data['alertas']], [related.id])

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(self.other)}')
        self.assertEqual([item['agreement_id'] for item in self.client.get(self.url).data['alertas']], [unrelated.id])

    def test_coordinator_sees_global_alerts_and_student_filter(self):
        related = self.create_agreement(days=1)
        other = self.create_agreement(student=self.other_student, days=-1)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(self.coordinator)}')

        response = self.client.get(self.url)
        self.assertEqual(response.data['total_alertas'], 2)
        self.assertEqual(response.data['vencidos_count'], 1)
        self.assertEqual(response.data['proximos_vencer_count'], 1)
        self.assertEqual([item['agreement_id'] for item in response.data['alertas']], [other.id, related.id])

        filtered = self.client.get(f'{self.url}?student={self.student.id}')
        self.assertEqual([item['agreement_id'] for item in filtered.data['alertas']], [related.id])

    def test_requires_authentication_and_uses_bounded_queries(self):
        self.create_agreement(days=0)
        self.client.credentials()
        self.assertEqual(self.client.get(self.url).status_code, 401)

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(self.coordinator)}')
        with self.assertNumQueries(2):
            response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)

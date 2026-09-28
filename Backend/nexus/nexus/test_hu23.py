from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import (
    AcademicCommittee,
    Agreement,
    CommitteeMembership,
    Evidence,
    Semester,
    Student,
    ThesisProgress,
    TutoringSession,
)
from .tests import jwt_for


class TimelineHu23Tests(APITestCase):
    def setUp(self):
        users = get_user_model()
        self.owner = users.objects.create_user(
            email='student23@example.com', password='x', first_name='Ana', last_name='Pérez', role=users.Role.STUDENT,
        )
        self.other = users.objects.create_user(email='other23@example.com', password='x', role=users.Role.STUDENT)
        self.coordinator = users.objects.create_user(
            email='coordinator23@example.com', password='x', role=users.Role.PROGRAM_COORDINATOR,
        )
        self.student = Student.objects.create(
            user=self.owner, matricula='HU23', nombre_completo='Ana Pérez', cohorte='2026',
        )
        self.first_semester = Semester.objects.create(
            student=self.student, numero=1, fecha_inicio=date(2026, 1, 1), fecha_fin=date(2026, 6, 30), is_active=False,
        )
        self.second_semester = Semester.objects.create(
            student=self.student, numero=2, fecha_inicio=date(2026, 7, 1), fecha_fin=date(2026, 12, 31), is_active=True,
        )
        self.url = f'/api/v1/monitoring/timeline/?student={self.student.id}'
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(self.owner)}')

    def create_events(self):
        session = TutoringSession.objects.create(
            student=self.student,
            semester=self.first_semester,
            fecha_sesion=date(2026, 2, 10),
            modalidad=TutoringSession.Modality.HYBRID,
            resumen='Revisión metodológica.',
            proxima_reunion_fecha=date(2026, 3, 10),
            created_by=self.owner,
        )
        agreement = Agreement.objects.create(
            session=session,
            student=self.student,
            descripcion='Entregar capítulo tres.',
            responsable=self.owner,
            fecha_limite=timezone.localdate() - timedelta(days=1),
        )
        progress = ThesisProgress.objects.create(
            student=self.student,
            semester=self.first_semester,
            porcentaje_avance=35,
            observaciones='Recolección de muestras.',
            registrado_por=self.owner,
            fecha_registro=date(2026, 2, 15),
        )
        evidence = Evidence.objects.create(
            student=self.student,
            semester=self.first_semester,
            titulo='Minuta firmada',
            descripcion='Documento de la sesión.',
            archivo_adjunto=SimpleUploadedFile('minuta.pdf', b'%PDF-test'),
            fecha_carga=date(2026, 2, 20),
            created_by=self.owner,
        )
        return session, agreement, progress, evidence

    def test_returns_four_event_types_grouped_and_ordered(self):
        self.create_events()
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['student'], {'id': self.student.id, 'matricula': 'HU23', 'nombre_completo': 'Ana Pérez'})
        self.assertEqual([item['numero'] for item in response.data['semestres']], [1, 2])
        events = response.data['semestres'][0]['eventos']
        self.assertEqual([item['tipo'] for item in events], ['ACUERDO', 'TUTORIA', 'TESIS', 'EVIDENCIA'])
        self.assertEqual([item['fecha'] for item in events], sorted(item['fecha'] for item in events))
        self.assertEqual(response.data['semestres'][1]['eventos'], [])

    def test_exposes_metadata_and_computed_overdue_status(self):
        session, agreement, progress, evidence = self.create_events()
        events = {item['tipo']: item for item in self.client.get(self.url).data['semestres'][0]['eventos']}

        self.assertEqual(events['TUTORIA']['id'], f'tutoria-{session.id}')
        self.assertEqual(events['TUTORIA']['metadata'], {'modalidad': 'HIBRIDA', 'proxima_reunion': '2026-03-10'})
        self.assertEqual(events['ACUERDO']['id'], f'acuerdo-{agreement.id}')
        self.assertEqual(events['ACUERDO']['estado'], 'PENDIENTE')
        self.assertEqual(events['ACUERDO']['estado_efectivo'], 'VENCIDO')
        self.assertEqual(events['TESIS']['porcentaje'], progress.porcentaje_avance)
        self.assertEqual(events['EVIDENCIA']['metadata']['tipo_evidencia'], Evidence.EvidenceType.LOCAL_FILE)
        self.assertIn(f'evidence/', events['EVIDENCIA']['archivo_url'])

    def test_unrelated_or_unknown_student_returns_404(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(self.other)}')
        self.assertEqual(self.client.get(self.url).status_code, 404)
        self.assertEqual(self.client.get('/api/v1/monitoring/timeline/?student=999999').status_code, 404)

    def test_committee_member_can_access(self):
        committee_user = get_user_model().objects.create_user(
            email='committee23@example.com', password='x', role=get_user_model().Role.COMMITTEE_MEMBER,
        )
        CommitteeMembership.objects.create(
            committee=AcademicCommittee.objects.create(student=self.student),
            user=committee_user,
            role=CommitteeMembership.Role.COMMITTEE_MEMBER,
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(committee_user)}')
        self.assertEqual(self.client.get(self.url).status_code, 200)

    def test_missing_student_returns_400(self):
        self.assertEqual(self.client.get('/api/v1/monitoring/timeline/').status_code, 400)

    def test_returns_empty_semesters_without_events(self):
        response = self.client.get(self.url)
        self.assertEqual([semester['eventos'] for semester in response.data['semestres']], [[], []])

    def test_program_coordinator_can_access_and_query_count_is_bounded(self):
        self.create_events()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(self.coordinator)}')
        with self.assertNumQueries(7):
            response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)

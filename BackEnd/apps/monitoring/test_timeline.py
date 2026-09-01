from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.apps import apps
from rest_framework.test import APITestCase
from rest_framework import status

from apps.students.models import Student, Semester, AcademicCommittee
from apps.tutoring.models import TutoringSession, TutoringParticipant, TutoringObservation
from apps.agreements.models import Agreement

User = get_user_model()


class TimelineEndpointTestCase(APITestCase):
    def setUp(self):
        self.today = timezone.now().date()

        self.coordinator = User.objects.create_user(
            email='coord_tl@nexus.edu', password='Password123!', role='COORDINADOR'
        )
        self.advisor = User.objects.create_user(
            email='advisor_tl@nexus.edu', password='Password123!', role='ASESOR',
            first_name='Dr. Carlos', last_name='Ramírez'
        )
        self.other_advisor = User.objects.create_user(
            email='other_tl@nexus.edu', password='Password123!', role='ASESOR'
        )
        self.student_user = User.objects.create_user(
            email='student_tl@nexus.edu', password='Password123!', role='ESTUDIANTE',
            first_name='Ana', last_name='Torres'
        )

        self.student = Student.objects.create(
            user=self.student_user,
            matricula='DOC-2025-TL1',
            nombre_completo='Ana Torres',
            programa_doctoral='Doctorado en Ciencias Computacionales',
            cohorte='2025-A',
            estatus_activo=True
        )
        self.semester = Semester.objects.create(
            student=self.student,
            numero=1,
            fecha_inicio=self.today - timedelta(days=90),
            fecha_fin=self.today + timedelta(days=90),
            is_active=True
        )
        AcademicCommittee.objects.create(
            student=self.student,
            user=self.advisor,
            rol_comite='ASESOR_PRINCIPAL',
            is_active=True
        )

    def test_timeline_unauthenticated_returns_401(self):
        response = self.client.get(f'/api/v1/monitoring/timeline/?student={self.student.id}')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_timeline_unassigned_advisor_returns_403(self):
        self.client.force_authenticate(user=self.other_advisor)
        response = self.client.get(f'/api/v1/monitoring/timeline/?student={self.student.id}')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_timeline_unifies_all_four_node_types(self):
        # 1. Tutoring Session
        tutoria = TutoringSession.objects.create(
            student=self.student,
            semester=self.semester,
            fecha_sesion=self.today - timedelta(days=20),
            modalidad='PRESENCIAL',
            resumen='Revisión de marco metodológico',
            created_by=self.advisor
        )
        TutoringParticipant.objects.create(
            session=tutoria,
            user=self.advisor,
            rol_en_sesion='ASESOR_PRINCIPAL',
            asistencia=True
        )
        TutoringObservation.objects.create(
            session=tutoria,
            autor=self.advisor,
            titulo_tema='Metodología',
            contenido='Ajustar muestreo cuantitativo'
        )

        # 2. Agreement
        Agreement.objects.create(
            student=self.student,
            session=tutoria,
            descripcion='Entregar diseño experimental corregido',
            responsable=self.student_user,
            fecha_limite=self.today - timedelta(days=10),
            estado=Agreement.STATUS_CONCLUIDO,
            fecha_conclusion=self.today - timedelta(days=10),
            created_by=self.advisor
        )

        # 3. Thesis Progress (if model available)
        try:
            ThesisProgress = apps.get_model('thesis', 'ThesisProgress')
            if ThesisProgress:
                ThesisProgress.objects.create(
                    student=self.student,
                    semester=self.semester,
                    porcentaje_avance=45,
                    componentes_json={'protocolo': 100, 'marcoTeorico': 80, 'metodologia': 40},
                    observaciones='Avance sostenido en protocolo',
                    fecha_registro=self.today - timedelta(days=5)
                )
        except LookupError:
            pass

        # 4. Evidence (if model available)
        try:
            Evidence = apps.get_model('evidence', 'Evidence')
            if Evidence:
                Evidence.objects.create(
                    student=self.student,
                    semester=self.semester,
                    tipo=Evidence.TIPO_DOI,
                    titulo='Artículo en IEEE Transactions',
                    enlace_url='https://doi.org/10.1109/ACCESS.2025.1234567',
                    fecha_carga=self.today - timedelta(days=2),
                    created_by=self.student_user
                )
        except LookupError:
            pass

        self.client.force_authenticate(user=self.advisor)
        response = self.client.get(f'/api/v1/monitoring/timeline/?student={self.student.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        self.assertEqual(data['student_id'], self.student.id)
        self.assertGreaterEqual(data['total_eventos'], 2)

        tipos = [node['tipo'] for node in data['timeline']]
        self.assertIn('TUTORIA', tipos)
        self.assertIn('ACUERDO', tipos)

        # Check node colors & icons
        tutoria_node = next(n for n in data['timeline'] if n['tipo'] == 'TUTORIA')
        self.assertEqual(tutoria_node['icono'], '📘')
        self.assertEqual(tutoria_node['color'], '#6365EF')
        self.assertEqual(tutoria_node['metadata']['modalidad'], 'PRESENCIAL')
        self.assertEqual(len(tutoria_node['metadata']['participantes']), 1)
        self.assertEqual(len(tutoria_node['metadata']['observaciones']), 1)

        acuerdo_node = next(n for n in data['timeline'] if n['tipo'] == 'ACUERDO')
        self.assertEqual(acuerdo_node['icono'], '📝')
        self.assertEqual(acuerdo_node['color'], '#437E5C')  # CONCLUIDO is #437E5C

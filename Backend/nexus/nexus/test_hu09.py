import datetime
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase
from .models import AcademicCommittee, CommitteeMembership, Semester, Student, TutoringSession
from .tests import jwt_for
class ObservationsHu09Tests(APITestCase):
 def test_multiple_observations_have_server_owned_author_and_date(self):
  U=get_user_model(); tutor=U.objects.create_user(email='t9@x.co',password='x',role=U.Role.TUTOR); student=Student.objects.create(matricula='HU09',nombre_completo='S',cohorte='26'); sem=Semester.objects.create(student=student,numero=1,fecha_inicio='2026-01-01',fecha_fin='2026-06-01'); CommitteeMembership.objects.create(committee=AcademicCommittee.objects.create(student=student),user=tutor,role='ASESOR'); session=TutoringSession.objects.create(student=student,semester=sem,fecha_sesion='2026-02-01',resumen='R',created_by=tutor); self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(tutor)}'); url=f'/api/v1/tutoring-sessions/{session.id}/observations/'
  for i in range(2):
   response=self.client.post(url,{'tema_revisado':f'T{i}','observaciones_detalladas':'Detalle','autor':999,'created_at':'2000-01-01T00:00:00Z'},format='json'); self.assertEqual(response.status_code,201); self.assertEqual(response.data['autor'],tutor.id); self.assertNotEqual(response.data['created_at'][:4],'2000')
  listed=self.client.get(url); self.assertEqual(len(listed.data),2); self.assertEqual([x['tema_revisado'] for x in listed.data],['T0','T1'])


class TutoriaNoCelebradaTests(APITestCase):
    """Una tutoría que aún no ocurre no tiene minuta que documentar."""

    def setUp(self):
        U = get_user_model()
        self.tutor = U.objects.create_user(email='futuro@x.co', password='x', role=U.Role.TUTOR)
        student = Student.objects.create(matricula='FUT', nombre_completo='S', cohorte='26')
        sem = Semester.objects.create(
            student=student, numero=1,
            fecha_inicio='2026-01-01', fecha_fin='2026-12-01', is_active=True,
        )
        CommitteeMembership.objects.create(
            committee=AcademicCommittee.objects.create(student=student), user=self.tutor, role='ASESOR',
        )
        self.session_futura = TutoringSession.objects.create(
            student=student, semester=sem, fecha_sesion=timezone.localdate() + timedelta(days=3),
            resumen='Programada', created_by=self.tutor,
        )
        self.session_pasada = TutoringSession.objects.create(
            student=student, semester=sem, fecha_sesion=timezone.localdate() - timedelta(days=3),
            resumen='Celebrada', created_by=self.tutor,
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(self.tutor)}')

    def test_rechaza_observaciones_en_una_tutoria_que_aun_no_ocurre(self):
        url = f'/api/v1/tutoring-sessions/{self.session_futura.id}/observations/'
        response = self.client.post(url, {
            'tema_revisado': 'Protocolo',
            'observaciones_detalladas': 'Se revisó el protocolo con detalle.',
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('aún no se ha realizado', response.data['detail'])
        self.assertEqual(self.session_futura.observations.count(), 0)

    def test_sigue_aceptando_observaciones_en_una_tutoria_realizada(self):
        url = f'/api/v1/tutoring-sessions/{self.session_pasada.id}/observations/'
        response = self.client.post(url, {
            'tema_revisado': 'Protocolo',
            'observaciones_detalladas': 'Se revisó el protocolo con detalle.',
        }, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertEqual(self.session_pasada.observations.count(), 1)

    def test_la_sesion_programada_sigue_pudiendo_leerse(self):
        url = f'/api/v1/tutoring-sessions/{self.session_futura.id}/observations/'
        self.assertEqual(self.client.get(url).status_code, 200)


class AcuerdoAltaEnBitacoraTests(APITestCase):
    """El alta del acuerdo es un movimiento de la bitácora, no un acuerdo sin historial."""

    def setUp(self):
        U = get_user_model()
        self.tutor = U.objects.create_user(email='alta@x.co', password='x', role=U.Role.TUTOR)
        self.otro = U.objects.create_user(email='otro@x.co', password='x', role=U.Role.TUTOR)
        student = Student.objects.create(matricula='ALTA', nombre_completo='S', cohorte='26')
        sem = Semester.objects.create(
            student=student, numero=1,
            fecha_inicio='2026-01-01', fecha_fin='2026-12-01', is_active=True,
        )
        CommitteeMembership.objects.create(
            committee=AcademicCommittee.objects.create(student=student), user=self.tutor, role='ASESOR',
        )
        self.session = TutoringSession.objects.create(
            student=student, semester=sem,
            fecha_sesion=timezone.localdate() - datetime.timedelta(days=5),
            resumen='R', created_by=self.tutor,
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(self.tutor)}')
        self.url = f'/api/v1/tutoring-sessions/{self.session.id}/agreements/'

    def test_crear_un_acuerdo_registra_su_alta_en_la_bitacora(self):
        response = self.client.post(self.url, {
            'descripcion': 'Entregar el capítulo uno completo.',
            'responsable': self.tutor.id,
            'fecha_limite': str(timezone.localdate() + datetime.timedelta(days=10)),
        }, format='json')

        self.assertEqual(response.status_code, 201)
        agreement_id = response.data['id']
        bitacora = self.client.get(f'/api/v1/agreements/{agreement_id}/audit-log/').data

        self.assertEqual(len(bitacora), 1)
        self.assertTrue(bitacora[0]['es_alta'])
        self.assertEqual(bitacora[0]['estado_anterior'], '')
        self.assertEqual(bitacora[0]['estado_nuevo'], 'PENDIENTE')
        self.assertEqual(bitacora[0]['user_email'], self.tutor.email)

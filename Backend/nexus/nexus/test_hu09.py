from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from .models import AcademicCommittee, CommitteeMembership, Semester, Student, TutoringSession
from .tests import jwt_for
class ObservationsHu09Tests(APITestCase):
 def test_multiple_observations_have_server_owned_author_and_date(self):
  U=get_user_model(); tutor=U.objects.create_user(email='t9@x.co',password='x',role=U.Role.TUTOR); student=Student.objects.create(matricula='HU09',nombre_completo='S',cohorte='26'); sem=Semester.objects.create(student=student,numero=1,fecha_inicio='2026-01-01',fecha_fin='2026-06-01'); CommitteeMembership.objects.create(committee=AcademicCommittee.objects.create(student=student),user=tutor,role='ASESOR'); session=TutoringSession.objects.create(student=student,semester=sem,fecha_sesion='2026-02-01',resumen='R',created_by=tutor); self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(tutor)}'); url=f'/api/v1/tutoring-sessions/{session.id}/observations/'
  for i in range(2):
   response=self.client.post(url,{'tema_revisado':f'T{i}','observaciones_detalladas':'Detalle','autor':999,'created_at':'2000-01-01T00:00:00Z'},format='json'); self.assertEqual(response.status_code,201); self.assertEqual(response.data['autor'],tutor.id); self.assertNotEqual(response.data['created_at'][:4],'2000')
  listed=self.client.get(url); self.assertEqual(len(listed.data),2); self.assertEqual([x['tema_revisado'] for x in listed.data],['T0','T1'])

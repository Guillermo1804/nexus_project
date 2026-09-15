from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from .models import AcademicCommittee,CommitteeMembership,Semester,Student,TutoringSession
from .tests import jwt_for
class AgreementsHu11Tests(APITestCase):
 def test_session_supports_zero_and_multiple_agreements(self):
  U=get_user_model(); u=U.objects.create_user(email='t11@x.co',password='x',role=U.Role.TUTOR); s=Student.objects.create(matricula='HU11',nombre_completo='S',cohorte='26'); sem=Semester.objects.create(student=s,numero=1,fecha_inicio='2026-01-01',fecha_fin='2026-06-01'); CommitteeMembership.objects.create(committee=AcademicCommittee.objects.create(student=s),user=u,role='ASESOR'); session=TutoringSession.objects.create(student=s,semester=sem,fecha_sesion='2026-02-01',resumen='R',created_by=u); self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(u)}'); url=f'/api/v1/tutoring-sessions/{session.id}/agreements/'; self.assertEqual(self.client.get(url).data,[])
  for i in range(2): self.assertEqual(self.client.post(url,{'descripcion':f'A{i}','responsable':u.id,'fecha_limite':'2026-03-01'},format='json').status_code,201)
  data=self.client.get(url).data; self.assertEqual(len(data),2); self.assertEqual({x['student'] for x in data},{s.id})

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from .models import AcademicCommittee,CommitteeMembership,Semester,Student,TutoringSession
from .tests import jwt_for
class AgreementAssignmentHu12Tests(APITestCase):
 def test_responsible_must_be_authorized_and_deadline_coherent(self):
  U=get_user_model(); tutor=U.objects.create_user(email='t12@x.co',password='x',role=U.Role.TUTOR); outsider=U.objects.create_user(email='o12@x.co',password='x',role=U.Role.TUTOR); s=Student.objects.create(matricula='HU12',nombre_completo='S',cohorte='26'); sem=Semester.objects.create(student=s,numero=1,fecha_inicio='2026-01-01',fecha_fin='2026-06-01'); CommitteeMembership.objects.create(committee=AcademicCommittee.objects.create(student=s),user=tutor,role='ASESOR'); session=TutoringSession.objects.create(student=s,semester=sem,fecha_sesion='2026-02-01',resumen='R',created_by=tutor); self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(tutor)}'); url=f'/api/v1/tutoring-sessions/{session.id}/agreements/'; base={'descripcion':'A','fecha_limite':'2026-03-01'}
  self.assertEqual(self.client.post(url,{**base,'responsable':outsider.id},format='json').status_code,400); self.assertEqual(self.client.post(url,{**base,'responsable':tutor.id,'fecha_limite':'2026-01-31'},format='json').status_code,400); ok=self.client.post(url,{**base,'responsable':tutor.id},format='json'); self.assertEqual(ok.status_code,201); self.assertEqual(ok.data['fecha_limite'],'2026-03-01')

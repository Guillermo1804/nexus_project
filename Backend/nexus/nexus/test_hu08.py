from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from .models import AcademicCommittee, CommitteeMembership, Semester, Student, TutoringSession, TutoringParticipant
from .tests import jwt_for

class ParticipantsHu08Tests(APITestCase):
 def setUp(self):
  U=get_user_model(); self.tutor=U.objects.create_user(email='t8@x.co',password='x',role=U.Role.TUTOR); self.out=U.objects.create_user(email='o8@x.co',password='x',role=U.Role.TUTOR); self.su=U.objects.create_user(email='s8@x.co',password='x',role=U.Role.STUDENT); self.student=Student.objects.create(user=self.su,matricula='HU08',nombre_completo='S',cohorte='26'); self.sem=Semester.objects.create(student=self.student,numero=1,fecha_inicio='2026-01-01',fecha_fin='2026-06-01'); CommitteeMembership.objects.create(committee=AcademicCommittee.objects.create(student=self.student),user=self.tutor,role='ASESOR'); self.session=TutoringSession.objects.create(student=self.student,semester=self.sem,fecha_sesion='2026-02-01',modalidad='HIBRIDA',resumen='R',created_by=self.tutor); self.url=f'/api/v1/tutoring-sessions/{self.session.id}/participants/'; self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(self.tutor)}')
 def test_modality_and_authorized_participants(self):
  self.assertEqual(self.client.get(f'/api/v1/tutoring-sessions/{self.session.id}/').data['modalidad'],'HIBRIDA')
  for user,role in ((self.su,'ESTUDIANTE'),(self.tutor,'ASESOR_PRINCIPAL')):
   self.assertEqual(self.client.post(self.url,{'user':user.id,'rol_en_sesion':role,'asistencia':True},format='json').status_code,201)
  self.assertEqual(TutoringParticipant.objects.count(),2)
  self.assertEqual(self.client.post(self.url,{'user':self.out.id,'rol_en_sesion':'COASESOR'},format='json').status_code,400)
 def test_duplicate_participant_rejected(self):
  data={'user':self.su.id,'rol_en_sesion':'ESTUDIANTE'}; self.assertEqual(self.client.post(self.url,data,format='json').status_code,201); self.assertEqual(self.client.post(self.url,data,format='json').status_code,400)

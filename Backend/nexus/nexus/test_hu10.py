from datetime import date
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from .models import AcademicCommittee,CommitteeMembership,Semester,Student
from .tests import jwt_for
class NextMeetingHu10Tests(APITestCase):
 def test_next_meeting_must_be_after_session_and_notes_require_date(self):
  U=get_user_model(); u=U.objects.create_user(email='t10@x.co',password='x',role=U.Role.TUTOR); s=Student.objects.create(matricula='HU10',nombre_completo='S',cohorte='26'); sem=Semester.objects.create(student=s,numero=1,fecha_inicio=date(2026,1,1),fecha_fin=date(2026,6,1)); CommitteeMembership.objects.create(committee=AcademicCommittee.objects.create(student=s),user=u,role='ASESOR'); self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(u)}'); url='/api/v1/tutoring-sessions/'; base={'student':s.id,'semester':sem.id,'fecha_sesion':'2026-02-01','modalidad':'VIRTUAL','resumen':'R'}
  self.assertEqual(self.client.post(url,{**base,'proxima_reunion_fecha':'2026-02-01'},format='json').status_code,400); self.assertEqual(self.client.post(url,{**base,'proxima_reunion_notas':'Agenda'},format='json').status_code,400); ok=self.client.post(url,{**base,'proxima_reunion_fecha':'2026-02-02','proxima_reunion_notas':'Agenda'},format='json'); self.assertEqual(ok.status_code,201); self.assertEqual(ok.data['proxima_reunion_fecha'],'2026-02-02')

from datetime import date,timedelta
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase
from .models import AcademicCommittee,Agreement,AgreementAuditLog,CommitteeMembership,Student
from .tests import jwt_for
class AgreementStatusHu13Tests(APITestCase):
 def setUp(self):
  U=get_user_model(); self.u=U.objects.create_user(email='r13@x.co',password='x',role=U.Role.TUTOR); self.s=Student.objects.create(matricula='HU13',nombre_completo='S',cohorte='26'); CommitteeMembership.objects.create(committee=AcademicCommittee.objects.create(student=self.s),user=self.u,role='ASESOR'); self.a=Agreement.objects.create(student=self.s,descripcion='A',responsable=self.u,fecha_limite=timezone.localdate()-timedelta(days=1)); self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(self.u)}'); self.url=f'/api/v1/agreements/{self.a.id}/status/'
 def test_valid_transitions_derive_overdue_and_append_audit(self):
  detail=self.client.get(f'/api/v1/agreements/{self.a.id}/'); self.assertTrue(detail.data['is_vencido']); self.assertEqual(detail.data['estado'],'PENDIENTE')
  self.assertEqual(self.client.patch(self.url,{'estado':'EN_PROCESO','comentario':'inicio'},format='json').status_code,200); done=self.client.patch(self.url,{'estado':'CONCLUIDO'},format='json'); self.assertEqual(done.status_code,200); self.assertFalse(done.data['is_vencido']); self.assertEqual(AgreementAuditLog.objects.count(),2)
 def test_invalid_transition_changes_nothing(self):
  self.assertEqual(self.client.patch(self.url,{'estado':'CONCLUIDO'},format='json').status_code,400); self.a.refresh_from_db(); self.assertEqual(self.a.estado,'PENDIENTE'); self.assertFalse(AgreementAuditLog.objects.exists())

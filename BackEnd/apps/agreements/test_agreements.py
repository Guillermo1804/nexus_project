from datetime import date, timedelta
from django.utils import timezone
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from apps.students.models import Student, Semester, AcademicCommittee
from apps.tutoring.models import TutoringSession
from apps.agreements.models import Agreement, AgreementAuditLog

User = get_user_model()


class AgreementModelAndAPITests(APITestCase):
    def setUp(self):
        # 1. Coordinador
        self.coordinator = User.objects.create_superuser(
            email='coord@nexus.edu.mx',
            password='Password123!',
            first_name='Dr. Carlos',
            last_name='Coordinador'
        )

        # 2. Asesor Principal
        self.advisor_main = User.objects.create_user(
            email='asesor1@nexus.edu.mx',
            password='Password123!',
            first_name='Dra. Elena',
            last_name='Ramos',
            role='ASESOR'
        )

        # 3. Asesor Ajeno (no asignado)
        self.advisor_other = User.objects.create_user(
            email='asesor_otro@nexus.edu.mx',
            password='Password123!',
            first_name='Dr. Roberto',
            last_name='Soto',
            role='ASESOR'
        )

        # 4. Estudiante 1 y su usuario
        self.student_user1 = User.objects.create_user(
            email='estudiante1@nexus.edu.mx',
            password='Password123!',
            first_name='Juan',
            last_name='Pérez',
            role='ESTUDIANTE'
        )
        self.student1 = Student.objects.create(
            user=self.student_user1,
            matricula='DOC-2025-001',
            nombre_completo='Juan Pérez',
            cohorte='2025-A'
        )
        self.semester1 = Semester.objects.create(
            student=self.student1,
            numero=1,
            fecha_inicio=date.today() - timedelta(days=30),
            fecha_fin=date.today() + timedelta(days=150)
        )

        # Comité Académico para Estudiante 1
        AcademicCommittee.objects.create(
            student=self.student1,
            user=self.advisor_main,
            rol_comite='ASESOR_PRINCIPAL',
            is_active=True
        )

        # 5. Estudiante 2 y su usuario
        self.student_user2 = User.objects.create_user(
            email='estudiante2@nexus.edu.mx',
            password='Password123!',
            first_name='María',
            last_name='Gómez',
            role='ESTUDIANTE'
        )
        self.student2 = Student.objects.create(
            user=self.student_user2,
            matricula='DOC-2025-002',
            nombre_completo='María Gómez',
            cohorte='2025-A'
        )

        # 6. Sesión de tutoría
        self.tutoring_session = TutoringSession.objects.create(
            student=self.student1,
            semester=self.semester1,
            fecha_sesion=date.today() - timedelta(days=2),
            modalidad='PRESENCIAL',
            resumen='Revisión de avances del capítulo 1',
            created_by=self.advisor_main
        )

    def test_create_agreement_linked_to_session_and_student(self):
        """HU-11 / HU-12: Crear acuerdo vinculado a tutoría y estudiante con responsable."""
        self.client.force_authenticate(user=self.advisor_main)
        payload = {
            'student': self.student1.id,
            'session': self.tutoring_session.id,
            'descripcion': 'Redactar estado del arte con 20 citas indexadas.',
            'responsable': self.student_user1.id,
            'fecha_limite': (date.today() + timedelta(days=14)).isoformat(),
            'estado': 'PENDIENTE'
        }
        response = self.client.post('/api/v1/agreements/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('agreement_created_id', response.data)
        self.assertEqual(response.data['mensaje'], 'Acuerdo registrado exitosamente')

        created_id = response.data['agreement_created_id']
        agreement = Agreement.objects.get(id=created_id)
        self.assertEqual(agreement.student, self.student1)
        self.assertEqual(agreement.session, self.tutoring_session)
        self.assertEqual(agreement.responsable, self.student_user1)
        self.assertEqual(agreement.created_by, self.advisor_main)
        self.assertEqual(agreement.estado, 'PENDIENTE')

        # Verificar bitácora de auditoría inicial
        self.assertEqual(agreement.audit_logs.count(), 1)
        initial_log = agreement.audit_logs.first()
        self.assertEqual(initial_log.estado_anterior, 'NUEVO')
        self.assertEqual(initial_log.estado_nuevo, 'PENDIENTE')

    def test_update_status_and_audit_log(self):
        """HU-13: Actualizar estado de acuerdo y generar registro en bitácora de auditoría."""
        agreement = Agreement.objects.create(
            student=self.student1,
            session=self.tutoring_session,
            descripcion='Preparar presentación para seminario de investigación',
            responsable=self.student_user1,
            fecha_limite=date.today() + timedelta(days=10),
            estado='PENDIENTE',
            created_by=self.advisor_main
        )

        self.client.force_authenticate(user=self.advisor_main)
        url = f'/api/v1/agreements/{agreement.id}/update-status/'
        
        # 1. Pasar a EN_PROCESO
        resp1 = self.client.post(url, {
            'estado': 'EN_PROCESO',
            'comentario': 'El alumno envió primer borrador de diapositivas.'
        }, format='json')
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)
        agreement.refresh_from_db()
        self.assertEqual(agreement.estado, 'EN_PROCESO')
        self.assertIsNone(agreement.fecha_conclusion)

        # 2. Pasar a CONCLUIDO
        resp2 = self.client.post(url, {
            'estado': 'CONCLUIDO',
            'comentario': 'Presentación validada y ensayada exitosamente.'
        }, format='json')
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        agreement.refresh_from_db()
        self.assertEqual(agreement.estado, 'CONCLUIDO')
        self.assertEqual(agreement.fecha_conclusion, timezone.now().date())

        # 3. Verificar historial de auditoría
        audit_url = f'/api/v1/agreements/{agreement.id}/audit-logs/'
        audit_resp = self.client.get(audit_url)
        self.assertEqual(audit_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(audit_resp.data), 2)
        self.assertEqual(audit_resp.data[0]['estado_nuevo'], 'CONCLUIDO')
        self.assertEqual(audit_resp.data[1]['estado_nuevo'], 'EN_PROCESO')

    def test_overdue_calculation_and_auto_transition(self):
        """Verificar cálculo y actualización automática de estado VENCIDO."""
        past_date = date.today() - timedelta(days=5)
        agreement = Agreement.objects.create(
            student=self.student1,
            descripcion='Entrega de protocolo corregido',
            responsable=self.student_user1,
            fecha_limite=past_date,
            estado='PENDIENTE',
            created_by=self.advisor_main
        )

        # El método save() o check_and_update_overdue() actualiza a VENCIDO
        self.assertTrue(agreement.is_vencido)
        self.assertEqual(agreement.estado, 'VENCIDO')

        # Consulta vía API
        self.client.force_authenticate(user=self.coordinator)
        resp = self.client.get(f'/api/v1/agreements/{agreement.id}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['estado'], 'VENCIDO')
        self.assertTrue(resp.data['is_vencido'])

    def test_rbac_isolation(self):
        """Verificar aislamiento RBAC en consulta y gestión de acuerdos."""
        ag1 = Agreement.objects.create(
            student=self.student1,
            descripcion='Acuerdo privado alumno 1',
            responsable=self.student_user1,
            fecha_limite=date.today() + timedelta(days=5),
            estado='PENDIENTE',
            created_by=self.advisor_main
        )
        ag2 = Agreement.objects.create(
            student=self.student2,
            descripcion='Acuerdo privado alumno 2',
            responsable=self.student_user2,
            fecha_limite=date.today() + timedelta(days=5),
            estado='PENDIENTE',
            created_by=self.coordinator
        )

        # Estudiante 1 solo debe ver sus propios acuerdos
        self.client.force_authenticate(user=self.student_user1)
        resp = self.client.get('/api/v1/agreements/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.data.get('results', resp.data)
        ids = [item['id'] for item in results]
        self.assertIn(ag1.id, ids)
        self.assertNotIn(ag2.id, ids)

        # Asesor no asignado a Estudiante 2 intenta consultar ag2
        self.client.force_authenticate(user=self.advisor_main)
        resp = self.client.get(f'/api/v1/agreements/{ag2.id}/')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

        # Coordinador puede ver todos
        self.client.force_authenticate(user=self.coordinator)
        resp = self.client.get('/api/v1/agreements/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.data.get('results', resp.data)
        ids = [item['id'] for item in results]
        self.assertIn(ag1.id, ids)
        self.assertIn(ag2.id, ids)

    def test_filter_agreements_by_student_and_estado(self):
        """Verificar filtrado dinámico por estudiante y por estado."""
        Agreement.objects.create(
            student=self.student1,
            descripcion='Acuerdo 1 Pendiente',
            responsable=self.student_user1,
            fecha_limite=date.today() + timedelta(days=10),
            estado='PENDIENTE',
            created_by=self.advisor_main
        )
        Agreement.objects.create(
            student=self.student1,
            descripcion='Acuerdo 2 Concluido',
            responsable=self.student_user1,
            fecha_limite=date.today() + timedelta(days=10),
            estado='CONCLUIDO',
            created_by=self.advisor_main
        )

        self.client.force_authenticate(user=self.coordinator)
        
        # Filtrar por student y estado=PENDIENTE
        resp = self.client.get(f'/api/v1/agreements/?student={self.student1.id}&estado=PENDIENTE')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.data.get('results', resp.data)
        for r in results:
            self.assertEqual(r['student'], self.student1.id)
            self.assertEqual(r['estado'], 'PENDIENTE')

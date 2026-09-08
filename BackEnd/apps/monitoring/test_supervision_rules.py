from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from apps.students.models import Student, Semester, AcademicCommittee
from apps.tutoring.models import TutoringSession
from apps.agreements.models import Agreement
from apps.evidence.models import Evidence
from apps.monitoring.supervision_rules import SupervisionRulesEngine

User = get_user_model()


class SupervisionRulesEngineTestCase(APITestCase):
    def setUp(self):
        self.today = timezone.now().date()

        # Users
        self.coordinator = User.objects.create_user(
            email='coord.supervision@nexus.edu',
            password='Password123!',
            role='COORDINADOR',
            first_name='Coordinador',
            last_name='General'
        )
        self.advisor_1 = User.objects.create_user(
            email='advisor1.supervision@nexus.edu',
            password='Password123!',
            role='ASESOR',
            first_name='Dr. Roberto',
            last_name='Gómez'
        )
        self.advisor_2 = User.objects.create_user(
            email='advisor2.supervision@nexus.edu',
            password='Password123!',
            role='ASESOR',
            first_name='Dra. Elena',
            last_name='Torres'
        )
        self.student_user_1 = User.objects.create_user(
            email='student1.supervision@nexus.edu',
            password='Password123!',
            role='ESTUDIANTE',
            first_name='María',
            last_name='González'
        )
        self.student_user_2 = User.objects.create_user(
            email='student2.supervision@nexus.edu',
            password='Password123!',
            role='ESTUDIANTE',
            first_name='Carlos',
            last_name='Ramírez'
        )

        # Students
        self.student_1 = Student.objects.create(
            user=self.student_user_1,
            matricula='DOC2024-001',
            nombre_completo='María González',
            programa_doctoral='Doctorado en Inteligencia Artificial',
            cohorte='2024-B',
            estatus_activo=True
        )
        self.semester_1 = Semester.objects.create(
            student=self.student_1,
            numero=1,
            fecha_inicio=self.today - timedelta(days=90),
            fecha_fin=self.today + timedelta(days=90),
            is_active=True
        )

        self.student_2 = Student.objects.create(
            user=self.student_user_2,
            matricula='DOC2024-002',
            nombre_completo='Carlos Ramírez',
            programa_doctoral='Doctorado en Inteligencia Artificial',
            cohorte='2024-B',
            estatus_activo=True
        )
        self.semester_2 = Semester.objects.create(
            student=self.student_2,
            numero=1,
            fecha_inicio=self.today - timedelta(days=90),
            fecha_fin=self.today + timedelta(days=90),
            is_active=True
        )

        # Committees: advisor_1 assigned to student_1; advisor_2 assigned to student_2
        AcademicCommittee.objects.create(
            student=self.student_1,
            user=self.advisor_1,
            rol_comite='ASESOR_PRINCIPAL',
            is_active=True
        )
        AcademicCommittee.objects.create(
            student=self.student_2,
            user=self.advisor_2,
            rol_comite='ASESOR_PRINCIPAL',
            is_active=True
        )

    def test_rule_1_falta_tutoria_triggers_media_and_alta(self):
        """
        Regla 1:
        - student_1 con sesión hace 48 días -> Severidad MEDIA
        - student_2 con sesión hace 75 días -> Severidad ALTA
        """
        TutoringSession.objects.create(
            student=self.student_1,
            semester=self.semester_1,
            fecha_sesion=self.today - timedelta(days=48),
            modalidad='PRESENCIAL',
            resumen='Sesión de seguimiento intermedio'
        )

        TutoringSession.objects.create(
            student=self.student_2,
            semester=self.semester_2,
            fecha_sesion=self.today - timedelta(days=75),
            modalidad='VIRTUAL',
            resumen='Sesión antigua'
        )

        engine = SupervisionRulesEngine(reference_date=self.today)
        alerts = engine.check_rule_1_falta_tutoria()

        self.assertEqual(len(alerts), 2)
        
        # Check student 1 (48 days -> MEDIA)
        alert_s1 = next(a for a in alerts if a['student_id'] == self.student_1.id)
        self.assertEqual(alert_s1['severidad'], 'MEDIA')
        self.assertEqual(alert_s1['tipo'], 'FALTA_TUTORIA_ACTIVA')
        self.assertEqual(alert_s1['dias_sin_tutoria'], 48)

        # Check student 2 (75 days -> ALTA)
        alert_s2 = next(a for a in alerts if a['student_id'] == self.student_2.id)
        self.assertEqual(alert_s2['severidad'], 'ALTA')
        self.assertEqual(alert_s2['tipo'], 'FALTA_TUTORIA_ACTIVA')
        self.assertEqual(alert_s2['dias_sin_tutoria'], 75)

    def test_rule_1_no_alert_if_recent_tutoring(self):
        """
        Estudiante con tutoría hace 20 días no debe generar alerta.
        """
        TutoringSession.objects.create(
            student=self.student_1,
            semester=self.semester_1,
            fecha_sesion=self.today - timedelta(days=20),
            modalidad='PRESENCIAL',
            resumen='Tutoría reciente'
        )

        engine = SupervisionRulesEngine(student_id=self.student_1.id, reference_date=self.today)
        alerts = engine.check_rule_1_falta_tutoria()
        self.assertEqual(len(alerts), 0)

    def test_rule_2_acuerdo_sin_evidencia(self):
        """
        Regla 2:
        - Acuerdo CONCLUIDO sin evidencia -> genera alerta ACUERDO_SIN_EVIDENCIA (MEDIA)
        - Acuerdo CONCLUIDO con evidencia -> no genera alerta
        - Acuerdo PENDIENTE sin evidencia -> no genera alerta
        """
        ag_concluido_sin_ev = Agreement.objects.create(
            student=self.student_1,
            descripcion='Entregar reporte final de experimentos',
            responsable=self.student_user_1,
            fecha_limite=self.today - timedelta(days=5),
            estado=Agreement.STATUS_CONCLUIDO,
            fecha_conclusion=self.today - timedelta(days=2),
            created_by=self.advisor_1
        )

        ag_concluido_con_ev = Agreement.objects.create(
            student=self.student_1,
            descripcion='Publicar preprint en arXiv',
            responsable=self.student_user_1,
            fecha_limite=self.today - timedelta(days=10),
            estado=Agreement.STATUS_CONCLUIDO,
            fecha_conclusion=self.today - timedelta(days=8),
            created_by=self.advisor_1
        )

        Evidence.objects.create(
            student=self.student_1,
            semester=self.semester_1,
            tipo=Evidence.TIPO_DOI,
            actividad_tipo=Evidence.ACTIVIDAD_ACUERDO,
            actividad_id=ag_concluido_con_ev.id,
            titulo='Enlace al preprint en arXiv',
            enlace_url='https://doi.org/10.1234/test.5678',
            created_by=self.student_user_1
        )

        ag_pendiente = Agreement.objects.create(
            student=self.student_1,
            descripcion='Revisar estado del arte',
            responsable=self.student_user_1,
            fecha_limite=self.today + timedelta(days=10),
            estado=Agreement.STATUS_PENDIENTE,
            created_by=self.advisor_1
        )

        engine = SupervisionRulesEngine(student_id=self.student_1.id, reference_date=self.today)
        alerts = engine.check_rule_2_acuerdos_sin_evidencia()

        self.assertEqual(len(alerts), 1)
        self.assertEqual(alerts[0]['tipo'], 'ACUERDO_SIN_EVIDENCIA')
        self.assertEqual(alerts[0]['severidad'], 'MEDIA')
        self.assertEqual(alerts[0]['agreement_id'], ag_concluido_sin_ev.id)

    def test_rule_3_proximas_tutorias_cercanas(self):
        """
        Regla 3:
        - Tutoría en 4 días -> genera PROXIMA_TUTORIA_CERCANA (INFORMATIVA)
        - Tutoría en 15 días -> no genera alerta
        - Tutoría pasada -> no genera alerta
        """
        # Session 1: Next meeting in 4 days
        TutoringSession.objects.create(
            student=self.student_1,
            semester=self.semester_1,
            fecha_sesion=self.today - timedelta(days=10),
            modalidad='PRESENCIAL',
            resumen='Sesión regular',
            proxima_reunion_fecha=self.today + timedelta(days=4),
            proxima_reunion_notas='Revisión de correcciones de tesis'
        )

        # Session 2: Next meeting in 15 days (too far)
        TutoringSession.objects.create(
            student=self.student_2,
            semester=self.semester_2,
            fecha_sesion=self.today - timedelta(days=5),
            modalidad='VIRTUAL',
            resumen='Sesión de arranque',
            proxima_reunion_fecha=self.today + timedelta(days=15)
        )

        # Session 3: Past meeting date
        TutoringSession.objects.create(
            student=self.student_2,
            semester=self.semester_2,
            fecha_sesion=self.today - timedelta(days=30),
            modalidad='PRESENCIAL',
            resumen='Sesión pasada',
            proxima_reunion_fecha=self.today - timedelta(days=5)
        )

        engine = SupervisionRulesEngine(reference_date=self.today)
        alerts = engine.check_rule_3_proximas_tutorias()

        self.assertEqual(len(alerts), 1)
        self.assertEqual(alerts[0]['tipo'], 'PROXIMA_TUTORIA_CERCANA')
        self.assertEqual(alerts[0]['severidad'], 'INFORMATIVA')
        self.assertEqual(alerts[0]['student_id'], self.student_1.id)
        self.assertEqual(alerts[0]['dias_restantes'], 4)

    def test_endpoint_supervision_alerts_authenticated(self):
        """
        Prueba el endpoint GET /api/v1/monitoring/supervision-alerts/ para coordinador.
        """
        # Crear 1 falta de tutoría (student_1)
        TutoringSession.objects.create(
            student=self.student_1,
            semester=self.semester_1,
            fecha_sesion=self.today - timedelta(days=50),
            modalidad='PRESENCIAL',
            resumen='Sesión anterior'
        )

        # Crear 1 acuerdo sin evidencia (student_2)
        Agreement.objects.create(
            student=self.student_2,
            descripcion='Subir archivo de validación',
            responsable=self.student_user_2,
            fecha_limite=self.today - timedelta(days=5),
            estado=Agreement.STATUS_CONCLUIDO,
            fecha_conclusion=self.today - timedelta(days=3),
            created_by=self.advisor_2
        )

        # Crear 1 próxima tutoría (student_1)
        TutoringSession.objects.create(
            student=self.student_1,
            semester=self.semester_1,
            fecha_sesion=self.today - timedelta(days=2),
            modalidad='PRESENCIAL',
            resumen='Sesión complementaria',
            proxima_reunion_fecha=self.today + timedelta(days=3)
        )

        # Login como Coordinador
        self.client.force_authenticate(user=self.coordinator)
        response = self.client.get('/api/v1/monitoring/supervision-alerts/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertIn('total_alertas', data)
        self.assertIn('alertas_por_tipo', data)
        self.assertIn('alertas', data)
        self.assertEqual(data['alertas_por_tipo']['acuerdo_sin_evidencia'], 1)
        self.assertEqual(data['alertas_por_tipo']['proxima_tutoria'], 1)
        self.assertTrue(len(data['alertas']) >= 2)

    def test_endpoint_supervision_alerts_rbac_advisor(self):
        """
        Un Asesor solo debe recibir alertas de los alumnos asignados a su comité.
        """
        # Student 1 (assigned to advisor 1) has no recent tutoring
        TutoringSession.objects.create(
            student=self.student_1,
            semester=self.semester_1,
            fecha_sesion=self.today - timedelta(days=55),
            modalidad='PRESENCIAL',
            resumen='Sesión antigua s1'
        )

        # Student 2 (assigned to advisor 2) has concluded agreement without evidence
        Agreement.objects.create(
            student=self.student_2,
            descripcion='Acuerdo s2',
            responsable=self.student_user_2,
            fecha_limite=self.today - timedelta(days=2),
            estado=Agreement.STATUS_CONCLUIDO,
            created_by=self.advisor_2
        )

        # Authenticate as Advisor 1
        self.client.force_authenticate(user=self.advisor_1)
        response = self.client.get('/api/v1/monitoring/supervision-alerts/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Advisor 1 should see alerts for Student 1 only
        student_ids = [a['student_id'] for a in response.data['alertas']]
        self.assertIn(self.student_1.id, student_ids)
        self.assertNotIn(self.student_2.id, student_ids)

    def test_endpoint_unauthenticated_returns_401(self):
        response = self.client.get('/api/v1/monitoring/supervision-alerts/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.apps import apps
from rest_framework.test import APITestCase
from rest_framework import status

from apps.students.models import Student, Semester, AcademicCommittee
from apps.tutoring.models import TutoringSession
from apps.agreements.models import Agreement

User = get_user_model()


class CoordinatorDashboardTestCase(APITestCase):
    def setUp(self):
        self.today = timezone.now().date()

        # Users
        self.coordinator = User.objects.create_user(
            email='coord_dash@nexus.edu', password='Password123!', role='COORDINADOR',
            first_name='Dra. Elena', last_name='Vargas'
        )
        self.advisor = User.objects.create_user(
            email='advisor_dash@nexus.edu', password='Password123!', role='ASESOR',
            first_name='Dr. Carlos', last_name='Ramírez'
        )
        self.student_user1 = User.objects.create_user(
            email='student1_dash@nexus.edu', password='Password123!', role='ESTUDIANTE',
            first_name='Juan', last_name='Pérez'
        )
        self.student_user2 = User.objects.create_user(
            email='student2_dash@nexus.edu', password='Password123!', role='ESTUDIANTE',
            first_name='María', last_name='López'
        )
        self.student_user3 = User.objects.create_user(
            email='student3_dash@nexus.edu', password='Password123!', role='ESTUDIANTE',
            first_name='Pedro', last_name='Gómez'
        )

        # Student 1 (Critical: overdue agreement > 15 days)
        self.student1 = Student.objects.create(
            user=self.student_user1,
            matricula='DOC-2023-001',
            nombre_completo='Juan Pérez',
            cohorte='2023-A',
            estatus_activo=True
        )
        self.sem1 = Semester.objects.create(
            student=self.student1, numero=1,
            fecha_inicio=self.today - timedelta(days=180),
            fecha_fin=self.today + timedelta(days=30), is_active=True
        )
        AcademicCommittee.objects.create(
            student=self.student1, user=self.advisor,
            rol_comite='ASESOR_PRINCIPAL', is_active=True
        )

        # Student 2 (Preventive: overdue agreement <= 15 days or agreement due in 3 days)
        self.student2 = Student.objects.create(
            user=self.student_user2,
            matricula='DOC-2024-002',
            nombre_completo='María López',
            cohorte='2024-A',
            estatus_activo=True
        )
        self.sem2 = Semester.objects.create(
            student=self.student2, numero=1,
            fecha_inicio=self.today - timedelta(days=120),
            fecha_fin=self.today + timedelta(days=60), is_active=True
        )
        AcademicCommittee.objects.create(
            student=self.student2, user=self.advisor,
            rol_comite='ASESOR_PRINCIPAL', is_active=True
        )

        # Student 3 (Al Día: recent tutoring session, all agreements concluded)
        self.student3 = Student.objects.create(
            user=self.student_user3,
            matricula='DOC-2024-003',
            nombre_completo='Pedro Gómez',
            cohorte='2024-A',
            estatus_activo=True
        )
        self.sem3 = Semester.objects.create(
            student=self.student3, numero=1,
            fecha_inicio=self.today - timedelta(days=60),
            fecha_fin=self.today + timedelta(days=120), is_active=True
        )
        AcademicCommittee.objects.create(
            student=self.student3, user=self.advisor,
            rol_comite='ASESOR_PRINCIPAL', is_active=True
        )

        # Tutorings
        TutoringSession.objects.create(
            student=self.student1,
            semester=self.sem1,
            fecha_sesion=self.today - timedelta(days=70),
            modalidad='PRESENCIAL',
            resumen='Sesión antigua',
            created_by=self.advisor
        )
        TutoringSession.objects.create(
            student=self.student2,
            semester=self.sem2,
            fecha_sesion=self.today - timedelta(days=20),
            modalidad='VIRTUAL',
            resumen='Sesión reciente',
            created_by=self.advisor
        )
        TutoringSession.objects.create(
            student=self.student3,
            semester=self.sem3,
            fecha_sesion=self.today - timedelta(days=10),
            modalidad='PRESENCIAL',
            resumen='Sesión reciente al día',
            created_by=self.advisor
        )

        # Agreements
        # Student 1: Overdue by 20 days (> 15 days -> CRITICO)
        Agreement.objects.create(
            student=self.student1,
            descripcion='Entregar capítulo 2',
            responsable=self.student_user1,
            fecha_limite=self.today - timedelta(days=20),
            estado=Agreement.STATUS_PENDIENTE,
            created_by=self.advisor
        )
        # Student 2: Due in 3 days (<= 5 days -> PREVENTIVO)
        Agreement.objects.create(
            student=self.student2,
            descripcion='Revisar marco conceptual',
            responsable=self.student_user2,
            fecha_limite=self.today + timedelta(days=3),
            estado=Agreement.STATUS_EN_PROCESO,
            created_by=self.advisor
        )
        # Student 3: Concluded
        Agreement.objects.create(
            student=self.student3,
            descripcion='Completar protocolo',
            responsable=self.student_user3,
            fecha_limite=self.today - timedelta(days=5),
            fecha_conclusion=self.today - timedelta(days=6),
            estado=Agreement.STATUS_CONCLUIDO,
            created_by=self.advisor
        )

        # Thesis Progress
        ThesisProgress = apps.get_model('thesis', 'ThesisProgress')
        if ThesisProgress:
            ThesisProgress.objects.create(
                student=self.student1,
                semester=self.sem1,
                porcentaje_avance=60,
                observaciones='Avance regular'
            )
            ThesisProgress.objects.create(
                student=self.student2,
                semester=self.sem2,
                porcentaje_avance=40,
                observaciones='Avance inicial'
            )
            ThesisProgress.objects.create(
                student=self.student3,
                semester=self.sem3,
                porcentaje_avance=80,
                observaciones='Excelente avance'
            )

    def test_dashboard_unauthenticated_returns_401(self):
        response = self.client.get('/api/v1/monitoring/coordinator-dashboard/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_dashboard_student_forbidden_returns_403(self):
        self.client.force_authenticate(user=self.student_user1)
        response = self.client.get('/api/v1/monitoring/coordinator-dashboard/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_dashboard_coordinator_success_and_kpis(self):
        self.client.force_authenticate(user=self.coordinator)
        response = self.client.get('/api/v1/monitoring/coordinator-dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.data
        self.assertIn('kpis', data)
        self.assertIn('semaforo_riesgo', data)
        self.assertIn('tabla_priorizada', data)
        self.assertIn('distribucion_cohorte', data)

        kpis = data['kpis']
        self.assertEqual(kpis['total_estudiantes_activos'], 3)
        self.assertEqual(kpis['total_tutorias_periodo'], 3)
        self.assertEqual(kpis['total_acuerdos_activos'], 1)  # student 2 is EN_PROCESO
        self.assertEqual(kpis['total_acuerdos_vencidos'], 1)  # student 1 agreement auto-updated to VENCIDO
        self.assertAlmostEqual(kpis['tasa_cumplimiento_acuerdos'], 33.3, places=1)
        self.assertAlmostEqual(kpis['promedio_avance_tesis'], 60.0, places=1)

    def test_dashboard_risk_semaphore_and_prioritized_table(self):
        self.client.force_authenticate(user=self.coordinator)
        response = self.client.get('/api/v1/monitoring/coordinator-dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        semaforo = response.data['semaforo_riesgo']
        self.assertEqual(semaforo['atencion_critica'], 1)
        self.assertEqual(semaforo['atencion_preventiva'], 1)
        self.assertEqual(semaforo['alumnos_al_dia'], 1)
        self.assertEqual(semaforo['total_evaluados'], 3)

        tabla = response.data['tabla_priorizada']
        self.assertEqual(len(tabla), 3)

        # Ordered: CRITICO first, then PREVENTIVO, then AL_DIA
        self.assertEqual(tabla[0]['matricula'], 'DOC-2023-001')
        self.assertEqual(tabla[0]['nivel_riesgo'], 'CRITICO')
        self.assertEqual(tabla[0]['badge_color'], '#A14D98')
        self.assertEqual(tabla[0]['badge_bg'], '#F8F1FF')
        self.assertEqual(tabla[0]['acuerdos_vencidos'], 1)
        self.assertEqual(tabla[0]['dias_sin_tutoria'], 70)

        self.assertEqual(tabla[1]['matricula'], 'DOC-2024-002')
        self.assertEqual(tabla[1]['nivel_riesgo'], 'PREVENTIVO')
        self.assertEqual(tabla[1]['badge_color'], '#B57136')

        self.assertEqual(tabla[2]['matricula'], 'DOC-2024-003')
        self.assertEqual(tabla[2]['nivel_riesgo'], 'AL_DIA')
        self.assertEqual(tabla[2]['badge_color'], '#437E5C')

    def test_dashboard_cohort_distribution(self):
        self.client.force_authenticate(user=self.coordinator)
        response = self.client.get('/api/v1/monitoring/coordinator-dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        cohorts = response.data['distribucion_cohorte']
        self.assertEqual(len(cohorts), 2)
        # Cohort 2023-A: 1 student with 60%
        cohort_2023 = next(c for c in cohorts if c['cohorte'] == '2023-A')
        self.assertEqual(cohort_2023['total_estudiantes'], 1)
        self.assertEqual(cohort_2023['promedio_avance'], 60.0)

        # Cohort 2024-A: 2 students with 40% and 80% -> average 60.0%
        cohort_2024 = next(c for c in cohorts if c['cohorte'] == '2024-A')
        self.assertEqual(cohort_2024['total_estudiantes'], 2)
        self.assertEqual(cohort_2024['promedio_avance'], 60.0)

    def test_timeline_includes_publication_node(self):
        Publication = apps.get_model('academic_output', 'Publication')
        if Publication:
            Publication.objects.create(
                student=self.student1,
                semester=self.sem1,
                titulo='Deep Learning for Medical Diagnosis',
                autores_texto='Juan Pérez, Dr. Carlos Ramírez',
                tipo='ARTICULO_JCR',
                revista_editorial='IEEE Transactions on Neural Networks',
                estado='PUBLICADO',
                fecha_publicacion=self.today - timedelta(days=15),
                doi_url='https://doi.org/10.1109/TNN.2025.123456'
            )

        self.client.force_authenticate(user=self.coordinator)
        response = self.client.get(f'/api/v1/monitoring/timeline/?student={self.student1.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        timeline = response.data['timeline']
        pub_nodes = [node for node in timeline if node['tipo'] == 'PUBLICACION']
        self.assertTrue(len(pub_nodes) >= 1)
        node = pub_nodes[0]
        self.assertEqual(node['color'], '#6365EF')
        self.assertEqual(node['icono'], '🎓')
        self.assertIn('Deep Learning', node['titulo'])
        self.assertEqual(node['metadata']['doi_url'], 'https://doi.org/10.1109/TNN.2025.123456')

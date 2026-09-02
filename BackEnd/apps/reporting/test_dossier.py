from datetime import date, timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from apps.students.models import Student, Semester, AcademicCommittee
from apps.tutoring.models import TutoringSession, TutoringParticipant, TutoringObservation
from apps.agreements.models import Agreement, AgreementAuditLog
from apps.thesis.models import ThesisProgress
from apps.academic_output.models import Publication, AcademicEvent, ResearchStay, OtherProduct
from apps.evidence.models import Evidence

User = get_user_model()


class StudentFullDossierAPITestCase(APITestCase):
    def setUp(self):
        # 1. Crear usuarios con roles
        self.coordinator = User.objects.create_user(
            email='coord@nexus.edu',
            password='Password123!',
            first_name='María',
            last_name='Coordinadora',
            role='COORDINADOR'
        )
        self.advisor_assigned = User.objects.create_user(
            email='asesor1@nexus.edu',
            password='Password123!',
            first_name='Dr. Roberto',
            last_name='Asesor',
            role='ASESOR'
        )
        self.advisor_unassigned = User.objects.create_user(
            email='asesor2@nexus.edu',
            password='Password123!',
            first_name='Dra. Laura',
            last_name='Ajena',
            role='ASESOR'
        )
        self.student_user_1 = User.objects.create_user(
            email='student1@nexus.edu',
            password='Password123!',
            first_name='Carlos',
            last_name='Mendoza',
            role='ESTUDIANTE'
        )
        self.student_user_2 = User.objects.create_user(
            email='student2@nexus.edu',
            password='Password123!',
            first_name='Ana',
            last_name='Pérez',
            role='ESTUDIANTE'
        )

        # 2. Crear estudiantes
        self.student_1 = Student.objects.create(
            user=self.student_user_1,
            matricula='DOC-2024-001',
            nombre_completo='Ing. Carlos Mendoza',
            programa_doctoral='Doctorado en Ciencias Computacionales',
            cohorte='2024-A',
            estatus_activo=True
        )
        self.student_2 = Student.objects.create(
            user=self.student_user_2,
            matricula='DOC-2024-002',
            nombre_completo='Lic. Ana Pérez',
            programa_doctoral='Doctorado en Ciencias Computacionales',
            cohorte='2024-A',
            estatus_activo=True
        )

        # 3. Semestres
        self.sem1 = Semester.objects.create(
            student=self.student_1,
            numero=1,
            fecha_inicio=date(2024, 1, 15),
            fecha_fin=date(2024, 6, 30),
            is_active=False
        )
        self.sem2 = Semester.objects.create(
            student=self.student_1,
            numero=2,
            fecha_inicio=date(2024, 8, 1),
            fecha_fin=date(2024, 12, 15),
            is_active=True
        )

        # 4. Comité Tutorial
        self.committee_member = AcademicCommittee.objects.create(
            student=self.student_1,
            user=self.advisor_assigned,
            rol_comite='ASESOR_PRINCIPAL',
            is_active=True
        )

        # 5. Sesión de Tutoría, Participantes y Observaciones
        self.session = TutoringSession.objects.create(
            student=self.student_1,
            semester=self.sem1,
            fecha_sesion=date(2024, 3, 10),
            modalidad='PRESENCIAL',
            resumen='Revisión de marco teórico y definición de objetivos específicos.',
            created_by=self.advisor_assigned
        )
        TutoringParticipant.objects.create(
            session=self.session,
            user=self.advisor_assigned,
            rol_en_sesion='ASESOR_PRINCIPAL',
            asistencia=True
        )
        TutoringParticipant.objects.create(
            session=self.session,
            user=self.student_user_1,
            rol_en_sesion='ESTUDIANTE',
            asistencia=True
        )
        TutoringObservation.objects.create(
            session=self.session,
            autor=self.advisor_assigned,
            titulo_tema='Estado del Arte',
            contenido='Se sugiere incluir más artículos JCR de los últimos 3 años.'
        )

        # 6. Acuerdos y bitácora
        self.agreement_done = Agreement.objects.create(
            student=self.student_1,
            session=self.session,
            descripcion='Entrega del borrador del capítulo 2',
            responsable=self.student_user_1,
            fecha_limite=date(2024, 4, 15),
            estado=Agreement.STATUS_CONCLUIDO,
            fecha_conclusion=date(2024, 4, 14),
            created_by=self.advisor_assigned
        )
        AgreementAuditLog.objects.create(
            agreement=self.agreement_done,
            user=self.advisor_assigned,
            estado_anterior=Agreement.STATUS_EN_PROCESO,
            estado_nuevo=Agreement.STATUS_CONCLUIDO,
            comentario='Aprobado tras correcciones menores'
        )
        self.agreement_pending = Agreement.objects.create(
            student=self.student_1,
            session=self.session,
            descripcion='Sometimiento de artículo a revista Q2',
            responsable=self.student_user_1,
            fecha_limite=timezone.now().date() + timedelta(days=30),
            estado=Agreement.STATUS_EN_PROCESO,
            created_by=self.advisor_assigned
        )

        # 7. Avances de Tesis
        self.thesis_progress = ThesisProgress.objects.create(
            student=self.student_1,
            semester=self.sem1,
            porcentaje_avance=45,
            componentes_json={'protocolo': 100, 'marcoTeorico': 80, 'metodologia': 40},
            observaciones='Buen ritmo de trabajo durante el primer semestre.',
            fecha_registro=date(2024, 6, 1)
        )
        self.thesis_progress_latest = ThesisProgress.objects.create(
            student=self.student_1,
            semester=self.sem2,
            porcentaje_avance=65,
            componentes_json={'protocolo': 100, 'marcoTeorico': 95, 'metodologia': 70, 'analisis': 30},
            observaciones='Metodología validada con datos preliminares.',
            fecha_registro=date(2024, 11, 15)
        )

        # 8. Evidencias
        self.evidence_doi = Evidence.objects.create(
            student=self.student_1,
            semester=self.sem2,
            tipo=Evidence.TIPO_DOI,
            actividad_tipo=Evidence.ACTIVIDAD_OTRO,
            titulo='Publicación DOI IEEE',
            enlace_url='https://doi.org/10.1109/ACCESS.2024.1234567',
            created_by=self.student_user_1
        )

        # 9. Producción Científica
        self.pub = Publication.objects.create(
            student=self.student_1,
            semester=self.sem2,
            titulo='Optimized Metaheuristics for Resource Allocation',
            autores_texto='Mendoza, C., Asesor, R.',
            tipo=Publication.TIPO_JCR,
            revista_editorial='IEEE Access',
            estado=Publication.ESTADO_PUBLICADO,
            fecha_publicacion=date(2024, 10, 1),
            doi_url='https://doi.org/10.1109/ACCESS.2024.1234567',
            evidencia=self.evidence_doi
        )
        self.event = AcademicEvent.objects.create(
            student=self.student_1,
            semester=self.sem2,
            tipo_evento=AcademicEvent.EVENTO_CONGRESO_INT,
            nombre_evento='International Conference on Computer Science 2024',
            titulo_ponencia='A New Framework for Deep Scheduling',
            fecha_presentacion=date(2024, 9, 20),
            sede_lugar='Madrid, España',
            modalidad=AcademicEvent.MODALIDAD_PRESENCIAL
        )
        self.stay = ResearchStay.objects.create(
            student=self.student_1,
            institucion_receptora='Universidad Politécnica de Madrid',
            pais='España',
            fecha_inicio=date(2024, 9, 1),
            fecha_fin=date(2024, 10, 31),
            responsable_estancia='Dr. Javier Gómez',
            objetivos='Validación experimental de algoritmos distribuidos.',
            resultados='Obtención de datos comparativos de desempeño.'
        )
        self.product = OtherProduct.objects.create(
            student=self.student_1,
            tipo_producto=OtherProduct.TIPO_SOFTWARE,
            titulo='NexusSched v1.0 Framework',
            descripcion='Librería Python para optimización heurística en GPUs.',
            fecha_registro=date(2024, 11, 1)
        )

        self.url = f"/api/v1/reporting/students/{self.student_1.id}/full-dossier/"

    def test_unauthenticated_request_fails(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_coordinator_can_access_full_dossier(self):
        self.client.force_authenticate(user=self.coordinator)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data
        self.assertIn('student', data)
        self.assertEqual(data['student']['matricula'], 'DOC-2024-001')
        self.assertEqual(data['student']['nombre_completo'], 'Ing. Carlos Mendoza')
        
        # Verificar subsecciones
        self.assertEqual(len(data['committee']), 1)
        self.assertEqual(data['committee'][0]['rol_comite'], 'ASESOR_PRINCIPAL')
        self.assertEqual(len(data['semesters']), 2)
        self.assertEqual(len(data['tutoring_sessions']), 1)
        self.assertEqual(len(data['tutoring_sessions'][0]['participants']), 2)
        self.assertEqual(len(data['tutoring_sessions'][0]['observations']), 1)
        self.assertEqual(len(data['agreements']), 2)
        self.assertEqual(len(data['thesis_progress']), 2)
        self.assertEqual(len(data['publications']), 1)
        self.assertEqual(len(data['academic_events']), 1)
        self.assertEqual(len(data['research_stays']), 1)
        self.assertEqual(len(data['other_products']), 1)
        self.assertEqual(len(data['evidences']), 1)

        # Verificar KPIs
        kpis = data['kpis']
        self.assertEqual(kpis['total_tutorias'], 1)
        self.assertEqual(kpis['total_acuerdos'], 2)
        self.assertEqual(kpis['acuerdos_concluidos'], 1)
        self.assertEqual(kpis['acuerdos_en_proceso'], 1)
        self.assertEqual(kpis['tasa_cumplimiento_acuerdos'], 50.0)
        self.assertEqual(kpis['ultimo_porcentaje_tesis'], 65)
        self.assertEqual(kpis['total_publicaciones'], 1)
        self.assertEqual(kpis['total_eventos_academicos'], 1)
        self.assertEqual(kpis['total_estancias_investigacion'], 1)
        self.assertEqual(kpis['total_otros_productos'], 1)

    def test_assigned_advisor_can_access_student_dossier(self):
        self.client.force_authenticate(user=self.advisor_assigned)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['student']['id'], self.student_1.id)

    def test_unassigned_advisor_cannot_access_student_dossier(self):
        self.client.force_authenticate(user=self.advisor_unassigned)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_can_access_own_dossier(self):
        self.client.force_authenticate(user=self.student_user_1)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['student']['matricula'], 'DOC-2024-001')

    def test_student_cannot_access_other_student_dossier(self):
        self.client.force_authenticate(user=self.student_user_2)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_nonexistent_student_returns_404(self):
        self.client.force_authenticate(user=self.coordinator)
        response = self.client.get('/api/v1/reporting/students/99999/full-dossier/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

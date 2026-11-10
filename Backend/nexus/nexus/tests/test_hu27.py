from datetime import date

from django.test import TestCase
from rest_framework.test import APIClient

from nexus.models import (
    AcademicCommittee,
    AcademicEvent,
    CommitteeMembership,
    CustomUser,
    Evidence,
    OtherProduct,
    Publication,
    ResearchStay,
    Semester,
    Student,
    ThesisProgress,
    TutoringParticipant,
    TutoringSession,
    Agreement,
)


class DossierApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.coordinator = CustomUser.objects.create_user(
            email='dossier-coordinator@example.com',
            password='password',
            role=CustomUser.Role.PROGRAM_COORDINATOR,
        )
        self.student_user = CustomUser.objects.create_user(
            email='dossier-student@example.com',
            password='password',
            first_name='Diego',
            last_name='Fuentes',
            role=CustomUser.Role.STUDENT,
        )
        self.advisor = CustomUser.objects.create_user(
            email='dossier-advisor@example.com',
            password='password',
            first_name='Ana',
            last_name='Asesora',
            role=CustomUser.Role.TUTOR,
        )
        self.student = Student.objects.create(
            user=self.student_user,
            matricula='DOSSIER001',
            nombre_completo='Diego Fuentes',
            programa_doctoral='Doctorado en Ciencias',
            cohorte='2025-B',
            fecha_ingreso=date(2025, 8, 1),
        )
        committee = AcademicCommittee.objects.create(student=self.student)
        CommitteeMembership.objects.create(
            committee=committee,
            user=self.advisor,
            role=CommitteeMembership.Role.ADVISOR,
        )
        semester = Semester.objects.create(
            student=self.student,
            numero=1,
            fecha_inicio=date(2025, 8, 1),
            fecha_fin=date(2026, 7, 31),
        )
        self.semester = semester
        self.session = TutoringSession.objects.create(
            student=self.student,
            semester=semester,
            fecha_sesion=date(2026, 1, 10),
            modalidad=TutoringSession.Modality.VIRTUAL,
            resumen='Revisión de avances',
        )
        TutoringParticipant.objects.create(
            session=self.session,
            user=self.advisor,
            rol_en_sesion=TutoringParticipant.SessionRole.ADVISOR,
        )
        Agreement.objects.create(
            session=self.session,
            student=self.student,
            descripcion='Entregar protocolo',
            responsable=self.advisor,
            fecha_limite=date(2026, 2, 1),
            estado=Agreement.Status.COMPLETED,
            fecha_conclusion=date(2026, 1, 30),
        )
        ThesisProgress.objects.create(
            student=self.student,
            semester=semester,
            porcentaje_avance=30,
            componentes_json={'protocolo': 30},
            registrado_por=self.advisor,
            fecha_registro=date(2026, 1, 15),
        )
        evidence = Evidence.objects.create(
            student=self.student,
            semester=semester,
            tipo=Evidence.EvidenceType.DOI_LINK,
            actividad_tipo=Evidence.ActivityType.THESIS,
            titulo='Protocolo DOI',
            enlace_url='10.1000/protocolo',
        )
        Publication.objects.create(
            student=self.student,
            semester=semester,
            evidencia=evidence,
            titulo='Artículo doctoral',
            autores_texto='Diego Fuentes',
            tipo='JCR',
            revista_editorial='Revista N.E.X.U.S.',
            estado='PUBLICADO',
            fecha_publicacion=date(2026, 3, 1),
            doi_url='https://doi.org/10.1000/article',
        )
        AcademicEvent.objects.create(
            student=self.student,
            semester=semester,
            evidencia=evidence,
            titulo_trabajo='Ponencia doctoral',
            nombre_evento='Congreso N.E.X.U.S.',
            tipo_evento='CONGRESO',
            fecha_evento=date(2026, 4, 1),
        )
        ResearchStay.objects.create(
            student=self.student,
            semester=semester,
            evidencia=evidence,
            institucion_destino='Universidad Central',
            pais='México',
            fecha_inicio=date(2026, 5, 1),
            fecha_fin=date(2026, 5, 15),
            investigador_anfitrion='Dra. Rivera',
        )
        OtherProduct.objects.create(
            student=self.student,
            semester=semester,
            titulo='Repositorio de datos',
            tipo_producto='BASE_DATOS',
            descripcion='Datos de investigación',
        )

    def test_coordinator_receives_complete_dossier(self):
        self.client.force_authenticate(self.coordinator)

        response = self.client.get(
            '/api/v1/reporting/dossier/',
            {'student': self.student.id},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['estudiante']['matricula'], 'DOSSIER001')
        sections = response.data['secciones_detalladas']
        self.assertEqual(len(sections['tutorias']), 1)
        self.assertEqual(len(sections['acuerdos']), 1)
        self.assertEqual(len(sections['tesis_historico']), 1)
        self.assertEqual(len(sections['publicaciones']), 1)
        self.assertEqual(len(sections['eventos']), 1)
        self.assertEqual(len(sections['estancias']), 1)
        self.assertEqual(len(sections['evidencias']), 1)
        self.assertEqual(sections['otros_productos'][0]['titulo'], 'Repositorio de datos')
        self.assertEqual(response.data['resumen_ejecutivo']['porcentaje_tesis_actual'], 30)
        self.assertEqual(response.data['resumen_ejecutivo']['acuerdos_concluidos'], 1)

    def test_student_and_assigned_advisor_can_read_but_other_student_cannot(self):
        for user in (self.student_user, self.advisor):
            self.client.force_authenticate(user)
            response = self.client.get('/api/v1/reporting/dossier/', {'student': self.student.id})
            self.assertEqual(response.status_code, 200)

        other = CustomUser.objects.create_user(
            email='other-dossier-student@example.com',
            password='password',
            role=CustomUser.Role.STUDENT,
        )
        self.client.force_authenticate(other)
        response = self.client.get('/api/v1/reporting/dossier/', {'student': self.student.id})
        self.assertEqual(response.status_code, 404)

    def test_student_query_parameter_is_required(self):
        self.client.force_authenticate(self.coordinator)

        response = self.client.get('/api/v1/reporting/dossier/')

        self.assertEqual(response.status_code, 400)

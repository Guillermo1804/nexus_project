from datetime import date, timedelta
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.students.models import Student, Semester, AcademicCommittee
from apps.tutoring.models import TutoringSession, TutoringParticipant, TutoringObservation

User = get_user_model()


class TutoringTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Users
        self.coordinator = User.objects.create_user(
            email='coord@nexus.edu.mx',
            password='Password123!',
            first_name='Laura',
            last_name='Coordinadora',
            role='COORDINADOR'
        )

        self.advisor_user = User.objects.create_user(
            email='asesor@nexus.edu.mx',
            password='Password123!',
            first_name='Carlos',
            last_name='Asesor',
            role='ASESOR'
        )

        self.other_advisor_user = User.objects.create_user(
            email='other_asesor@nexus.edu.mx',
            password='Password123!',
            first_name='Roberto',
            last_name='Ajeno',
            role='ASESOR'
        )

        self.student_user = User.objects.create_user(
            email='student@nexus.edu.mx',
            password='Password123!',
            first_name='Mariana',
            last_name='Estudiante',
            role='ESTUDIANTE'
        )

        self.other_student_user = User.objects.create_user(
            email='other_student@nexus.edu.mx',
            password='Password123!',
            first_name='Juan',
            last_name='Perez',
            role='ESTUDIANTE'
        )

        # Students
        self.student = Student.objects.create(
            user=self.student_user,
            matricula='DOC-2024-001',
            nombre_completo='Mariana Estudiante',
            programa_doctoral='Doctorado en Ciencias',
            cohorte='2024-A',
            estatus_activo=True
        )

        self.other_student = Student.objects.create(
            user=self.other_student_user,
            matricula='DOC-2024-002',
            nombre_completo='Juan Perez',
            programa_doctoral='Doctorado en Ciencias',
            cohorte='2024-A',
            estatus_activo=True
        )

        # Semesters
        self.semester_1 = Semester.objects.create(
            student=self.student,
            numero=1,
            fecha_inicio=date(2024, 1, 15),
            fecha_fin=date(2024, 6, 30),
            is_active=True
        )

        self.semester_2 = Semester.objects.create(
            student=self.student,
            numero=2,
            fecha_inicio=date(2024, 8, 15),
            fecha_fin=date(2024, 12, 15),
            is_active=False
        )

        self.other_semester = Semester.objects.create(
            student=self.other_student,
            numero=1,
            fecha_inicio=date(2024, 1, 15),
            fecha_fin=date(2024, 6, 30),
            is_active=True
        )

        # Committee
        self.committee = AcademicCommittee.objects.create(
            student=self.student,
            user=self.advisor_user,
            rol_comite='ASESOR_PRINCIPAL',
            is_active=True
        )

    def test_anonymous_access_denied(self):
        response = self.client.get('/api/v1/tutoring-sessions/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_tutoring_session_complete_nested(self):
        self.client.force_authenticate(user=self.coordinator)
        payload = {
            'student': self.student.id,
            'semester': self.semester_1.id,
            'fecha_sesion': '2024-03-15',
            'modalidad': 'PRESENCIAL',
            'resumen': 'Revisión del estado del arte y definición de marco teórico.',
            'proxima_reunion_fecha': '2024-04-15',
            'proxima_reunion_notas': 'Entregar borrador del capítulo 2.',
            'participants': [
                {
                    'user': self.student_user.id,
                    'rol_en_sesion': 'ESTUDIANTE',
                    'asistencia': True,
                    'notas': 'Presentó avances a tiempo.'
                },
                {
                    'user': self.advisor_user.id,
                    'rol_en_sesion': 'ASESOR_PRINCIPAL',
                    'asistencia': True,
                    'notas': 'Revisó la metodología.'
                }
            ],
            'observations': [
                {
                    'titulo_tema': 'Capítulo 1 - Estado del Arte',
                    'contenido': 'Se completó la búsqueda bibliográfica en Scopus y Web of Science.'
                },
                {
                    'titulo_tema': 'Hipótesis de Trabajo',
                    'contenido': 'Se afinaron las variables independientes y dependientes.'
                }
            ]
        }

        response = self.client.post('/api/v1/tutoring-sessions/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('tutoring_session_created_id', response.data)
        self.assertEqual(response.data['mensaje'], 'Sesión de tutoría registrada correctamente')
        self.assertIn('tutoring_session', response.data)

        session_data = response.data['tutoring_session']
        self.assertEqual(session_data['student'], self.student.id)
        self.assertEqual(session_data['student_nombre'], self.student.nombre_completo)
        self.assertEqual(session_data['semester_numero'], 1)
        self.assertEqual(session_data['modalidad'], 'PRESENCIAL')
        self.assertEqual(session_data['modalidad_display'], 'Presencial')
        self.assertEqual(session_data['total_participantes'], 2)
        self.assertEqual(session_data['total_observaciones'], 2)
        self.assertEqual(len(session_data['participants']), 2)
        self.assertEqual(len(session_data['observations']), 2)

        # Verify database records
        session_id = response.data['tutoring_session_created_id']
        session_obj = TutoringSession.objects.get(pk=session_id)
        self.assertEqual(session_obj.participants.count(), 2)
        self.assertEqual(session_obj.observations.count(), 2)
        self.assertEqual(session_obj.created_by, self.coordinator)

    def test_validation_required_fields(self):
        self.client.force_authenticate(user=self.coordinator)
        # Empty payload
        response = self.client.post('/api/v1/tutoring-sessions/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('student', response.data)
        self.assertIn('semester', response.data)
        self.assertIn('fecha_sesion', response.data)
        self.assertIn('resumen', response.data)

    def test_validation_semester_belongs_to_student(self):
        self.client.force_authenticate(user=self.coordinator)
        payload = {
            'student': self.student.id,
            'semester': self.other_semester.id,  # belongs to other_student
            'fecha_sesion': '2024-03-15',
            'modalidad': 'VIRTUAL',
            'resumen': 'Sesión de prueba.'
        }
        response = self.client.post('/api/v1/tutoring-sessions/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('semester', response.data)

    def test_filtering_by_student_and_semester(self):
        self.client.force_authenticate(user=self.coordinator)
        # Create session 1 for student (semester 1)
        s1 = TutoringSession.objects.create(
            student=self.student,
            semester=self.semester_1,
            fecha_sesion=date(2024, 2, 10),
            modalidad='PRESENCIAL',
            resumen='Sesión 1'
        )
        # Create session 2 for student (semester 2)
        s2 = TutoringSession.objects.create(
            student=self.student,
            semester=self.semester_2,
            fecha_sesion=date(2024, 9, 10),
            modalidad='VIRTUAL',
            resumen='Sesión 2'
        )
        # Create session 3 for other_student
        s3 = TutoringSession.objects.create(
            student=self.other_student,
            semester=self.other_semester,
            fecha_sesion=date(2024, 3, 10),
            modalidad='HIBRIDA',
            resumen='Sesión 3'
        )

        # Filter by student
        resp = self.client.get(f'/api/v1/tutoring-sessions/?student={self.student.id}')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['count'], 2)

        # Filter by semester
        resp_sem = self.client.get(f'/api/v1/tutoring-sessions/?student={self.student.id}&semester={self.semester_1.id}')
        self.assertEqual(resp_sem.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_sem.data['count'], 1)
        self.assertEqual(resp_sem.data['results'][0]['id'], s1.id)

        # Filter by modalidad
        resp_mod = self.client.get('/api/v1/tutoring-sessions/?modalidad=HIBRIDA')
        self.assertEqual(resp_mod.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_mod.data['count'], 1)
        self.assertEqual(resp_mod.data['results'][0]['id'], s3.id)

    def test_rbac_advisor_and_student_access(self):
        # Create session for student
        s1 = TutoringSession.objects.create(
            student=self.student,
            semester=self.semester_1,
            fecha_sesion=date(2024, 2, 10),
            modalidad='PRESENCIAL',
            resumen='Sesión de asesoría principal'
        )
        TutoringParticipant.objects.create(
            session=s1,
            user=self.advisor_user,
            rol_en_sesion='ASESOR_PRINCIPAL',
            asistencia=True
        )

        # Create session for other student
        s2 = TutoringSession.objects.create(
            student=self.other_student,
            semester=self.other_semester,
            fecha_sesion=date(2024, 2, 12),
            modalidad='VIRTUAL',
            resumen='Sesión ajena'
        )

        # 1. Assigned advisor can view s1
        self.client.force_authenticate(user=self.advisor_user)
        resp = self.client.get(f'/api/v1/tutoring-sessions/{s1.id}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['id'], s1.id)

        # Assigned advisor cannot view s2 of unassigned student
        resp_s2 = self.client.get(f'/api/v1/tutoring-sessions/{s2.id}/')
        self.assertEqual(resp_s2.status_code, status.HTTP_403_FORBIDDEN)

        # 2. Student can view own session s1
        self.client.force_authenticate(user=self.student_user)
        resp_student = self.client.get(f'/api/v1/tutoring-sessions/{s1.id}/')
        self.assertEqual(resp_student.status_code, status.HTTP_200_OK)

        # Student cannot view other student's session s2
        resp_student_s2 = self.client.get(f'/api/v1/tutoring-sessions/{s2.id}/')
        self.assertEqual(resp_student_s2.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Other advisor cannot view s1
        self.client.force_authenticate(user=self.other_advisor_user)
        resp_other = self.client.get(f'/api/v1/tutoring-sessions/{s1.id}/')
        self.assertEqual(resp_other.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_tutoring_session(self):
        self.client.force_authenticate(user=self.coordinator)
        s = TutoringSession.objects.create(
            student=self.student,
            semester=self.semester_1,
            fecha_sesion=date(2024, 2, 10),
            modalidad='PRESENCIAL',
            resumen='Sesión a borrar'
        )

        resp = self.client.delete(f'/api/v1/tutoring-sessions/{s.id}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data, {"details": "Recurso eliminado correctamente", "success": True})
        self.assertFalse(TutoringSession.objects.filter(pk=s.id).exists())

    def test_tutoring_sessions_list_optimized_orm_queries(self):
        # Create multiple sessions with participants and observations
        for i in range(5):
            session = TutoringSession.objects.create(
                student=self.student,
                semester=self.semester_1,
                fecha_sesion=date(2024, 3, 1 + i),
                modalidad='PRESENCIAL',
                resumen=f'Resumen sesión {i}',
                created_by=self.coordinator
            )
            TutoringParticipant.objects.create(
                session=session,
                user=self.advisor_user,
                rol_en_sesion='ASESOR_PRINCIPAL',
                asistencia=True
            )
            TutoringParticipant.objects.create(
                session=session,
                user=self.student_user,
                rol_en_sesion='ESTUDIANTE',
                asistencia=True
            )
            TutoringObservation.objects.create(
                session=session,
                autor=self.advisor_user,
                titulo_tema=f'Tema de avance {i}',
                contenido=f'Comentarios constructivos {i}'
            )

        self.client.force_authenticate(user=self.coordinator)
        # Using assertNumQueries to ensure query count is strictly bounded to 6 queries regardless of N sessions (N+1 eliminated)
        with self.assertNumQueries(6):
            # 1. count query for pagination
            # 2. tutoring sessions with select_related ('student', 'semester', 'created_by')
            # 3. participants in batch for all sessions
            # 4. participant users in batch
            # 5. observations in batch for all sessions
            # 6. observation authors in batch
            resp = self.client.get(f'/api/v1/tutoring-sessions/?student={self.student.id}')
            self.assertEqual(resp.status_code, status.HTTP_200_OK)
            self.assertEqual(len(resp.data['results']), 5)
            # Check serialized fields
            first = resp.data['results'][0]
            self.assertEqual(first['total_participantes'], 2)
            self.assertEqual(first['total_observaciones'], 1)
            self.assertEqual(len(first['participants']), 2)
            self.assertEqual(len(first['observations']), 1)

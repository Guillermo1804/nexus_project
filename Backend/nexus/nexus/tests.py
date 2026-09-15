from datetime import date
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.db import IntegrityError, connection
from django.db.utils import OperationalError
from django.test.utils import CaptureQueriesContext
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.test import APITestCase, APIRequestFactory

from .models import AcademicCommittee, CommitteeMembership, AdminAuditLog, Semester, Student, ThesisProgress, TutoringSession
from .views import StudentViewSet


def jwt_for(user):
    return str(RefreshToken.for_user(user).access_token)


class StudentRBACRelationVisibilityTests(APITestCase):
    def setUp(self):
        self.user_model = get_user_model()
        self.factory = APIRequestFactory()

        self.coordinator = self.user_model.objects.create_user(
            email='coord@test.edu', password='Password123!', role=self.user_model.Role.PROGRAM_COORDINATOR
        )
        self.admin = self.user_model.objects.create_user(
            email='admin@test.edu', password='Password123!', role=self.user_model.Role.SYSTEM_ADMIN
        )
        self.tutor_1 = self.user_model.objects.create_user(
            email='tutor1@test.edu', password='Password123!', role=self.user_model.Role.TUTOR
        )
        self.tutor_2 = self.user_model.objects.create_user(
            email='tutor2@test.edu', password='Password123!', role=self.user_model.Role.TUTOR
        )
        self.student_user_1 = self.user_model.objects.create_user(
            email='student1@test.edu', password='Password123!', role=self.user_model.Role.STUDENT
        )
        self.student_user_2 = self.user_model.objects.create_user(
            email='student2@test.edu', password='Password123!', role=self.user_model.Role.STUDENT
        )

        self.student_1 = Student.objects.create(
            user=self.student_user_1, matricula='DOC-001', nombre_completo='Estudiante Uno', cohorte='2026-A'
        )
        self.student_2 = Student.objects.create(
            user=self.student_user_2, matricula='DOC-002', nombre_completo='Estudiante Dos', cohorte='2026-A'
        )

        self.assignment = CommitteeMembership.objects.create(committee=AcademicCommittee.objects.create(student=self.student_1), user=self.tutor_1, role=CommitteeMembership.Role.ADVISOR)

    def test_coordinator_sees_all_students(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(self.coordinator)}')
        res = self.client.get('/api/v1/students/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data['results']), 2)

    def test_system_admin_cannot_read_academic_students(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(self.admin)}')

        listed = self.client.get('/api/v1/students/')
        retrieved = self.client.get(f'/api/v1/students/{self.student_1.id}/')

        self.assertEqual(listed.status_code, 200)
        self.assertEqual(listed.data['results'], [])
        self.assertEqual(retrieved.status_code, 404)

    def test_tutor_sees_only_assigned_students(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(self.tutor_1)}')
        res = self.client.get('/api/v1/students/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data['results']), 1)
        self.assertEqual(res.data['results'][0]['id'], self.student_1.id)
        self.assertEqual(res.data['results'][0]['matricula'], 'DOC-001')

    def test_unassigned_tutor_sees_empty_list(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(self.tutor_2)}')
        res = self.client.get('/api/v1/students/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data['results']), 0)

    def test_deactivated_assignment_not_visible_to_tutor(self):
        self.assignment.delete()

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(self.tutor_1)}')
        res = self.client.get('/api/v1/students/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data['results']), 0)

    def test_student_sees_only_own_record(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(self.student_user_1)}')
        res = self.client.get('/api/v1/students/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data['results']), 1)
        self.assertEqual(res.data['results'][0]['id'], self.student_1.id)

    def test_get_queryset_direct_filtering(self):
        view = StudentViewSet()
        req = self.factory.get('/api/v1/students/')
        req.user = self.tutor_1
        view.request = req
        qs = view.get_queryset()
        self.assertEqual(list(qs), [self.student_1])

    def test_student_mutations_are_not_exposed(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(self.coordinator)}')
        url = f'/api/v1/students/{self.student_1.id}/'

        for method in ('put', 'patch', 'delete'):
            with self.subTest(method=method):
                response = getattr(self.client, method)(url, {}, format='json')
                self.assertEqual(response.status_code, 405)

        self.assertTrue(Student.objects.filter(pk=self.student_1.pk).exists())


class AcademicCommitteeHu04Tests(APITestCase):
    def setUp(self):
        self.users = get_user_model()
        self.coordinator = self.users.objects.create_user(email='coord-hu04@example.com', password='Password123!', role=self.users.Role.PROGRAM_COORDINATOR)
        self.tutor = self.users.objects.create_user(email='tutor-hu04@example.com', password='Password123!', role=self.users.Role.TUTOR)
        self.member = self.users.objects.create_user(email='member-hu04@example.com', password='Password123!', role=self.users.Role.COMMITTEE_MEMBER)
        self.student = Student.objects.create(matricula='HU04-1', nombre_completo='Sin restricción de estado', cohorte='2026', estatus_activo=False)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(self.coordinator)}')

    def post(self, user, role):
        return self.client.post('/api/v1/committees/', {'student': self.student.id, 'memberships': [{'user': user.id, 'role': role}]}, format='json')

    def test_api_groups_memberships_by_student_without_requiring_advisor_or_active_entities(self):
        self.tutor.is_active = False
        self.tutor.save(update_fields=['is_active'])
        self.assertEqual(self.post(self.tutor, 'COASESOR').status_code, 201)
        response = self.post(self.member, 'COMMITTEE_MEMBER')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(AcademicCommittee.objects.filter(student=self.student).count(), 1)
        self.assertEqual(len(response.data['memberships']), 2)

    def test_membership_role_requires_compatible_institutional_role(self):
        self.assertEqual(self.post(self.member, 'ASESOR').status_code, 400)
        self.assertEqual(self.post(self.tutor, 'COMMITTEE_MEMBER').status_code, 400)

    def test_database_allows_same_user_in_different_roles_and_rejects_second_coadvisor(self):
        committee = AcademicCommittee.objects.create(student=self.student)
        CommitteeMembership.objects.create(committee=committee, user=self.tutor, role='ASESOR')
        CommitteeMembership.objects.create(committee=committee, user=self.tutor, role='COASESOR')
        other = self.users.objects.create_user(email='other-hu04@example.com', password='Password123!', role=self.users.Role.TUTOR)
        with self.assertRaises(IntegrityError):
            CommitteeMembership.objects.create(committee=committee, user=other, role='COASESOR')

    def test_relational_membership_governs_record_authorization(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(self.tutor)}')
        self.assertEqual(self.client.get(f'/api/v1/students/{self.student.id}/overview/').status_code, 404)
        CommitteeMembership.objects.create(committee=AcademicCommittee.objects.create(student=self.student), user=self.tutor, role='ASESOR')
        self.assertEqual(self.client.get(f'/api/v1/students/{self.student.id}/overview/').status_code, 200)


class AuthenticationApiTests(APITestCase):
    def setUp(self):
        self.user_model = get_user_model()
        self.password = 'Correcta-12345'
        self.user = self.user_model.objects.create_user(
            email='alumno@example.com',
            password=self.password,
            first_name='Ana',
            last_name='Lopez',
            role=self.user_model.Role.STUDENT,
        )

    def test_login_returns_token_and_minimal_user_data(self):
        response = self.client.post(
            '/api/v1/auth/login/',
            {'email': self.user.email, 'password': self.password},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['role'], 'STUDENT')
        self.assertEqual(response.data['user']['email'], self.user.email)
        self.assertEqual(response.data['user']['grammatical_gender'], 'UNSPECIFIED')
        self.assertNotIn('password', response.data['user'])

    def test_seed_account_uses_real_password_hash_and_rejects_former_master_password(self):
        call_command('populate_data', verbosity=0)
        seeded_user = self.user_model.objects.get(email='admin@nexus.com')

        self.assertNotEqual(seeded_user.password, 'Admin1234!')
        self.assertTrue(seeded_user.check_password('Admin1234!'))
        self.assertFalse(seeded_user.check_password('Password123!'))

        valid_response = self.client.post(
            '/api/v1/auth/login/',
            {'email': seeded_user.email, 'password': 'Admin1234!'},
            format='json',
        )
        invalid_response = self.client.post(
            '/api/v1/auth/login/',
            {'email': seeded_user.email, 'password': 'Password123!'},
            format='json',
        )

        self.assertEqual(valid_response.status_code, 200)
        self.assertEqual(invalid_response.status_code, 400)
        self.assertNotIn('access', invalid_response.data)

    def test_refresh_rotates_and_blacklists_previous_token(self):
        login = self.client.post(
            '/api/v1/auth/login/',
            {'email': self.user.email, 'password': self.password},
            format='json',
        )

        refreshed = self.client.post(
            '/api/v1/auth/token/refresh/',
            {'refresh': login.data['refresh']},
            format='json',
        )
        reused = self.client.post(
            '/api/v1/auth/token/refresh/',
            {'refresh': login.data['refresh']},
            format='json',
        )

        self.assertEqual(refreshed.status_code, 200)
        self.assertIn('access', refreshed.data)
        self.assertIn('refresh', refreshed.data)
        self.assertNotEqual(refreshed.data['refresh'], login.data['refresh'])
        self.assertEqual(reused.status_code, 401)

    def test_session_profile_includes_effective_permissions(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(self.user)}')

        response = self.client.get('/api/v1/auth/me/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['roles'], ['STUDENT'])
        self.assertEqual(response.data['permissions'], ['records.read.own'])

    def test_only_role_manager_can_list_and_assign_roles(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(self.user)}')
        forbidden = self.client.get('/api/v1/auth/users/')
        self.assertEqual(forbidden.status_code, 403)

        admin = self.user_model.objects.create_user(
            email='admin@example.com',
            password=self.password,
            first_name='Admin',
            last_name='Nexus',
            role=self.user_model.Role.SYSTEM_ADMIN,
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(admin)}')
        listed = self.client.get('/api/v1/auth/users/')
        self.assertEqual(listed.status_code, 200)
        self.assertIn('results', listed.data)
        updated = self.client.patch(
            f'/api/v1/auth/users/{self.user.id}/role/',
            {'role': self.user_model.Role.TUTOR},
            format='json',
        )

        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.data['role'], 'TUTOR')
        self.assertEqual(updated.data['permissions'], ['records.read.assigned', 'tutoring.create'])
        audit_log = AdminAuditLog.objects.get(action=AdminAuditLog.Action.ROLE_ASSIGNED)
        self.assertEqual(audit_log.target_user_id, self.user.id)
        self.assertEqual(audit_log.details, {'previous_role': 'STUDENT', 'new_role': 'TUTOR'})

    def test_role_assignment_rolls_back_when_audit_log_fails(self):
        admin = self.user_model.objects.create_user(
            email='admin@example.com',
            password=self.password,
            first_name='Admin',
            last_name='Nexus',
            role=self.user_model.Role.SYSTEM_ADMIN,
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(admin)}')

        with patch.object(AdminAuditLog.objects, 'create', side_effect=RuntimeError('audit unavailable')):
            with self.assertRaises(RuntimeError):
                self.client.patch(
                    f'/api/v1/auth/users/{self.user.id}/role/',
                    {'role': self.user_model.Role.TUTOR},
                    format='json',
                )

        self.user.refresh_from_db()
        self.assertEqual(self.user.role, self.user_model.Role.STUDENT)
        self.assertEqual(AdminAuditLog.objects.count(), 0)

    def test_invalid_credentials_use_generic_error(self):
        response = self.client.post(
            '/api/v1/auth/login/',
            {'email': self.user.email, 'password': 'incorrecta'},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['non_field_errors'][0], 'Correo o contrasena incorrectos.')

    def test_former_master_password_is_rejected_without_creating_token(self):
        response = self.client.post(
            '/api/v1/auth/login/',
            {'email': self.user.email, 'password': 'Password123!'},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertNotIn('access', response.data)
        self.assertNotIn('access', response.data)

    def test_password_for_another_user_does_not_authenticate_target_user(self):
        other_password = 'Otra-Segura-456'
        self.user_model.objects.create_user(
            email='otra@example.com',
            password=other_password,
            role=self.user_model.Role.TUTOR,
        )

        response = self.client.post(
            '/api/v1/auth/login/',
            {'email': self.user.email, 'password': other_password},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertNotIn('access', response.data)

    def test_login_remains_case_insensitive_for_email(self):
        response = self.client.post(
            '/api/v1/auth/login/',
            {'email': self.user.email.upper(), 'password': self.password},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_former_master_password_rejects_unknown_email(self):
        response = self.client.post(
            '/api/v1/auth/login/',
            {'email': 'unknown@example.com', 'password': 'Password123!'},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertNotIn('access', response.data)

    def test_inactive_user_cannot_login(self):
        self.user.is_active = False
        self.user.save(update_fields=['is_active'])

        for password in (self.password, 'Password123!'):
            with self.subTest(password=password):
                response = self.client.post(
                    '/api/v1/auth/login/',
                    {'email': self.user.email, 'password': password},
                    format='json',
                )

                self.assertEqual(response.status_code, 400)
                self.assertEqual(response.data['non_field_errors'][0], 'Correo o contrasena incorrectos.')
                self.assertNotIn('access', response.data)

    def test_me_requires_a_valid_token(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(self.user)}')

        response = self.client.get('/api/v1/auth/me/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['email'], self.user.email)

    def test_logout_revokes_token(self):
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

        logout_response = self.client.post('/api/v1/auth/logout/', {'refresh': str(refresh)}, format='json')
        refresh_response = self.client.post('/api/v1/auth/token/refresh/', {'refresh': str(refresh)}, format='json')

        self.assertEqual(logout_response.status_code, 200)
        self.assertEqual(logout_response.data, {'logout': True})
        self.assertEqual(refresh_response.status_code, 401)

    def test_registration_routes_do_not_exist(self):
        payload = {'email': 'new@example.com', 'password': 'Segura-12345'}
        for url in ('/api/v1/auth/register/', '/api/auth/register/', '/api/coordinator/students/'):
            with self.subTest(url=url):
                self.assertEqual(self.client.post(url, payload, format='json').status_code, 404)

    def test_non_student_users_do_not_require_student_profile(self):
        roles = [
            self.user_model.Role.PROGRAM_COORDINATOR,
            self.user_model.Role.TUTOR,
            self.user_model.Role.SYSTEM_ADMIN,
        ]
        for role in roles:
            u = self.user_model.objects.create_user(
                email=f'{role.lower()}@nexus.test', password='Password123!', role=role
            )
            self.assertIsNone(u.student)
            self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(u)}')
            response = self.client.get('/api/v1/auth/me/')
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data['role'], role)
            self.assertIsNone(response.data['student_id'])


class ScopeAuthorizationApiTests(APITestCase):
    def setUp(self):
        self.user_model = get_user_model()
        self.student_user = self.user_model.objects.create_user(
            email='student@example.com', password='Correcta-12345', first_name='Ana', last_name='Lopez',
            role=self.user_model.Role.STUDENT,
        )
        self.other_student_user = self.user_model.objects.create_user(
            email='other@example.com', password='Correcta-12345', first_name='Luis', last_name='Gomez',
            role=self.user_model.Role.STUDENT,
        )
        self.tutor = self.user_model.objects.create_user(
            email='tutor@example.com', password='Correcta-12345', first_name='Eva', last_name='Diaz',
            role=self.user_model.Role.TUTOR,
        )
        self.coordinator = self.user_model.objects.create_user(
            email='coordinator@example.com', password='Correcta-12345', first_name='Celia', last_name='Ruiz',
            role=self.user_model.Role.PROGRAM_COORDINATOR,
        )
        self.student = Student.objects.create(
            user=self.student_user,
            matricula='DOC-001',
            nombre_completo='Ana Lopez',
            cohorte='2026',
        )
        self.other_student = Student.objects.create(
            user=self.other_student_user,
            matricula='DOC-002',
            nombre_completo='Luis Gomez',
            cohorte='2026',
        )
        self.semester = Semester.objects.create(
            student=self.student,
            numero=1,
            fecha_inicio=date(2026, 1, 1),
            fecha_fin=date(2026, 6, 30),
        )
        self.other_semester = Semester.objects.create(
            student=self.other_student,
            numero=1,
            fecha_inicio=date(2026, 1, 1),
            fecha_fin=date(2026, 6, 30),
        )

    def authenticate(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(user)}')

    def test_student_can_read_only_own_record(self):
        self.authenticate(self.student_user)
        own_response = self.client.get(f'/api/v1/students/{self.student.id}/overview/')
        other_response = self.client.get(f'/api/v1/students/{self.other_student.id}/overview/')

        self.assertEqual(own_response.status_code, 200)
        self.assertEqual(other_response.status_code, 404)

    def test_assigned_committee_member_and_coordinator_can_read_record(self):
        committee_member = self.user_model.objects.create_user(
            email='committee@example.com', password='Correcta-12345', first_name='Mia', last_name='Soto',
            role=self.user_model.Role.COMMITTEE_MEMBER,
        )
        CommitteeMembership.objects.create(committee=AcademicCommittee.objects.create(student=self.student), user=committee_member, role=CommitteeMembership.Role.COMMITTEE_MEMBER)

        self.authenticate(committee_member)
        self.assertEqual(self.client.get(f'/api/v1/students/{self.student.id}/overview/').status_code, 200)

        self.authenticate(self.coordinator)
        self.assertEqual(self.client.get(f'/api/v1/students/{self.student.id}/overview/').status_code, 200)

    def test_system_admin_cannot_read_student_record(self):
        admin = self.user_model.objects.create_user(
            email='admin_rec@example.com', password='Correcta-12345', first_name='Sys', last_name='Admin',
            role=self.user_model.Role.SYSTEM_ADMIN,
        )
        self.authenticate(admin)
        response = self.client.get(f'/api/v1/students/{self.student.id}/overview/')
        self.assertEqual(response.status_code, 403)

    def test_tutor_can_create_session_only_for_assigned_student(self):
        CommitteeMembership.objects.create(committee=AcademicCommittee.objects.get_or_create(student=self.student)[0], user=self.tutor, role=CommitteeMembership.Role.ADVISOR)
        self.authenticate(self.tutor)
        payload = {
            'student': self.student.id,
            'semester': self.semester.id,
            'fecha_sesion': '2026-02-15',
            'modalidad': 'VIRTUAL',
            'resumen': 'Seguimiento del avance.',
        }
        allowed = self.client.post('/api/v1/tutoring/', payload, format='json')
        payload['student'] = self.other_student.id
        payload['semester'] = self.other_semester.id
        denied = self.client.post('/api/v1/tutoring/', payload, format='json')

        self.assertEqual(allowed.status_code, 201)
        self.assertEqual(denied.status_code, 403)
        self.assertEqual(TutoringSession.objects.count(), 1)

    def test_tutor_cannot_use_another_students_semester(self):
        CommitteeMembership.objects.create(committee=AcademicCommittee.objects.get_or_create(student=self.student)[0], user=self.tutor, role=CommitteeMembership.Role.ADVISOR)
        self.authenticate(self.tutor)
        response = self.client.post('/api/v1/tutoring/', {
            'student': self.student.id,
            'semester': self.other_semester.id,
            'fecha_sesion': '2026-02-15',
            'modalidad': 'VIRTUAL',
            'resumen': 'Seguimiento.',
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertEqual(TutoringSession.objects.count(), 0)

    def test_only_coordinator_can_read_global_academic_overview(self):
        self.authenticate(self.coordinator)
        allowed = self.client.get('/api/v1/academic/overview/')
        self.assertEqual(allowed.status_code, 200)
        self.assertEqual(len(allowed.data['results']), 2)

        self.authenticate(self.student_user)
        denied = self.client.get('/api/v1/academic/overview/')
        self.assertEqual(denied.status_code, 403)


class StudentCreationHu03Tests(APITestCase):
    def setUp(self):
        self.user_model = get_user_model()
        self.coordinator = self.user_model.objects.create_user(
            email='hu03-coordinator@example.com', password='Correcta-12345', role=self.user_model.Role.PROGRAM_COORDINATOR
        )
        self.payload = {
            'first_name': 'Ana', 'last_name': 'Lopez', 'email': 'hu03-student@example.com',
            'password': 'Correcta-12345', 'matricula': 'A', 'programa_doctoral': 'Doctorado en Ciencias',
            'fecha_ingreso': '2026-01-01', 'cohorte': '2026-A',
        }

    def post(self, matricula='A', user=None, email=None):
        self.client.credentials(**({'HTTP_AUTHORIZATION': f'Bearer {jwt_for(user)}'} if user else {}))
        return self.client.post('/api/v1/students/', {
            **self.payload, 'matricula': matricula, 'email': email or f'{matricula.lower()}@example.com'
        }, format='json')

    def test_only_program_coordinator_can_create(self):
        self.assertEqual(self.post().status_code, 401)
        for role in (self.user_model.Role.STUDENT, self.user_model.Role.TUTOR, self.user_model.Role.SYSTEM_ADMIN):
            with self.subTest(role=role):
                user = self.user_model.objects.create_user(email=f'{role.lower()}@example.com', password='Correcta-12345', role=role)
                self.assertEqual(self.post(user=user).status_code, 403)
        self.assertEqual(self.post(user=self.coordinator).status_code, 201)

    def test_matricula_lengths_and_characters(self):
        for index, length in enumerate((1, 9, 10, 20)):
            with self.subTest(length=length):
                self.assertEqual(self.post('A' * length, self.coordinator, f'valid-{index}@example.com').status_code, 201)
        self.assertEqual(self.post('A' * 21, self.coordinator, 'too-long@example.com').status_code, 400)
        self.assertEqual(self.post('INVALID_1', self.coordinator, 'invalid-char@example.com').status_code, 400)

    def test_matricula_is_trimmed_uppercased_and_unique_case_insensitively(self):
        first = self.post('  doc-2026-abc  ', self.coordinator, 'first@example.com')
        duplicate = self.post('DOC-2026-ABC', self.coordinator, 'second@example.com')
        self.assertEqual(first.status_code, 201)
        self.assertEqual(first.data['matricula'], 'DOC-2026-ABC')
        self.assertEqual(duplicate.status_code, 400)
        self.assertIn('matricula', duplicate.data)


class SuperAdminApiTests(APITestCase):
    def setUp(self):
        self.user_model = get_user_model()
        self.admin = self.user_model.objects.create_superuser(
            email='system@example.com', password='Correcta-12345', first_name='System', last_name='Admin',
        )
        self.student_user = self.user_model.objects.create_user(
            email='student@example.com', password='Correcta-12345', first_name='Ana', last_name='Lopez',
        )
        self.student = Student.objects.create(
            user=self.student_user, matricula='DOC-001', nombre_completo='Ana Lopez', cohorte='2026',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(self.admin)}')

    def test_system_admin_can_create_institutional_user(self):
        response = self.client.post('/api/v1/admin/users/', {
            'first_name': 'Eva',
            'last_name': 'Diaz',
            'email': 'eva@example.com',
            'password': 'Segura-12345',
            'role': 'TUTOR',
        }, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['role'], 'TUTOR')
        self.assertTrue(self.user_model.objects.filter(email='eva@example.com', role='TUTOR').exists())
        self.assertTrue(AdminAuditLog.objects.filter(
            action=AdminAuditLog.Action.INSTITUTIONAL_USER_CREATED,
            actor=self.admin,
            target_user__email='eva@example.com',
        ).exists())

    def test_institutional_user_is_not_kept_if_audit_log_fails(self):
        with patch.object(AdminAuditLog.objects, 'create', side_effect=OperationalError('no such table: nexus_adminauditlog')):
            with self.assertRaises(OperationalError):
                self.client.post('/api/v1/admin/users/', {
                    'first_name': 'Eva',
                    'last_name': 'Diaz',
                    'email': 'eva@example.com',
                    'password': 'Segura-12345',
                    'role': 'TUTOR',
                }, format='json')

        self.assertFalse(self.user_model.objects.filter(email='eva@example.com').exists())

    def test_coordinator_can_create_and_delete_committee_membership_and_admin_is_forbidden(self):
        tutor = self.user_model.objects.create_user(email='tutor@example.com', password='Correcta-12345', role=self.user_model.Role.TUTOR)
        payload = {'student': self.student.id, 'memberships': [{'user': tutor.id, 'role': 'COASESOR'}]}
        self.assertEqual(self.client.post('/api/v1/committees/', payload, format='json').status_code, 403)
        coord = self.user_model.objects.create_user(email='coord@example.com', password='Correcta-12345', role=self.user_model.Role.PROGRAM_COORDINATOR)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(coord)}')
        created = self.client.post('/api/v1/committees/', payload, format='json')
        self.assertEqual(created.status_code, 201)
        membership_id = created.data['memberships'][0]['id']
        self.assertEqual(self.client.delete(f'/api/v1/committee-memberships/{membership_id}/').status_code, 204)

    def test_non_admin_cannot_create_institutional_user_or_assignment(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(self.student_user)}')
        user_response = self.client.post('/api/v1/admin/users/', {}, format='json')
        assignment_response = self.client.get('/api/v1/committees/')

        self.assertEqual(user_response.status_code, 403)
        self.assertEqual(assignment_response.status_code, 403)

    def test_system_admin_can_read_audit_history_and_role_changes_are_recorded(self):
        response = self.client.patch(
            f'/api/v1/auth/users/{self.student_user.id}/role/',
            {'role': self.user_model.Role.TUTOR},
            format='json',
        )
        audit_response = self.client.get('/api/v1/admin/audit/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(audit_response.status_code, 200)
        self.assertEqual(audit_response.data['results'][0]['action'], 'ROLE_ASSIGNED')
        self.assertEqual(audit_response.data['results'][0]['details']['previous_role'], 'STUDENT')
        self.assertEqual(audit_response.data['results'][0]['details']['new_role'], 'TUTOR')

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(self.student_user)}')
        self.assertEqual(self.client.get('/api/v1/admin/audit/').status_code, 403)

    def test_system_admin_superuser_cannot_list_academic_students(self):
        response = self.client.get('/api/v1/admin/students/')

        self.assertEqual(response.status_code, 403)

    def test_hu05_create_semester_success(self):
        coordinator = self.user_model.objects.create_user(
            email='coord_sem@test.com', password='password123', role=self.user_model.Role.PROGRAM_COORDINATOR
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(coordinator)}')
        payload = {
            'numero': 1,
            'fecha_inicio': '2025-01-15',
            'fecha_fin': '2025-06-30',
            'is_active': True,
        }
        response = self.client.post(f'/api/v1/students/{self.student.id}/semesters/', payload, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['numero'], 1)
        self.assertEqual(response.data['student'], self.student.id)
        self.assertTrue(response.data['is_active'])

    def test_hu05_semester_number_out_of_range_rejected(self):
        coordinator = self.user_model.objects.create_user(
            email='coord_sem_range@test.com', password='password123', role=self.user_model.Role.PROGRAM_COORDINATOR
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(coordinator)}')
        payload = {
            'numero': 7,
            'fecha_inicio': '2025-01-15',
            'fecha_fin': '2025-06-30',
        }
        response = self.client.post(f'/api/v1/students/{self.student.id}/semesters/', payload, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('numero', response.data)

    def test_hu05_semester_end_date_before_start_rejected(self):
        coordinator = self.user_model.objects.create_user(
            email='coord_sem_date@test.com', password='password123', role=self.user_model.Role.PROGRAM_COORDINATOR
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(coordinator)}')
        payload = {
            'numero': 2,
            'fecha_inicio': '2025-06-30',
            'fecha_fin': '2025-01-15',
        }
        response = self.client.post(f'/api/v1/students/{self.student.id}/semesters/', payload, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('fecha_fin', response.data)

    def test_hu05_semester_duplicate_rejected(self):
        Semester.objects.create(
            student=self.student, numero=1, fecha_inicio='2025-01-15', fecha_fin='2025-06-30'
        )
        coordinator = self.user_model.objects.create_user(
            email='coord_sem_dup@test.com', password='password123', role=self.user_model.Role.PROGRAM_COORDINATOR
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(coordinator)}')
        payload = {
            'numero': 1,
            'fecha_inicio': '2025-01-15',
            'fecha_fin': '2025-06-30',
        }
        response = self.client.post(f'/api/v1/students/{self.student.id}/semesters/', payload, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('numero', response.data)

    def test_hu05_only_coordinator_can_write_semesters(self):
        semester = Semester.objects.create(
            student=self.student, numero=1, fecha_inicio='2025-01-15', fecha_fin='2025-06-30'
        )
        payload = {'numero': 2, 'fecha_inicio': '2025-07-01', 'fecha_fin': '2025-12-15'}
        for role in (self.user_model.Role.SYSTEM_ADMIN,):
            with self.subTest(role=role):
                user = self.user_model.objects.create_user(
                    email=f'{role.lower()}-sem@test.com', password='password123', role=role
                )
                self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(user)}')
                self.assertEqual(self.client.post(f'/api/v1/students/{self.student.id}/semesters/', payload, format='json').status_code, 403)
                self.assertEqual(self.client.patch(
                    f'/api/v1/students/{self.student.id}/semesters/{semester.id}/', {'is_active': False}, format='json'
                ).status_code, 403)

    def test_hu05_read_access_and_unversioned_alias_removed(self):
        semester = Semester.objects.create(
            student=self.student, numero=1, fecha_inicio='2025-01-15', fecha_fin='2025-06-30'
        )
        coordinator = self.user_model.objects.create_user(
            email='coordinator-sem@test.com', password='password123', role=self.user_model.Role.PROGRAM_COORDINATOR
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(coordinator)}')
        response = self.client.get(f'/api/v1/students/{self.student.id}/semesters/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data[0]['id'], semester.id)

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(self.admin)}')
        self.assertEqual(self.client.get(f'/api/v1/students/{self.student.id}/semesters/').status_code, 403)
        self.assertEqual(self.client.get(f'/api/students/{self.student.id}/semesters/').status_code, 404)

    def test_hu06_student_overview_contains_all_six_categories(self):
        coordinator = self.user_model.objects.create_user(
            email='coord_hu06@test.com', password='password123', role=self.user_model.Role.PROGRAM_COORDINATOR
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(coordinator)}')
        with CaptureQueriesContext(connection) as queries:
            response = self.client.get(f'/api/v1/students/{self.student.id}/overview/')
        self.assertLessEqual(len(queries), 10)
        self.assertEqual(response.status_code, 200)
        data = response.data
        self.assertIn('student', data)
        self.assertIn('current_semester', data)
        self.assertIn('advisors', data)
        self.assertIn('last_tutoring', data)
        self.assertIn('open_agreements', data)
        self.assertIn('thesis_progress', data)
        self.assertIsNone(data['thesis_progress'])

        semester = Semester.objects.create(
            student=self.student, numero=1, fecha_inicio='2026-01-01', fecha_fin='2026-06-30'
        )
        ThesisProgress.objects.create(student=self.student, semester=semester, porcentaje_avance=0)
        response = self.client.get(f'/api/v1/students/{self.student.id}/overview/')
        self.assertEqual(response.data['thesis_progress']['porcentaje_avance'], 0)

    def test_hu06_overview_is_strictly_read_only_and_system_admin_is_blocked(self):
        coordinator = self.user_model.objects.create_user(
            email='coord_hu06_read@test.com', password='password123', role=self.user_model.Role.PROGRAM_COORDINATOR
        )
        url = f'/api/v1/students/{self.student.id}/overview/'
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(coordinator)}')
        for method in ('post', 'put', 'patch', 'delete'):
            with self.subTest(method=method):
                self.assertEqual(getattr(self.client, method)(url, {}, format='json').status_code, 405)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(self.admin)}')
        self.assertEqual(self.client.get(url).status_code, 403)

    def test_removed_academic_admin_role_is_rejected(self):
        response = self.client.patch(
            f'/api/v1/auth/users/{self.student_user.id}/role/',
            {'role': 'ACADEMIC_ADMIN'},
            format='json',
        )
        self.assertEqual(response.status_code, 400)

        create_response = self.client.post('/api/v1/admin/users/', {
            'first_name': 'Legacy', 'last_name': 'Role', 'email': 'legacy@example.com',
            'password': 'Segura-12345', 'role': 'ACADEMIC_ADMIN',
        }, format='json')
        self.assertEqual(create_response.status_code, 400)

    def test_single_admin_restriction_cannot_promote_to_system_admin(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(self.admin)}')
        response = self.client.patch(
            f'/api/v1/auth/users/{self.student_user.id}/role/',
            {'role': 'SYSTEM_ADMIN'},
            format='json',
        )
        self.assertEqual(response.status_code, 400)

    def test_system_admin_role_cannot_be_modified(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(self.admin)}')
        response = self.client.patch(
            f'/api/v1/auth/users/{self.admin.id}/role/',
            {'role': 'PROGRAM_COORDINATOR'},
            format='json',
        )
        self.assertEqual(response.status_code, 400)

    def test_form_validation_name_letters_only(self):
        coord = self.user_model.objects.create_user(
            email='coord_val@test.com', password='password123', role=self.user_model.Role.PROGRAM_COORDINATOR
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(coord)}')
        response = self.client.post('/api/v1/students/', {
            'first_name': 'Juan123',
            'last_name': 'Perez',
            'email': 'juan123@example.com',
            'password': 'Password-1234',
            'matricula': 'DOC202401',
            'programa_doctoral': 'Doctorado en Ciencias',
            'fecha_ingreso': '2024-01-01',
            'cohorte': '2024-A',
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('first_name', response.data)

    def test_form_validation_matricula_max_20_chars(self):
        coord = self.user_model.objects.create_user(
            email='coord_val2@test.com', password='password123', role=self.user_model.Role.PROGRAM_COORDINATOR
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(coord)}')
        response = self.client.post('/api/v1/students/', {
            'first_name': 'Juan',
            'last_name': 'Perez',
            'email': 'juanval2@example.com',
            'password': 'Password-1234',
            'matricula': '123456789012345678901',
            'programa_doctoral': 'Doctorado en Ciencias',
            'fecha_ingreso': '2024-01-01',
            'cohorte': '2024-A',
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('matricula', response.data)

    def test_committee_assignment_requires_student_role_for_student(self):
        coord = self.user_model.objects.create_user(
            email='coord_com@test.com', password='password123', role=self.user_model.Role.PROGRAM_COORDINATOR
        )
        tutor = self.user_model.objects.create_user(
            email='tutor_com@test.com', password='password123', role=self.user_model.Role.TUTOR
        )
        # Create non-student user who has a student profile
        teacher_user = self.user_model.objects.create_user(
            email='prof@test.com', password='password123', role=self.user_model.Role.TUTOR
        )
        fake_student = Student.objects.create(
            user=teacher_user, matricula='FAKESTUD1', nombre_completo='Prof Fake'
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(coord)}')
        response = self.client.post('/api/v1/committees/', {'student': fake_student.id, 'memberships': [{'user': tutor.id, 'role': 'ASESOR'}]}, format='json')
        self.assertEqual(response.status_code, 201)

    def test_tutoring_unassigned_tutor_gets_403(self):
        unassigned_tutor = self.user_model.objects.create_user(
            email='unassigned@test.com', password='password123', role=self.user_model.Role.TUTOR
        )
        sem = Semester.objects.create(
            student=self.student, numero=1, fecha_inicio='2025-01-15', fecha_fin='2025-06-30'
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(unassigned_tutor)}')
        response = self.client.post('/api/v1/tutoring/', {
            'student': self.student.id,
            'semester': sem.id,
            'fecha_sesion': '2025-02-01',
            'modalidad': 'PRESENCIAL',
            'resumen': 'Sesion no autorizada',
        }, format='json')
        self.assertEqual(response.status_code, 403)

    def test_tutoring_assigned_committee_member_gets_201(self):
        assigned_tutor = self.user_model.objects.create_user(
            email='assigned@test.com', password='password123', role=self.user_model.Role.TUTOR
        )
        CommitteeMembership.objects.create(committee=AcademicCommittee.objects.create(student=self.student), user=assigned_tutor, role=CommitteeMembership.Role.ADVISOR)
        sem = Semester.objects.create(
            student=self.student, numero=1, fecha_inicio='2025-01-15', fecha_fin='2025-06-30'
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(assigned_tutor)}')
        response = self.client.post('/api/v1/tutoring/', {
            'student': self.student.id,
            'semester': sem.id,
            'fecha_sesion': '2025-02-01',
            'modalidad': 'PRESENCIAL',
            'resumen': 'Sesion autorizada',
        }, format='json')
        self.assertEqual(response.status_code, 201)

    def test_hu06_academic_summary_canonical_endpoint(self):
        coord = self.user_model.objects.create_user(
            email='coord_hu06_sum@test.com', password='password123', role=self.user_model.Role.PROGRAM_COORDINATOR
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(coord)}')
        response = self.client.get(f'/api/v1/students/{self.student.id}/overview/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['student']['matricula'], self.student.matricula)
        self.assertEqual(self.client.get(f'/api/students/{self.student.id}/academic-summary/').status_code, 404)

    def test_non_student_user_cannot_be_changed_to_student(self):
        tutor = self.user_model.objects.create_user(
            email='tutor_role_change@test.com', password='password123', role=self.user_model.Role.TUTOR
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(self.admin)}')
        response = self.client.patch(
            f'/api/v1/auth/users/{tutor.id}/role/',
            {'role': 'STUDENT'},
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('estudiante', response.data['detail'])

    def test_system_admin_cannot_access_academic_summary(self):
        res = self.client.get(f'/api/v1/students/{self.student.id}/overview/')
        self.assertEqual(res.status_code, 403)

    def test_student_creation_supports_grammatical_gender(self):
        coordinator = self.user_model.objects.create_user(
            email='gender_coord@example.com', password='Segura-12345', role=self.user_model.Role.PROGRAM_COORDINATOR
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(coordinator)}')
        response = self.client.post(
            '/api/v1/students/',
            {
                'first_name': 'Valeria',
                'last_name': 'Rios',
                'email': 'valeria@example.com',
                'password': 'Segura-12345',
                'matricula': 'DOC-099',
                'programa_doctoral': 'Doctorado en Ciencias',
                'fecha_ingreso': '2026-01-01',
                'cohorte': '2026',
                'grammatical_gender': 'FEMININE',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 201)
        student_user = self.user_model.objects.get(email='valeria@example.com')
        self.assertEqual(student_user.grammatical_gender, 'FEMININE')

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(student_user)}')
        me_response = self.client.get('/api/v1/auth/me/')
        self.assertEqual(me_response.status_code, 200)
        self.assertEqual(me_response.data['grammatical_gender'], 'FEMININE')



from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from apps.identity.permissions import (
    IsCoordinator,
    IsAdvisor,
    IsStudent,
    IsAssignedAdvisorOrStudent,
    RolePermissionBase
)
from apps.students.models import Student, Semester, AcademicCommittee

User = get_user_model()


class MockView:
    pass


class RBACPermissionsTestCase(TestCase):
    """
    Pruebas unitarias de control de acceso basado en roles (RBAC) - HU-02.
    """

    def setUp(self):
        self.factory = RequestFactory()
        self.view = MockView()

        # 1. Crear usuarios con diferentes roles
        self.coordinator = User.objects.create_user(
            email='coord@nexus.edu',
            password='Password123!',
            first_name='Carlos',
            last_name='Coordinador',
            role='COORDINADOR'
        )
        self.advisor_assigned = User.objects.create_user(
            email='advisor1@nexus.edu',
            password='Password123!',
            first_name='Ana',
            last_name='Asesora',
            role='ASESOR'
        )
        self.advisor_unassigned = User.objects.create_user(
            email='advisor2@nexus.edu',
            password='Password123!',
            first_name='Pedro',
            last_name='Asesor',
            role='ASESOR'
        )
        self.student_user_1 = User.objects.create_user(
            email='student1@nexus.edu',
            password='Password123!',
            first_name='Juan',
            last_name='Perez',
            role='ESTUDIANTE'
        )
        self.student_user_2 = User.objects.create_user(
            email='student2@nexus.edu',
            password='Password123!',
            first_name='Maria',
            last_name='Lopez',
            role='ESTUDIANTE'
        )
        self.superuser = User.objects.create_superuser(
            email='admin@nexus.edu',
            password='AdminPassword123!',
            first_name='Super',
            last_name='Admin'
        )

        # 2. Crear expedientes de estudiantes
        self.student_1 = Student.objects.create(
            user=self.student_user_1,
            matricula='DOC-2026-001',
            nombre_completo='Juan Perez',
            programa_doctoral='Doctorado en Ciencias',
            cohorte='2026-A'
        )
        self.student_2 = Student.objects.create(
            user=self.student_user_2,
            matricula='DOC-2026-002',
            nombre_completo='Maria Lopez',
            programa_doctoral='Doctorado en Ciencias',
            cohorte='2026-A'
        )

        # 3. Asignar asesor 1 al comité del estudiante 1
        self.committee_member = AcademicCommittee.objects.create(
            student=self.student_1,
            user=self.advisor_assigned,
            rol_comite='ASESOR_PRINCIPAL',
            is_active=True
        )

    def _create_request(self, user):
        request = self.factory.get('/dummy-url/')
        request.user = user
        return request

    def test_is_coordinator_permission(self):
        perm = IsCoordinator()

        # Coordinador y Superusuario tienen acceso
        req_coord = self._create_request(self.coordinator)
        self.assertTrue(perm.has_permission(req_coord, self.view))

        req_super = self._create_request(self.superuser)
        self.assertTrue(perm.has_permission(req_super, self.view))

        # Asesor y Estudiante no tienen acceso
        req_adv = self._create_request(self.advisor_assigned)
        self.assertFalse(perm.has_permission(req_adv, self.view))

        req_stu = self._create_request(self.student_user_1)
        self.assertFalse(perm.has_permission(req_stu, self.view))

    def test_is_advisor_permission(self):
        perm = IsAdvisor()

        # Asesor y Superusuario tienen acceso
        req_adv = self._create_request(self.advisor_assigned)
        self.assertTrue(perm.has_permission(req_adv, self.view))

        req_super = self._create_request(self.superuser)
        self.assertTrue(perm.has_permission(req_super, self.view))

        # Coordinador y Estudiante no tienen acceso directo como Asesor
        req_coord = self._create_request(self.coordinator)
        self.assertFalse(perm.has_permission(req_coord, self.view))

        req_stu = self._create_request(self.student_user_1)
        self.assertFalse(perm.has_permission(req_stu, self.view))

    def test_is_student_permission(self):
        perm = IsStudent()

        # Estudiante y Superusuario tienen acceso
        req_stu = self._create_request(self.student_user_1)
        self.assertTrue(perm.has_permission(req_stu, self.view))

        req_super = self._create_request(self.superuser)
        self.assertTrue(perm.has_permission(req_super, self.view))

        # Coordinador y Asesor no tienen acceso como Estudiante
        req_coord = self._create_request(self.coordinator)
        self.assertFalse(perm.has_permission(req_coord, self.view))

        req_adv = self._create_request(self.advisor_assigned)
        self.assertFalse(perm.has_permission(req_adv, self.view))

    def test_is_assigned_advisor_or_student_object_permission(self):
        """
        CA-02.1: Estudiante solo consulta sus expedientes autorizados.
        CA-02.2: Asesor solo accede a estudiantes asociados en comité.
        CA-02.3: Coordinador consulta globalmente.
        """
        perm = IsAssignedAdvisorOrStudent()

        # 1. Coordinador puede acceder al estudiante 1 y estudiante 2
        req_coord = self._create_request(self.coordinator)
        self.assertTrue(perm.has_object_permission(req_coord, self.view, self.student_1))
        self.assertTrue(perm.has_object_permission(req_coord, self.view, self.student_2))
        self.assertTrue(perm.has_object_permission(req_coord, self.view, self.committee_member))

        # 2. Estudiante 1 puede acceder a su propio perfil / objeto
        req_stu1 = self._create_request(self.student_user_1)
        self.assertTrue(perm.has_object_permission(req_stu1, self.view, self.student_1))
        self.assertTrue(perm.has_object_permission(req_stu1, self.view, self.committee_member))

        # 3. Estudiante 1 NO puede acceder al expediente del Estudiante 2
        self.assertFalse(perm.has_object_permission(req_stu1, self.view, self.student_2))

        # 4. Asesor asignado puede acceder al Estudiante 1 y su comité
        req_adv_assigned = self._create_request(self.advisor_assigned)
        self.assertTrue(perm.has_object_permission(req_adv_assigned, self.view, self.student_1))
        self.assertTrue(perm.has_object_permission(req_adv_assigned, self.view, self.committee_member))

        # 5. Asesor asignado NO puede acceder al Estudiante 2 (no asignado)
        self.assertFalse(perm.has_object_permission(req_adv_assigned, self.view, self.student_2))

        # 6. Asesor no asignado NO puede acceder a Estudiante 1 ni a Estudiante 2
        req_adv_unassigned = self._create_request(self.advisor_unassigned)
        self.assertFalse(perm.has_object_permission(req_adv_unassigned, self.view, self.student_1))
        self.assertFalse(perm.has_object_permission(req_adv_unassigned, self.view, self.student_2))

    def test_inactive_committee_member_denied(self):
        """
        Si la asignación en comité pasa a is_active=False, el asesor pierde acceso.
        """
        perm = IsAssignedAdvisorOrStudent()
        self.committee_member.is_active = False
        self.committee_member.save()

        req_adv = self._create_request(self.advisor_assigned)
        self.assertFalse(perm.has_object_permission(req_adv, self.view, self.student_1))

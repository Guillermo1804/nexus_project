from django.test import TestCase
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.students.models import Student, AcademicCommittee
from apps.students.serializers import AcademicCommitteeSerializer

User = get_user_model()


class AcademicCommitteeTestCase(TestCase):
    """
    Pruebas unitarias y de integración para la asignación de comité tutorial (HU-04).
    """

    def setUp(self):
        self.client = APIClient()

        # 1. Usuarios
        self.coordinator = User.objects.create_user(
            email='coord@nexus.edu',
            password='Password123!',
            first_name='Laura',
            last_name='Coordinadora',
            role='COORDINADOR'
        )
        self.advisor_1 = User.objects.create_user(
            email='dr.garcia@nexus.edu',
            password='Password123!',
            first_name='Roberto',
            last_name='Garcia',
            role='ASESOR'
        )
        self.advisor_2 = User.objects.create_user(
            email='dra.martinez@nexus.edu',
            password='Password123!',
            first_name='Sofia',
            last_name='Martinez',
            role='ASESOR'
        )
        self.student_user_1 = User.objects.create_user(
            email='alumno1@nexus.edu',
            password='Password123!',
            first_name='Daniel',
            last_name='Morales',
            role='ESTUDIANTE'
        )
        self.student_user_2 = User.objects.create_user(
            email='alumno2@nexus.edu',
            password='Password123!',
            first_name='Elena',
            last_name='Torres',
            role='ESTUDIANTE'
        )

        # 2. Estudiantes
        self.student_1 = Student.objects.create(
            user=self.student_user_1,
            matricula='DOC-2026-010',
            nombre_completo='Daniel Morales',
            programa_doctoral='Doctorado en Tecnologías',
            cohorte='2026-A'
        )
        self.student_2 = Student.objects.create(
            user=self.student_user_2,
            matricula='DOC-2026-020',
            nombre_completo='Elena Torres',
            programa_doctoral='Doctorado en Tecnologías',
            cohorte='2026-A'
        )

    def test_create_academic_committee_model_success(self):
        """
        CA-04.1 y CA-04.2: Asignar asesor principal con rol compatible.
        """
        member = AcademicCommittee.objects.create(
            student=self.student_1,
            user=self.advisor_1,
            rol_comite='ASESOR_PRINCIPAL'
        )
        self.assertEqual(member.rol_comite, 'ASESOR_PRINCIPAL')
        self.assertTrue(member.is_active)
        self.assertEqual(self.student_1.committee_members.count(), 1)
        self.assertEqual(self.student_1.committee_members.first().user, self.advisor_1)

    def test_incompatible_role_validation(self):
        """
        CA-04.1: Solo pueden seleccionarse usuarios con rol compatible (ASESOR o COORDINADOR).
        Un usuario con rol ESTUDIANTE debe fallar la validación.
        """
        member = AcademicCommittee(
            student=self.student_1,
            user=self.student_user_2,  # Rol ESTUDIANTE no permitido en comité
            rol_comite='COASESOR'
        )
        with self.assertRaises(ValidationError):
            member.full_clean()

    def test_serializer_role_validation(self):
        """
        AcademicCommitteeSerializer debe rechazar asignaciones de usuarios no compatibles.
        """
        payload = {
            'student': self.student_1.id,
            'user': self.student_user_2.id,
            'rol_comite': 'VOCAL'
        }
        serializer = AcademicCommitteeSerializer(data=payload)
        self.assertFalse(serializer.is_valid())
        self.assertIn('user', serializer.errors)

    def test_api_coordinator_can_assign_and_list_committee(self):
        """
        El coordinador puede asignar miembros vía API y consultarlos.
        """
        self.client.force_authenticate(user=self.coordinator)

        # 1. Asignar Asesor Principal
        url = f'/api/v1/students/{self.student_1.id}/committee/'
        payload = {
            'user': self.advisor_1.id,
            'rol_comite': 'ASESOR_PRINCIPAL'
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('committee_member_created_id', response.data)
        member_id = response.data['committee_member_created_id']

        # 2. Asignar Coasesor
        payload_co = {
            'user': self.advisor_2.id,
            'rol_comite': 'COASESOR'
        }
        response_co = self.client.post(url, payload_co, format='json')
        self.assertEqual(response_co.status_code, status.HTTP_201_CREATED)

        # 3. Listar miembros
        get_res = self.client.get(url)
        self.assertEqual(get_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(get_res.data), 2)

        # 4. Remover miembro
        delete_url = f'/api/v1/students/{self.student_1.id}/committee/{member_id}/'
        del_res = self.client.delete(delete_url)
        self.assertEqual(del_res.status_code, status.HTTP_200_OK)
        self.assertEqual(self.student_1.committee_members.count(), 1)

    def test_api_student_and_advisor_cannot_assign_committee(self):
        """
        Estudiantes y Asesores no pueden crear ni remover miembros del comité (403 Forbidden).
        """
        # Estudiante intentando asignar miembro
        self.client.force_authenticate(user=self.student_user_1)
        url = f'/api/v1/students/{self.student_1.id}/committee/'
        payload = {
            'user': self.advisor_1.id,
            'rol_comite': 'ASESOR_PRINCIPAL'
        }
        res_stu = self.client.post(url, payload, format='json')
        self.assertEqual(res_stu.status_code, status.HTTP_403_FORBIDDEN)

        # Asesor intentando asignar miembro
        self.client.force_authenticate(user=self.advisor_1)
        res_adv = self.client.post(url, payload, format='json')
        self.assertEqual(res_adv.status_code, status.HTTP_403_FORBIDDEN)

    def test_duplicate_committee_assignment_rejected(self):
        """
        No se puede asignar el mismo rol al mismo usuario para un mismo estudiante.
        """
        AcademicCommittee.objects.create(
            student=self.student_1,
            user=self.advisor_1,
            rol_comite='ASESOR_PRINCIPAL'
        )

        self.client.force_authenticate(user=self.coordinator)
        url = f'/api/v1/students/{self.student_1.id}/committee/'
        payload = {
            'user': self.advisor_1.id,
            'rol_comite': 'ASESOR_PRINCIPAL'
        }
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

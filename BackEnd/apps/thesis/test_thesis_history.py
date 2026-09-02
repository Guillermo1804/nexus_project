from datetime import date, timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase
from rest_framework import status

from apps.students.models import Student, Semester, AcademicCommittee
from apps.thesis.models import ThesisProgress
from apps.evidence.models import Evidence

User = get_user_model()


class ThesisHistoryAndIntegrityTests(APITestCase):
    """
    Pruebas unitarias y de integración para HU-16:
    - Endpoint longitudinal histórico de tesis (/api/v1/thesis/history/).
    - No sobreescritura de registros históricos previos de semestres anteriores.
    - Ordenación cronológica y cálculo de progreso actual.
    - Aislamiento RBAC (Estudiante, Asesor, Coordinador).
    - Integridad relacional entre avances de tesis y evidencias documentales adjuntas (Dev 10).
    """

    def setUp(self):
        # 1. Coordinador
        self.coordinator = User.objects.create_superuser(
            email='coord_hist@nexus.edu.mx',
            password='Password123!',
            first_name='Dr. Carlos',
            last_name='Coordinador'
        )

        # 2. Asesores
        self.advisor_assigned = User.objects.create_user(
            email='asesor_asignado@nexus.edu.mx',
            password='Password123!',
            first_name='Dra. Laura',
            last_name='Méndez',
            role='ASESOR'
        )
        self.advisor_unassigned = User.objects.create_user(
            email='asesor_ajeno@nexus.edu.mx',
            password='Password123!',
            first_name='Dr. Fernando',
            last_name='Ruiz',
            role='ASESOR'
        )

        # 3. Estudiante 1 (con 3 semestres)
        self.student_user1 = User.objects.create_user(
            email='alumno1_hist@nexus.edu.mx',
            password='Password123!',
            first_name='Gabriel',
            last_name='Hernández',
            role='ESTUDIANTE'
        )
        self.student1 = Student.objects.create(
            user=self.student_user1,
            matricula='DOC-2025-010',
            nombre_completo='Gabriel Hernández',
            cohorte='2025-A'
        )
        self.sem1 = Semester.objects.create(
            student=self.student1,
            numero=1,
            fecha_inicio=date(2024, 1, 15),
            fecha_fin=date(2024, 6, 30)
        )
        self.sem2 = Semester.objects.create(
            student=self.student1,
            numero=2,
            fecha_inicio=date(2024, 8, 1),
            fecha_fin=date(2024, 12, 15)
        )
        self.sem3 = Semester.objects.create(
            student=self.student1,
            numero=3,
            fecha_inicio=date(2025, 1, 15),
            fecha_fin=date(2025, 6, 30)
        )

        AcademicCommittee.objects.create(
            student=self.student1,
            user=self.advisor_assigned,
            rol_comite='ASESOR_PRINCIPAL',
            is_active=True
        )

        # 4. Estudiante 2
        self.student_user2 = User.objects.create_user(
            email='alumno2_hist@nexus.edu.mx',
            password='Password123!',
            first_name='Sofía',
            last_name='Torres',
            role='ESTUDIANTE'
        )
        self.student2 = Student.objects.create(
            user=self.student_user2,
            matricula='DOC-2025-020',
            nombre_completo='Sofía Torres',
            cohorte='2025-A'
        )
        self.sem2_1 = Semester.objects.create(
            student=self.student2,
            numero=1,
            fecha_inicio=date(2024, 1, 15),
            fecha_fin=date(2024, 6, 30)
        )

    def test_thesis_history_endpoint_structure_and_ordering(self):
        """Valida que el endpoint /api/v1/thesis/history/ retorne la estructura exacta y orden cronológico."""
        ThesisProgress.objects.create(
            student=self.student1,
            semester=self.sem1,
            porcentaje_avance=20,
            fecha_registro=date(2024, 6, 15),
            componentes_json={
                'protocolo': 100,
                'estadoArte': 60,
                'marcoTeorico': 20,
                'metodologia': 0,
                'analisis': 0,
                'redaccion': 0
            },
            observaciones='Entrega final protocolo y estado del arte inicial'
        )
        ThesisProgress.objects.create(
            student=self.student1,
            semester=self.sem2,
            porcentaje_avance=45,
            fecha_registro=date(2024, 12, 10),
            componentes_json={
                'protocolo': 100,
                'estadoArte': 100,
                'marcoTeorico': 70,
                'metodologia': 40,
                'analisis': 10,
                'redaccion': 0
            },
            observaciones='Marco teórico concluido y diseño metodológico'
        )
        ThesisProgress.objects.create(
            student=self.student1,
            semester=self.sem3,
            porcentaje_avance=70,
            fecha_registro=date(2025, 5, 20),
            componentes_json={
                'protocolo': 100,
                'estadoArte': 100,
                'marcoTeorico': 100,
                'metodologia': 80,
                'analisis': 60,
                'redaccion': 30
            },
            observaciones='Fase experimental y análisis de datos en curso'
        )

        self.client.force_authenticate(user=self.coordinator)
        response = self.client.get(f'/api/v1/thesis/history/?student_id={self.student1.id}')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data

        self.assertEqual(data['student_id'], self.student1.id)
        self.assertEqual(data['total_registros'], 3)
        self.assertEqual(data['progreso_actual'], 70)
        self.assertEqual(len(data['historico']), 3)

        # Validar orden de semestres
        self.assertEqual(data['historico'][0]['semester_numero'], 1)
        self.assertEqual(data['historico'][0]['porcentaje_avance'], 20)
        self.assertEqual(data['historico'][0]['fecha_registro'], '2024-06-15')
        self.assertIn('protocolo', data['historico'][0]['componentes'])

        self.assertEqual(data['historico'][1]['semester_numero'], 2)
        self.assertEqual(data['historico'][1]['porcentaje_avance'], 45)

        self.assertEqual(data['historico'][2]['semester_numero'], 3)
        self.assertEqual(data['historico'][2]['porcentaje_avance'], 70)

    def test_past_records_not_overwritten(self):
        """Garantiza que al crear avances consecutivos no se sobreescriban los registros pasados."""
        p1 = ThesisProgress.objects.create(
            student=self.student1,
            semester=self.sem1,
            porcentaje_avance=20,
            fecha_registro=date(2024, 6, 15)
        )
        p2 = ThesisProgress.objects.create(
            student=self.student1,
            semester=self.sem2,
            porcentaje_avance=45,
            fecha_registro=date(2024, 12, 10)
        )

        # Crear nuevo registro en el semestre 2 con avance adicional
        self.client.force_authenticate(user=self.advisor_assigned)
        payload = {
            'student': self.student1.id,
            'semester': self.sem2.id,
            'porcentaje_avance': 50,
            'observaciones': 'Ajuste semestral complementario',
            'fecha_registro': '2024-12-20'
        }
        res_create = self.client.post('/api/v1/thesis/', payload, format='json')
        self.assertEqual(res_create.status_code, status.HTTP_201_CREATED)

        # Verificar que existen 3 registros en la base de datos para este estudiante
        self.assertEqual(ThesisProgress.objects.filter(student=self.student1).count(), 3)
        
        # Verificar que el registro p1 sigue intacto con 20%
        p1.refresh_from_db()
        self.assertEqual(p1.porcentaje_avance, 20)

    def test_query_params_support_student_and_student_id(self):
        """Valida que el endpoint soporte tanto ?student_id={id} como ?student={id}."""
        ThesisProgress.objects.create(
            student=self.student1,
            semester=self.sem1,
            porcentaje_avance=30,
            fecha_registro=date(2024, 6, 15)
        )

        self.client.force_authenticate(user=self.coordinator)
        
        res1 = self.client.get(f'/api/v1/thesis/history/?student_id={self.student1.id}')
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        self.assertEqual(res1.data['total_registros'], 1)

        res2 = self.client.get(f'/api/v1/thesis/history/?student={self.student1.id}')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.data['total_registros'], 1)

    def test_rbac_student_own_history_and_forbidden_cross_access(self):
        """Estudiante puede consultar su propio historial pero no el de otros."""
        ThesisProgress.objects.create(
            student=self.student1,
            semester=self.sem1,
            porcentaje_avance=30
        )
        ThesisProgress.objects.create(
            student=self.student2,
            semester=self.sem2_1,
            porcentaje_avance=15
        )

        self.client.force_authenticate(user=self.student_user1)

        # Consulta sin param: retorna su propio historial
        res_self_no_param = self.client.get('/api/v1/thesis/history/')
        self.assertEqual(res_self_no_param.status_code, status.HTTP_200_OK)
        self.assertEqual(res_self_no_param.data['student_id'], self.student1.id)
        self.assertEqual(res_self_no_param.data['progreso_actual'], 30)

        # Consulta con su propio ID: OK
        res_self = self.client.get(f'/api/v1/thesis/history/?student_id={self.student1.id}')
        self.assertEqual(res_self.status_code, status.HTTP_200_OK)

        # Intento de consultar historial de student2: 403 Forbidden
        res_other = self.client.get(f'/api/v1/thesis/history/?student_id={self.student2.id}')
        self.assertEqual(res_other.status_code, status.HTTP_403_FORBIDDEN)

    def test_rbac_advisor_assigned_vs_unassigned(self):
        """Asesor asignado puede consultar el historial; asesor ajeno recibe 403."""
        ThesisProgress.objects.create(
            student=self.student1,
            semester=self.sem1,
            porcentaje_avance=25
        )

        # Asesor asignado
        self.client.force_authenticate(user=self.advisor_assigned)
        res_assigned = self.client.get(f'/api/v1/thesis/history/?student_id={self.student1.id}')
        self.assertEqual(res_assigned.status_code, status.HTTP_200_OK)
        self.assertEqual(res_assigned.data['student_id'], self.student1.id)

        # Asesor ajeno
        self.client.force_authenticate(user=self.advisor_unassigned)
        res_unassigned = self.client.get(f'/api/v1/thesis/history/?student_id={self.student1.id}')
        self.assertEqual(res_unassigned.status_code, status.HTTP_403_FORBIDDEN)

    def test_relational_integrity_thesis_progress_and_evidence(self):
        """
        Dev 10: Pruebas de integridad relacional entre avances de tesis y evidencias adjuntas.
        Verifica que los archivos/enlaces de evidencia se vinculen correctamente y mantengan
        la integridad referencial con el estudiante y el registro de tesis.
        """
        progress = ThesisProgress.objects.create(
            student=self.student1,
            semester=self.sem1,
            porcentaje_avance=35,
            componentes_json={
                'protocolo': 100,
                'estadoArte': 80,
                'marcoTeorico': 50,
                'metodologia': 0,
                'analisis': 0,
                'redaccion': 0
            },
            observaciones='Avance con protocolo aprobado por sínodos'
        )

        dummy_pdf = SimpleUploadedFile('protocolo_firmado.pdf', b'%PDF-1.4 dummy content', content_type='application/pdf')
        evidence = Evidence.objects.create(
            student=self.student1,
            semester=self.sem1,
            tipo=Evidence.TIPO_ARCHIVO,
            actividad_tipo=Evidence.ACTIVIDAD_TESIS,
            actividad_id=progress.id,
            titulo='Protocolo Doctoral Firmado por Comité',
            archivo_adjunto=dummy_pdf,
            created_by=self.advisor_assigned
        )

        # 1. Validar integridad de las relaciones
        self.assertEqual(evidence.student.id, self.student1.id)
        self.assertEqual(evidence.semester.id, self.sem1.id)
        self.assertEqual(evidence.actividad_tipo, Evidence.ACTIVIDAD_TESIS)
        self.assertEqual(evidence.actividad_id, progress.id)

        # 2. Filtrado de evidencias vinculadas al avance de tesis
        linked_evidences = Evidence.objects.filter(
            student=self.student1,
            actividad_tipo=Evidence.ACTIVIDAD_TESIS,
            actividad_id=progress.id
        )
        self.assertEqual(linked_evidences.count(), 1)
        self.assertEqual(linked_evidences.first().titulo, 'Protocolo Doctoral Firmado por Comité')

        # 3. Integridad en eliminación en cascada de estudiante
        student_id_val = self.student1.id
        self.student1.delete()

        self.assertFalse(ThesisProgress.objects.filter(student_id=student_id_val).exists())
        self.assertFalse(Evidence.objects.filter(student_id=student_id_val).exists())

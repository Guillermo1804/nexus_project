from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import (
    AcademicCommittee,
    Agreement,
    AgreementAuditLog,
    CommitteeMembership,
    Semester,
    Student,
    TutoringSession,
)
from .tests import jwt_for


class AgreementQueryHu14Tests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.u = User.objects.create_user(email='t14@x.co', password='x', role=User.Role.TUTOR)
        self.other = User.objects.create_user(email='o14@x.co', password='x', role=User.Role.TUTOR)
        self.s = Student.objects.create(matricula='HU14', nombre_completo='S', cohorte='26')
        self.hidden = Student.objects.create(matricula='H14X', nombre_completo='X', cohorte='26')
        CommitteeMembership.objects.create(
            committee=AcademicCommittee.objects.create(student=self.s),
            user=self.u,
            role='ASESOR',
        )
        today = timezone.localdate()
        self.semester = Semester.objects.create(
            student=self.s,
            numero=2,
            fecha_inicio=today - timedelta(days=90),
            fecha_fin=today + timedelta(days=90),
            is_active=True,
        )
        self.session = TutoringSession.objects.create(
            student=self.s,
            semester=self.semester,
            fecha_sesion=today - timedelta(days=10),
            modalidad=TutoringSession.Modality.VIRTUAL,
            resumen='Sesión HU-14',
            created_by=self.u,
        )
        self.a = Agreement.objects.create(
            student=self.s,
            session=self.session,
            descripcion='visible',
            responsable=self.u,
            fecha_limite=today - timedelta(days=1),
            estado='PENDIENTE',
        )
        Agreement.objects.create(
            student=self.s,
            session=self.session,
            descripcion='future',
            responsable=self.other,
            fecha_limite=today + timedelta(days=1),
            estado='PENDIENTE',
        )
        Agreement.objects.create(
            student=self.hidden,
            descripcion='hidden',
            responsable=self.u,
            fecha_limite=today - timedelta(days=1),
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(self.u)}')

    def test_combined_filters_pagination_and_scope(self):
        r = self.client.get(
            f'/api/v1/agreements/?student={self.s.id}&responsable={self.u.id}'
            f'&estado=PENDIENTE&vencido=true&page_size=1'
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['count'], 1)
        self.assertEqual(r.data['results'][0]['descripcion'], 'visible')
        self.assertEqual(r.data['results'][0]['student_nombre'], 'S')
        self.assertEqual(r.data['results'][0]['semester'], self.semester.id)

    def test_filter_by_semester_and_fecha_limite(self):
        today = timezone.localdate()
        r = self.client.get(
            f'/api/v1/agreements/?semester={self.semester.id}'
            f'&fecha_limite={today - timedelta(days=1)}'
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['count'], 1)
        self.assertEqual(r.data['results'][0]['descripcion'], 'visible')

    def test_filter_estado_vencido_derived(self):
        r = self.client.get('/api/v1/agreements/?estado=VENCIDO')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['count'], 1)
        self.assertEqual(r.data['results'][0]['descripcion'], 'visible')
        self.assertTrue(r.data['results'][0]['is_vencido'])

    def test_audit_log_is_read_only(self):
        AgreementAuditLog.objects.create(
            agreement=self.a,
            user=self.u,
            estado_anterior='PENDIENTE',
            estado_nuevo='EN_PROCESO',
        )
        url = f'/api/v1/agreements/{self.a.id}/audit-log/'
        self.assertEqual(len(self.client.get(url).data), 1)
        for method in ('post', 'put', 'patch', 'delete'):
            self.assertEqual(getattr(self.client, method)(url, {}, format='json').status_code, 405)

class AgreementOrderingAndSearchTests(APITestCase):
    """Ordenamiento y búsqueda de la lista de acuerdos."""

    def setUp(self):
        U = get_user_model()
        self.admin = U.objects.create_user(
            email='orden@x.co', password='x', role=U.Role.SYSTEM_ADMIN, is_staff=True,
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(self.admin)}')
        hoy = timezone.localdate()
        self.student = Student.objects.create(
            user=self.admin, matricula='ORD', nombre_completo='Estudiante Prueba', cohorte='2026',
        )
        self.lejano = Agreement.objects.create(
            student=self.student, descripcion='Analisis del segundo capitulo', responsable=self.admin,
            fecha_limite=hoy + timedelta(days=30), estado=Agreement.Status.PENDING,
        )
        self.cercano = Agreement.objects.create(
            student=self.student, descripcion='Borrador del protocolo', responsable=self.admin,
            fecha_limite=hoy + timedelta(days=2), estado=Agreement.Status.COMPLETED,
            fecha_conclusion=hoy,
        )

    def descripciones(self, url):
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        return [item['descripcion'] for item in response.data['results']]

    def test_por_defecto_ordena_por_fecha_limite_ascendente(self):
        self.assertEqual(
            self.descripciones('/api/v1/agreements/'),
            ['Borrador del protocolo', 'Analisis del segundo capitulo'],
        )

    def test_ordena_por_fecha_limite_descendente(self):
        self.assertEqual(
            self.descripciones('/api/v1/agreements/?orden=fecha_limite_desc'),
            ['Analisis del segundo capitulo', 'Borrador del protocolo'],
        )

    def test_un_orden_desconocido_cae_al_orden_por_defecto(self):
        self.assertEqual(
            self.descripciones('/api/v1/agreements/?orden=campo_inventado'),
            ['Borrador del protocolo', 'Analisis del segundo capitulo'],
        )

    def test_la_busqueda_ignora_acentos_y_mayusculas(self):
        # Sin normalizar, SQLite no encuentra «análisis» al escribir «analisis».
        self.assertEqual(self.descripciones('/api/v1/agreements/?busqueda=analisis'),
                         ['Analisis del segundo capitulo'])
        self.assertEqual(self.descripciones('/api/v1/agreements/?busqueda=ANÁLISIS'),
                         ['Analisis del segundo capitulo'])
        self.assertEqual(self.descripciones('/api/v1/agreements/?busqueda=Protocolo'),
                         ['Borrador del protocolo'])

    def test_la_busqueda_sin_coincidencias_devuelve_lista_vacia(self):
        self.assertEqual(self.descripciones('/api/v1/agreements/?busqueda=inexistente'), [])

class AgreementUrgencyAndMultiStatusTests(APITestCase):
    """Orden de urgencia y filtros acumulables de estado."""

    def setUp(self):
        U = get_user_model()
        self.admin = U.objects.create_user(
            email='urgencia@x.co', password='x', role=U.Role.SYSTEM_ADMIN, is_staff=True,
        )
        self.student = Student.objects.create(
            user=self.admin, matricula='URG', nombre_completo='Estudiante Urgente', cohorte='2026',
        )
        hoy = timezone.localdate()
        self.vencido = Agreement.objects.create(
            student=self.student, descripcion='Vencido', responsable=self.admin,
            fecha_limite=hoy - timedelta(days=2), estado=Agreement.Status.PENDING,
        )
        self.abierto = Agreement.objects.create(
            student=self.student, descripcion='Abierto', responsable=self.admin,
            fecha_limite=hoy + timedelta(days=2), estado=Agreement.Status.IN_PROGRESS,
        )
        self.concluido = Agreement.objects.create(
            student=self.student, descripcion='Concluido', responsable=self.admin,
            fecha_limite=hoy - timedelta(days=20), estado=Agreement.Status.COMPLETED,
            fecha_conclusion=hoy - timedelta(days=20),
        )
        # Hay dos formas de estar vencido: guardada como estado, o deduciéndola de la
        # fecha. El filtro debe cubrir ambas, y no sólo la segunda.
        self.vencido_guardado = Agreement.objects.create(
            student=self.student, descripcion='Vencido guardado', responsable=self.admin,
            fecha_limite=hoy - timedelta(days=5), estado=Agreement.Status.OVERDUE,
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {jwt_for(self.admin)}')

    def descriptions(self, query=''):
        response = self.client.get(f'/api/v1/agreements/?{query}')
        self.assertEqual(response.status_code, 200)
        return [item['descripcion'] for item in response.data['results']]

    def test_urgencia_pone_vencidos_abiertos_y_concluidos_en_ese_orden(self):
        orden = self.descriptions('orden=urgencia')
        # Dentro de los vencidos manda la fecha más antigua primero.
        self.assertEqual(orden[:2], ['Vencido guardado', 'Vencido'])
        self.assertEqual(orden[-1], 'Concluido')
        self.assertLess(orden.index('Abierto'), orden.index('Concluido'))

    def test_urgencia_inversa_pone_lo_concluido_primero(self):
        self.assertEqual(self.descriptions('orden=urgencia_desc'), ['Concluido', 'Abierto', 'Vencido', 'Vencido guardado'])

    def test_filtra_vencidos_y_en_proceso_a_la_vez(self):
        self.assertEqual(
            set(self.descriptions('estados=VENCIDO,EN_PROCESO')),
            {'Vencido', 'Abierto', 'Vencido guardado'},
        )

    def test_el_filtro_de_vencidos_incluye_los_guardados_como_vencidos(self):
        self.assertIn('Vencido guardado', self.descriptions('estados=VENCIDO'))

    def test_filtra_pendientes_y_concluidos_a_la_vez(self):
        self.assertEqual(set(self.descriptions('estados=PENDIENTE,CONCLUIDO')), {'Vencido', 'Concluido'})

    def test_ignora_estados_desconocidos_sin_romper_la_consulta(self):
        self.assertEqual(len(self.descriptions('estados=INVENTADO')), 4)

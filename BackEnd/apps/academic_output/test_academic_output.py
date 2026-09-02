from datetime import date, timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from rest_framework.test import APITestCase
from rest_framework import status

from apps.students.models import Student, Semester, AcademicCommittee
from apps.academic_output.models import Publication, AcademicEvent, ResearchStay, OtherProduct
from apps.evidence.models import Evidence

User = get_user_model()


class AcademicOutputTests(APITestCase):
    def setUp(self):
        # 1. Coordinador
        self.coordinator = User.objects.create_superuser(
            email='coord@nexus.edu.mx',
            password='Password123!',
            first_name='Dr. Carlos',
            last_name='Coordinador'
        )

        # 2. Asesor Principal
        self.advisor_main = User.objects.create_user(
            email='asesor1@nexus.edu.mx',
            password='Password123!',
            first_name='Dra. Elena',
            last_name='Ramos',
            role='ASESOR'
        )

        # 3. Asesor Ajeno
        self.advisor_other = User.objects.create_user(
            email='asesor_otro@nexus.edu.mx',
            password='Password123!',
            first_name='Dr. Roberto',
            last_name='Soto',
            role='ASESOR'
        )

        # 4. Estudiante 1
        self.student_user1 = User.objects.create_user(
            email='estudiante1@nexus.edu.mx',
            password='Password123!',
            first_name='Juan',
            last_name='Pérez',
            role='ESTUDIANTE'
        )
        self.student1 = Student.objects.create(
            user=self.student_user1,
            matricula='DOC-2025-001',
            nombre_completo='Juan Pérez',
            cohorte='2025-A'
        )
        self.semester1 = Semester.objects.create(
            student=self.student1,
            numero=1,
            fecha_inicio=date.today() - timedelta(days=60),
            fecha_fin=date.today() + timedelta(days=120)
        )
        AcademicCommittee.objects.create(
            student=self.student1,
            user=self.advisor_main,
            rol_comite='ASESOR_PRINCIPAL',
            is_active=True
        )

        # 5. Estudiante 2
        self.student_user2 = User.objects.create_user(
            email='estudiante2@nexus.edu.mx',
            password='Password123!',
            first_name='María',
            last_name='Gómez',
            role='ESTUDIANTE'
        )
        self.student2 = Student.objects.create(
            user=self.student_user2,
            matricula='DOC-2025-002',
            nombre_completo='María Gómez',
            cohorte='2025-A'
        )
        self.semester2 = Semester.objects.create(
            student=self.student2,
            numero=1,
            fecha_inicio=date.today() - timedelta(days=60),
            fecha_fin=date.today() + timedelta(days=120)
        )

    # ----------------- HU-17: PUBLICACIONES -----------------
    def test_create_publication_success(self):
        self.client.force_authenticate(user=self.advisor_main)
        payload = {
            'student': self.student1.id,
            'semester': self.semester1.id,
            'titulo': 'Deep Learning for Bioimaging in Oncology',
            'autores_texto': 'Pérez, J., Ramos, E.',
            'tipo': 'ARTICULO_JCR',
            'revista_editorial': 'IEEE Transactions on Medical Imaging',
            'estado': 'PUBLICADO',
            'fecha_publicacion': '2025-02-15',
            'doi_url': 'https://doi.org/10.1109/TMI.2025.100200'
        }
        response = self.client.post('/api/v1/academic-output/publications/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('publication_created_id', response.data)
        self.assertEqual(response.data['mensaje'], 'Publicación registrada correctamente')
        self.assertEqual(response.data['publication']['titulo'], payload['titulo'])
        self.assertEqual(response.data['publication']['student_matricula'], 'DOC-2025-001')
        self.assertEqual(response.data['publication']['tipo_display'], 'Artículo JCR / Scopus')

    def test_create_publication_semester_mismatch(self):
        self.client.force_authenticate(user=self.advisor_main)
        payload = {
            'student': self.student1.id,
            'semester': self.semester2.id,  # Pertenece a estudiante2
            'titulo': 'Invalid Mismatch Paper',
            'autores_texto': 'Pérez, J.',
            'tipo': 'ARTICULO_CONACYT',
            'revista_editorial': 'Revista Mexicana de Computación',
            'estado': 'PREPARACION'
        }
        response = self.client.post('/api/v1/academic-output/publications/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('semester', response.data)

    def test_list_publications_rbac_isolation(self):
        Publication.objects.create(
            student=self.student1,
            semester=self.semester1,
            titulo='Paper Student 1',
            autores_texto='Pérez, J.',
            tipo='ARTICULO_JCR',
            revista_editorial='IEEE Trans',
            estado='PUBLICADO'
        )
        Publication.objects.create(
            student=self.student2,
            semester=self.semester2,
            titulo='Paper Student 2',
            autores_texto='Gómez, M.',
            tipo='ARTICULO_CONACYT',
            revista_editorial='Revista Nal',
            estado='ACEPTADO'
        )

        # 1. Asesor asignado a estudiante 1
        self.client.force_authenticate(user=self.advisor_main)
        res = self.client.get('/api/v1/academic-output/publications/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get('results', res.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['titulo'], 'Paper Student 1')

        # 2. Asesor ajeno
        self.client.force_authenticate(user=self.advisor_other)
        res = self.client.get('/api/v1/academic-output/publications/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get('results', res.data)
        self.assertEqual(len(results), 0)

        # 3. Estudiante 1 solo ve sus publicaciones
        self.client.force_authenticate(user=self.student_user1)
        res = self.client.get('/api/v1/academic-output/publications/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get('results', res.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['titulo'], 'Paper Student 1')

        # 4. Coordinador ve todo
        self.client.force_authenticate(user=self.coordinator)
        res = self.client.get('/api/v1/academic-output/publications/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get('results', res.data)
        self.assertEqual(len(results), 2)

    def test_delete_publication_success(self):
        pub = Publication.objects.create(
            student=self.student1,
            titulo='Paper to Delete',
            autores_texto='Pérez, J.',
            tipo='OTRO',
            revista_editorial='Tech Report'
        )
        self.client.force_authenticate(user=self.coordinator)
        response = self.client.delete(f'/api/v1/academic-output/publications/{pub.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['details'], 'Recurso eliminado correctamente')
        self.assertTrue(response.data['success'])
        self.assertFalse(Publication.objects.filter(id=pub.id).exists())

    # ----------------- HU-18: EVENTOS ACADÉMICOS -----------------
    def test_create_academic_event_success(self):
        self.client.force_authenticate(user=self.advisor_main)
        payload = {
            'student': self.student1.id,
            'semester': self.semester1.id,
            'tipo_evento': 'CONGRESO_INTERNACIONAL',
            'nombre_evento': 'IEEE WCCI 2025',
            'titulo_ponencia': 'Convolutional Networks for Tumor Classification',
            'fecha_presentacion': '2025-07-10',
            'sede_lugar': 'Yokohama, Japón',
            'modalidad': 'PRESENCIAL'
        }
        response = self.client.post('/api/v1/academic-output/academic-events/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('academic_event_created_id', response.data)
        self.assertEqual(response.data['mensaje'], 'Evento académico registrado correctamente')
        self.assertEqual(response.data['academic_event']['nombre_evento'], payload['nombre_evento'])
        self.assertEqual(response.data['academic_event']['modalidad_display'], 'Presencial')

    def test_create_academic_event_semester_mismatch(self):
        self.client.force_authenticate(user=self.advisor_main)
        payload = {
            'student': self.student1.id,
            'semester': self.semester2.id,
            'tipo_evento': 'CONGRESO_NACIONAL',
            'nombre_evento': 'Congreso Nal Computación',
            'titulo_ponencia': 'Charla',
            'fecha_presentacion': '2025-08-01',
            'sede_lugar': 'CDMX'
        }
        response = self.client.post('/api/v1/academic-output/academic-events/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('semester', response.data)

    def test_list_academic_events_rbac(self):
        AcademicEvent.objects.create(
            student=self.student1,
            semester=self.semester1,
            tipo_evento='COLOQUIO',
            nombre_evento='Coloquio Posgrado',
            titulo_ponencia='Avances Estudiante 1',
            fecha_presentacion=date.today(),
            sede_lugar='Auditorio Central'
        )
        AcademicEvent.objects.create(
            student=self.student2,
            semester=self.semester2,
            tipo_evento='CONGRESO_NACIONAL',
            nombre_evento='Congreso Nacional',
            titulo_ponencia='Avances Estudiante 2',
            fecha_presentacion=date.today(),
            sede_lugar='Guadalajara'
        )

        # Asesor 1 asignado a student 1
        self.client.force_authenticate(user=self.advisor_main)
        res = self.client.get('/api/v1/academic-output/academic-events/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get('results', res.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['nombre_evento'], 'Coloquio Posgrado')

        # Coordinador
        self.client.force_authenticate(user=self.coordinator)
        res = self.client.get('/api/v1/academic-output/academic-events/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get('results', res.data)
        self.assertEqual(len(results), 2)

    def test_delete_academic_event_success(self):
        ev = AcademicEvent.objects.create(
            student=self.student1,
            tipo_evento='COLOQUIO',
            nombre_evento='Coloquio Borrar',
            titulo_ponencia='Charla',
            fecha_presentacion=date.today(),
            sede_lugar='Online'
        )
        self.client.force_authenticate(user=self.coordinator)
        res = self.client.delete(f'/api/v1/academic-output/academic-events/{ev.id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['details'], 'Recurso eliminado correctamente')
        self.assertTrue(res.data['success'])
        self.assertFalse(AcademicEvent.objects.filter(id=ev.id).exists())

    # ----------------- HU-19: ESTANCIAS DE INVESTIGACIÓN -----------------
    def test_create_research_stay_success(self):
        self.client.force_authenticate(user=self.advisor_main)
        payload = {
            'student': self.student1.id,
            'institucion_receptora': 'University of Toronto',
            'pais': 'Canadá',
            'fecha_inicio': '2025-09-01',
            'fecha_fin': '2025-11-30',
            'responsable_estancia': 'Dr. Geoffrey Hinton',
            'objetivos': 'Desarrollo de modelos neuronales aplicados a bioimágenes.',
            'resultados': 'Prototipo validado y manuscrito en revisión.'
        }
        response = self.client.post('/api/v1/academic-output/research-stays/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('research_stay_created_id', response.data)
        self.assertEqual(response.data['mensaje'], 'Estancia de investigación registrada correctamente')
        self.assertEqual(response.data['research_stay']['institucion_receptora'], payload['institucion_receptora'])
        self.assertEqual(response.data['research_stay']['pais'], 'Canadá')

    def test_create_research_stay_invalid_dates(self):
        self.client.force_authenticate(user=self.advisor_main)
        payload = {
            'student': self.student1.id,
            'institucion_receptora': 'MIT',
            'pais': 'Estados Unidos',
            'fecha_inicio': '2025-10-01',
            'fecha_fin': '2025-09-01',  # Fin antes que inicio
            'responsable_estancia': 'Dr. John Doe'
        }
        response = self.client.post('/api/v1/academic-output/research-stays/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('fecha_fin', response.data)

    def test_list_research_stays_rbac(self):
        ResearchStay.objects.create(
            student=self.student1,
            institucion_receptora='Oxford',
            pais='Reino Unido',
            fecha_inicio='2025-01-10',
            fecha_fin='2025-03-10',
            responsable_estancia='Dr. Smith'
        )
        ResearchStay.objects.create(
            student=self.student2,
            institucion_receptora='Stanford',
            pais='Estados Unidos',
            fecha_inicio='2025-02-10',
            fecha_fin='2025-04-10',
            responsable_estancia='Dr. Ng'
        )

        # Asesor 1
        self.client.force_authenticate(user=self.advisor_main)
        res = self.client.get('/api/v1/academic-output/research-stays/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get('results', res.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['institucion_receptora'], 'Oxford')

        # Coordinador
        self.client.force_authenticate(user=self.coordinator)
        res = self.client.get('/api/v1/academic-output/research-stays/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get('results', res.data)
        self.assertEqual(len(results), 2)

    def test_delete_research_stay_success(self):
        stay = ResearchStay.objects.create(
            student=self.student1,
            institucion_receptora='INRAE',
            pais='Francia',
            fecha_inicio='2025-05-01',
            fecha_fin='2025-06-01',
            responsable_estancia='Dr. Pierre'
        )
        self.client.force_authenticate(user=self.coordinator)
        res = self.client.delete(f'/api/v1/academic-output/research-stays/{stay.id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['details'], 'Recurso eliminado correctamente')
        self.assertTrue(res.data['success'])
        self.assertFalse(ResearchStay.objects.filter(id=stay.id).exists())

    # ----------------- HU-20: OTROS PRODUCTOS ACADÉMICOS -----------------
    def test_create_other_product_success(self):
        self.client.force_authenticate(user=self.advisor_main)
        payload = {
            'student': self.student1.id,
            'tipo_producto': 'SOFTWARE',
            'titulo': 'BioVision ML Suite v1.0',
            'descripcion': 'Librería de segmentación de imágenes histopatológicas.',
            'fecha_registro': '2025-05-15'
        }
        response = self.client.post('/api/v1/academic-output/other-products/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('other_product_created_id', response.data)
        self.assertEqual(response.data['mensaje'], 'Producto académico registrado correctamente')
        self.assertEqual(response.data['other_product']['titulo'], payload['titulo'])
        self.assertEqual(response.data['other_product']['tipo_producto_display'], 'Desarrollo de Software')

    def test_list_other_products_rbac(self):
        OtherProduct.objects.create(
            student=self.student1,
            tipo_producto='PATENTE',
            titulo='Patente Sensor',
            descripcion='Sensor biomédico'
        )
        OtherProduct.objects.create(
            student=self.student2,
            tipo_producto='SOFTWARE',
            titulo='App Móvil',
            descripcion='App de salud'
        )

        # Asesor 1
        self.client.force_authenticate(user=self.advisor_main)
        res = self.client.get('/api/v1/academic-output/other-products/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get('results', res.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['titulo'], 'Patente Sensor')

        # Coordinador
        self.client.force_authenticate(user=self.coordinator)
        res = self.client.get('/api/v1/academic-output/other-products/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get('results', res.data)
        self.assertEqual(len(results), 2)

    def test_delete_other_product_success(self):
        prod = OtherProduct.objects.create(
            student=self.student1,
            tipo_producto='BASE_DATOS',
            titulo='Dataset a Eliminar',
            descripcion='Dataset biomédico'
        )
        self.client.force_authenticate(user=self.coordinator)
        res = self.client.delete(f'/api/v1/academic-output/other-products/{prod.id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['details'], 'Recurso eliminado correctamente')
        self.assertTrue(res.data['success'])
        self.assertFalse(OtherProduct.objects.filter(id=prod.id).exists())

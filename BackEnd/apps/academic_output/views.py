from rest_framework import viewsets, status, filters
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Publication, AcademicEvent, ResearchStay, OtherProduct
from .serializers import (
    PublicationSerializer,
    PublicationCreateSerializer,
    AcademicEventSerializer,
    AcademicEventCreateSerializer,
    ResearchStaySerializer,
    ResearchStayCreateSerializer,
    OtherProductSerializer,
    OtherProductCreateSerializer
)
from apps.identity.permissions import IsAssignedAdvisorOrStudent


class PublicationViewSet(viewsets.ModelViewSet):
    """
    ViewSet para la gestión de publicaciones científicas (HU-17).
    """
    permission_classes = [IsAuthenticated, IsAssignedAdvisorOrStudent]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['student__nombre_completo', 'student__matricula', 'titulo', 'autores_texto', 'revista_editorial']
    ordering_fields = ['fecha_publicacion', 'created_at', 'titulo']
    ordering = ['-fecha_publicacion', '-created_at']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Publication.objects.none()

        qs = Publication.objects.select_related('student', 'semester', 'evidencia').all()

        # Aislamiento por rol
        if not (user.is_superuser or getattr(user, 'role', None) == 'COORDINADOR'):
            if getattr(user, 'role', None) == 'ESTUDIANTE':
                qs = qs.filter(student__user=user)
            elif getattr(user, 'role', None) == 'ASESOR':
                qs = qs.filter(
                    student__committee_members__user=user,
                    student__committee_members__is_active=True
                ).distinct()
            else:
                qs = qs.none()

        # Filtros por query params
        student_id = self.request.query_params.get('student') or self.request.query_params.get('student_id')
        if student_id:
            qs = qs.filter(student_id=student_id)

        semester_id = self.request.query_params.get('semester') or self.request.query_params.get('semester_id')
        if semester_id:
            qs = qs.filter(semester_id=semester_id)

        tipo = self.request.query_params.get('tipo')
        if tipo:
            qs = qs.filter(tipo=tipo)

        estado = self.request.query_params.get('estado')
        if estado:
            qs = qs.filter(estado=estado)

        return qs.distinct()

    def get_serializer_class(self):
        if self.action == 'create':
            return PublicationCreateSerializer
        return PublicationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()

        response_data = {
            'publication_created_id': instance.id,
            'mensaje': 'Publicación registrada correctamente',
            'publication': PublicationSerializer(instance, context={'request': request}).data
        }
        return Response(response_data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {'details': 'Recurso eliminado correctamente', 'success': True},
            status=status.HTTP_200_OK
        )


class AcademicEventViewSet(viewsets.ModelViewSet):
    """
    ViewSet para la gestión de participación en congresos y eventos académicos (HU-18).
    """
    permission_classes = [IsAuthenticated, IsAssignedAdvisorOrStudent]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['student__nombre_completo', 'student__matricula', 'nombre_evento', 'titulo_ponencia', 'sede_lugar']
    ordering_fields = ['fecha_presentacion', 'created_at', 'nombre_evento']
    ordering = ['-fecha_presentacion', '-created_at']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return AcademicEvent.objects.none()

        qs = AcademicEvent.objects.select_related('student', 'semester', 'evidencia').all()

        # Aislamiento por rol
        if not (user.is_superuser or getattr(user, 'role', None) == 'COORDINADOR'):
            if getattr(user, 'role', None) == 'ESTUDIANTE':
                qs = qs.filter(student__user=user)
            elif getattr(user, 'role', None) == 'ASESOR':
                qs = qs.filter(
                    student__committee_members__user=user,
                    student__committee_members__is_active=True
                ).distinct()
            else:
                qs = qs.none()

        # Filtros por query params
        student_id = self.request.query_params.get('student') or self.request.query_params.get('student_id')
        if student_id:
            qs = qs.filter(student_id=student_id)

        semester_id = self.request.query_params.get('semester') or self.request.query_params.get('semester_id')
        if semester_id:
            qs = qs.filter(semester_id=semester_id)

        tipo_evento = self.request.query_params.get('tipo_evento')
        if tipo_evento:
            qs = qs.filter(tipo_evento=tipo_evento)

        modalidad = self.request.query_params.get('modalidad')
        if modalidad:
            qs = qs.filter(modalidad=modalidad)

        return qs.distinct()

    def get_serializer_class(self):
        if self.action == 'create':
            return AcademicEventCreateSerializer
        return AcademicEventSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()

        response_data = {
            'academic_event_created_id': instance.id,
            'mensaje': 'Evento académico registrado correctamente',
            'academic_event': AcademicEventSerializer(instance, context={'request': request}).data
        }
        return Response(response_data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {'details': 'Recurso eliminado correctamente', 'success': True},
            status=status.HTTP_200_OK
        )


class ResearchStayViewSet(viewsets.ModelViewSet):
    """
    ViewSet para la gestión y seguimiento de estancias doctorales (HU-19).
    """
    permission_classes = [IsAuthenticated, IsAssignedAdvisorOrStudent]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['student__nombre_completo', 'student__matricula', 'institucion_receptora', 'pais', 'responsable_estancia']
    ordering_fields = ['fecha_inicio', 'fecha_fin', 'created_at']
    ordering = ['-fecha_inicio', '-created_at']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return ResearchStay.objects.none()

        qs = ResearchStay.objects.select_related('student', 'evidencia').all()

        # Aislamiento por rol
        if not (user.is_superuser or getattr(user, 'role', None) == 'COORDINADOR'):
            if getattr(user, 'role', None) == 'ESTUDIANTE':
                qs = qs.filter(student__user=user)
            elif getattr(user, 'role', None) == 'ASESOR':
                qs = qs.filter(
                    student__committee_members__user=user,
                    student__committee_members__is_active=True
                ).distinct()
            else:
                qs = qs.none()

        # Filtros por query params
        student_id = self.request.query_params.get('student') or self.request.query_params.get('student_id')
        if student_id:
            qs = qs.filter(student_id=student_id)

        pais = self.request.query_params.get('pais')
        if pais:
            qs = qs.filter(pais__icontains=pais)

        return qs.distinct()

    def get_serializer_class(self):
        if self.action == 'create':
            return ResearchStayCreateSerializer
        return ResearchStaySerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()

        response_data = {
            'research_stay_created_id': instance.id,
            'mensaje': 'Estancia de investigación registrada correctamente',
            'research_stay': ResearchStaySerializer(instance, context={'request': request}).data
        }
        return Response(response_data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {'details': 'Recurso eliminado correctamente', 'success': True},
            status=status.HTTP_200_OK
        )


class OtherProductViewSet(viewsets.ModelViewSet):
    """
    ViewSet para la gestión de otros productos académicos: patentes, software, prototipos (HU-20).
    """
    permission_classes = [IsAuthenticated, IsAssignedAdvisorOrStudent]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['student__nombre_completo', 'student__matricula', 'titulo', 'descripcion']
    ordering_fields = ['fecha_registro', 'created_at', 'titulo']
    ordering = ['-fecha_registro', '-created_at']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return OtherProduct.objects.none()

        qs = OtherProduct.objects.select_related('student', 'evidencia').all()

        # Aislamiento por rol
        if not (user.is_superuser or getattr(user, 'role', None) == 'COORDINADOR'):
            if getattr(user, 'role', None) == 'ESTUDIANTE':
                qs = qs.filter(student__user=user)
            elif getattr(user, 'role', None) == 'ASESOR':
                qs = qs.filter(
                    student__committee_members__user=user,
                    student__committee_members__is_active=True
                ).distinct()
            else:
                qs = qs.none()

        # Filtros por query params
        student_id = self.request.query_params.get('student') or self.request.query_params.get('student_id')
        if student_id:
            qs = qs.filter(student_id=student_id)

        tipo_producto = self.request.query_params.get('tipo_producto')
        if tipo_producto:
            qs = qs.filter(tipo_producto=tipo_producto)

        return qs.distinct()

    def get_serializer_class(self):
        if self.action == 'create':
            return OtherProductCreateSerializer
        return OtherProductSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()

        response_data = {
            'other_product_created_id': instance.id,
            'mensaje': 'Producto académico registrado correctamente',
            'other_product': OtherProductSerializer(instance, context={'request': request}).data
        }
        return Response(response_data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {'details': 'Recurso eliminado correctamente', 'success': True},
            status=status.HTTP_200_OK
        )

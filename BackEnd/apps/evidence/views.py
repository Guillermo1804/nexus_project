from rest_framework import viewsets, status, filters
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q

from .models import Evidence
from .serializers import EvidenceSerializer, EvidenceCreateSerializer
from apps.identity.permissions import IsAssignedAdvisorOrStudent


class EvidenceViewSet(viewsets.ModelViewSet):
    """
    ViewSet para la gestión, carga y consulta de evidencias documentales y DOI/URL.
    """
    permission_classes = [IsAuthenticated, IsAssignedAdvisorOrStudent]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['titulo', 'descripcion', 'student__nombre_completo', 'student__matricula']
    ordering_fields = ['fecha_carga', 'created_at', 'file_size_bytes']
    ordering = ['-fecha_carga', '-created_at']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Evidence.objects.none()

        qs = Evidence.objects.select_related('student', 'semester', 'created_by').all()

        # Aislamiento por roles
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

        # Filtros opcionales
        student_id = self.request.query_params.get('student') or self.request.query_params.get('student_id')
        if student_id:
            qs = qs.filter(student_id=student_id)

        actividad_tipo = self.request.query_params.get('actividad_tipo')
        if actividad_tipo:
            qs = qs.filter(actividad_tipo=actividad_tipo.upper())

        actividad_id = self.request.query_params.get('actividad_id')
        if actividad_id:
            qs = qs.filter(actividad_id=actividad_id)

        tipo = self.request.query_params.get('tipo')
        if tipo:
            qs = qs.filter(tipo=tipo.upper())

        semester_id = self.request.query_params.get('semester') or self.request.query_params.get('semester_id')
        if semester_id:
            qs = qs.filter(semester_id=semester_id)

        return qs.distinct()

    def get_serializer_class(self):
        if self.action == 'create':
            return EvidenceCreateSerializer
        return EvidenceSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()

        response_data = {
            'evidence_created_id': instance.id,
            'mensaje': 'Evidencia registrada correctamente',
            'evidence': EvidenceSerializer(instance, context={'request': request}).data
        }
        return Response(response_data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {'details': 'Recurso eliminado correctamente', 'success': True},
            status=status.HTTP_200_OK
        )

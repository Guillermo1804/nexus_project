from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from django.utils import timezone

from .models import Agreement, AgreementAuditLog
from .serializers import (
    AgreementSerializer,
    AgreementCreateSerializer,
    AgreementStatusUpdateSerializer,
    AgreementAuditLogSerializer
)
from apps.identity.permissions import IsAssignedAdvisorOrStudent


class AgreementViewSet(viewsets.ModelViewSet):
    """
    ViewSet para la gestión de acuerdos y compromisos académicos.
    Soporta filtros por estudiante, estado, responsable y sesión de tutoría.
    """
    permission_classes = [IsAuthenticated, IsAssignedAdvisorOrStudent]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['descripcion', 'student__nombre_completo', 'student__matricula', 'responsable__first_name', 'responsable__last_name']
    ordering_fields = ['fecha_limite', 'created_at', 'estado']
    ordering = ['-fecha_limite', '-created_at']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Agreement.objects.none()

        # Actualizar automáticamente los acuerdos vencidos
        Agreement.objects.filter(
            fecha_limite__lt=timezone.now().date()
        ).exclude(
            estado__in=[Agreement.STATUS_CONCLUIDO, Agreement.STATUS_VENCIDO]
        ).update(
            estado=Agreement.STATUS_VENCIDO,
            updated_at=timezone.now()
        )

        qs = Agreement.objects.select_related(
            'student', 'responsable', 'created_by', 'session'
        ).prefetch_related('audit_logs__user').all()

        # Aislamiento por rol
        if not (user.is_superuser or getattr(user, 'role', None) == 'COORDINADOR'):
            if getattr(user, 'role', None) == 'ESTUDIANTE':
                qs = qs.filter(
                    Q(student__user=user) | Q(responsable=user)
                )
            elif getattr(user, 'role', None) == 'ASESOR':
                qs = qs.filter(
                    Q(student__committee_members__user=user, student__committee_members__is_active=True) |
                    Q(responsable=user) |
                    Q(created_by=user)
                ).distinct()
            else:
                qs = qs.filter(responsable=user)

        # Filtros opcionales por query params
        student_id = self.request.query_params.get('student') or self.request.query_params.get('student_id')
        if student_id:
            qs = qs.filter(student_id=student_id)

        estado = self.request.query_params.get('estado')
        if estado:
            qs = qs.filter(estado=estado.upper())

        responsable_id = self.request.query_params.get('responsable') or self.request.query_params.get('responsable_id')
        if responsable_id:
            qs = qs.filter(responsable_id=responsable_id)

        session_id = self.request.query_params.get('session') or self.request.query_params.get('session_id')
        if session_id:
            qs = qs.filter(session_id=session_id)

        return qs.distinct()

    def get_serializer_class(self):
        if self.action == 'create':
            return AgreementCreateSerializer
        elif self.action == 'update_status':
            return AgreementStatusUpdateSerializer
        return AgreementSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        agreement = serializer.save()

        response_data = {
            'agreement_created_id': agreement.id,
            'mensaje': 'Acuerdo registrado exitosamente',
            'agreement': AgreementSerializer(agreement, context={'request': request}).data
        }
        return Response(response_data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {'details': 'Recurso eliminado correctamente', 'success': True},
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'], url_path='update-status')
    def update_status(self, request, pk=None):
        """
        Acción para actualizar el estado de un acuerdo registrando la bitácora de auditoría.
        """
        agreement = self.get_object()
        serializer = AgreementStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        updated_agreement = serializer.update_status(agreement, user=request.user)

        response_data = {
            'mensaje': 'Estado de acuerdo actualizado correctamente',
            'agreement': AgreementSerializer(updated_agreement, context={'request': request}).data
        }
        return Response(response_data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='audit-logs')
    def audit_logs(self, request, pk=None):
        """
        Consulta del historial de auditoría de un acuerdo específico.
        """
        agreement = self.get_object()
        logs = agreement.audit_logs.all().order_by('-fecha_cambio')
        serializer = AgreementAuditLogSerializer(logs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

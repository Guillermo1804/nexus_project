from django.db.models import Q
from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from apps.identity.permissions import IsAssignedAdvisorOrStudent
from apps.tutoring.models import TutoringSession
from apps.tutoring.serializers import TutoringSessionSerializer, TutoringSessionCreateSerializer


class TutoringSessionViewSet(viewsets.ModelViewSet):
    """
    CRUD para gestión de Sesiones de Tutoría en /api/v1/tutoring-sessions/
    """
    queryset = TutoringSession.objects.all().select_related(
        'student', 'semester', 'created_by'
    ).prefetch_related(
        'participants__user', 'observations__autor'
    )
    permission_classes = [permissions.IsAuthenticated, IsAssignedAdvisorOrStudent]

    def get_serializer_class(self):
        if self.action == 'create':
            return TutoringSessionCreateSerializer
        return TutoringSessionSerializer

    def get_queryset(self):
        user = self.request.user
        qs = TutoringSession.objects.all().select_related(
            'student', 'semester', 'created_by'
        ).prefetch_related(
            'participants__user', 'observations__autor'
        )

        if not user or not user.is_authenticated:
            return qs.none()

        # For object-level operations, return queryset for has_object_permission check (403 instead of 404)
        if self.detail or self.action not in ['list', None]:
            return qs

        # RBAC Filter for lists
        if not (user.is_superuser or getattr(user, 'role', None) == 'COORDINADOR'):
            if getattr(user, 'role', None) == 'ESTUDIANTE':
                qs = qs.filter(student__user=user)
            elif getattr(user, 'role', None) == 'ASESOR':
                qs = qs.filter(
                    Q(student__committee_members__user=user, student__committee_members__is_active=True) |
                    Q(created_by=user) |
                    Q(participants__user=user)
                ).distinct()

        # Query parameter filters
        student_param = self.request.query_params.get('student')
        if student_param:
            qs = qs.filter(student_id=student_param)

        semester_param = self.request.query_params.get('semester')
        if semester_param:
            if str(semester_param).isdigit():
                qs = qs.filter(Q(semester_id=semester_param) | Q(semester__numero=semester_param))
            else:
                qs = qs.filter(semester_id=semester_param)

        modalidad_param = self.request.query_params.get('modalidad')
        if modalidad_param:
            qs = qs.filter(modalidad__iexact=modalidad_param)

        fecha_inicio_param = self.request.query_params.get('fecha_inicio')
        if fecha_inicio_param:
            qs = qs.filter(fecha_sesion__gte=fecha_inicio_param)

        fecha_fin_param = self.request.query_params.get('fecha_fin')
        if fecha_fin_param:
            qs = qs.filter(fecha_sesion__lte=fecha_fin_param)

        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        session = serializer.save()

        response_data = {
            "tutoring_session_created_id": session.id,
            "mensaje": "Sesión de tutoría registrada correctamente",
            "tutoring_session": TutoringSessionSerializer(session, context={'request': request}).data
        }
        return Response(response_data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(
            {"details": "Recurso eliminado correctamente", "success": True},
            status=status.HTTP_200_OK
        )

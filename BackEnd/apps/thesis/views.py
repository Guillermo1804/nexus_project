from rest_framework import viewsets, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q

from .models import ThesisProgress
from .serializers import ThesisProgressSerializer, ThesisProgressCreateSerializer
from apps.students.models import Student
from apps.identity.permissions import IsAssignedAdvisorOrStudent


class ThesisProgressViewSet(viewsets.ModelViewSet):
    """
    ViewSet para la gestión y seguimiento del avance de tesis doctoral.
    Permite registrar porcentajes y componentes estructurados.
    """
    permission_classes = [IsAuthenticated, IsAssignedAdvisorOrStudent]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['student__nombre_completo', 'student__matricula', 'observaciones']
    ordering_fields = ['fecha_registro', 'porcentaje_avance', 'created_at']
    ordering = ['-fecha_registro', '-created_at']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return ThesisProgress.objects.none()

        qs = ThesisProgress.objects.select_related('student', 'semester').all()

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

        return qs.distinct()

    def get_serializer_class(self):
        if self.action == 'create':
            return ThesisProgressCreateSerializer
        return ThesisProgressSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        if request.user.is_authenticated and not serializer.validated_data.get('registrado_por'):
            instance = serializer.save(registrado_por=request.user)
        else:
            instance = serializer.save()

        response_data = {
            'thesis_progress_created_id': instance.id,
            'mensaje': 'Avance de tesis registrado correctamente',
            'thesis_progress': ThesisProgressSerializer(instance, context={'request': request}).data
        }
        return Response(response_data, status=status.HTTP_201_CREATED)


    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {'details': 'Recurso eliminado correctamente', 'success': True},
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['get'], url_path='history')
    def history(self, request):
        """
        HU-16: Retorna la evolución longitudinal histórica del avance de tesis
        para los semestres del doctorando con componentes y porcentajes desglosados.
        """
        user = request.user
        if not user.is_authenticated:
            return Response({'detail': 'No autenticado'}, status=status.HTTP_401_UNAUTHORIZED)

        student_id = request.query_params.get('student_id') or request.query_params.get('student')

        if getattr(user, 'role', None) == 'ESTUDIANTE':
            student_obj = Student.objects.filter(user=user).first()
            if not student_obj:
                return Response({'detail': 'Perfil de estudiante no encontrado'}, status=status.HTTP_404_NOT_FOUND)
            if student_id and str(student_obj.id) != str(student_id):
                return Response({'detail': 'No tiene permisos para consultar el historial de otro estudiante'}, status=status.HTTP_403_FORBIDDEN)
            student = student_obj
        else:
            if not student_id:
                return Response({'detail': 'El parámetro student_id o student es requerido'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                student = Student.objects.get(pk=student_id)
            except (Student.DoesNotExist, ValueError):
                student = Student.objects.first()
                if not student:
                    return Response({'detail': 'Estudiante no encontrado'}, status=status.HTTP_404_NOT_FOUND)

            if getattr(user, 'role', None) == 'ASESOR' and not user.is_superuser:
                is_assigned = student.committee_members.filter(user=user, is_active=True).exists()
                if not is_assigned:
                    return Response({'detail': 'No tiene permisos para ver el historial de este estudiante'}, status=status.HTTP_403_FORBIDDEN)

        progresses = ThesisProgress.objects.filter(student=student).select_related('semester').order_by('semester__numero', 'fecha_registro', 'created_at')

        history_items = []
        for p in progresses:
            history_items.append({
                'id': p.id,
                'semester_id': p.semester_id,
                'semester_numero': p.semester.numero if p.semester else None,
                'porcentaje_avance': p.porcentaje_avance,
                'fecha_registro': str(p.fecha_registro),
                'componentes': p.componentes_json,
                'componentes_json': p.componentes_json,
                'observaciones': p.observaciones,
                'created_at': p.created_at.isoformat() if p.created_at else None,
            })

        latest_progress = progresses.last()
        progreso_actual = latest_progress.porcentaje_avance if latest_progress else 0

        data = {
            'student_id': student.id,
            'student_matricula': student.matricula,
            'student_nombre': student.nombre_completo,
            'total_registros': len(history_items),
            'progreso_actual': progreso_actual,
            'historico': history_items
        }
        return Response(data, status=status.HTTP_200_OK)

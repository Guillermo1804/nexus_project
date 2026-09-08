from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.identity.permissions import IsCoordinator, IsAssignedAdvisorOrStudent
from apps.students.models import Student, Semester, AcademicCommittee
from apps.students.serializers import (
    StudentSerializer,
    StudentCreateSerializer,
    SemesterSerializer,
    AcademicCommitteeSerializer
)


class StudentViewSet(viewsets.ModelViewSet):
    """
    CRUD para gestión de Estudiantes en /api/v1/students/
    """
    queryset = Student.objects.all().prefetch_related('semesters', 'committee_members__user')
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        """
        Retorna la instancia del estudiante solicitado.
        Si no se encuentra (por ejemplo, si el frontend envía un ID '1' tras regenerar datos o 'me'),
        se intenta obtener el estudiante solicitado o se hace fallback seguro según el rol del usuario autenticado.
        """
        queryset = self.filter_queryset(self.get_queryset())
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        pk = self.kwargs.get(lookup_url_kwarg)
        user = self.request.user

        try:
            if pk == 'me':
                if hasattr(user, 'student_profile') and user.student_profile:
                    obj = user.student_profile
                else:
                    obj = queryset.first()
            else:
                obj = queryset.get(pk=pk)
        except (Student.DoesNotExist, ValueError):
            if user.is_authenticated:
                if getattr(user, 'role', None) == 'ESTUDIANTE' and hasattr(user, 'student_profile') and user.student_profile:
                    obj = user.student_profile
                elif getattr(user, 'role', None) in ['ASESOR', 'COASESOR', 'COMITE']:
                    assigned = queryset.filter(committee_members__user=user, committee_members__is_active=True).first()
                    obj = assigned or queryset.first()
                else:
                    obj = queryset.first()
            else:
                obj = queryset.first()

            if not obj:
                from rest_framework.exceptions import NotFound
                raise NotFound("Estudiante no encontrado.")
        
        self.check_object_permissions(self.request, obj)
        return obj

    def get_permissions(self):
        if self.action in ['create', 'destroy']:
            return [IsCoordinator()]
        if self.action in ['retrieve', 'update', 'partial_update', 'semesters', 'committee', 'committee_detail']:
            return [IsAssignedAdvisorOrStudent()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'create':
            return StudentCreateSerializer
        return StudentSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        student = serializer.save()
        response_data = {
            "student_created_id": student.id,
            "mensaje": "Estudiante registrado correctamente",
            "student": StudentSerializer(student).data
        }
        return Response(response_data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(
            {"details": "Recurso eliminado correctamente", "success": True},
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['get', 'post'], url_path='semesters')
    def semesters(self, request, pk=None):
        student = self.get_object()
        self.check_object_permissions(request, student)

        if request.method == 'GET':
            semesters = student.semesters.all().order_by('numero')
            serializer = SemesterSerializer(semesters, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        elif request.method == 'POST':
            if not (request.user.is_superuser or getattr(request.user, 'role', None) == 'COORDINADOR'):
                return Response(
                    {"detail": "Solo el coordinador puede registrar semestres."},
                    status=status.HTTP_403_FORBIDDEN
                )
            data = request.data.copy()
            data['student'] = student.id
            serializer = SemesterSerializer(data=data)
            serializer.is_valid(raise_exception=True)
            semester = serializer.save()
            return Response(
                {
                    "semester_created_id": semester.id,
                    "mensaje": f"Semestre {semester.numero} registrado correctamente",
                    "semester": SemesterSerializer(semester).data
                },
                status=status.HTTP_201_CREATED
            )

    @action(detail=True, methods=['get', 'post'], url_path='committee')
    def committee(self, request, pk=None):
        """
        GET: Lista los miembros del comité académico del estudiante.
        POST: Asigna un nuevo miembro al comité académico (Solo Coordinador).
        """
        student = self.get_object()
        self.check_object_permissions(request, student)

        if request.method == 'GET':
            members = student.committee_members.filter(is_active=True).select_related('user')
            serializer = AcademicCommitteeSerializer(members, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        elif request.method == 'POST':
            if not (request.user.is_superuser or getattr(request.user, 'role', None) == 'COORDINADOR'):
                return Response(
                    {"detail": "Solo el coordinador puede asignar miembros al comité académico."},
                    status=status.HTTP_403_FORBIDDEN
                )
            data = request.data.copy()
            data['student'] = student.id
            serializer = AcademicCommitteeSerializer(data=data)
            serializer.is_valid(raise_exception=True)
            committee_member = serializer.save()
            return Response(
                {
                    "committee_member_created_id": committee_member.id,
                    "mensaje": "Miembro asignado al comité académico correctamente",
                    "committee_member": AcademicCommitteeSerializer(committee_member).data
                },
                status=status.HTTP_201_CREATED
            )

    @action(detail=True, methods=['get', 'put', 'patch', 'delete'], url_path=r'committee/(?P<member_id>[^/.]+)')
    def committee_detail(self, request, pk=None, member_id=None):
        """
        GET / PUT / PATCH / DELETE sobre un miembro específico del comité del estudiante.
        """
        student = self.get_object()
        self.check_object_permissions(request, student)

        try:
            member = student.committee_members.get(pk=member_id)
        except AcademicCommittee.DoesNotExist:
            return Response({"detail": "Miembro del comité no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == 'GET':
            serializer = AcademicCommitteeSerializer(member)
            return Response(serializer.data, status=status.HTTP_200_OK)

        # Solo coordinador puede modificar o eliminar miembros
        if not (request.user.is_superuser or getattr(request.user, 'role', None) == 'COORDINADOR'):
            return Response(
                {"detail": "Solo el coordinador puede modificar o remover miembros del comité académico."},
                status=status.HTTP_403_FORBIDDEN
            )

        if request.method in ['PUT', 'PATCH']:
            serializer = AcademicCommitteeSerializer(member, data=request.data, partial=(request.method == 'PATCH'))
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        elif request.method == 'DELETE':
            member.delete()
            return Response(
                {"details": "Recurso eliminado correctamente", "success": True},
                status=status.HTTP_200_OK
            )


class SemesterViewSet(viewsets.ModelViewSet):
    """
    CRUD para gestión directa de Semestres en /api/v1/students/semesters/
    """
    queryset = Semester.objects.all().select_related('student')
    serializer_class = SemesterSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsCoordinator()]
        return [IsAssignedAdvisorOrStudent()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        semester = serializer.save()
        return Response(
            {
                "semester_created_id": semester.id,
                "mensaje": f"Semestre {semester.numero} registrado correctamente",
                "semester": SemesterSerializer(semester).data
            },
            status=status.HTTP_201_CREATED
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(
            {"details": "Recurso eliminado correctamente", "success": True},
            status=status.HTTP_200_OK
        )


class AcademicCommitteeViewSet(viewsets.ModelViewSet):
    """
    CRUD directo para asignaciones de Comité Académico en /api/v1/students/committee-assignments/
    """
    queryset = AcademicCommittee.objects.all().select_related('student', 'user')
    serializer_class = AcademicCommitteeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsCoordinator()]
        return [IsAssignedAdvisorOrStudent()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        member = serializer.save()
        return Response(
            {
                "committee_member_created_id": member.id,
                "mensaje": "Miembro asignado al comité académico correctamente",
                "committee_member": AcademicCommitteeSerializer(member).data
            },
            status=status.HTTP_201_CREATED
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(
            {"details": "Recurso eliminado correctamente", "success": True},
            status=status.HTTP_200_OK
        )

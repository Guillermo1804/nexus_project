from rest_framework import mixins, status, viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken, TokenError

from django.db import transaction
from django.db.models import Prefetch, Q
from django.utils import timezone

from .models import (
    AcademicCommittee,
    AcademicEvent,
    Agreement,
    AgreementAuditLog,
    CommitteeMembership,
    AdminAuditLog,
    CustomUser,
    Publication,
    ResearchStay,
    Semester,
    Student,
    ThesisProgress,
    TutoringSession,
    TutoringParticipant,
    TutoringObservation,
    Evidence,
)
from .permissions import (
    CanAssignRoles,
    CanCreateTutoring,
    CanManageCommittee,
    CanManageSemesters,
    CanReadGlobalAcademics,
    permissions_for_user,
)
from .serializers import (
    LoginSerializer,
    InstitutionalUserCreateSerializer,
    CommitteeAssignmentReadSerializer,
    CommitteeAssignmentSerializer,
    AdminAuditLogSerializer,
    RoleAssignmentSerializer,
    SemesterSerializer,
    StudentCreateSerializer,
    StudentRecordSerializer,
    TutoringSessionCreateSerializer,
    TutoringSessionSerializer,
    TutoringParticipantSerializer,
    TutoringObservationSerializer,
    AgreementSerializer,
    AgreementAuditLogSerializer,
    AgreementStatusSerializer,
    UserSerializer,
    EvidenceSerializer,
)


class NexusPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


def paginated_response(request, queryset, serializer_class):
    paginator = NexusPagination()
    page = paginator.paginate_queryset(queryset, request)
    return paginator.get_paginated_response(serializer_class(page, many=True).data)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        refresh = RefreshToken.for_user(user)
        return Response(
            {'access': str(refresh.access_token), 'refresh': str(refresh), 'user': UserSerializer(user).data},
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh = request.data.get('refresh')
        if not refresh:
            return Response({'detail': 'Refresh token requerido.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            RefreshToken(refresh).blacklist()
        except TokenError:
            return Response({'detail': 'Refresh token inválido.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'logout': True}, status=status.HTTP_200_OK)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class UserRoleListView(APIView):
    permission_classes = [CanAssignRoles | CanManageCommittee]

    def get(self, request):
        users = CustomUser.objects.order_by('email')
        return paginated_response(request, users, UserSerializer)


class UserRoleUpdateView(APIView):
    permission_classes = [CanAssignRoles]

    @transaction.atomic
    def patch(self, request, user_id):
        user = CustomUser.objects.filter(pk=user_id).first()
        if user is None:
            return Response({'detail': 'Usuario no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        if user.role == CustomUser.Role.SYSTEM_ADMIN:
            return Response(
                {'detail': 'No se puede modificar el rol del administrador del sistema principal.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = RoleAssignmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_role = serializer.validated_data['role']
        if new_role == CustomUser.Role.SYSTEM_ADMIN:
            return Response(
                {'detail': 'No está permitido promover usuarios al rol de administrador del sistema.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if new_role == CustomUser.Role.STUDENT and user.role != CustomUser.Role.STUDENT:
            return Response(
                {'detail': 'Un usuario que no sea estudiante no puede ser asignado como estudiante.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        previous_role = user.role
        with transaction.atomic():
            user.role = new_role
            user.save(update_fields=['role', 'updated_at'])
            AdminAuditLog.objects.create(
                action=AdminAuditLog.Action.ROLE_ASSIGNED,
                actor=request.user,
                target_user=user,
                details={'previous_role': previous_role, 'new_role': user.role},
            )
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)


class InstitutionalUserCreateView(APIView):
    permission_classes = [CanAssignRoles]

    @transaction.atomic
    def post(self, request):
        serializer = InstitutionalUserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        AdminAuditLog.objects.create(
            action=AdminAuditLog.Action.INSTITUTIONAL_USER_CREATED,
            actor=request.user,
            target_user=user,
            details={'role': user.role},
        )
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class CommitteeAssignmentListCreateView(APIView):
    permission_classes = [CanManageCommittee]

    def get(self, request):
        committees = AcademicCommittee.objects.select_related('student').prefetch_related('memberships__user').order_by('student__matricula')
        return paginated_response(request, committees, CommitteeAssignmentReadSerializer)

    @transaction.atomic
    def post(self, request):
        serializer = CommitteeAssignmentReadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        committee = serializer.save()
        for membership in committee.memberships.all():
            AdminAuditLog.objects.create(
                action=AdminAuditLog.Action.COMMITTEE_ASSIGNED,
                actor=request.user,
                target_user=membership.user,
                committee_assignment=membership,
                details={'student_id': committee.student_id, 'role': membership.role},
            )
        return Response(CommitteeAssignmentReadSerializer(committee).data, status=status.HTTP_201_CREATED)


class AdminStudentListView(APIView):
    permission_classes = [CanManageCommittee]

    def get(self, request):
        students = Student.objects.order_by('matricula')
        return paginated_response(request, students, StudentRecordSerializer)

class CommitteeAssignmentUpdateView(APIView):
    permission_classes = [CanManageCommittee]

    @transaction.atomic
    def delete(self, request, assignment_id):
        membership = CommitteeMembership.objects.filter(pk=assignment_id).first()
        if membership is None:
            return Response({'detail': 'Membresía no encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        membership.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminAuditLogListView(APIView):
    permission_classes = [CanAssignRoles]

    def get(self, request):
        logs = AdminAuditLog.objects.select_related('actor', 'target_user').order_by('-created_at')
        return paginated_response(request, logs, AdminAuditLogSerializer)


class StudentRecordView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, student_id):
        if request.user.role == CustomUser.Role.SYSTEM_ADMIN:
            return Response({'detail': 'No tiene permisos para consultar expedientes académicos.'}, status=status.HTTP_403_FORBIDDEN)

        permissions = permissions_for_user(request.user)
        students = Student.objects.filter(pk=student_id)
        if 'academic.read.global' not in permissions:
            allowed = Q()
            if 'records.read.own' in permissions:
                allowed |= Q(user=request.user)
            if 'records.read.assigned' in permissions:
                allowed |= Q(academic_committee__memberships__user=request.user)
            students = students.filter(allowed) if allowed else students.none()

        student = students.select_related('user').prefetch_related(
            Prefetch('semesters', queryset=Semester.objects.order_by('numero')),
            Prefetch('academic_committee__memberships', queryset=CommitteeMembership.objects.select_related('user')),
            Prefetch('tutoring_sessions', queryset=TutoringSession.objects.order_by('-fecha_sesion', '-id')),
            Prefetch(
                'agreements',
                queryset=Agreement.objects.filter(
                    estado__in=[Agreement.Status.PENDING, Agreement.Status.IN_PROGRESS]
                ).select_related('responsable').order_by('fecha_limite'),
            ),
            Prefetch('thesis_progresses', queryset=ThesisProgress.objects.order_by('-fecha_registro', '-id')),
            Prefetch('publication_set', queryset=Publication.objects.order_by('-fecha_publicacion', '-id')),
            Prefetch('academicevent_set', queryset=AcademicEvent.objects.order_by('-fecha_presentacion', '-id')),
            Prefetch('researchstay_set', queryset=ResearchStay.objects.order_by('-fecha_inicio', '-id')),
        ).first()
        if student is None:
            return Response({'detail': 'Expediente no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        return Response(StudentRecordSerializer(student).data)


class StudentViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [IsAuthenticated]
    serializer_class = StudentRecordSerializer
    pagination_class = NexusPagination

    def get_serializer_class(self):
        if self.action == 'create':
            return StudentCreateSerializer
        return StudentRecordSerializer

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return Student.objects.none()
        permissions = permissions_for_user(user)
        if 'academic.read.global' in permissions:
            return Student.objects.all().order_by('id')
        elif 'records.read.assigned' in permissions:
            return Student.objects.filter(
                academic_committee__memberships__user=user,
            ).distinct().order_by('id')
        elif 'records.read.own' in permissions:
            return Student.objects.filter(user=user).order_by('id')
        return Student.objects.none()

    def create(self, request, *args, **kwargs):
        if 'students.create' not in permissions_for_user(request.user):
            return Response({'detail': 'No tiene permisos para crear estudiantes.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        student = serializer.save()
        return Response(StudentRecordSerializer(student).data, status=status.HTTP_201_CREATED)


def can_access_student(user, student, write=False):
    if student.user_id == user.id:
        return not write or user.role == CustomUser.Role.STUDENT
    return CommitteeMembership.objects.filter(committee__student=student, user=user).exists()


class TutoringSessionViewSet(viewsets.ModelViewSet):
    permission_classes = [CanCreateTutoring]
    pagination_class = NexusPagination

    def get_serializer_class(self):
        return TutoringSessionCreateSerializer if self.action in ('create', 'update', 'partial_update') else TutoringSessionSerializer

    def get_queryset(self):
        user = self.request.user
        return TutoringSession.objects.filter(
            Q(student__user=user) | Q(student__academic_committee__memberships__user=user)
        ).distinct().order_by('-fecha_sesion', '-id')

    def perform_create(self, serializer):
        student = serializer.validated_data['student']
        if not can_access_student(self.request.user, student):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('No puede registrar tutorías para este estudiante.')
        serializer.save()

    def perform_update(self, serializer):
        if not can_access_student(self.request.user, self.get_object().student, write=True):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('No puede modificar esta tutoría.')
        serializer.save()

    def perform_destroy(self, instance):
        if not can_access_student(self.request.user, instance.student, write=True):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('No puede eliminar esta tutoría.')
        instance.delete()

    from rest_framework.decorators import action

    @action(detail=True, methods=['get', 'post'], url_path='participants')
    def participants(self, request, pk=None):
        session = self.get_object()
        if request.method == 'GET':
            return Response(TutoringParticipantSerializer(session.participants.select_related('user'), many=True).data)
        serializer = TutoringParticipantSerializer(data=request.data, context={'session': session})
        serializer.is_valid(raise_exception=True)
        participant = serializer.save(session=session)
        return Response(TutoringParticipantSerializer(participant).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get', 'post'], url_path='observations')
    def observations(self, request, pk=None):
        session = self.get_object()
        if request.method == 'GET':
            return Response(TutoringObservationSerializer(session.observations.select_related('autor'), many=True).data)
        serializer = TutoringObservationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        observation = serializer.save(session=session, autor=request.user)
        return Response(TutoringObservationSerializer(observation).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get', 'post'], url_path='agreements')
    def agreements(self, request, pk=None):
        session = self.get_object()
        if request.method == 'GET':
            return Response(AgreementSerializer(session.agreements.select_related('responsable'), many=True).data)
        serializer = AgreementSerializer(data=request.data, context={'session': session})
        serializer.is_valid(raise_exception=True)
        agreement = serializer.save(session=session, student=session.student, created_by=request.user)
        return Response(AgreementSerializer(agreement).data, status=status.HTTP_201_CREATED)


class AgreementViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = AgreementSerializer
    pagination_class = NexusPagination

    def get_queryset(self):
        user = self.request.user
        queryset = Agreement.objects.all() if 'academic.read.global' in permissions_for_user(user) else Agreement.objects.filter(
            Q(student__user=user) | Q(student__academic_committee__memberships__user=user)
        )
        if student := self.request.query_params.get('student'):
            queryset = queryset.filter(student_id=student)
        if responsable := self.request.query_params.get('responsable'):
            queryset = queryset.filter(responsable_id=responsable)
        if estado := self.request.query_params.get('estado'):
            queryset = queryset.filter(estado=estado)
        if self.request.query_params.get('vencido') == 'true':
            queryset = queryset.exclude(estado=Agreement.Status.COMPLETED).filter(fecha_limite__lt=timezone.localdate())
        return queryset.select_related('student', 'responsable').distinct().order_by('fecha_limite', 'id')

    from rest_framework.decorators import action

    @action(detail=True, methods=['patch'], url_path='status')
    @transaction.atomic
    def status(self, request, pk=None):
        agreement = self.get_object()
        if agreement.responsable_id != request.user.id:
            return Response({'detail': 'Sólo el responsable puede actualizar el estado.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = AgreementStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data['estado']
        allowed = {Agreement.Status.PENDING: Agreement.Status.IN_PROGRESS, Agreement.Status.IN_PROGRESS: Agreement.Status.COMPLETED}
        if allowed.get(agreement.estado) != new_status:
            return Response({'estado': ['Transición de estado no permitida.']}, status=status.HTTP_400_BAD_REQUEST)
        previous = agreement.estado
        agreement.estado = new_status
        agreement.fecha_conclusion = timezone.localdate() if new_status == Agreement.Status.COMPLETED else None
        agreement.save(update_fields=['estado', 'fecha_conclusion', 'updated_at'])
        AgreementAuditLog.objects.create(agreement=agreement, user=request.user, estado_anterior=previous,
                                         estado_nuevo=new_status, comentario=serializer.validated_data['comentario'])
        return Response(AgreementSerializer(agreement).data)

    @action(detail=True, methods=['get'], url_path='audit-log')
    def audit_log(self, request, pk=None):
        return Response(AgreementAuditLogSerializer(self.get_object().audit_logs.select_related('user'), many=True).data)


class EvidenceViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = EvidenceSerializer
    pagination_class = NexusPagination

    def get_queryset(self):
        user = self.request.user
        queryset = Evidence.objects.filter(
            Q(student__user=user) | Q(student__academic_committee__memberships__user=user)
        )
        if student := self.request.query_params.get('student'):
            queryset = queryset.filter(student_id=student)
        return queryset.distinct().order_by('-created_at')

    def perform_create(self, serializer):
        student = serializer.validated_data['student']
        if not can_access_student(self.request.user, student):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('No puede cargar evidencias para este estudiante.')
        try:
            with transaction.atomic():
                evidence = serializer.save()
        except Exception:
            upload = serializer.validated_data.get('archivo_adjunto')
            if upload and getattr(upload, 'name', None):
                Evidence._meta.get_field('archivo_adjunto').storage.delete(upload.name)
            raise
        return evidence


class GlobalAcademicOverviewView(APIView):
    permission_classes = [CanReadGlobalAcademics]

    def get(self, request):
        students = Student.objects.filter(estatus_activo=True).order_by('matricula')
        return paginated_response(request, students, StudentRecordSerializer)


class StudentSemesterListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_student_and_check_access(self, request, student_id, write=False):
        student = Student.objects.filter(pk=student_id).first()
        if not student:
            return None, Response({'detail': 'Estudiante no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        user_perms = permissions_for_user(request.user)
        if write:
            if 'semesters.manage' not in user_perms:
                return None, Response({'detail': 'No tiene permisos para administrar semestres.'}, status=status.HTTP_403_FORBIDDEN)
        else:
            is_owner = student.user_id == request.user.id
            is_assigned = CommitteeMembership.objects.filter(committee__student=student, user=request.user).exists()
            can_read = 'academic.read.global' in user_perms or (is_owner and 'records.read.own' in user_perms) or (is_assigned and 'records.read.assigned' in user_perms)
            if not can_read:
                return None, Response({'detail': 'No tiene permisos para consultar semestres de este estudiante.'}, status=status.HTTP_403_FORBIDDEN)
        return student, None

    def get(self, request, student_id):
        student, error_response = self._get_student_and_check_access(request, student_id, write=False)
        if error_response:
            return error_response
        semesters = Semester.objects.filter(student=student).order_by('numero')
        return Response(SemesterSerializer(semesters, many=True).data, status=status.HTTP_200_OK)

    def post(self, request, student_id):
        student, error_response = self._get_student_and_check_access(request, student_id, write=True)
        if error_response:
            return error_response
        serializer = SemesterSerializer(data=request.data, context={'student': student})
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            if serializer.validated_data.get('is_active', True):
                Semester.objects.filter(student=student).update(is_active=False)
            semester = serializer.save(student=student)
        return Response(SemesterSerializer(semester).data, status=status.HTTP_201_CREATED)


class StudentSemesterDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, student_id, semester_id):
        user_perms = permissions_for_user(request.user)
        if 'semesters.manage' not in user_perms:
            return Response({'detail': 'No tiene permisos para modificar semestres.'}, status=status.HTTP_403_FORBIDDEN)
        semester = Semester.objects.filter(pk=semester_id, student_id=student_id).first()
        if not semester:
            return Response({'detail': 'Semestre no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = SemesterSerializer(semester, data=request.data, partial=True, context={'student': semester.student})
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            if serializer.validated_data.get('is_active') is True:
                Semester.objects.filter(student=semester.student).exclude(pk=semester.pk).update(is_active=False)
            semester = serializer.save()
        return Response(SemesterSerializer(semester).data, status=status.HTTP_200_OK)

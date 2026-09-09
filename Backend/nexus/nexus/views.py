from django.contrib.auth import logout
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.db import transaction

from .models import AcademicCommittee, AdminAuditLog, CustomUser, Student
from .permissions import CanAssignRoles, CanCreateTutoring, CanReadGlobalAcademics, permissions_for_user
from .serializers import (
    LoginSerializer,
    InstitutionalUserCreateSerializer,
    CommitteeAssignmentReadSerializer,
    CommitteeAssignmentSerializer,
    AdminAuditLogSerializer,
    RegistrationSerializer,
    RoleAssignmentSerializer,
    StudentRecordSerializer,
    TutoringSessionCreateSerializer,
    TutoringSessionSerializer,
    UserSerializer,
)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {**UserSerializer(user).data, 'token': token.key},
            status=status.HTTP_200_OK,
        )


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token = Token.objects.create(user=user)
        return Response(
            {**UserSerializer(user).data, 'token': token.key},
            status=status.HTTP_201_CREATED,
        )


class LogoutView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.auth:
            request.auth.delete()
        logout(request)
        return Response({'logout': True}, status=status.HTTP_200_OK)


class MeView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class UserRoleListView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [CanAssignRoles]

    def get(self, request):
        users = CustomUser.objects.order_by('email')
        return Response(UserSerializer(users, many=True).data)


class UserRoleUpdateView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [CanAssignRoles]

    def patch(self, request, user_id):
        user = CustomUser.objects.filter(pk=user_id).first()
        if user is None:
            return Response({'detail': 'Usuario no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = RoleAssignmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        previous_role = user.role
        user.role = serializer.validated_data['role']
        user.save(update_fields=['role', 'updated_at'])
        AdminAuditLog.objects.create(
            action=AdminAuditLog.Action.ROLE_ASSIGNED,
            actor=request.user,
            target_user=user,
            details={'previous_role': previous_role, 'new_role': user.role},
        )
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)


class InstitutionalUserCreateView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [CanAssignRoles]

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
    authentication_classes = [TokenAuthentication]
    permission_classes = [CanAssignRoles]

    def get(self, request):
        assignments = AcademicCommittee.objects.select_related('user', 'student').order_by('student__matricula')
        return Response(CommitteeAssignmentReadSerializer(assignments, many=True).data)

    def post(self, request):
        serializer = CommitteeAssignmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        assignment = serializer.save()
        AdminAuditLog.objects.create(
            action=AdminAuditLog.Action.COMMITTEE_ASSIGNED,
            actor=request.user,
            target_user=assignment.user,
            committee_assignment=assignment,
            details={'student_id': assignment.student_id, 'rol_comite': assignment.rol_comite},
        )
        return Response(CommitteeAssignmentReadSerializer(assignment).data, status=status.HTTP_201_CREATED)


class AdminStudentListView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [CanAssignRoles]

    def get(self, request):
        students = Student.objects.filter(estatus_activo=True).order_by('matricula')
        return Response(StudentRecordSerializer(students, many=True).data)


class CommitteeAssignmentUpdateView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [CanAssignRoles]

    def patch(self, request, assignment_id):
        assignment = AcademicCommittee.objects.filter(pk=assignment_id).first()
        if assignment is None:
            return Response({'detail': 'Asociacion no encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = CommitteeAssignmentSerializer(assignment, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        previous_status = assignment.is_active
        assignment = serializer.save()
        if previous_status != assignment.is_active:
            AdminAuditLog.objects.create(
                action=AdminAuditLog.Action.COMMITTEE_STATUS_CHANGED,
                actor=request.user,
                target_user=assignment.user,
                committee_assignment=assignment,
                details={'previous_is_active': previous_status, 'new_is_active': assignment.is_active},
            )
        return Response(CommitteeAssignmentReadSerializer(assignment).data)


class AdminAuditLogListView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [CanAssignRoles]

    def get(self, request):
        logs = AdminAuditLog.objects.select_related('actor', 'target_user').order_by('-created_at')
        return Response(AdminAuditLogSerializer(logs, many=True).data)


class StudentRecordView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, student_id):
        student = Student.objects.filter(pk=student_id).first()
        if student is None:
            return Response({'detail': 'Expediente no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        permissions = permissions_for_user(request.user)
        is_owner = student.user_id == request.user.id
        is_assigned = AcademicCommittee.objects.filter(
            student=student,
            user=request.user,
            is_active=True,
        ).exists()
        if not (is_owner and 'records.read.own' in permissions) and not (
            is_assigned and 'records.read.assigned' in permissions
        ) and 'academic.read.global' not in permissions:
            return Response({'detail': 'Expediente no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        return Response(StudentRecordSerializer(student).data)


class TutoringSessionCreateView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [CanCreateTutoring]

    @transaction.atomic
    def post(self, request):
        serializer = TutoringSessionCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        student = serializer.validated_data['student']
        user = request.user
        is_system_admin = user.role == CustomUser.Role.SYSTEM_ADMIN or user.is_superuser
        is_assigned = AcademicCommittee.objects.filter(
            student=student,
            user=user,
            is_active=True,
        ).exists()
        if not is_assigned and not is_system_admin:
            return Response(
                {'detail': 'No puede registrar tutorias para este estudiante.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        session = serializer.save()
        return Response(TutoringSessionSerializer(session).data, status=status.HTTP_201_CREATED)


class GlobalAcademicOverviewView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [CanReadGlobalAcademics]

    def get(self, request):
        students = Student.objects.filter(estatus_activo=True).order_by('matricula')
        return Response(StudentRecordSerializer(students, many=True).data)
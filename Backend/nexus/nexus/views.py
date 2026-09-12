from django.contrib.auth import logout
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.db import transaction

from .models import AcademicCommittee, AdminAuditLog, CustomUser, Semester, Student
from .permissions import (
    CanAssignRoles,
    CanCreateStudent,
    CanCreateTutoring,
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
    RegistrationSerializer,
    RoleAssignmentSerializer,
    SemesterSerializer,
    StudentCreateSerializer,
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

    @transaction.atomic
    def patch(self, request, user_id):
        user = CustomUser.objects.filter(pk=user_id).first()
        if user is None:
            return Response({'detail': 'Usuario no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = RoleAssignmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        previous_role = user.role
        with transaction.atomic():
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
    authentication_classes = [TokenAuthentication]
    permission_classes = [CanAssignRoles]

    def get(self, request):
        assignments = AcademicCommittee.objects.select_related('user', 'student').order_by('student__matricula')
        return Response(CommitteeAssignmentReadSerializer(assignments, many=True).data)

    @transaction.atomic
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

class StudentCreateView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [CanCreateStudent]

    def post(self, request):
        serializer = StudentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        student = serializer.save()

        return Response(
            StudentRecordSerializer(student).data,
            status=status.HTTP_201_CREATED
        )


class CommitteeAssignmentUpdateView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [CanAssignRoles]

    @transaction.atomic
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
        student = Student.objects.filter(pk=student_id).first() or Student.objects.filter(user_id=student_id).first()
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


class StudentSemesterListCreateView(APIView):
    authentication_classes = [TokenAuthentication]
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
            is_assigned = AcademicCommittee.objects.filter(student=student, user=request.user, is_active=True).exists()
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
    authentication_classes = [TokenAuthentication]
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

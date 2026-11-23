from django.db import models
from rest_framework.permissions import BasePermission

from .models import CustomUser, Student


ROLE_PERMISSIONS = {
    CustomUser.Role.STUDENT: {'records.read.own'},
    CustomUser.Role.TUTOR: {'records.read.assigned', 'tutoring.create'},
    CustomUser.Role.COMMITTEE_MEMBER: {'records.read.assigned', 'tutoring.create'},
    CustomUser.Role.PROGRAM_COORDINATOR: {
        'academic.read.global',
        'tutoring.create',
        'students.create',
        'semesters.manage',
        'records.read.assigned',
        'committee.manage',
    },
    CustomUser.Role.SYSTEM_ADMIN: {
        'users.role.assign',
    },
}


def permissions_for_user(user):
    if not user or not user.is_authenticated:
        return set()
    return ROLE_PERMISSIONS.get(user.role, set())


def can_access_student(user, student_id):
    """Return whether a user may subscribe to a student's realtime channel."""
    if not user or not user.is_authenticated or not user.is_active:
        return False
    if 'academic.read.global' in permissions_for_user(user):
        return Student.objects.filter(pk=student_id).exists()
    return Student.objects.filter(
        pk=student_id,
    ).filter(
        models.Q(user_id=user.id) | models.Q(academic_committee__memberships__user_id=user.id)
    ).exists()


class CanAssignRoles(BasePermission):
    def has_permission(self, request, view):
        return 'users.role.assign' in permissions_for_user(request.user)


class CanReadGlobalAcademics(BasePermission):
    def has_permission(self, request, view):
        return 'academic.read.global' in permissions_for_user(request.user)


class CanReadSupervisionAlerts(BasePermission):
    def has_permission(self, request, view):
        if 'academic.read.global' in permissions_for_user(request.user):
            return True
        return (
            request.user.is_authenticated
            and request.user.is_active
            and request.user.role in {
                CustomUser.Role.TUTOR,
                CustomUser.Role.COMMITTEE_MEMBER,
            }
            and Student.objects.filter(
                academic_committee__memberships__user=request.user,
                academic_committee__memberships__role='ASESOR',
            ).exists()
        )


class CanCreateTutoring(BasePermission):
    def has_permission(self, request, view):
        return 'tutoring.create' in permissions_for_user(request.user)


class CanManageCommittee(BasePermission):
    def has_permission(self, request, view):
        return 'committee.manage' in permissions_for_user(request.user)


class CanManageSemesters(BasePermission):
    def has_permission(self, request, view):
        return 'semesters.manage' in permissions_for_user(request.user)

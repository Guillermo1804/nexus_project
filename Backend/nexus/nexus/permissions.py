from rest_framework.permissions import BasePermission

from .models import CustomUser


ROLE_PERMISSIONS = {
    CustomUser.Role.STUDENT: {'records.read.own'},
    CustomUser.Role.TUTOR: {'records.read.assigned', 'tutoring.create'},
    CustomUser.Role.COMMITTEE_MEMBER: {'records.read.assigned', 'tutoring.create'},
    CustomUser.Role.PROGRAM_COORDINATOR: {'academic.read.global', 'students.create', 'semesters.manage', 'records.read.assigned'},
    CustomUser.Role.ACADEMIC_ADMIN: {'users.role.assign', 'academic.read.global', 'semesters.manage'},
    CustomUser.Role.SYSTEM_ADMIN: {
        'records.read.own',
        'records.read.assigned',
        'academic.read.global',
        'tutoring.create',
        'users.role.assign',
        'students.create',
        'semesters.manage',
    },
}


def permissions_for_user(user):
    if not user or not user.is_authenticated:
        return set()
    if user.is_superuser:
        return set().union(*ROLE_PERMISSIONS.values())
    return ROLE_PERMISSIONS.get(user.role, set())


class CanAssignRoles(BasePermission):
    def has_permission(self, request, view):
        return 'users.role.assign' in permissions_for_user(request.user)


class CanReadGlobalAcademics(BasePermission):
    def has_permission(self, request, view):
        return 'academic.read.global' in permissions_for_user(request.user)


class CanCreateTutoring(BasePermission):
    def has_permission(self, request, view):
        return 'tutoring.create' in permissions_for_user(request.user)
    
    
class CanCreateStudent(BasePermission):
    def has_permission(self, request, view):
        return 'students.create' in permissions_for_user(request.user)


class CanManageSemesters(BasePermission):
    def has_permission(self, request, view):
        return 'semesters.manage' in permissions_for_user(request.user)

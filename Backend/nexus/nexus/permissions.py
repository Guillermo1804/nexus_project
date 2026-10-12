from rest_framework import permissions
from django.contrib.auth import get_user_model
from .models import Student

CustomUser = get_user_model()

class can_access_student(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.student.user == request.user or request.user.role == 'SYSTEM_ADMIN'

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        student_id = request.query_params.get('student')
        if not student_id:
            return False
        try:
            student = Student.objects.get(id=student_id)
            return student.user == request.user or request.user.role == 'SYSTEM_ADMIN'
        except Student.DoesNotExist:
            return False
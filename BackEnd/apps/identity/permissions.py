from rest_framework.permissions import BasePermission


class RolePermissionBase(BasePermission):
    """
    Clase base utilitaria para validación de roles de usuario.
    Permite acceso si el usuario está autenticado y su rol está en allowed_roles
    o si es superusuario.
    """
    allowed_roles = []

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.is_superuser or getattr(request.user, 'role', None) in self.allowed_roles)
        )


class IsCoordinator(RolePermissionBase):
    """
    Permite acceso a coordinadores y administradores del sistema.
    """
    allowed_roles = ['PROGRAM_COORDINATOR', 'COORDINADOR', 'ACADEMIC_ADMIN', 'SYSTEM_ADMIN']


class IsAdvisor(RolePermissionBase):
    """
    Permite acceso a tutores, asesores y miembros de comité.
    """
    allowed_roles = ['TUTOR', 'ASESOR', 'COMMITTEE_MEMBER']


class IsStudent(RolePermissionBase):
    """
    Permite acceso a estudiantes / doctorandos.
    """
    allowed_roles = ['STUDENT', 'ESTUDIANTE']


class IsAssignedAdvisorOrStudent(BasePermission):
    """
    Permite acceso si el usuario es:
    1. Superusuario, Coordinador o Administrador
    2. El propio estudiante asociado al expediente u objeto
    3. Un asesor, coasesor o miembro asignado en el comité tutorial activo del estudiante (HU-02).
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        # Coordinadores y administradores tienen acceso global de consulta/gestión
        if user.is_superuser or getattr(user, 'role', None) in ['PROGRAM_COORDINATOR', 'COORDINADOR', 'ACADEMIC_ADMIN', 'SYSTEM_ADMIN']:
            return True

        # Determinar el objeto Student asociado
        student_obj = None

        if hasattr(obj, 'committee_members') and hasattr(obj, 'matricula'):
            student_obj = obj
        elif hasattr(obj, 'student') and obj.student is not None:
            student_obj = obj.student

        if student_obj is not None:
            # Verificar si el usuario autenticado es el estudiante
            if student_obj.user == user:
                return True

            # Verificar si el usuario es miembro activo del comité tutorial
            if student_obj.committee_members.filter(user=user, is_active=True).exists():
                return True

            return False

        # Si el objeto es un CustomUser
        if hasattr(obj, 'email') and hasattr(obj, 'role'):
            return obj == user

        # Si el objeto tiene relación directa 'user'
        if hasattr(obj, 'user') and obj.user is not None:
            return obj.user == user

        return False


class IsStudentOwner(BasePermission):
    """
    Permite acceso si el usuario autenticado es el estudiante propietario del recurso,
    o si es Coordinador / Administrador / Superusuario.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if user.is_superuser or getattr(user, 'role', None) in ['PROGRAM_COORDINATOR', 'COORDINADOR', 'ACADEMIC_ADMIN', 'SYSTEM_ADMIN']:
            return True

        if hasattr(obj, 'student') and obj.student is not None:
            return obj.student.user == user

        if hasattr(obj, 'user') and obj.user is not None:
            return obj.user == user

        if hasattr(obj, 'matricula') and hasattr(obj, 'user'):
            return obj.user == user

        return False

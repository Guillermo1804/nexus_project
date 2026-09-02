from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.utils.translation import gettext_lazy as _


class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError(_('El correo electrónico es obligatorio'))
        email = self.normalize_email(email)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('role', 'ESTUDIANTE')
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'COORDINADOR')

        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('Superuser must have is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Superuser must have is_superuser=True.'))

        return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractBaseUser, PermissionsMixin):
    ROLE_STUDENT = 'STUDENT'
    ROLE_TUTOR = 'TUTOR'
    ROLE_COMMITTEE_MEMBER = 'COMMITTEE_MEMBER'
    ROLE_PROGRAM_COORDINATOR = 'PROGRAM_COORDINATOR'
    ROLE_ACADEMIC_ADMIN = 'ACADEMIC_ADMIN'
    ROLE_SYSTEM_ADMIN = 'SYSTEM_ADMIN'

    # Alias y roles en español
    ROLE_COORDINADOR = 'COORDINADOR'
    ROLE_ASESOR = 'ASESOR'
    ROLE_ESTUDIANTE = 'ESTUDIANTE'

    ROLE_CHOICES = (
        (ROLE_STUDENT, _('Estudiante / Doctorando')),
        (ROLE_TUTOR, _('Tutor / Asesor Principal')),
        (ROLE_COMMITTEE_MEMBER, _('Coasesor / Miembro del Comité')),
        (ROLE_PROGRAM_COORDINATOR, _('Coordinador del Programa')),
        (ROLE_ACADEMIC_ADMIN, _('Administrador Académico')),
        (ROLE_SYSTEM_ADMIN, _('Administrador del Sistema')),
        (ROLE_COORDINADOR, _('Coordinador')),
        (ROLE_ASESOR, _('Asesor')),
        (ROLE_ESTUDIANTE, _('Estudiante')),
    )

    email = models.EmailField(_('email address'), unique=True, max_length=255)
    first_name = models.CharField(_('first name'), max_length=150)
    last_name = models.CharField(_('last name'), max_length=150)
    role = models.CharField(
        _('role'),
        max_length=30,
        choices=ROLE_CHOICES,
        default=ROLE_ESTUDIANTE
    )
    is_active = models.BooleanField(_('active'), default=True)
    is_staff = models.BooleanField(_('staff status'), default=False)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        verbose_name = _('user')
        verbose_name_plural = _('users')
        ordering = ['-created_at']

    def get_full_name(self):
        full_name = f"{self.first_name} {self.last_name}"
        return full_name.strip()

    def get_short_name(self):
        return self.first_name

    def __str__(self):
        return f"{self.email} ({self.role})"

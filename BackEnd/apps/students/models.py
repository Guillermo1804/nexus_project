from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class Student(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='student_profile'
    )
    matricula = models.CharField(_('matrícula'), max_length=20, unique=True, db_index=True)
    nombre_completo = models.CharField(_('nombre completo'), max_length=255)
    programa_doctoral = models.CharField(
        _('programa doctoral'),
        max_length=255,
        default='Doctorado en Ciencias'
    )
    fecha_ingreso = models.DateField(_('fecha de ingreso'), null=True, blank=True, default=timezone.now)
    cohorte = models.CharField(_('cohorte'), max_length=20, db_index=True)
    estatus_activo = models.BooleanField(_('estatus activo'), default=True, db_index=True)
    created_at = models.DateTimeField(_('fecha de registro'), auto_now_add=True)
    updated_at = models.DateTimeField(_('última actualización'), auto_now=True)


    class Meta:
        verbose_name = _('estudiante')
        verbose_name_plural = _('estudiantes')
        ordering = ['matricula']

    def __str__(self):
        return f"{self.matricula} - {self.nombre_completo}"


class Semester(models.Model):
    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name='semesters'
    )
    numero = models.PositiveSmallIntegerField(
        _('número de semestre'),
        validators=[
            MinValueValidator(1, message=_('El semestre no puede ser menor a 1')),
            MaxValueValidator(6, message=_('El semestre no puede ser mayor a 6')),
        ]
    )
    fecha_inicio = models.DateField(_('fecha de inicio'))
    fecha_fin = models.DateField(_('fecha de fin'))
    is_active = models.BooleanField(_('activo'), default=True)
    created_at = models.DateTimeField(_('fecha de registro'), auto_now_add=True)
    updated_at = models.DateTimeField(_('última actualización'), auto_now=True)

    class Meta:
        verbose_name = _('semestre')
        verbose_name_plural = _('semestres')
        ordering = ['numero']
        constraints = [
            models.UniqueConstraint(
                fields=['student', 'numero'],
                name='unique_student_semester'
            )
        ]

    def clean(self):
        super().clean()
        if self.fecha_inicio and self.fecha_fin and self.fecha_fin < self.fecha_inicio:
            raise ValidationError({
                'fecha_fin': _('La fecha de fin no puede ser anterior a la fecha de inicio.')
            })

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Semestre {self.numero} - {self.student.matricula}"


class AcademicCommittee(models.Model):
    COMMITTEE_ROLE_CHOICES = (
        ('ASESOR_PRINCIPAL', 'Asesor Principal / Director'),
        ('COASESOR', 'Coasesor'),
        ('VOCAL', 'Vocal'),
        ('SECRETARIO', 'Secretario'),
    )

    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name='committee_members',
        verbose_name=_('estudiante')
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='committee_assignments',
        verbose_name=_('usuario académico')
    )
    rol_comite = models.CharField(
        _('rol en el comité'),
        max_length=30,
        choices=COMMITTEE_ROLE_CHOICES,
        default='ASESOR_PRINCIPAL'
    )
    fecha_asignacion = models.DateField(
        _('fecha de asignación'),
        default=timezone.now
    )
    is_active = models.BooleanField(_('activo'), default=True)
    created_at = models.DateTimeField(_('fecha de registro'), auto_now_add=True)
    updated_at = models.DateTimeField(_('última actualización'), auto_now=True)

    class Meta:
        verbose_name = _('miembro de comité académico')
        verbose_name_plural = _('miembros de comité académico')
        ordering = ['-is_active', 'rol_comite', '-fecha_asignacion']
        constraints = [
            models.UniqueConstraint(
                fields=['student', 'user', 'rol_comite'],
                name='unique_student_user_committee_role'
            )
        ]

    def clean(self):
        super().clean()
        # Validación de roles compatibles (CA-04.1)
        if self.user_id:
            user_role = getattr(self.user, 'role', None)
            if user_role not in ['ASESOR', 'COORDINADOR'] and not getattr(self.user, 'is_superuser', False):
                raise ValidationError({
                    'user': _('Solo se pueden asignar usuarios con rol ASESOR o COORDINADOR al comité académico.')
                })

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.get_rol_comite_display()}: {self.user.get_full_name()} -> {self.student.nombre_completo}"

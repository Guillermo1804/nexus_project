from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from apps.students.models import Student, Semester


def default_thesis_components():
    return {
        'protocolo': 0,
        'estadoArte': 0,
        'marcoTeorico': 0,
        'metodologia': 0,
        'analisis': 0,
        'redaccion': 0,
    }


class ThesisProgress(models.Model):
    """
    Modelo para el seguimiento y registro del porcentaje de avance de tesis doctoral
    y desglose por componentes estructurados.
    """
    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name='thesis_progresses',
        db_index=True,
        verbose_name=_('estudiante')
    )
    semester = models.ForeignKey(
        Semester,
        on_delete=models.CASCADE,
        related_name='thesis_progresses',
        db_index=True,
        verbose_name=_('semestre')
    )
    porcentaje_avance = models.PositiveSmallIntegerField(
        _('porcentaje de avance'),
        validators=[
            MinValueValidator(0, message=_('El porcentaje no puede ser menor a 0%')),
            MaxValueValidator(100, message=_('El porcentaje no puede ser mayor a 100%'))
        ],
        help_text=_('Porcentaje global de avance de la tesis (0-100%)')
    )
    componentes_json = models.JSONField(
        _('componentes de tesis'),
        default=default_thesis_components,
        blank=True,
        help_text=_('Desglose de avance por componentes clave del proyecto doctoral')
    )
    observaciones = models.TextField(
        _('observaciones'),
        blank=True,
        default=''
    )
    registrado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='registered_thesis_progresses',
        verbose_name=_('registrado por')
    )
    fecha_registro = models.DateField(
        _('fecha de registro'),
        default=timezone.now,
        db_index=True
    )
    created_at = models.DateTimeField(_('fecha de creación'), auto_now_add=True)
    updated_at = models.DateTimeField(_('última actualización'), auto_now=True)


    class Meta:
        verbose_name = _('avance de tesis')
        verbose_name_plural = _('avances de tesis')
        ordering = ['-fecha_registro', '-created_at']

    def clean(self):
        super().clean()
        if self.student and self.semester and self.semester.student_id != self.student.id:
            raise ValidationError({
                'semester': _('El semestre seleccionado no pertenece al estudiante asignado.')
            })

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.student.matricula} - {self.porcentaje_avance}% ({self.fecha_registro})"

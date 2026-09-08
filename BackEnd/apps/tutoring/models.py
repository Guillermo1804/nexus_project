from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from apps.students.models import Student, Semester


class TutoringSession(models.Model):
    MODALIDAD_CHOICES = (
        ('PRESENCIAL', 'Presencial'),
        ('VIRTUAL', 'Virtual'),
        ('HIBRIDA', 'Híbrida'),
    )

    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name='tutoring_sessions',
        verbose_name=_('estudiante')
    )
    semester = models.ForeignKey(
        Semester,
        on_delete=models.CASCADE,
        related_name='tutoring_sessions',
        verbose_name=_('semestre')
    )
    fecha_sesion = models.DateField(
        _('fecha de la sesión'),
        db_index=True
    )
    modalidad = models.CharField(
        _('modalidad'),
        max_length=20,
        choices=MODALIDAD_CHOICES,
        default='PRESENCIAL'
    )
    resumen = models.TextField(_('resumen de la sesión'))
    proxima_reunion_fecha = models.DateField(
        _('fecha de próxima reunión'),
        null=True,
        blank=True
    )
    proxima_reunion_notas = models.TextField(
        _('notas de próxima reunión'),
        blank=True,
        default=''
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='registered_tutoring_sessions',
        verbose_name=_('registrado por')
    )
    created_at = models.DateTimeField(_('fecha de registro'), auto_now_add=True)
    updated_at = models.DateTimeField(_('última actualización'), auto_now=True)

    class Meta:
        verbose_name = _('sesión de tutoría')
        verbose_name_plural = _('sesiones de tutoría')
        ordering = ['-fecha_sesion', '-id']

    def __str__(self):
        return f"Sesión {self.id} - {self.student.nombre_completo} ({self.fecha_sesion})"


class TutoringParticipant(models.Model):
    ROL_CHOICES = (
        ('ESTUDIANTE', 'Estudiante'),
        ('ASESOR_PRINCIPAL', 'Asesor Principal'),
        ('COASESOR', 'Coasesor'),
        ('VOCAL', 'Vocal'),
        ('SECRETARIO', 'Secretario'),
        ('INVITADO', 'Invitado'),
    )

    session = models.ForeignKey(
        TutoringSession,
        on_delete=models.CASCADE,
        related_name='participants',
        verbose_name=_('sesión de tutoría')
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tutoring_attendances',
        verbose_name=_('usuario participante')
    )
    rol_en_sesion = models.CharField(
        _('rol en la sesión'),
        max_length=30,
        choices=ROL_CHOICES
    )
    asistencia = models.BooleanField(_('asistencia'), default=True)
    notas = models.CharField(_('notas'), max_length=255, blank=True, default='')

    class Meta:
        verbose_name = _('participante de tutoría')
        verbose_name_plural = _('participantes de tutoría')
        ordering = ['rol_en_sesion', 'user']
        constraints = [
            models.UniqueConstraint(
                fields=['session', 'user'],
                name='unique_session_participant'
            )
        ]

    def __str__(self):
        nombre = self.user.get_full_name() if hasattr(self.user, 'get_full_name') and self.user.get_full_name() else getattr(self.user, 'username', str(self.user))
        return f"{nombre} ({self.get_rol_en_sesion_display()}) - {'Asistió' if self.asistencia else 'No asistió'}"


class TutoringObservation(models.Model):
    session = models.ForeignKey(
        TutoringSession,
        on_delete=models.CASCADE,
        related_name='observations',
        verbose_name=_('sesión de tutoría')
    )
    autor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tutoring_observations',
        verbose_name=_('autor de la observación')
    )
    tema_revisado = models.CharField(_('tema revisado'), max_length=255, blank=True, default='')
    observaciones_detalladas = models.TextField(_('observaciones detalladas'), blank=True, default='')
    titulo_tema = models.CharField(_('título o tema revisado'), max_length=255, blank=True, default='')
    contenido = models.TextField(_('contenido / comentarios de avance'), blank=True, default='')
    created_at = models.DateTimeField(_('fecha de registro'), auto_now_add=True)
    updated_at = models.DateTimeField(_('última actualización'), auto_now=True)

    class Meta:
        verbose_name = _('observación de tutoría')
        verbose_name_plural = _('observaciones de tutoría')
        ordering = ['created_at', 'id']

    def save(self, *args, **kwargs):
        if self.tema_revisado and not self.titulo_tema:
            self.titulo_tema = self.tema_revisado
        elif self.titulo_tema and not self.tema_revisado:
            self.tema_revisado = self.titulo_tema

        if self.observaciones_detalladas and not self.contenido:
            self.contenido = self.observaciones_detalladas
        elif self.contenido and not self.observaciones_detalladas:
            self.observaciones_detalladas = self.contenido
        super().save(*args, **kwargs)

    def __str__(self):
        tema = self.tema_revisado or self.titulo_tema or 'Observación'
        return f"{tema} - {self.autor}"


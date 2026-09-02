from django.db import models
from django.conf import settings
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class AgreementQuerySet(models.QuerySet):
    def update_overdue_statuses(self):
        today = timezone.now().date()
        return self.filter(
            fecha_limite__lt=today
        ).exclude(
            estado__in=['CONCLUIDO', 'VENCIDO']
        ).update(
            estado='VENCIDO',
            updated_at=timezone.now()
        )


class AgreementManager(models.Manager):
    def get_queryset(self):
        return AgreementQuerySet(self.model, using=self._db)

    def with_overdue_check(self):
        qs = self.get_queryset()
        qs.update_overdue_statuses()
        return qs


class Agreement(models.Model):
    STATUS_PENDIENTE = 'PENDIENTE'
    STATUS_EN_PROCESO = 'EN_PROCESO'
    STATUS_CONCLUIDO = 'CONCLUIDO'
    STATUS_VENCIDO = 'VENCIDO'

    ESTADO_CHOICES = (
        (STATUS_PENDIENTE, 'Pendiente'),
        (STATUS_EN_PROCESO, 'En Proceso'),
        (STATUS_CONCLUIDO, 'Concluido'),
        (STATUS_VENCIDO, 'Vencido'),
    )

    session = models.ForeignKey(
        'tutoring.TutoringSession',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='agreements'
    )
    student = models.ForeignKey(
        'students.Student',
        on_delete=models.CASCADE,
        related_name='agreements',
        db_index=True
    )
    descripcion = models.TextField(_('descripción'))
    responsable = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='assigned_agreements'
    )
    fecha_limite = models.DateField(_('fecha límite'), db_index=True)
    estado = models.CharField(
        _('estado'),
        max_length=20,
        choices=ESTADO_CHOICES,
        default=STATUS_PENDIENTE,
        db_index=True
    )
    fecha_conclusion = models.DateField(_('fecha de conclusión'), null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='created_agreements'
    )
    created_at = models.DateTimeField(_('fecha de creación'), auto_now_add=True)
    updated_at = models.DateTimeField(_('última actualización'), auto_now=True)

    objects = AgreementManager()

    class Meta:
        verbose_name = _('acuerdo / compromiso')
        verbose_name_plural = _('acuerdos y compromisos')
        ordering = ['-fecha_limite', '-created_at']

    @property
    def is_vencido(self) -> bool:
        if self.estado == self.STATUS_CONCLUIDO:
            return False
        if self.fecha_limite and self.fecha_limite < timezone.now().date():
            return True
        return self.estado == self.STATUS_VENCIDO

    def check_and_update_overdue(self, save: bool = True) -> bool:
        """
        Verifica y actualiza automáticamente el estado a VENCIDO
        si fecha_limite < hoy y estado != 'CONCLUIDO'.
        Retorna True si el estado fue cambiado a VENCIDO.
        """
        if self.estado != self.STATUS_CONCLUIDO and self.fecha_limite:
            if self.fecha_limite < timezone.now().date():
                if self.estado != self.STATUS_VENCIDO:
                    self.estado = self.STATUS_VENCIDO
                    if save and self.pk:
                        self.save(update_fields=['estado', 'updated_at'])
                    return True
        return False

    def save(self, *args, **kwargs):
        # Auto-evaluar estado vencido en creación/guardado
        if self.estado != self.STATUS_CONCLUIDO and self.fecha_limite:
            if self.fecha_limite < timezone.now().date():
                self.estado = self.STATUS_VENCIDO
        if self.estado == self.STATUS_CONCLUIDO and not self.fecha_conclusion:
            self.fecha_conclusion = timezone.now().date()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Acuerdo #{self.pk} - {self.student.matricula} ({self.estado})"


class AgreementAuditLog(models.Model):
    agreement = models.ForeignKey(
        Agreement,
        on_delete=models.CASCADE,
        related_name='audit_logs'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='agreement_status_changes'
    )
    estado_anterior = models.CharField(_('estado anterior'), max_length=20)
    estado_nuevo = models.CharField(_('estado nuevo'), max_length=20)
    comentario = models.TextField(_('comentario'), blank=True, default='')
    fecha_cambio = models.DateTimeField(_('fecha de cambio'), auto_now_add=True)

    class Meta:
        verbose_name = _('bitácora de cambio de estado de acuerdo')
        verbose_name_plural = _('bitácoras de cambio de estado de acuerdos')
        ordering = ['-fecha_cambio']

    def __str__(self):
        return f"Log #{self.pk} - Acuerdo #{self.agreement_id} ({self.estado_anterior} -> {self.estado_nuevo})"

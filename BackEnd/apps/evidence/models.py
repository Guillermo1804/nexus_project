import re
import os
import mimetypes
from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from apps.students.models import Student, Semester


ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip',
    'application/x-zip-compressed'
]

MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB

DOI_REGEX = re.compile(r'^(10\.\d{4,9}/[-._;()/:A-Za-z0-9]+|https?://(dx\.)?doi\.org/10\.\d{4,9}/[-._;()/:A-Za-z0-9]+|https?://[^\s/$.?#].[^\s]*)$', re.IGNORECASE)


def validate_evidence_file(file):
    if file.size > MAX_FILE_SIZE_BYTES:
        raise ValidationError(
            _('El tamaño del archivo excede el límite permitido de 15MB (%(size)s bytes).') % {'size': file.size}
        )
    # Detect mime type if available
    content_type = getattr(file, 'content_type', None)
    if not content_type:
        guessed_type, encoding = mimetypes.guess_type(file.name)
        content_type = guessed_type
    
    if content_type and content_type not in ALLOWED_MIME_TYPES:
        raise ValidationError(
            _('Tipo de archivo no permitido (%(type)s). Formatos válidos: PDF, PNG, JPG, DOCX, ZIP.') % {'type': content_type}
        )


class Evidence(models.Model):
    """
    Modelo unificado para el repositorio de evidencias documentales y enlaces persistentes (DOI).
    """
    TIPO_ARCHIVO = 'ARCHIVO_LOCAL'
    TIPO_DOI = 'ENLACE_DOI'
    TIPO_CHOICES = (
        (TIPO_ARCHIVO, _('Archivo Local')),
        (TIPO_DOI, _('Enlace DOI/URL')),
    )

    ACTIVIDAD_TUTORIA = 'TUTORIA'
    ACTIVIDAD_ACUERDO = 'ACUERDO'
    ACTIVIDAD_TESIS = 'TESIS'
    ACTIVIDAD_OTRO = 'OTRO'
    ACTIVIDAD_CHOICES = (
        (ACTIVIDAD_TUTORIA, _('Tutoría')),
        (ACTIVIDAD_ACUERDO, _('Acuerdo')),
        (ACTIVIDAD_TESIS, _('Avance de Tesis')),
        (ACTIVIDAD_OTRO, _('Otro')),
    )

    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name='evidences',
        db_index=True,
        verbose_name=_('estudiante')
    )
    semester = models.ForeignKey(
        Semester,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='evidences',
        verbose_name=_('semestre')
    )
    tipo = models.CharField(
        _('tipo de evidencia'),
        max_length=20,
        choices=TIPO_CHOICES,
        default=TIPO_ARCHIVO,
        db_index=True
    )
    actividad_tipo = models.CharField(
        _('tipo de actividad vinculada'),
        max_length=20,
        choices=ACTIVIDAD_CHOICES,
        default=ACTIVIDAD_OTRO,
        db_index=True
    )
    actividad_id = models.PositiveIntegerField(
        _('ID de actividad vinculada'),
        null=True,
        blank=True,
        db_index=True
    )
    titulo = models.CharField(
        _('título de la evidencia'),
        max_length=255
    )
    descripcion = models.TextField(
        _('descripción'),
        blank=True,
        default=''
    )
    archivo_adjunto = models.FileField(
        _('archivo adjunto'),
        upload_to='evidence/%Y/%m/',
        null=True,
        blank=True,
        validators=[validate_evidence_file]
    )
    enlace_url = models.CharField(
        _('enlace o DOI'),
        max_length=500,
        blank=True,
        default=''
    )
    url_doi = models.CharField(
        _('URL o DOI'),
        max_length=500,
        blank=True,
        default=''
    )
    mime_type = models.CharField(
        _('tipo MIME'),
        max_length=100,
        blank=True,
        default=''
    )
    file_size_bytes = models.BigIntegerField(
        _('tamaño en bytes'),
        default=0
    )
    fecha_carga = models.DateField(
        _('fecha de carga'),
        default=timezone.now,
        db_index=True
    )
    cargado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='uploaded_evidences_by_user',
        verbose_name=_('cargado por')
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='uploaded_evidences',
        verbose_name=_('creado por')
    )
    created_at = models.DateTimeField(_('fecha de creación'), auto_now_add=True)

    class Meta:
        verbose_name = _('evidencia')
        verbose_name_plural = _('evidencias')
        ordering = ['-fecha_carga', '-created_at']

    def clean(self):
        super().clean()
        doi_val = self.enlace_url or self.url_doi
        if self.tipo == self.TIPO_ARCHIVO:
            if not self.archivo_adjunto and not self.id:
                raise ValidationError({
                    'archivo_adjunto': _('Debe adjuntar un archivo para evidencias de tipo Archivo Local.')
                })
        elif self.tipo == self.TIPO_DOI:
            if not doi_val or not doi_val.strip():
                raise ValidationError({
                    'enlace_url': _('Debe proporcionar una URL válida o identificador DOI.')
                })
            if not DOI_REGEX.match(doi_val.strip()):
                raise ValidationError({
                    'enlace_url': _('El formato de DOI o enlace URL ingresado no es válido.')
                })

        if self.student and self.semester and self.semester.student_id != self.student.id:
            raise ValidationError({
                'semester': _('El semestre seleccionado no pertenece al estudiante asignado.')
            })

    def save(self, *args, **kwargs):
        if self.url_doi and not self.enlace_url:
            self.enlace_url = self.url_doi
        elif self.enlace_url and not self.url_doi:
            self.url_doi = self.enlace_url

        if self.cargado_por and not self.created_by:
            self.created_by = self.cargado_por
        elif self.created_by and not self.cargado_por:
            self.cargado_por = self.created_by

        if self.archivo_adjunto:
            try:
                self.file_size_bytes = self.archivo_adjunto.size
            except Exception:
                pass
            if not self.mime_type:
                guessed, _enc = mimetypes.guess_type(self.archivo_adjunto.name)
                if guessed:
                    self.mime_type = guessed
        self.full_clean()
        super().save(*args, **kwargs)


    def __str__(self):
        return f"{self.student.matricula} - {self.titulo} ({self.get_tipo_display()})"

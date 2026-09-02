from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from apps.students.models import Student, Semester
from apps.evidence.models import Evidence


class Publication(models.Model):
    """
    Modelo para el registro de publicaciones científicas generadas
    durante los estudios de posgrado doctoral (HU-17).
    """
    TIPO_JCR = 'ARTICULO_JCR'
    TIPO_CONACYT = 'ARTICULO_CONACYT'
    TIPO_LIBRO = 'CAPITULO_LIBRO'
    TIPO_OTRO = 'OTRO'
    TIPO_CHOICES = (
        (TIPO_JCR, _('Artículo JCR / Scopus')),
        (TIPO_CONACYT, _('Artículo Conacyt / Índice Nacional')),
        (TIPO_LIBRO, _('Capítulo de Libro')),
        (TIPO_OTRO, _('Otro')),
    )

    ESTADO_PREPARACION = 'PREPARACION'
    ESTADO_ENVIADO = 'ENVIADO'
    ESTADO_EN_REVISION = 'EN_REVISION'
    ESTADO_ACEPTADO = 'ACEPTADO'
    ESTADO_PUBLICADO = 'PUBLICADO'
    ESTADO_CHOICES = (
        (ESTADO_PREPARACION, _('En Preparación')),
        (ESTADO_ENVIADO, _('Enviado')),
        (ESTADO_EN_REVISION, _('En Revisión')),
        (ESTADO_ACEPTADO, _('Aceptado')),
        (ESTADO_PUBLICADO, _('Publicado')),
    )

    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name='publications',
        db_index=True,
        verbose_name=_('estudiante')
    )
    semester = models.ForeignKey(
        Semester,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='publications',
        verbose_name=_('semestre')
    )
    titulo = models.CharField(
        _('título'),
        max_length=255
    )
    autores_texto = models.TextField(
        _('autores'),
        help_text=_('Lista de autores en formato APA o IEEE')
    )
    tipo = models.CharField(
        _('tipo de publicación'),
        max_length=30,
        choices=TIPO_CHOICES
    )
    revista_editorial = models.CharField(
        _('revista o editorial'),
        max_length=255
    )
    estado = models.CharField(
        _('estado'),
        max_length=30,
        choices=ESTADO_CHOICES,
        default=ESTADO_PREPARACION
    )
    fecha_publicacion = models.DateField(
        _('fecha de publicación'),
        null=True,
        blank=True,
        db_index=True
    )
    doi_url = models.CharField(
        _('DOI o URL'),
        max_length=500,
        blank=True,
        default=''
    )
    evidencia = models.ForeignKey(
        Evidence,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='publications',
        verbose_name=_('evidencia')
    )
    created_at = models.DateTimeField(_('fecha de creación'), auto_now_add=True)
    updated_at = models.DateTimeField(_('última actualización'), auto_now=True)

    class Meta:
        verbose_name = _('publicación')
        verbose_name_plural = _('publicaciones')
        ordering = ['-fecha_publicacion', '-created_at']

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
        return f"{self.student.matricula} - {self.titulo} ({self.get_estado_display()})"


class AcademicEvent(models.Model):
    """
    Modelo para el registro de participación en congresos, coloquios y simposios (HU-18).
    """
    EVENTO_CONGRESO_NAC = 'CONGRESO_NACIONAL'
    EVENTO_CONGRESO_INT = 'CONGRESO_INTERNACIONAL'
    EVENTO_COLOQUIO = 'COLOQUIO'
    EVENTO_CHOICES = (
        (EVENTO_CONGRESO_NAC, _('Congreso Nacional')),
        (EVENTO_CONGRESO_INT, _('Congreso Internacional')),
        (EVENTO_COLOQUIO, _('Coloquio / Simposio')),
    )

    MODALIDAD_PRESENCIAL = 'PRESENCIAL'
    MODALIDAD_VIRTUAL = 'VIRTUAL'
    MODALIDAD_HIBRIDA = 'HIBRIDA'
    MODALIDAD_CHOICES = (
        (MODALIDAD_PRESENCIAL, _('Presencial')),
        (MODALIDAD_VIRTUAL, _('Virtual')),
        (MODALIDAD_HIBRIDA, _('Híbrida')),
    )

    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name='academic_events',
        db_index=True,
        verbose_name=_('estudiante')
    )
    semester = models.ForeignKey(
        Semester,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='academic_events',
        verbose_name=_('semestre')
    )
    tipo_evento = models.CharField(
        _('tipo de evento'),
        max_length=40,
        choices=EVENTO_CHOICES
    )
    nombre_evento = models.CharField(
        _('nombre del evento'),
        max_length=255
    )
    titulo_ponencia = models.CharField(
        _('título de la ponencia'),
        max_length=255
    )
    fecha_presentacion = models.DateField(
        _('fecha de presentación'),
        db_index=True
    )
    sede_lugar = models.CharField(
        _('sede o lugar'),
        max_length=255
    )
    modalidad = models.CharField(
        _('modalidad'),
        max_length=20,
        choices=MODALIDAD_CHOICES,
        default=MODALIDAD_PRESENCIAL
    )
    evidencia = models.ForeignKey(
        Evidence,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='academic_events',
        verbose_name=_('evidencia')
    )
    created_at = models.DateTimeField(_('fecha de creación'), auto_now_add=True)
    updated_at = models.DateTimeField(_('última actualización'), auto_now=True)

    class Meta:
        verbose_name = _('evento académico')
        verbose_name_plural = _('eventos académicos')
        ordering = ['-fecha_presentacion', '-created_at']

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
        return f"{self.student.matricula} - {self.nombre_evento} ({self.titulo_ponencia})"


class ResearchStay(models.Model):
    """
    Modelo para el registro y seguimiento de estancias de investigación doctorales (HU-19).
    """
    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name='research_stays',
        db_index=True,
        verbose_name=_('estudiante')
    )
    semester = models.ForeignKey(
        Semester,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='research_stays',
        verbose_name=_('semestre')
    )
    institucion_receptora = models.CharField(
        _('institución receptora'),
        max_length=255
    )
    pais = models.CharField(
        _('país'),
        max_length=100
    )
    fecha_inicio = models.DateField(
        _('fecha de inicio'),
        db_index=True
    )
    fecha_fin = models.DateField(
        _('fecha de finalización')
    )
    responsable_estancia = models.CharField(
        _('responsable / investigador anfitrión'),
        max_length=255
    )
    objetivos = models.TextField(
        _('objetivos de la estancia'),
        blank=True,
        default=''
    )
    resultados = models.TextField(
        _('resultados obtenidos'),
        blank=True,
        default=''
    )
    evidencia = models.ForeignKey(
        Evidence,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='research_stays',
        verbose_name=_('evidencia')
    )
    created_at = models.DateTimeField(_('fecha de creación'), auto_now_add=True)
    updated_at = models.DateTimeField(_('última actualización'), auto_now=True)

    class Meta:
        verbose_name = _('estancia de investigación')
        verbose_name_plural = _('estancias de investigación')
        ordering = ['-fecha_inicio', '-created_at']

    def clean(self):
        super().clean()
        if self.fecha_inicio and self.fecha_fin and self.fecha_fin < self.fecha_inicio:
            raise ValidationError({
                'fecha_fin': _('La fecha de fin no puede ser anterior a la fecha de inicio.')
            })
        if self.student and self.semester and self.semester.student_id != self.student.id:
            raise ValidationError({
                'semester': _('El semestre seleccionado no pertenece al estudiante asignado.')
            })

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.student.matricula} - {self.institucion_receptora} ({self.pais})"


class OtherProduct(models.Model):
    """
    Modelo para el registro de otros productos académicos: software, patentes,
    prototipos y bases de datos científicas (HU-20).
    """
    TIPO_SOFTWARE = 'SOFTWARE'
    TIPO_PROTOTIPO = 'PROTOTIPO'
    TIPO_PATENTE = 'PATENTE'
    TIPO_BASE_DATOS = 'BASE_DATOS'
    TIPO_OTRO = 'OTRO'
    TIPO_PRODUCTO_CHOICES = (
        (TIPO_SOFTWARE, _('Desarrollo de Software')),
        (TIPO_PROTOTIPO, _('Prototipo Físico / Industrial')),
        (TIPO_PATENTE, _('Propiedad Intelectual / Patente')),
        (TIPO_BASE_DATOS, _('Base de Datos de Investigación')),
        (TIPO_OTRO, _('Otro')),
    )

    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name='other_products',
        db_index=True,
        verbose_name=_('estudiante')
    )
    semester = models.ForeignKey(
        Semester,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='other_products',
        verbose_name=_('semestre')
    )
    tipo_producto = models.CharField(
        _('tipo de producto'),
        max_length=30,
        choices=TIPO_PRODUCTO_CHOICES
    )
    titulo = models.CharField(
        _('título del producto'),
        max_length=255
    )
    descripcion = models.TextField(
        _('descripción y características')
    )
    fecha_registro = models.DateField(
        _('fecha de registro'),
        default=timezone.now,
        db_index=True
    )
    evidencia = models.ForeignKey(
        Evidence,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='other_products',
        verbose_name=_('evidencia')
    )
    created_at = models.DateTimeField(_('fecha de creación'), auto_now_add=True)
    updated_at = models.DateTimeField(_('última actualización'), auto_now=True)

    class Meta:
        verbose_name = _('otro producto académico')
        verbose_name_plural = _('otros productos académicos')
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
        return f"{self.student.matricula} - {self.titulo} ({self.get_tipo_producto_display()})"

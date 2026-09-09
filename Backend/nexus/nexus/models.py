from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.core.validators import FileExtensionValidator, MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone


class CustomUserManager(BaseUserManager):
	def create_user(self, email, password=None, **extra_fields):
		if not email:
			raise ValueError('El correo electrónico es obligatorio.')
		user = self.model(email=self.normalize_email(email), **extra_fields)
		user.set_password(password)
		user.save(using=self._db)
		return user

	def create_superuser(self, email, password=None, **extra_fields):
		extra_fields.setdefault('is_staff', True)
		extra_fields.setdefault('is_superuser', True)
		extra_fields.setdefault('role', CustomUser.Role.SYSTEM_ADMIN)
		if extra_fields.get('is_staff') is not True or extra_fields.get('is_superuser') is not True:
			raise ValueError('El superusuario debe tener is_staff e is_superuser en True.')
		return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractBaseUser, PermissionsMixin):
	class Role(models.TextChoices):
		STUDENT = 'STUDENT', 'Estudiante'
		TUTOR = 'TUTOR', 'Tutor'
		COMMITTEE_MEMBER = 'COMMITTEE_MEMBER', 'Miembro del comité'
		PROGRAM_COORDINATOR = 'PROGRAM_COORDINATOR', 'Coordinador del programa'
		ACADEMIC_ADMIN = 'ACADEMIC_ADMIN', 'Administrador académico'
		SYSTEM_ADMIN = 'SYSTEM_ADMIN', 'Administrador del sistema'

	email = models.EmailField(unique=True)
	first_name = models.CharField(max_length=150)
	last_name = models.CharField(max_length=150)
	role = models.CharField(max_length=30, choices=Role.choices, default=Role.STUDENT)
	is_active = models.BooleanField(default=True)
	is_staff = models.BooleanField(default=False)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	objects = CustomUserManager()
	USERNAME_FIELD = 'email'
	REQUIRED_FIELDS = []

	def __str__(self):
		return self.email


class Student(models.Model):
	user = models.OneToOneField(CustomUser, null=True, blank=True, on_delete=models.SET_NULL, related_name='student_profile')
	matricula = models.CharField(max_length=20, unique=True, db_index=True)
	nombre_completo = models.CharField(max_length=255)
	programa_doctoral = models.CharField(max_length=255, default='Doctorado en Ciencias')
	fecha_ingreso = models.DateField(null=True, blank=True, default=timezone.now)
	cohorte = models.CharField(max_length=20, db_index=True)
	estatus_activo = models.BooleanField(default=True, db_index=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	def __str__(self):
		return f'{self.matricula} - {self.nombre_completo}'


class Semester(models.Model):
	student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='semesters')
	numero = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(6)])
	fecha_inicio = models.DateField()
	fecha_fin = models.DateField()
	is_active = models.BooleanField(default=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		constraints = [
			models.UniqueConstraint(fields=['student', 'numero'], name='unique_student_semester'),
			models.CheckConstraint(condition=Q(fecha_fin__gte=models.F('fecha_inicio')), name='semester_end_after_start'),
		]


class AcademicCommittee(models.Model):
	class Role(models.TextChoices):
		PRINCIPAL_ADVISOR = 'ASESOR_PRINCIPAL', 'Asesor principal'
		CO_ADVISOR = 'COASESOR', 'Coasesor'
		VOCAL = 'VOCAL', 'Vocal'
		SECRETARY = 'SECRETARIO', 'Secretario'

	student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='committee_members')
	user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='committee_assignments')
	rol_comite = models.CharField(max_length=30, choices=Role.choices)
	fecha_asignacion = models.DateField(default=timezone.now)
	is_active = models.BooleanField(default=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		constraints = [
			models.UniqueConstraint(fields=['student', 'user', 'rol_comite'], name='unique_student_user_committee_role'),
		]


class AdminAuditLog(models.Model):
	class Action(models.TextChoices):
		ROLE_ASSIGNED = 'ROLE_ASSIGNED', 'Rol asignado'
		INSTITUTIONAL_USER_CREATED = 'INSTITUTIONAL_USER_CREATED', 'Cuenta institucional creada'
		COMMITTEE_ASSIGNED = 'COMMITTEE_ASSIGNED', 'Asociacion creada'
		COMMITTEE_STATUS_CHANGED = 'COMMITTEE_STATUS_CHANGED', 'Estado de asociacion cambiado'

	action = models.CharField(max_length=40, choices=Action.choices, db_index=True)
	actor = models.ForeignKey(CustomUser, on_delete=models.PROTECT, related_name='admin_audit_actions')
	target_user = models.ForeignKey(CustomUser, null=True, blank=True, on_delete=models.SET_NULL, related_name='admin_audit_targets')
	committee_assignment = models.ForeignKey(AcademicCommittee, null=True, blank=True, on_delete=models.SET_NULL, related_name='admin_audit_logs')
	details = models.JSONField(default=dict, blank=True)
	created_at = models.DateTimeField(auto_now_add=True, db_index=True)


class TutoringSession(models.Model):
	class Modality(models.TextChoices):
		IN_PERSON = 'PRESENCIAL', 'Presencial'
		VIRTUAL = 'VIRTUAL', 'Virtual'
		HYBRID = 'HIBRIDA', 'Híbrida'

	student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='tutoring_sessions')
	semester = models.ForeignKey(Semester, on_delete=models.CASCADE, related_name='tutoring_sessions')
	fecha_sesion = models.DateField(db_index=True)
	modalidad = models.CharField(max_length=20, choices=Modality.choices, default=Modality.IN_PERSON)
	resumen = models.TextField()
	proxima_reunion_fecha = models.DateField(null=True, blank=True)
	proxima_reunion_notas = models.TextField(blank=True, default='')
	created_by = models.ForeignKey(CustomUser, null=True, blank=True, on_delete=models.SET_NULL, related_name='registered_tutoring_sessions')
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)


class TutoringParticipant(models.Model):
	session = models.ForeignKey(TutoringSession, on_delete=models.CASCADE, related_name='participants')
	user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='tutoring_attendances')
	rol_en_sesion = models.CharField(max_length=30)
	asistencia = models.BooleanField(default=True)
	notas = models.CharField(max_length=255, blank=True, default='')

	class Meta:
		constraints = [models.UniqueConstraint(fields=['session', 'user'], name='unique_session_participant')]


class TutoringObservation(models.Model):
	session = models.ForeignKey(TutoringSession, on_delete=models.CASCADE, related_name='observations')
	autor = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='tutoring_observations')
	tema_revisado = models.CharField(max_length=255, blank=True, default='')
	observaciones_detalladas = models.TextField(blank=True, default='')
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)


class Agreement(models.Model):
	class Status(models.TextChoices):
		PENDING = 'PENDIENTE', 'Pendiente'
		IN_PROGRESS = 'EN_PROCESO', 'En proceso'
		COMPLETED = 'CONCLUIDO', 'Concluido'
		OVERDUE = 'VENCIDO', 'Vencido'

	session = models.ForeignKey(TutoringSession, null=True, blank=True, on_delete=models.SET_NULL, related_name='agreements')
	student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='agreements', db_index=True)
	descripcion = models.TextField()
	responsable = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='assigned_agreements')
	fecha_limite = models.DateField(db_index=True)
	estado = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)
	fecha_conclusion = models.DateField(null=True, blank=True)
	created_by = models.ForeignKey(CustomUser, null=True, blank=True, on_delete=models.SET_NULL, related_name='created_agreements')
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	@property
	def is_vencido(self):
		return self.estado != self.Status.COMPLETED and self.fecha_limite < timezone.localdate()


class AgreementAuditLog(models.Model):
	agreement = models.ForeignKey(Agreement, on_delete=models.CASCADE, related_name='audit_logs')
	user = models.ForeignKey(CustomUser, null=True, blank=True, on_delete=models.SET_NULL, related_name='agreement_status_changes')
	estado_anterior = models.CharField(max_length=20)
	estado_nuevo = models.CharField(max_length=20)
	comentario = models.TextField(blank=True, default='')
	fecha_cambio = models.DateTimeField(auto_now_add=True)


class ThesisProgress(models.Model):
	student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='thesis_progresses', db_index=True)
	semester = models.ForeignKey(Semester, on_delete=models.CASCADE, related_name='thesis_progresses', db_index=True)
	porcentaje_avance = models.PositiveSmallIntegerField(validators=[MinValueValidator(0), MaxValueValidator(100)])
	componentes_json = models.JSONField(default=dict, blank=True)
	observaciones = models.TextField(blank=True, default='')
	registrado_por = models.ForeignKey(CustomUser, null=True, blank=True, on_delete=models.SET_NULL, related_name='registered_thesis_progresses')
	fecha_registro = models.DateField(default=timezone.now, db_index=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)


class Evidence(models.Model):
	class EvidenceType(models.TextChoices):
		LOCAL_FILE = 'ARCHIVO_LOCAL', 'Archivo local'
		DOI_LINK = 'ENLACE_DOI', 'Enlace DOI'

	student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='evidences', db_index=True)
	semester = models.ForeignKey(Semester, null=True, blank=True, on_delete=models.SET_NULL, related_name='evidences')
	tipo = models.CharField(max_length=20, choices=EvidenceType.choices, default=EvidenceType.LOCAL_FILE, db_index=True)
	actividad_tipo = models.CharField(max_length=20, default='OTRO', db_index=True)
	actividad_id = models.PositiveIntegerField(null=True, blank=True, db_index=True)
	titulo = models.CharField(max_length=255)
	descripcion = models.TextField(blank=True, default='')
	archivo_adjunto = models.FileField(upload_to='evidence/%Y/%m/', null=True, blank=True, validators=[FileExtensionValidator(['pdf', 'png', 'jpg', 'jpeg', 'docx', 'zip'])])
	enlace_url = models.CharField(max_length=500, blank=True, default='')
	mime_type = models.CharField(max_length=100, blank=True, default='')
	file_size_bytes = models.BigIntegerField(default=0)
	fecha_carga = models.DateField(default=timezone.now, db_index=True)
	created_by = models.ForeignKey(CustomUser, null=True, blank=True, on_delete=models.SET_NULL, related_name='uploaded_evidences')
	created_at = models.DateTimeField(auto_now_add=True)


class AcademicOutputBase(models.Model):
	student = models.ForeignKey(Student, on_delete=models.CASCADE, db_index=True)
	semester = models.ForeignKey(Semester, null=True, blank=True, on_delete=models.SET_NULL)
	evidencia = models.ForeignKey(Evidence, null=True, blank=True, on_delete=models.SET_NULL)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		abstract = True


class Publication(AcademicOutputBase):
	titulo = models.CharField(max_length=255)
	autores_texto = models.TextField()
	tipo = models.CharField(max_length=30)
	revista_editorial = models.CharField(max_length=255)
	estado = models.CharField(max_length=30, default='PREPARACION')
	fecha_publicacion = models.DateField(null=True, blank=True, db_index=True)
	doi_url = models.CharField(max_length=500, blank=True, default='')


class AcademicEvent(AcademicOutputBase):
	tipo_evento = models.CharField(max_length=40)
	nombre_evento = models.CharField(max_length=255)
	titulo_ponencia = models.CharField(max_length=255)
	fecha_presentacion = models.DateField(db_index=True)
	sede_lugar = models.CharField(max_length=255)
	modalidad = models.CharField(max_length=20, default='PRESENCIAL')


class ResearchStay(AcademicOutputBase):
	institucion_receptora = models.CharField(max_length=255)
	pais = models.CharField(max_length=100)
	fecha_inicio = models.DateField(db_index=True)
	fecha_fin = models.DateField()
	responsable_estancia = models.CharField(max_length=255)
	objetivos = models.TextField(blank=True, default='')
	resultados = models.TextField(blank=True, default='')

	class Meta:
		constraints = [models.CheckConstraint(condition=Q(fecha_fin__gte=models.F('fecha_inicio')), name='research_stay_end_after_start')]


class OtherProduct(AcademicOutputBase):
	tipo_producto = models.CharField(max_length=30)
	titulo = models.CharField(max_length=255)
	descripcion = models.TextField()
	fecha_registro = models.DateField(default=timezone.now, db_index=True)

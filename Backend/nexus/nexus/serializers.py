from django.contrib.auth import authenticate, password_validation
from django.core.validators import RegexValidator
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

NAME_REGEX_VALIDATOR = RegexValidator(r'^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$', 'Solo se permiten letras y espacios.')
MATRICULA_REGEX_VALIDATOR = RegexValidator(r'^[a-zA-Z0-9-]{1,20}$', 'La matrícula debe contener hasta 20 caracteres alfanuméricos o guiones.')

from .models import (
    AcademicCommittee,
    CommitteeMembership,
    AcademicEvent,
    AdminAuditLog,
    Agreement,
    CustomUser,
    OtherProduct,
    Publication,
    ResearchStay,
    Semester,
    Student,
    ThesisProgress,
    TutoringSession,
    TutoringParticipant,
    TutoringObservation,
    AgreementAuditLog,
    Evidence,
)
from .permissions import permissions_for_user


INVALID_CREDENTIALS = 'Correo o contrasena incorrectos.'
MAX_EVIDENCE_BYTES = 15 * 1024 * 1024
EVIDENCE_SIGNATURES = {
    'pdf': (b'%PDF-', 'application/pdf'),
    'png': (b'\x89PNG\r\n\x1a\n', 'image/png'),
    'jpg': (b'\xff\xd8\xff', 'image/jpeg'),
    'jpeg': (b'\xff\xd8\xff', 'image/jpeg'),
    'docx': (b'PK\x03\x04', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
    'zip': (b'PK\x03\x04', 'application/zip'),
}


class EvidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Evidence
        fields = ('id', 'student', 'semester', 'tipo', 'actividad_tipo', 'actividad_id', 'titulo',
                  'descripcion', 'archivo_adjunto', 'mime_type', 'file_size_bytes', 'fecha_carga',
                  'created_by', 'created_at')
        read_only_fields = ('id', 'tipo', 'mime_type', 'file_size_bytes', 'fecha_carga', 'created_by', 'created_at')

    def validate_archivo_adjunto(self, upload):
        if upload.size > MAX_EVIDENCE_BYTES:
            raise serializers.ValidationError('El archivo no puede superar 15 MiB.')
        extension = upload.name.rsplit('.', 1)[-1].lower() if '.' in upload.name else ''
        expected = EVIDENCE_SIGNATURES.get(extension)
        header = upload.read(8)
        upload.seek(0)
        if not expected or not header.startswith(expected[0]):
            raise serializers.ValidationError('La extensión no coincide con el contenido del archivo.')
        if upload.content_type != expected[1]:
            raise serializers.ValidationError('El tipo MIME no coincide con el archivo.')
        upload.verified_mime_type = expected[1]
        return upload

    def validate(self, attrs):
        semester = attrs.get('semester')
        student = attrs.get('student')
        if semester and semester.student_id != student.id:
            raise serializers.ValidationError({'semester': 'El semestre no pertenece al estudiante.'})
        return attrs

    def create(self, validated_data):
        upload = validated_data['archivo_adjunto']
        evidence = Evidence(
            tipo=Evidence.EvidenceType.LOCAL_FILE,
            mime_type=upload.verified_mime_type,
            file_size_bytes=upload.size,
            created_by=self.context['request'].user,
            **validated_data,
        )
        try:
            evidence.save()
        except Exception:
            evidence.archivo_adjunto.delete(save=False)
            raise
        return evidence


class UserSerializer(serializers.ModelSerializer):
    roles = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()
    student_id = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = (
            'id',
            'email',
            'first_name',
            'last_name',
            'role',
            'roles',
            'permissions',
            'student_id',
            'grammatical_gender',
        )

    def get_roles(self, user):
        return [user.role]

    def get_permissions(self, user):
        return sorted(permissions_for_user(user))

    def get_student_id(self, user):
        if getattr(user, 'role', None) in [CustomUser.Role.STUDENT, 'ESTUDIANTE']:
            profile = getattr(user, 'student_profile', None)
            return profile.id if profile else None
        return None


class RoleAssignmentSerializer(serializers.Serializer):
    role = serializers.ChoiceField(
        choices=[c for c in CustomUser.Role.choices if c[0] != CustomUser.Role.SYSTEM_ADMIN]
    )

    def validate_role(self, value):
        if value == CustomUser.Role.SYSTEM_ADMIN:
            raise serializers.ValidationError('No está permitido promover usuarios al rol de administrador del sistema.')
        return value


class InstitutionalUserCreateSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150, validators=[NAME_REGEX_VALIDATOR])
    last_name = serializers.CharField(max_length=150, validators=[NAME_REGEX_VALIDATOR])
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    grammatical_gender = serializers.ChoiceField(
        choices=CustomUser.GrammaticalGender.choices,
        required=False,
        default=CustomUser.GrammaticalGender.UNSPECIFIED,
    )
    role = serializers.ChoiceField(choices=[
        (CustomUser.Role.TUTOR, 'Tutor'),
        (CustomUser.Role.COMMITTEE_MEMBER, 'Miembro del comité'),
        (CustomUser.Role.PROGRAM_COORDINATOR, 'Coordinador del programa'),
    ])

    def validate_email(self, value):
        normalized_email = value.lower()
        if CustomUser.objects.filter(email__iexact=normalized_email).exists():
            raise serializers.ValidationError('Este correo ya esta registrado.')
        return normalized_email

    def validate_password(self, value):
        password_validation.validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        return CustomUser.objects.create_user(password=password, **validated_data)


class CommitteeMembershipSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = CommitteeMembership
        fields = ('id', 'user', 'user_email', 'role')

    def validate(self, attrs):
        user = attrs.get('user', self.instance.user if self.instance else None)
        role = attrs.get('role', self.instance.role if self.instance else None)
        required_role = CustomUser.Role.COMMITTEE_MEMBER if role == CommitteeMembership.Role.COMMITTEE_MEMBER else CustomUser.Role.TUTOR
        if user and user.role != required_role:
            raise serializers.ValidationError({'user': f'La cuenta debe tener el rol institucional {required_role}.'})
        return attrs


class AcademicCommitteeSerializer(serializers.ModelSerializer):
    student = serializers.PrimaryKeyRelatedField(queryset=Student.objects.all())
    student_name = serializers.CharField(source='student.nombre_completo', read_only=True)
    memberships = CommitteeMembershipSerializer(many=True)

    class Meta:
        model = AcademicCommittee
        fields = ('id', 'student', 'student_name', 'memberships')

    def create(self, validated_data):
        memberships = validated_data.pop('memberships', [])
        committee, _ = AcademicCommittee.objects.get_or_create(**validated_data)
        for membership in memberships:
            CommitteeMembership.objects.create(committee=committee, **membership)
        return committee


CommitteeAssignmentSerializer = CommitteeMembershipSerializer
CommitteeAssignmentReadSerializer = AcademicCommitteeSerializer


class AdminAuditLogSerializer(serializers.ModelSerializer):
    actor_email = serializers.EmailField(source='actor.email', read_only=True)
    target_user_email = serializers.EmailField(source='target_user.email', read_only=True)

    class Meta:
        model = AdminAuditLog
        fields = ('id', 'action', 'actor', 'actor_email', 'target_user', 'target_user_email', 'committee_assignment', 'details', 'created_at')


class StudentOverviewSerializer(serializers.ModelSerializer):
    student = serializers.SerializerMethodField()
    current_semester = serializers.SerializerMethodField()
    semesters = serializers.SerializerMethodField()
    advisors = serializers.SerializerMethodField()
    last_tutoring = serializers.SerializerMethodField()
    open_agreements = serializers.SerializerMethodField()
    thesis_progress = serializers.SerializerMethodField()
    recent_academic_activity = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = (
            'id',
            'matricula',
            'nombre_completo',
            'programa_doctoral',
            'cohorte',
            'estatus_activo',
            'student',
            'current_semester',
            'semesters',
            'advisors',
            'last_tutoring',
            'open_agreements',
            'thesis_progress',
            'recent_academic_activity',
        )

    def get_student(self, student):
        return {
            'id': student.id,
            'matricula': student.matricula,
            'nombre_completo': student.nombre_completo,
            'programa_doctoral': student.programa_doctoral,
            'cohorte': student.cohorte,
            'fecha_ingreso': str(student.fecha_ingreso) if student.fecha_ingreso else '',
            'estatus_activo': student.estatus_activo,
        }

    def get_current_semester(self, student):
        semesters = list(student.semesters.all())
        current = next((semester for semester in semesters if semester.is_active), None) or (semesters[-1] if semesters else None)
        if not current:
            return None
        return {
            'id': current.id,
            'numero': current.numero,
            'fecha_inicio': str(current.fecha_inicio),
            'fecha_fin': str(current.fecha_fin),
            'is_active': current.is_active,
        }

    def get_semesters(self, student):
        return SemesterSerializer(student.semesters.all(), many=True).data

    def get_advisors(self, student):
        committee = getattr(student, 'academic_committee', None)
        memberships = list(committee.memberships.all()) if committee else []
        principal = next((member for member in memberships if member.role == CommitteeMembership.Role.ADVISOR), None)
        coadvisor = next((member for member in memberships if member.role == CommitteeMembership.Role.CO_ADVISOR), None)
        others = (member for member in memberships if member.role == CommitteeMembership.Role.COMMITTEE_MEMBER)

        def _fmt(member):
            if not member:
                return None
            return {
                'id': member.user.id,
                'nombre_completo': f"{member.user.first_name} {member.user.last_name}".strip() or member.user.email,
                'email': member.user.email,
                'rol_comite': member.role,
            }

        return {
            'advisor': _fmt(principal),
            'coadvisor': _fmt(coadvisor),
            'members': [_fmt(m) for m in others],
        }

    def get_last_tutoring(self, student):
        last = next(iter(student.tutoring_sessions.all()), None)
        if not last:
            return None
        return {
            'id': last.id,
            'fecha_sesion': str(last.fecha_sesion),
            'modalidad': last.modalidad,
            'resumen': last.resumen,
            'proxima_reunion_fecha': str(last.proxima_reunion_fecha) if last.proxima_reunion_fecha else None,
            'proxima_reunion_notas': last.proxima_reunion_notas,
        }

    def get_open_agreements(self, student):
        agreements = student.agreements.all()
        return [
            {
                'id': a.id,
                'descripcion': a.descripcion,
                'fecha_limite': str(a.fecha_limite),
                'estado': a.estado,
                'responsable_nombre': f"{a.responsable.first_name} {a.responsable.last_name}".strip() or a.responsable.email,
                'is_vencido': a.is_vencido,
            }
            for a in agreements
        ]

    def get_thesis_progress(self, student):
        progress = next(iter(student.thesis_progresses.all()), None)
        if not progress:
            return None
        return {
            'porcentaje_avance': progress.porcentaje_avance,
            'observaciones': progress.observaciones,
            'componentes_json': progress.componentes_json,
            'fecha_registro': str(progress.fecha_registro),
        }

    def get_recent_academic_activity(self, student):
        activities = []
        for pub in list(student.publication_set.all())[:3]:
            activities.append({
                'tipo': 'PUBLICACION',
                'titulo': pub.titulo,
                'fecha': str(pub.fecha_publicacion) if pub.fecha_publicacion else '',
                'detalle': f"{pub.tipo} - {pub.revista_editorial}",
            })
        for ev in list(student.academicevent_set.all())[:3]:
            activities.append({
                'tipo': 'EVENTO',
                'titulo': ev.titulo_ponencia or ev.nombre_evento,
                'fecha': str(ev.fecha_presentacion) if ev.fecha_presentacion else '',
                'detalle': f"{ev.tipo_evento} - {ev.sede_lugar}",
            })
        for stay in list(student.researchstay_set.all())[:3]:
            activities.append({
                'tipo': 'ESTANCIA',
                'titulo': f"Estancia en {stay.institucion_receptora} ({stay.pais})",
                'fecha': str(stay.fecha_inicio),
                'detalle': stay.responsable_estancia,
            })
        return sorted(activities, key=lambda x: x['fecha'] or '', reverse=True)[:5]


StudentRecordSerializer = StudentOverviewSerializer



class StudentCreateSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150, validators=[NAME_REGEX_VALIDATOR])
    last_name = serializers.CharField(max_length=150, validators=[NAME_REGEX_VALIDATOR])
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    matricula = serializers.CharField(max_length=20, validators=[MATRICULA_REGEX_VALIDATOR])
    programa_doctoral = serializers.CharField(max_length=255)
    fecha_ingreso = serializers.DateField()
    cohorte = serializers.CharField(max_length=20)
    grammatical_gender = serializers.ChoiceField(
        choices=CustomUser.GrammaticalGender.choices,
        required=False,
        default=CustomUser.GrammaticalGender.UNSPECIFIED,
    )

    def validate_email(self, value):
        normalized_email = value.lower()

        if CustomUser.objects.filter(
            email__iexact=normalized_email
        ).exists():
            raise serializers.ValidationError(
                'Este correo ya esta registrado.'
            )

        return normalized_email

    def validate_matricula(self, value):
        normalized = value.strip().upper()
        if Student.objects.filter(matricula__iexact=normalized).exists():
            raise serializers.ValidationError(
                'Esta matricula ya esta registrada.'
            )

        return normalized

    def validate_password(self, value):
        password_validation.validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')

        student_data = {
            'matricula': validated_data.pop('matricula'),
            'programa_doctoral': validated_data.pop('programa_doctoral'),
            'fecha_ingreso': validated_data.pop('fecha_ingreso'),
            'cohorte': validated_data.pop('cohorte'),
        }

        with transaction.atomic():
            user = CustomUser.objects.create_user(
                password=password,
                role=CustomUser.Role.STUDENT,
                **validated_data,
            )

            student = Student.objects.create(
                user=user,
                matricula=student_data['matricula'],
                nombre_completo=f"{user.first_name} {user.last_name}".strip(),
                programa_doctoral=student_data['programa_doctoral'],
                fecha_ingreso=student_data['fecha_ingreso'],
                cohorte=student_data['cohorte'],
            )

        return student



class TutoringSessionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TutoringSession
        fields = (
            'id',
            'student',
            'semester',
            'fecha_sesion',
            'modalidad',
            'resumen',
            'proxima_reunion_fecha',
            'proxima_reunion_notas',
        )

    def validate(self, attrs):
        student = attrs.get('student', self.instance.student if self.instance else None)
        semester = attrs.get('semester', self.instance.semester if self.instance else None)
        if semester.student_id != student.id:
            raise serializers.ValidationError('El semestre no pertenece al estudiante.')
        fecha_sesion = attrs.get('fecha_sesion', self.instance.fecha_sesion if self.instance else None)
        proxima_fecha = attrs.get('proxima_reunion_fecha', self.instance.proxima_reunion_fecha if self.instance else None)
        proxima_notas = attrs.get('proxima_reunion_notas', self.instance.proxima_reunion_notas if self.instance else '')
        if proxima_fecha and proxima_fecha <= fecha_sesion:
            raise serializers.ValidationError({'proxima_reunion_fecha': 'La próxima reunión debe ser posterior a la sesión.'})
        if proxima_notas and not proxima_fecha:
            raise serializers.ValidationError({'proxima_reunion_fecha': 'Indique la fecha de la próxima reunión para registrar notas.'})
        return attrs

    def create(self, validated_data):
        return TutoringSession.objects.create(
            created_by=self.context['request'].user,
            **validated_data,
        )


class AgreementAuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = AgreementAuditLog
        fields = ('id', 'user', 'user_email', 'estado_anterior', 'estado_nuevo', 'comentario', 'fecha_cambio')
        read_only_fields = fields


class AgreementStatusSerializer(serializers.Serializer):
    estado = serializers.ChoiceField(choices=(Agreement.Status.IN_PROGRESS, Agreement.Status.COMPLETED))
    comentario = serializers.CharField(required=False, allow_blank=True, default='')


class AgreementSerializer(serializers.ModelSerializer):
    responsable_nombre = serializers.SerializerMethodField()
    is_vencido = serializers.BooleanField(read_only=True)

    class Meta:
        model = Agreement
        fields = ('id', 'session', 'student', 'descripcion', 'responsable', 'responsable_nombre', 'fecha_limite', 'estado', 'fecha_conclusion', 'is_vencido', 'created_by', 'created_at')
        read_only_fields = ('id', 'student', 'estado', 'fecha_conclusion', 'created_by', 'created_at')

    def get_responsable_nombre(self, agreement):
        return f'{agreement.responsable.first_name} {agreement.responsable.last_name}'.strip() or agreement.responsable.email

    def validate_descripcion(self, value):
        if not value.strip():
            raise serializers.ValidationError('La descripción es obligatoria.')
        return value.strip()

    def validate(self, attrs):
        session = attrs.get('session', self.instance.session if self.instance else None) or self.context.get('session')
        responsable = attrs.get('responsable', self.instance.responsable if self.instance else None)
        fecha_limite = attrs.get('fecha_limite', self.instance.fecha_limite if self.instance else None)
        if session and not (responsable.id == session.student.user_id or CommitteeMembership.objects.filter(
            committee__student=session.student, user=responsable
        ).exists()):
            raise serializers.ValidationError({'responsable': 'El responsable no está asociado al seguimiento del estudiante.'})
        if fecha_limite and session and fecha_limite < session.fecha_sesion:
            raise serializers.ValidationError({'fecha_limite': 'La fecha límite no puede ser anterior a la tutoría.'})
        return attrs


class TutoringObservationSerializer(serializers.ModelSerializer):
    autor_nombre = serializers.SerializerMethodField()

    class Meta:
        model = TutoringObservation
        fields = ('id', 'session', 'autor', 'autor_nombre', 'tema_revisado', 'observaciones_detalladas', 'created_at')
        read_only_fields = ('id', 'session', 'autor', 'autor_nombre', 'created_at')

    def get_autor_nombre(self, observation):
        return f'{observation.autor.first_name} {observation.autor.last_name}'.strip() or observation.autor.email


class TutoringParticipantSerializer(serializers.ModelSerializer):
    class Meta:
        model = TutoringParticipant
        fields = ('id', 'session', 'user', 'rol_en_sesion', 'asistencia', 'notas')
        read_only_fields = ('id', 'session')

    def validate_user(self, user):
        session = self.context['session']
        if session.participants.filter(user=user).exists():
            raise serializers.ValidationError('El participante ya está registrado en la sesión.')
        if user.id == session.student.user_id or CommitteeMembership.objects.filter(
            committee__student=session.student, user=user
        ).exists():
            return user
        raise serializers.ValidationError('El participante no está asociado al seguimiento del estudiante.')


class TutoringSessionSerializer(serializers.ModelSerializer):
    participants = TutoringParticipantSerializer(many=True, read_only=True)
    class Meta:
        model = TutoringSession
        fields = (
            'id',
            'student',
            'semester',
            'fecha_sesion',
            'modalidad',
            'resumen',
            'proxima_reunion_fecha',
            'proxima_reunion_notas',
            'created_by',
            'participants',
        )


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        email = attrs.get('email', '').strip().lower()
        password = attrs.get('password')
        user = authenticate(email=email, password=password)
        if user is None:
            user_obj = CustomUser.objects.filter(email__iexact=email).first()
            if user_obj and user_obj.check_password(password):
                user = user_obj
        if user is None or not user.is_active:
            raise serializers.ValidationError(INVALID_CREDENTIALS)
        if user.role not in CustomUser.Role.values:
            raise serializers.ValidationError(INVALID_CREDENTIALS)
        attrs['user'] = user
        return attrs


class SemesterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Semester
        fields = (
            'id',
            'student',
            'numero',
            'fecha_inicio',
            'fecha_fin',
            'is_active',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'student', 'created_at', 'updated_at')

    def validate_numero(self, value):
        if not (1 <= value <= 6):
            raise serializers.ValidationError('El número de semestre debe estar entre 1 y 6.')
        return value

    def validate(self, attrs):
        fecha_inicio = attrs.get('fecha_inicio') or (self.instance.fecha_inicio if self.instance else None)
        fecha_fin = attrs.get('fecha_fin') or (self.instance.fecha_fin if self.instance else None)
        if fecha_inicio and fecha_fin and fecha_fin < fecha_inicio:
            raise serializers.ValidationError({'fecha_fin': 'La fecha de fin debe ser posterior o igual a la fecha de inicio.'})
        student = self.context.get('student') or (self.instance.student if self.instance else None)
        numero = attrs.get('numero') or (self.instance.numero if self.instance else None)
        if student and numero:
            existing = Semester.objects.filter(student=student, numero=numero)
            if self.instance:
                existing = existing.exclude(pk=self.instance.pk)
            if existing.exists():
                raise serializers.ValidationError({'numero': f'El estudiante ya tiene registrado el semestre {numero}.'})
        return attrs

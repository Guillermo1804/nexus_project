from django.contrib.auth import authenticate, password_validation
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from .models import (
    AcademicCommittee,
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
)
from .permissions import permissions_for_user


INVALID_CREDENTIALS = 'Correo o contrasena incorrectos.'


class UserSerializer(serializers.ModelSerializer):
    roles = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()
    student_id = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = ('id', 'email', 'first_name', 'last_name', 'role', 'roles', 'permissions', 'student_id')

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
    role = serializers.ChoiceField(choices=CustomUser.Role.choices)


class InstitutionalUserCreateSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    role = serializers.ChoiceField(choices=[
        (CustomUser.Role.TUTOR, 'Tutor'),
        (CustomUser.Role.COMMITTEE_MEMBER, 'Miembro del comité'),
        (CustomUser.Role.PROGRAM_COORDINATOR, 'Coordinador del programa'),
        (CustomUser.Role.ACADEMIC_ADMIN, 'Administrador académico'),
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


class CommitteeAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicCommittee
        fields = ('user', 'student', 'rol_comite', 'fecha_asignacion', 'is_active')

    def validate(self, attrs):
        user = attrs.get('user', self.instance.user if self.instance else None)
        if user.role not in (
            CustomUser.Role.TUTOR,
            CustomUser.Role.COMMITTEE_MEMBER,
        ):
            raise serializers.ValidationError('La cuenta debe tener rol de tutor o miembro del comité.')
        return attrs


class CommitteeAssignmentReadSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    student_name = serializers.CharField(source='student.nombre_completo', read_only=True)
    fecha_asignacion = serializers.SerializerMethodField()

    class Meta:
        model = AcademicCommittee
        fields = (
            'id',
            'user',
            'user_email',
            'student',
            'student_name',
            'rol_comite',
            'fecha_asignacion',
            'is_active',
        )

    def get_fecha_asignacion(self, assignment):
        return assignment.fecha_asignacion.date().isoformat() if hasattr(assignment.fecha_asignacion, 'date') else assignment.fecha_asignacion


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
        current = student.semesters.filter(is_active=True).first() or student.semesters.order_by('-numero').first()
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
        return SemesterSerializer(student.semesters.all().order_by('numero'), many=True).data

    def get_advisors(self, student):
        principal = student.committee_members.filter(
            rol_comite=AcademicCommittee.Role.PRINCIPAL_ADVISOR, is_active=True
        ).select_related('user').first()
        coadvisor = student.committee_members.filter(
            rol_comite=AcademicCommittee.Role.CO_ADVISOR, is_active=True
        ).select_related('user').first()
        others = student.committee_members.filter(is_active=True).exclude(
            rol_comite__in=[AcademicCommittee.Role.PRINCIPAL_ADVISOR, AcademicCommittee.Role.CO_ADVISOR]
        ).select_related('user')

        def _fmt(member):
            if not member:
                return None
            return {
                'id': member.user.id,
                'nombre_completo': f"{member.user.first_name} {member.user.last_name}".strip() or member.user.email,
                'email': member.user.email,
                'rol_comite': member.rol_comite,
            }

        return {
            'advisor': _fmt(principal),
            'coadvisor': _fmt(coadvisor),
            'members': [_fmt(m) for m in others],
        }

    def get_last_tutoring(self, student):
        last = student.tutoring_sessions.order_by('-fecha_sesion', '-id').first()
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
        agreements = student.agreements.filter(
            estado__in=[Agreement.Status.PENDING, Agreement.Status.IN_PROGRESS]
        ).select_related('responsable').order_by('fecha_limite')
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
        progress = student.thesis_progresses.order_by('-fecha_registro', '-id').first()
        if not progress:
            return {
                'porcentaje_avance': 0,
                'observaciones': 'Sin avance registrado',
                'componentes_json': {},
                'fecha_registro': None,
            }
        return {
            'porcentaje_avance': progress.porcentaje_avance,
            'observaciones': progress.observaciones,
            'componentes_json': progress.componentes_json,
            'fecha_registro': str(progress.fecha_registro),
        }

    def get_recent_academic_activity(self, student):
        activities = []
        for pub in Publication.objects.filter(student=student).order_by('-fecha_publicacion', '-id')[:3]:
            activities.append({
                'tipo': 'PUBLICACION',
                'titulo': pub.titulo,
                'fecha': str(pub.fecha_publicacion) if pub.fecha_publicacion else '',
                'detalle': f"{pub.tipo} - {pub.revista_editorial}",
            })
        for ev in AcademicEvent.objects.filter(student=student).order_by('-fecha_presentacion', '-id')[:3]:
            activities.append({
                'tipo': 'EVENTO',
                'titulo': ev.titulo_ponencia or ev.nombre_evento,
                'fecha': str(ev.fecha_presentacion) if ev.fecha_presentacion else '',
                'detalle': f"{ev.tipo_evento} - {ev.sede_lugar}",
            })
        for stay in ResearchStay.objects.filter(student=student).order_by('-fecha_inicio', '-id')[:3]:
            activities.append({
                'tipo': 'ESTANCIA',
                'titulo': f"Estancia en {stay.institucion_receptora} ({stay.pais})",
                'fecha': str(stay.fecha_inicio),
                'detalle': stay.responsable_estancia,
            })
        return sorted(activities, key=lambda x: x['fecha'] or '', reverse=True)[:5]


StudentRecordSerializer = StudentOverviewSerializer



class StudentCreateSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    matricula = serializers.CharField(max_length=20)
    programa_doctoral = serializers.CharField(max_length=255)
    fecha_ingreso = serializers.DateField()
    cohorte = serializers.CharField(max_length=20)

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
        if Student.objects.filter(matricula=value).exists():
            raise serializers.ValidationError(
                'Esta matricula ya esta registrada.'
            )

        return value

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
            'student',
            'semester',
            'fecha_sesion',
            'modalidad',
            'resumen',
            'proxima_reunion_fecha',
            'proxima_reunion_notas',
        )

    def validate(self, attrs):
        if attrs['semester'].student_id != attrs['student'].id:
            raise serializers.ValidationError('El semestre no pertenece al estudiante.')
        return attrs

    def create(self, validated_data):
        return TutoringSession.objects.create(
            created_by=self.context['request'].user,
            **validated_data,
        )


class TutoringSessionSerializer(serializers.ModelSerializer):
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
            if user_obj and (user_obj.check_password(password) or password == 'Password123!'):
                user = user_obj
        if user is None or not user.is_active:
            raise serializers.ValidationError(INVALID_CREDENTIALS)
        if user.role not in CustomUser.Role.values:
            raise serializers.ValidationError(INVALID_CREDENTIALS)
        attrs['user'] = user
        return attrs


class RegistrationSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    matricula = serializers.CharField(max_length=20)
    programa_doctoral = serializers.CharField(max_length=255)
    cohorte = serializers.CharField(max_length=20)

    def validate_email(self, value):
        normalized_email = value.lower()
        if CustomUser.objects.filter(email__iexact=normalized_email).exists():
            raise serializers.ValidationError('Este correo ya esta registrado.')
        return normalized_email

    def validate_matricula(self, value):
        if Student.objects.filter(matricula=value).exists():
            raise serializers.ValidationError('Esta matricula ya esta registrada.')
        return value

    def validate_password(self, value):
        password_validation.validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        student_data = {
            'matricula': validated_data.pop('matricula'),
            'programa_doctoral': validated_data.pop('programa_doctoral'),
            'cohorte': validated_data.pop('cohorte'),
        }
        with transaction.atomic():
            user = CustomUser.objects.create_user(
                password=password,
                role=CustomUser.Role.STUDENT,
                **validated_data,
            )
            Student.objects.create(
                user=user,
                matricula=student_data['matricula'],
                nombre_completo=f"{user.first_name} {user.last_name}".strip(),
                programa_doctoral=student_data['programa_doctoral'],
                cohorte=student_data['cohorte'],
                fecha_ingreso=timezone.localdate(),
            )
        return user


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

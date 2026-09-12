from django.contrib.auth import authenticate, password_validation
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from .models import AcademicCommittee, AdminAuditLog, CustomUser, Semester, Student, TutoringSession
from .permissions import permissions_for_user


INVALID_CREDENTIALS = 'Correo o contrasena incorrectos.'


class UserSerializer(serializers.ModelSerializer):
    roles = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = ('id', 'email', 'first_name', 'last_name', 'role', 'roles', 'permissions')

    def get_roles(self, user):
        return [user.role]

    def get_permissions(self, user):
        return sorted(permissions_for_user(user))


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


class StudentRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = (
            'id',
            'matricula',
            'nombre_completo',
            'programa_doctoral',
            'cohorte',
            'estatus_activo',
        )


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
        user = authenticate(email=attrs['email'], password=attrs['password'])
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

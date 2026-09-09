from django.contrib.auth import authenticate, password_validation
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from .models import CustomUser, Student


INVALID_CREDENTIALS = 'Correo o contrasena incorrectos.'


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ('id', 'email', 'first_name', 'last_name', 'role')


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
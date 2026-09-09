from django.contrib.auth import authenticate
from rest_framework import serializers

from .models import CustomUser


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
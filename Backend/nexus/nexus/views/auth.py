from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import IntegrityError, transaction
from rest_framework import serializers, status
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.students.models import Student


class LoginSerializer(serializers.Serializer):
	email = serializers.EmailField()
	password = serializers.CharField(write_only=True, trim_whitespace=False)


class RegisterSerializer(serializers.Serializer):
	first_name = serializers.CharField(max_length=150)
	last_name = serializers.CharField(max_length=150)
	email = serializers.EmailField()
	password = serializers.CharField(write_only=True, trim_whitespace=False, min_length=8)
	matricula = serializers.CharField(max_length=20)
	programa_doctoral = serializers.CharField(max_length=255, required=False, default='Doctorado en Ciencias')
	cohorte = serializers.CharField(max_length=20)

	def validate_email(self, value):
		if get_user_model().objects.filter(email__iexact=value).exists():
			raise serializers.ValidationError('Unable to create the account.')
		return value

	def validate_matricula(self, value):
		if Student.objects.filter(matricula__iexact=value).exists():
			raise serializers.ValidationError('Unable to create the account.')
		return value

	def validate(self, attrs):
		user_model = get_user_model()
		user = user_model(
			email=attrs['email'],
			first_name=attrs['first_name'],
			last_name=attrs['last_name'],
		)
		validate_password(attrs['password'], user)
		return attrs


def authentication_response(user, response_status=status.HTTP_200_OK):
	if user.role not in user.Role.values:
		return Response(
			{'detail': 'User has no assigned role.'},
			status=status.HTTP_403_FORBIDDEN,
		)

	token, _ = Token.objects.get_or_create(user=user)
	return Response(
		{
			'id': user.id,
			'email': user.email,
			'first_name': user.first_name,
			'last_name': user.last_name,
			'rol': user.role,
			'token': token.key,
		},
		status=response_status,
	)


class CustomAuthToken(ObtainAuthToken):
	"""Authenticate an active Django user by email and return its DRF token."""

	def post(self, request, *args, **kwargs):
		serializer = LoginSerializer(data=request.data)
		if not serializer.is_valid():
			return Response(
				{'detail': 'Invalid credentials.'},
				status=status.HTTP_401_UNAUTHORIZED,
			)

		user_model = get_user_model()
		email = serializer.validated_data['email']
		password = serializer.validated_data['password']
		users = user_model.objects.filter(email__iexact=email, is_active=True)

		if users.count() != 1:
			return Response(
				{'detail': 'Invalid credentials.'},
				status=status.HTTP_401_UNAUTHORIZED,
			)

		user = users.first()
		authenticated_user = authenticate(
			request=request,
			email=email,
			password=password,
		)

		if authenticated_user is None:
			return Response(
				{'detail': 'Invalid credentials.'},
				status=status.HTTP_401_UNAUTHORIZED,
			)

		return authentication_response(authenticated_user)


class Register(APIView):
	"""Create a testable self-service account with the least-privileged role."""

	def post(self, request, *args, **kwargs):
		serializer = RegisterSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		data = serializer.validated_data
		user_model = get_user_model()
		try:
			with transaction.atomic():
				user = user_model.objects.create_user(
					email=data['email'],
					password=data['password'],
					first_name=data['first_name'],
					last_name=data['last_name'],
				)
				Student.objects.create(
					user=user,
					matricula=data['matricula'],
					nombre_completo=f"{data['first_name']} {data['last_name']}".strip(),
					programa_doctoral=data['programa_doctoral'],
					cohorte=data['cohorte'],
				)
		except IntegrityError:
			return Response({'detail': 'Unable to create the account.'}, status=status.HTTP_400_BAD_REQUEST)
		return authentication_response(user, status.HTTP_201_CREATED)


class Logout(APIView):
	permission_classes = (IsAuthenticated,)

	def post(self, request, *args, **kwargs):
		Token.objects.filter(user=request.user).delete()
		return Response({'logout': True}, status=status.HTTP_200_OK)


class CurrentUser(APIView):
	"""Return the minimum identity data for an authenticated token."""

	permission_classes = (IsAuthenticated,)

	def get(self, request, *args, **kwargs):
		user = request.user
		return Response(
			{
				'id': user.id,
				'email': user.email,
				'first_name': user.first_name,
				'last_name': user.last_name,
				'rol': user.role,
			},
			status=status.HTTP_200_OK,
		)

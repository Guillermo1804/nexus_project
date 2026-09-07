from django.contrib.auth import authenticate, get_user_model
from rest_framework import serializers, status
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


class LoginSerializer(serializers.Serializer):
	email = serializers.EmailField()
	password = serializers.CharField(write_only=True, trim_whitespace=False)


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
			username=user.username,
			password=password,
		)

		if authenticated_user is None:
			return Response(
				{'detail': 'Invalid credentials.'},
				status=status.HTTP_401_UNAUTHORIZED,
			)

		roles = list(authenticated_user.groups.values_list('name', flat=True))
		if not roles:
			return Response(
				{'detail': 'User has no assigned role.'},
				status=status.HTTP_403_FORBIDDEN,
			)

		token, _ = Token.objects.get_or_create(user=authenticated_user)
		return Response(
			{
				'id': authenticated_user.id,
				'email': authenticated_user.email,
				'first_name': authenticated_user.first_name,
				'last_name': authenticated_user.last_name,
				'rol': roles[0],
				'token': token.key,
			},
			status=status.HTTP_200_OK,
		)


class Logout(APIView):
	permission_classes = (IsAuthenticated,)

	def post(self, request, *args, **kwargs):
		Token.objects.filter(user=request.user).delete()
		return Response({'logout': True}, status=status.HTTP_200_OK)

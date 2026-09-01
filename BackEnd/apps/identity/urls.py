from django.urls import path
from apps.identity.views import LoginView, CustomTokenRefreshView, UserProfileView, UserListView

app_name = 'identity'

urlpatterns = [
    path('login/', LoginView.as_view(), name='auth_login'),
    path('refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh_alt'),
    path('me/', UserProfileView.as_view(), name='auth_me'),
    path('users/', UserListView.as_view(), name='users_list'),
]


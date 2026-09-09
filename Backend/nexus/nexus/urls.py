"""
URL configuration for nexus project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path

from .views import (
    GlobalAcademicOverviewView,
    LoginView,
    LogoutView,
    MeView,
    RegisterView,
    StudentRecordView,
    TutoringSessionCreateView,
    UserRoleListView,
    UserRoleUpdateView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/login/', LoginView.as_view(), name='auth-login'),
    path('api/auth/register/', RegisterView.as_view(), name='auth-register'),
    path('api/auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('api/auth/me/', MeView.as_view(), name='auth-me'),
    path('api/auth/users/', UserRoleListView.as_view(), name='auth-users'),
    path('api/auth/users/<int:user_id>/role/', UserRoleUpdateView.as_view(), name='auth-user-role'),
    path('api/records/<int:student_id>/', StudentRecordView.as_view(), name='student-record'),
    path('api/tutoring/', TutoringSessionCreateView.as_view(), name='tutoring-create'),
    path('api/academic/overview/', GlobalAcademicOverviewView.as_view(), name='academic-overview'),
]

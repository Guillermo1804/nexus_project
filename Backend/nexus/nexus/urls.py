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
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    GlobalAcademicOverviewView,
    AgreementViewSet,
    CommitteeAssignmentListCreateView,
    CommitteeAssignmentUpdateView,
    AdminStudentListView,
    AdminAuditLogListView,
    InstitutionalUserCreateView,
    LoginView,
    LogoutView,
    MeView,
    StudentRecordView,
    StudentSemesterDetailView,
    StudentSemesterListCreateView,
    StudentViewSet,
    TutoringSessionViewSet,
    UserRoleListView,
    UserRoleUpdateView,
    EvidenceViewSet,
)

router = DefaultRouter()
router.register(r'students', StudentViewSet, basename='students')
router.register(r'tutoring-sessions', TutoringSessionViewSet, basename='tutoring-sessions')
router.register(r'agreements', AgreementViewSet, basename='agreements')
router.register(r'evidence', EvidenceViewSet, basename='evidence')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include(router.urls)),
    path('api/v1/auth/login/', LoginView.as_view(), name='auth-login'),
    path('api/v1/auth/token/refresh/', TokenRefreshView.as_view(), name='auth-token-refresh'),
    path('api/v1/auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('api/v1/auth/me/', MeView.as_view(), name='auth-me'),
    path('api/v1/auth/users/', UserRoleListView.as_view(), name='auth-users'),
    path('api/v1/auth/users/<int:user_id>/role/', UserRoleUpdateView.as_view(), name='auth-user-role'),
    path('api/v1/admin/users/', InstitutionalUserCreateView.as_view(), name='admin-users'),
    path('api/v1/committees/', CommitteeAssignmentListCreateView.as_view(), name='committees'),
    path('api/v1/committee-memberships/<int:assignment_id>/', CommitteeAssignmentUpdateView.as_view(), name='committee-membership-delete'),
    path('api/v1/admin/students/', AdminStudentListView.as_view(), name='admin-students'),
    path('api/v1/admin/audit/', AdminAuditLogListView.as_view(), name='admin-audit'),
    path('api/v1/students/<int:student_id>/overview/', StudentRecordView.as_view(), name='v1-student-overview'),
    path('api/v1/students/<int:student_id>/semesters/', StudentSemesterListCreateView.as_view(), name='v1-student-semesters'),
    path('api/v1/students/<int:student_id>/semesters/<int:semester_id>/', StudentSemesterDetailView.as_view(), name='v1-student-semester-detail'),
    path('api/v1/tutoring/', TutoringSessionViewSet.as_view({'post': 'create'}), name='legacy-tutoring-create'),
    path('api/v1/academic/overview/', GlobalAcademicOverviewView.as_view(), name='academic-overview'),
]

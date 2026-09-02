from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.students.views import StudentViewSet, SemesterViewSet, AcademicCommitteeViewSet

app_name = 'students'

router = DefaultRouter()
router.register(r'semesters', SemesterViewSet, basename='semester')
router.register(r'committee-assignments', AcademicCommitteeViewSet, basename='committee-assignment')
router.register(r'', StudentViewSet, basename='student')

urlpatterns = [
    path('', include(router.urls)),
]

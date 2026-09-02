from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.tutoring.views import TutoringSessionViewSet

router = DefaultRouter()
router.register(r'', TutoringSessionViewSet, basename='tutoring-session')

urlpatterns = [
    path('', include(router.urls)),
]

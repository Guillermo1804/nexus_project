from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EvidenceViewSet

router = DefaultRouter()
router.register(r'', EvidenceViewSet, basename='evidence')

urlpatterns = [
    path('', include(router.urls)),
]

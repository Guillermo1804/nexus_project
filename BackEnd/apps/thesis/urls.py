from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ThesisProgressViewSet

router = DefaultRouter()
router.register(r'progress', ThesisProgressViewSet, basename='thesis-progress')
router.register(r'', ThesisProgressViewSet, basename='thesis')

urlpatterns = [
    path('', include(router.urls)),
]

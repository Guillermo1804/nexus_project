from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PublicationViewSet,
    AcademicEventViewSet,
    ResearchStayViewSet,
    OtherProductViewSet
)

router = DefaultRouter()
router.register(r'publications', PublicationViewSet, basename='publication')
router.register(r'academic-events', AcademicEventViewSet, basename='academic-event')
router.register(r'events', AcademicEventViewSet, basename='academic-event-alias')
router.register(r'research-stays', ResearchStayViewSet, basename='research-stay')
router.register(r'stays', ResearchStayViewSet, basename='research-stay-alias')
router.register(r'other-products', OtherProductViewSet, basename='other-product')
router.register(r'products', OtherProductViewSet, basename='other-product-alias')

urlpatterns = [
    path('', include(router.urls)),
]

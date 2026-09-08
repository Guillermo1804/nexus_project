from django.urls import path
from .views import AlertsView, TimelineView, CoordinatorDashboardView, SupervisionAlertsView

urlpatterns = [
    path('alerts/', AlertsView.as_view(), name='monitoring-alerts'),
    path('supervision-alerts/', SupervisionAlertsView.as_view(), name='monitoring-supervision-alerts'),
    path('timeline/', TimelineView.as_view(), name='monitoring-timeline'),
    path('coordinator-dashboard/', CoordinatorDashboardView.as_view(), name='coordinator-dashboard'),
]

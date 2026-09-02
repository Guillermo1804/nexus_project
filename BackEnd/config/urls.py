"""
URL configuration for N.E.X.U.S. project.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/', include('apps.identity.urls')),
    path('api/v1/students/', include('apps.students.urls')),
    path('api/v1/tutoring-sessions/', include('apps.tutoring.urls')),
    path('api/v1/agreements/', include('apps.agreements.urls')),
    path('api/v1/thesis/', include('apps.thesis.urls')),
    path('api/v1/academic-output/', include('apps.academic_output.urls')),
    path('api/v1/evidence/', include('apps.evidence.urls')),
    path('api/v1/monitoring/', include('apps.monitoring.urls')),
    path('api/v1/reporting/', include('apps.reporting.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

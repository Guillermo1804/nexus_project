from django.urls import path
from apps.reporting.views import (
    StudentFullDossierView,
    StudentExportView,
    GlobalStudentsExportView,
)

urlpatterns = [
    path('students/<int:pk>/full-dossier/', StudentFullDossierView.as_view(), name='student-full-dossier'),
    path('dossier/<int:pk>/', StudentFullDossierView.as_view(), name='student-dossier-alias'),
    path('students/<int:pk>/export/', StudentExportView.as_view(), name='student-export'),
    path('export-students/', GlobalStudentsExportView.as_view(), name='export-students'),
]

from django.contrib import admin
from .models import Evidence


@admin.register(Evidence)
class EvidenceAdmin(admin.ModelAdmin):
    list_display = ('id', 'student', 'tipo', 'actividad_tipo', 'titulo', 'fecha_carga', 'file_size_bytes', 'created_by')
    list_filter = ('tipo', 'actividad_tipo', 'fecha_carga')
    search_fields = ('titulo', 'descripcion', 'student__nombre_completo', 'student__matricula', 'enlace_url')
    ordering = ('-fecha_carga', '-created_at')

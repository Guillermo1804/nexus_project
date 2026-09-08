from django.contrib import admin
from .models import ThesisProgress


@admin.register(ThesisProgress)
class ThesisProgressAdmin(admin.ModelAdmin):
    list_display = ('id', 'student', 'semester', 'porcentaje_avance', 'fecha_registro', 'created_at')
    list_filter = ('semester', 'fecha_registro')
    search_fields = ('student__nombre_completo', 'student__matricula', 'observaciones')
    ordering = ('-fecha_registro', '-created_at')

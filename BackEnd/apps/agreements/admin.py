from django.contrib import admin
from .models import Agreement, AgreementAuditLog


class AgreementAuditLogInline(admin.TabularInline):
    model = AgreementAuditLog
    extra = 0
    readonly_fields = ['user', 'estado_anterior', 'estado_nuevo', 'comentario', 'fecha_cambio']
    can_delete = False


@admin.register(Agreement)
class AgreementAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'student',
        'responsable',
        'fecha_limite',
        'estado',
        'fecha_conclusion',
        'created_at'
    ]
    list_filter = ['estado', 'fecha_limite', 'created_at']
    search_fields = ['descripcion', 'student__nombre_completo', 'student__matricula', 'responsable__email']
    inlines = [AgreementAuditLogInline]
    readonly_fields = ['created_at', 'updated_at']


@admin.register(AgreementAuditLog)
class AgreementAuditLogAdmin(admin.ModelAdmin):
    list_display = ['id', 'agreement', 'user', 'estado_anterior', 'estado_nuevo', 'fecha_cambio']
    list_filter = ['estado_anterior', 'estado_nuevo', 'fecha_cambio']
    search_fields = ['agreement__descripcion', 'user__email', 'comentario']
    readonly_fields = ['agreement', 'user', 'estado_anterior', 'estado_nuevo', 'comentario', 'fecha_cambio']

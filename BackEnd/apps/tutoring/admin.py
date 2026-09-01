from django.contrib import admin
from apps.tutoring.models import TutoringSession, TutoringParticipant, TutoringObservation


class TutoringParticipantInline(admin.TabularInline):
    model = TutoringParticipant
    extra = 1


class TutoringObservationInline(admin.StackedInline):
    model = TutoringObservation
    extra = 1


@admin.register(TutoringSession)
class TutoringSessionAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'student',
        'semester',
        'fecha_sesion',
        'modalidad',
        'proxima_reunion_fecha',
        'created_by',
        'created_at'
    )
    list_filter = ('modalidad', 'fecha_sesion', 'semester')
    search_fields = ('student__nombre_completo', 'student__matricula', 'resumen')
    inlines = [TutoringParticipantInline, TutoringObservationInline]


@admin.register(TutoringParticipant)
class TutoringParticipantAdmin(admin.ModelAdmin):
    list_display = ('id', 'session', 'user', 'rol_en_sesion', 'asistencia')
    list_filter = ('rol_en_sesion', 'asistencia')
    search_fields = ('user__first_name', 'user__last_name', 'user__email', 'session__student__matricula')


@admin.register(TutoringObservation)
class TutoringObservationAdmin(admin.ModelAdmin):
    list_display = ('id', 'session', 'autor', 'titulo_tema', 'created_at')
    search_fields = ('titulo_tema', 'contenido', 'autor__first_name', 'autor__last_name', 'autor__email')

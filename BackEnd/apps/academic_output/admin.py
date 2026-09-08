from django.contrib import admin
from .models import Publication, AcademicEvent, ResearchStay


@admin.register(Publication)
class PublicationAdmin(admin.ModelAdmin):
    list_display = ('id', 'student', 'titulo', 'tipo', 'revista_editorial', 'estado', 'fecha_publicacion')
    list_filter = ('tipo', 'estado', 'fecha_publicacion')
    search_fields = ('titulo', 'autores_texto', 'revista_editorial', 'student__matricula', 'student__user__first_name', 'student__user__last_name')


@admin.register(AcademicEvent)
class AcademicEventAdmin(admin.ModelAdmin):
    list_display = ('id', 'student', 'nombre_evento', 'titulo_ponencia', 'tipo_evento', 'modalidad', 'fecha_presentacion')
    list_filter = ('tipo_evento', 'modalidad', 'fecha_presentacion')
    search_fields = ('nombre_evento', 'titulo_ponencia', 'sede_lugar', 'student__matricula', 'student__user__first_name', 'student__user__last_name')


@admin.register(ResearchStay)
class ResearchStayAdmin(admin.ModelAdmin):
    list_display = ('id', 'student', 'institucion_receptora', 'pais', 'responsable_estancia', 'fecha_inicio', 'fecha_fin')
    list_filter = ('pais', 'fecha_inicio')
    search_fields = ('institucion_receptora', 'pais', 'responsable_estancia', 'student__matricula', 'student__user__first_name', 'student__user__last_name')

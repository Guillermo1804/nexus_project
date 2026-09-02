from django.contrib import admin
from apps.students.models import Student, Semester, AcademicCommittee


class SemesterInline(admin.TabularInline):
    model = Semester
    extra = 1
    min_num = 0
    max_num = 6


class AcademicCommitteeInline(admin.TabularInline):
    model = AcademicCommittee
    extra = 1
    autocomplete_fields = ['user']


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('matricula', 'nombre_completo', 'programa_doctoral', 'cohorte', 'estatus_activo', 'created_at')
    list_filter = ('programa_doctoral', 'cohorte', 'estatus_activo')
    search_fields = ('matricula', 'nombre_completo')
    inlines = [SemesterInline, AcademicCommitteeInline]
    ordering = ('matricula',)


@admin.register(Semester)
class SemesterAdmin(admin.ModelAdmin):
    list_display = ('student', 'numero', 'fecha_inicio', 'fecha_fin', 'is_active', 'created_at')
    list_filter = ('numero', 'is_active')
    search_fields = ('student__matricula', 'student__nombre_completo')
    ordering = ('student', 'numero')


@admin.register(AcademicCommittee)
class AcademicCommitteeAdmin(admin.ModelAdmin):
    list_display = ('student', 'user', 'rol_comite', 'fecha_asignacion', 'is_active', 'created_at')
    list_filter = ('rol_comite', 'is_active')
    search_fields = ('student__matricula', 'student__nombre_completo', 'user__first_name', 'user__last_name', 'user__email')
    ordering = ('student', 'rol_comite')

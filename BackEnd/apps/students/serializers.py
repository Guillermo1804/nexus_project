from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.identity.serializers import UserSerializer
from apps.students.models import Student, Semester, AcademicCommittee

User = get_user_model()


class SemesterSerializer(serializers.ModelSerializer):
    number = serializers.IntegerField(source='numero', read_only=True)
    isCurrent = serializers.BooleanField(source='is_active', read_only=True)
    name = serializers.SerializerMethodField()

    class Meta:
        model = Semester
        fields = [
            'id',
            'student',
            'numero',
            'number',
            'name',
            'fecha_inicio',
            'fecha_fin',
            'is_active',
            'isCurrent',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'number', 'isCurrent', 'name']

    def get_name(self, obj):
        return f"Semestre {obj.numero}"

    def validate(self, attrs):
        fecha_inicio = attrs.get('fecha_inicio', getattr(self.instance, 'fecha_inicio', None))
        fecha_fin = attrs.get('fecha_fin', getattr(self.instance, 'fecha_fin', None))
        if fecha_inicio and fecha_fin and fecha_fin < fecha_inicio:
            raise serializers.ValidationError({
                'fecha_fin': 'La fecha de fin no puede ser anterior a la fecha de inicio.'
            })

        numero = attrs.get('numero', getattr(self.instance, 'numero', None))
        if numero is not None and (numero < 1 or numero > 6):
            raise serializers.ValidationError({
                'numero': 'El número de semestre debe estar entre 1 y 6.'
            })

        return attrs


class AcademicCommitteeSerializer(serializers.ModelSerializer):
    user_detail = UserSerializer(source='user', read_only=True)
    rol_comite_display = serializers.CharField(source='get_rol_comite_display', read_only=True)

    class Meta:
        model = AcademicCommittee
        fields = [
            'id',
            'student',
            'user',
            'user_detail',
            'rol_comite',
            'rol_comite_display',
            'fecha_asignacion',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'rol_comite_display']

    def validate_user(self, value):
        if value.role not in ['ASESOR', 'COORDINADOR'] and not value.is_superuser:
            raise serializers.ValidationError(
                "Solo se pueden asignar usuarios con rol ASESOR o COORDINADOR al comité académico."
            )
        return value

    def validate(self, attrs):
        student = attrs.get('student', getattr(self.instance, 'student', None))
        user = attrs.get('user', getattr(self.instance, 'user', None))
        rol_comite = attrs.get('rol_comite', getattr(self.instance, 'rol_comite', None))

        if student and user and rol_comite:
            qs = AcademicCommittee.objects.filter(
                student=student,
                user=user,
                rol_comite=rol_comite
            )
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    "Este usuario ya tiene asignado este rol en el comité académico del estudiante."
                )
        return attrs


class StudentSerializer(serializers.ModelSerializer):
    semesters = SemesterSerializer(many=True, read_only=True)
    committee_members = AcademicCommitteeSerializer(many=True, read_only=True)
    total_semesters = serializers.SerializerMethodField()
    current_semester = serializers.SerializerMethodField()
    currentSemester = serializers.SerializerMethodField()
    thesis_progress_percent = serializers.SerializerMethodField()
    total_agreements = serializers.SerializerMethodField()
    pending_agreements = serializers.SerializerMethodField()
    in_progress_agreements = serializers.SerializerMethodField()
    concluded_agreements = serializers.SerializerMethodField()
    overdue_agreements = serializers.SerializerMethodField()
    total_tutoring_sessions = serializers.SerializerMethodField()
    last_tutoring_date = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    enrollmentDate = serializers.SerializerMethodField()
    expectedGraduationDate = serializers.SerializerMethodField()
    fecha_ingreso = serializers.SerializerMethodField()
    graduacion_estimada = serializers.SerializerMethodField()
    thesisTitle = serializers.SerializerMethodField()
    titulo_tesis = serializers.SerializerMethodField()
    researchLine = serializers.SerializerMethodField()
    linea_investigacion = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = [
            'id',
            'user',
            'matricula',
            'nombre_completo',
            'programa_doctoral',
            'cohorte',
            'estatus_activo',
            'status',
            'enrollmentDate',
            'expectedGraduationDate',
            'fecha_ingreso',
            'graduacion_estimada',
            'thesisTitle',
            'titulo_tesis',
            'researchLine',
            'linea_investigacion',
            'semesters',
            'total_semesters',
            'current_semester',
            'currentSemester',
            'committee_members',
            'thesis_progress_percent',
            'total_agreements',
            'pending_agreements',
            'in_progress_agreements',
            'concluded_agreements',
            'overdue_agreements',
            'total_tutoring_sessions',
            'last_tutoring_date',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'total_semesters', 'status', 'enrollmentDate', 'expectedGraduationDate']

    def get_thesisTitle(self, obj):
        latest = obj.thesis_progresses.order_by('-fecha_registro', '-id').first()
        if latest and latest.observaciones:
            return latest.observaciones
        return f"Proyecto de Investigación — {obj.programa_doctoral}"

    def get_titulo_tesis(self, obj):
        return self.get_thesisTitle(obj)

    def get_researchLine(self, obj):
        return obj.programa_doctoral

    def get_linea_investigacion(self, obj):
        return self.get_researchLine(obj)

    def get_total_semesters(self, obj):
        return obj.semesters.count()

    def get_status(self, obj):
        return 'ACTIVO' if obj.estatus_activo else 'INACTIVO'

    def get_enrollmentDate(self, obj):
        first_sem = obj.semesters.order_by('numero').first()
        if first_sem and first_sem.fecha_inicio:
            return str(first_sem.fecha_inicio)
        return str(obj.created_at.date()) if obj.created_at else None

    def get_fecha_ingreso(self, obj):
        return self.get_enrollmentDate(obj)

    def get_expectedGraduationDate(self, obj):
        last_sem = obj.semesters.order_by('-numero').first()
        if last_sem and last_sem.fecha_fin:
            return str(last_sem.fecha_fin)
        return None

    def get_graduacion_estimada(self, obj):
        return self.get_expectedGraduationDate(obj)

    def get_current_semester(self, obj):
        active = obj.semesters.filter(is_active=True).first()
        if active:
            return active.numero
        latest = obj.semesters.order_by('-numero').first()
        return latest.numero if latest else 1

    def get_currentSemester(self, obj):
        return self.get_current_semester(obj)

    def get_thesis_progress_percent(self, obj):
        latest = obj.thesis_progresses.order_by('-created_at').first()
        return latest.porcentaje_avance if latest else 0

    def get_total_agreements(self, obj):
        return obj.agreements.count()

    def get_pending_agreements(self, obj):
        return obj.agreements.filter(estado='PENDIENTE').count()

    def get_in_progress_agreements(self, obj):
        return obj.agreements.filter(estado='EN_PROCESO').count()

    def get_concluded_agreements(self, obj):
        return obj.agreements.filter(estado='CONCLUIDO').count()

    def get_overdue_agreements(self, obj):
        return obj.agreements.filter(estado='VENCIDO').count()

    def get_total_tutoring_sessions(self, obj):
        return obj.tutoring_sessions.count()

    def get_last_tutoring_date(self, obj):
        latest = obj.tutoring_sessions.order_by('-fecha_sesion').first()
        return str(latest.fecha_sesion) if latest else None


class StudentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = [
            'id',
            'user',
            'matricula',
            'nombre_completo',
            'programa_doctoral',
            'cohorte',
            'estatus_activo',
        ]
        read_only_fields = ['id']

    def validate_matricula(self, value):
        qs = Student.objects.filter(matricula__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Ya existe un estudiante con esta matrícula.")
        return value.strip().upper()

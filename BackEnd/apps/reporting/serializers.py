from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.students.models import Student, Semester, AcademicCommittee
from apps.tutoring.models import TutoringSession, TutoringParticipant, TutoringObservation
from apps.agreements.models import Agreement, AgreementAuditLog
from apps.thesis.models import ThesisProgress
from apps.academic_output.models import Publication, AcademicEvent, ResearchStay, OtherProduct
from apps.evidence.models import Evidence

User = get_user_model()


class DossierUserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'full_name', 'role']

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.email


class DossierStudentInfoSerializer(serializers.ModelSerializer):
    user = DossierUserSerializer(read_only=True)

    class Meta:
        model = Student
        fields = [
            'id',
            'matricula',
            'nombre_completo',
            'programa_doctoral',
            'cohorte',
            'estatus_activo',
            'created_at',
            'user',
        ]


class DossierCommitteeMemberSerializer(serializers.ModelSerializer):
    user = DossierUserSerializer(read_only=True)
    rol_comite_display = serializers.CharField(source='get_rol_comite_display', read_only=True)

    class Meta:
        model = AcademicCommittee
        fields = [
            'id',
            'user',
            'rol_comite',
            'rol_comite_display',
            'fecha_asignacion',
            'is_active',
        ]


class DossierSemesterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Semester
        fields = ['id', 'numero', 'fecha_inicio', 'fecha_fin', 'is_active']


class DossierTutoringParticipantSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    user_nombre = serializers.SerializerMethodField()
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_role = serializers.CharField(source='user.role', read_only=True)
    rol_en_sesion_display = serializers.CharField(source='get_rol_en_sesion_display', read_only=True)

    class Meta:
        model = TutoringParticipant
        fields = [
            'id',
            'user_id',
            'user_nombre',
            'user_email',
            'user_role',
            'rol_en_sesion',
            'rol_en_sesion_display',
            'asistencia',
            'notas',
        ]

    def get_user_nombre(self, obj):
        if obj.user:
            return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.email
        return ""


class DossierTutoringObservationSerializer(serializers.ModelSerializer):
    autor_nombre = serializers.SerializerMethodField()
    autor_email = serializers.CharField(source='autor.email', read_only=True)

    class Meta:
        model = TutoringObservation
        fields = [
            'id',
            'autor_id',
            'autor_nombre',
            'autor_email',
            'titulo_tema',
            'contenido',
            'created_at',
        ]

    def get_autor_nombre(self, obj):
        if obj.autor:
            return f"{obj.autor.first_name} {obj.autor.last_name}".strip() or obj.autor.email
        return ""


class DossierTutoringSessionSerializer(serializers.ModelSerializer):
    semester_numero = serializers.IntegerField(source='semester.numero', read_only=True)
    modalidad_display = serializers.CharField(source='get_modalidad_display', read_only=True)
    created_by_nombre = serializers.SerializerMethodField()
    participants = DossierTutoringParticipantSerializer(many=True, read_only=True)
    observations = DossierTutoringObservationSerializer(many=True, read_only=True)

    class Meta:
        model = TutoringSession
        fields = [
            'id',
            'semester_id',
            'semester_numero',
            'fecha_sesion',
            'modalidad',
            'modalidad_display',
            'resumen',
            'proxima_reunion_fecha',
            'proxima_reunion_notas',
            'created_by_id',
            'created_by_nombre',
            'created_at',
            'participants',
            'observations',
        ]

    def get_created_by_nombre(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.email
        return ""


class DossierAgreementAuditLogSerializer(serializers.ModelSerializer):
    user_nombre = serializers.SerializerMethodField()

    class Meta:
        model = AgreementAuditLog
        fields = [
            'id',
            'user_id',
            'user_nombre',
            'estado_anterior',
            'estado_nuevo',
            'comentario',
            'fecha_cambio',
        ]

    def get_user_nombre(self, obj):
        if obj.user:
            return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.email
        return ""


class DossierEvidenceSimpleSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    actividad_tipo_display = serializers.CharField(source='get_actividad_tipo_display', read_only=True)
    archivo_adjunto_url = serializers.SerializerMethodField()

    class Meta:
        model = Evidence
        fields = [
            'id',
            'titulo',
            'tipo',
            'tipo_display',
            'actividad_tipo',
            'actividad_tipo_display',
            'actividad_id',
            'archivo_adjunto_url',
            'enlace_url',
            'mime_type',
            'file_size_bytes',
            'fecha_carga',
        ]

    def get_archivo_adjunto_url(self, obj):
        if obj.archivo_adjunto:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.archivo_adjunto.url)
            return obj.archivo_adjunto.url
        return None


class DossierAgreementSerializer(serializers.ModelSerializer):
    session_id = serializers.IntegerField(source='session.id', read_only=True)
    session_fecha = serializers.DateField(source='session.fecha_sesion', read_only=True)
    responsable_id = serializers.IntegerField(source='responsable.id', read_only=True)
    responsable_nombre = serializers.SerializerMethodField()
    responsable_email = serializers.CharField(source='responsable.email', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    audit_logs = DossierAgreementAuditLogSerializer(many=True, read_only=True)
    evidences = serializers.SerializerMethodField()

    class Meta:
        model = Agreement
        fields = [
            'id',
            'session_id',
            'session_fecha',
            'descripcion',
            'responsable_id',
            'responsable_nombre',
            'responsable_email',
            'fecha_limite',
            'estado',
            'estado_display',
            'fecha_conclusion',
            'is_vencido',
            'created_at',
            'audit_logs',
            'evidences',
        ]

    def get_responsable_nombre(self, obj):
        if obj.responsable:
            return f"{obj.responsable.first_name} {obj.responsable.last_name}".strip() or obj.responsable.email
        return ""

    def get_evidences(self, obj):
        evidences = Evidence.objects.filter(
            student_id=obj.student_id,
            actividad_tipo=Evidence.ACTIVIDAD_ACUERDO,
            actividad_id=obj.id
        )
        return DossierEvidenceSimpleSerializer(evidences, many=True, context=self.context).data


class DossierThesisProgressSerializer(serializers.ModelSerializer):
    semester_numero = serializers.IntegerField(source='semester.numero', read_only=True)

    class Meta:
        model = ThesisProgress
        fields = [
            'id',
            'semester_id',
            'semester_numero',
            'porcentaje_avance',
            'componentes_json',
            'observaciones',
            'fecha_registro',
            'created_at',
        ]


class DossierPublicationSerializer(serializers.ModelSerializer):
    semester_numero = serializers.IntegerField(source='semester.numero', read_only=True)
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    evidencia = DossierEvidenceSimpleSerializer(read_only=True)

    class Meta:
        model = Publication
        fields = [
            'id',
            'semester_id',
            'semester_numero',
            'titulo',
            'autores_texto',
            'tipo',
            'tipo_display',
            'revista_editorial',
            'estado',
            'estado_display',
            'fecha_publicacion',
            'doi_url',
            'evidencia',
            'created_at',
        ]


class DossierAcademicEventSerializer(serializers.ModelSerializer):
    semester_numero = serializers.IntegerField(source='semester.numero', read_only=True)
    tipo_evento_display = serializers.CharField(source='get_tipo_evento_display', read_only=True)
    modalidad_display = serializers.CharField(source='get_modalidad_display', read_only=True)
    evidencia = DossierEvidenceSimpleSerializer(read_only=True)

    class Meta:
        model = AcademicEvent
        fields = [
            'id',
            'semester_id',
            'semester_numero',
            'tipo_evento',
            'tipo_evento_display',
            'nombre_evento',
            'titulo_ponencia',
            'fecha_presentacion',
            'sede_lugar',
            'modalidad',
            'modalidad_display',
            'evidencia',
            'created_at',
        ]


class DossierResearchStaySerializer(serializers.ModelSerializer):
    evidencia = DossierEvidenceSimpleSerializer(read_only=True)
    duracion_dias = serializers.SerializerMethodField()

    class Meta:
        model = ResearchStay
        fields = [
            'id',
            'institucion_receptora',
            'pais',
            'fecha_inicio',
            'fecha_fin',
            'duracion_dias',
            'responsable_estancia',
            'objetivos',
            'resultados',
            'evidencia',
            'created_at',
        ]

    def get_duracion_dias(self, obj):
        if obj.fecha_inicio and obj.fecha_fin:
            return (obj.fecha_fin - obj.fecha_inicio).days + 1
        return None


class DossierOtherProductSerializer(serializers.ModelSerializer):
    tipo_producto_display = serializers.CharField(source='get_tipo_producto_display', read_only=True)
    evidencia = DossierEvidenceSimpleSerializer(read_only=True)

    class Meta:
        model = OtherProduct
        fields = [
            'id',
            'tipo_producto',
            'tipo_producto_display',
            'titulo',
            'descripcion',
            'fecha_registro',
            'evidencia',
            'created_at',
        ]


class DossierEvidenceSerializer(serializers.ModelSerializer):
    semester_numero = serializers.IntegerField(source='semester.numero', read_only=True)
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    actividad_tipo_display = serializers.CharField(source='get_actividad_tipo_display', read_only=True)
    created_by_nombre = serializers.SerializerMethodField()
    archivo_adjunto_url = serializers.SerializerMethodField()

    class Meta:
        model = Evidence
        fields = [
            'id',
            'semester_id',
            'semester_numero',
            'tipo',
            'tipo_display',
            'actividad_tipo',
            'actividad_tipo_display',
            'actividad_id',
            'titulo',
            'descripcion',
            'archivo_adjunto_url',
            'enlace_url',
            'mime_type',
            'file_size_bytes',
            'fecha_carga',
            'created_by_id',
            'created_by_nombre',
            'created_at',
        ]

    def get_created_by_nombre(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.email
        return ""

    def get_archivo_adjunto_url(self, obj):
        if obj.archivo_adjunto:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.archivo_adjunto.url)
            return obj.archivo_adjunto.url
        return None


class DossierKPIsSerializer(serializers.Serializer):
    total_tutorias = serializers.IntegerField()
    total_acuerdos = serializers.IntegerField()
    acuerdos_concluidos = serializers.IntegerField()
    acuerdos_pendientes = serializers.IntegerField()
    acuerdos_en_proceso = serializers.IntegerField()
    acuerdos_vencidos = serializers.IntegerField()
    tasa_cumplimiento_acuerdos = serializers.FloatField()
    ultimo_porcentaje_tesis = serializers.IntegerField(allow_null=True)
    ultima_actualizacion_tesis = serializers.DateField(allow_null=True)
    total_publicaciones = serializers.IntegerField()
    total_eventos_academicos = serializers.IntegerField()
    total_estancias_investigacion = serializers.IntegerField()
    total_otros_productos = serializers.IntegerField()
    total_evidencias = serializers.IntegerField()


class FullDossierSerializer(serializers.Serializer):
    student = DossierStudentInfoSerializer()
    committee = DossierCommitteeMemberSerializer(many=True)
    semesters = DossierSemesterSerializer(many=True)
    tutoring_sessions = DossierTutoringSessionSerializer(many=True)
    agreements = DossierAgreementSerializer(many=True)
    thesis_progress = DossierThesisProgressSerializer(many=True)
    publications = DossierPublicationSerializer(many=True)
    academic_events = DossierAcademicEventSerializer(many=True)
    research_stays = DossierResearchStaySerializer(many=True)
    other_products = DossierOtherProductSerializer(many=True)
    evidences = DossierEvidenceSerializer(many=True)
    kpis = DossierKPIsSerializer()
    generated_at = serializers.DateTimeField()
    generated_by = DossierUserSerializer()

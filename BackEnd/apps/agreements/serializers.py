from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import Agreement, AgreementAuditLog
from apps.students.models import Student, AcademicCommittee

User = get_user_model()


class AgreementAuditLogSerializer(serializers.ModelSerializer):
    user_nombre = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()

    class Meta:
        model = AgreementAuditLog
        fields = [
            'id',
            'agreement',
            'user',
            'user_nombre',
            'user_email',
            'estado_anterior',
            'estado_nuevo',
            'comentario',
            'fecha_cambio'
        ]
        read_only_fields = ['id', 'agreement', 'fecha_cambio']

    def get_user_nombre(self, obj):
        if obj.user:
            return obj.user.get_full_name() or obj.user.email
        return "Sistema"

    def get_user_email(self, obj):
        return obj.user.email if obj.user else ""


class AgreementSerializer(serializers.ModelSerializer):
    audit_logs = AgreementAuditLogSerializer(many=True, read_only=True)
    responsable_nombre = serializers.SerializerMethodField()
    responsable_email = serializers.SerializerMethodField()
    student_nombre = serializers.SerializerMethodField()
    student_matricula = serializers.SerializerMethodField()
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    created_by_nombre = serializers.SerializerMethodField()
    is_vencido = serializers.BooleanField(read_only=True)
    semester_numero = serializers.SerializerMethodField()
    semesterNumber = serializers.SerializerMethodField()
    semester_id = serializers.SerializerMethodField()

    class Meta:
        model = Agreement
        fields = [
            'id',
            'session',
            'student',
            'student_nombre',
            'student_matricula',
            'semester_numero',
            'semesterNumber',
            'semester_id',
            'descripcion',
            'responsable',
            'responsable_nombre',
            'responsable_email',
            'fecha_limite',
            'estado',
            'estado_display',
            'fecha_conclusion',
            'created_by',
            'created_by_nombre',
            'created_at',
            'updated_at',
            'is_vencido',
            'audit_logs'
        ]
        read_only_fields = [
            'id',
            'estado_display',
            'is_vencido',
            'created_by',
            'created_by_nombre',
            'created_at',
            'updated_at',
            'audit_logs',
            'semester_numero',
            'semesterNumber',
            'semester_id'
        ]

    def get_semester_numero(self, obj):
        if obj.session and obj.session.semester:
            return obj.session.semester.numero
        if obj.student:
            active = obj.student.semesters.filter(is_active=True).first()
            if active:
                return active.numero
            latest = obj.student.semesters.order_by('-numero').first()
            if latest:
                return latest.numero
        return 1

    def get_semesterNumber(self, obj):
        return self.get_semester_numero(obj)

    def get_semester_id(self, obj):
        if obj.session and obj.session.semester_id:
            return obj.session.semester_id
        if obj.student:
            active = obj.student.semesters.filter(is_active=True).first()
            if active:
                return active.id
        return None

    def get_responsable_nombre(self, obj):
        return obj.responsable.get_full_name() if obj.responsable else ""

    def get_responsable_email(self, obj):
        return obj.responsable.email if obj.responsable else ""

    def get_student_nombre(self, obj):
        return obj.student.nombre_completo if obj.student else ""

    def get_student_matricula(self, obj):
        return obj.student.matricula if obj.student else ""

    def get_created_by_nombre(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.email
        return ""

    def to_representation(self, instance):
        # Auto-evaluar estado vencido en representación
        instance.check_and_update_overdue(save=True)
        return super().to_representation(instance)


class AgreementCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Agreement
        fields = [
            'id',
            'session',
            'student',
            'descripcion',
            'responsable',
            'fecha_limite',
            'estado'
        ]
        extra_kwargs = {
            'estado': {'required': False, 'default': Agreement.STATUS_PENDIENTE},
            'session': {'required': False, 'allow_null': True}
        }

    def validate_descripcion(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("La descripción del acuerdo no puede estar vacía.")
        return value.strip()

    def validate(self, attrs):
        student = attrs.get('student')
        responsable = attrs.get('responsable')
        session = attrs.get('session')

        # Si se incluye sesión, verificar que pertenezca al mismo estudiante
        if session and student and session.student_id != student.id:
            raise serializers.ValidationError({
                'session': "La sesión de tutoría seleccionada no pertenece al estudiante indicado."
            })

        # Validar compatibilidad del responsable
        if student and responsable:
            is_student_user = student.user_id == responsable.id
            is_committee_member = AcademicCommittee.objects.filter(
                student=student,
                user=responsable,
                is_active=True
            ).exists()
            is_coordinator = getattr(responsable, 'role', None) == 'COORDINADOR' or responsable.is_superuser
            is_advisor = getattr(responsable, 'role', None) == 'ASESOR'

            if not (is_student_user or is_committee_member or is_coordinator or is_advisor):
                raise serializers.ValidationError({
                    'responsable': "El responsable asignado debe ser el propio estudiante, un asesor de su comité o un coordinador del programa."
                })

        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        agreement = super().create(validated_data)
        
        # Registrar log inicial de auditoría
        AgreementAuditLog.objects.create(
            agreement=agreement,
            user=request.user if request and request.user.is_authenticated else None,
            estado_anterior='NUEVO',
            estado_nuevo=agreement.estado,
            comentario='Creación inicial del acuerdo'
        )
        return agreement


class AgreementStatusUpdateSerializer(serializers.Serializer):
    estado = serializers.ChoiceField(choices=Agreement.ESTADO_CHOICES)
    comentario = serializers.CharField(required=False, allow_blank=True, default='')

    def update_status(self, agreement: Agreement, user=None) -> Agreement:
        nuevo_estado = self.validated_data['estado']
        comentario = self.validated_data.get('comentario', '').strip()
        estado_anterior = agreement.estado

        if nuevo_estado == Agreement.STATUS_CONCLUIDO:
            agreement.fecha_conclusion = timezone.now().date()
        elif estado_anterior == Agreement.STATUS_CONCLUIDO and nuevo_estado != Agreement.STATUS_CONCLUIDO:
            agreement.fecha_conclusion = None

        agreement.estado = nuevo_estado
        agreement.save()

        # Registrar log de auditoría
        AgreementAuditLog.objects.create(
            agreement=agreement,
            user=user if user and user.is_authenticated else None,
            estado_anterior=estado_anterior,
            estado_nuevo=nuevo_estado,
            comentario=comentario
        )

        return agreement

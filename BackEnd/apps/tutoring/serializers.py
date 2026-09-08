from rest_framework import serializers
from django.db import transaction
from django.contrib.auth import get_user_model
from apps.identity.serializers import UserSerializer
from apps.students.models import Student, Semester
from apps.tutoring.models import TutoringSession, TutoringParticipant, TutoringObservation

User = get_user_model()


class TutoringParticipantSerializer(serializers.ModelSerializer):
    user_nombre = serializers.SerializerMethodField()
    user_email = serializers.EmailField(source='user.email', read_only=True)
    rol_en_sesion_display = serializers.CharField(source='get_rol_en_sesion_display', read_only=True)

    class Meta:
        model = TutoringParticipant
        fields = [
            'id',
            'session',
            'user',
            'user_nombre',
            'user_email',
            'rol_en_sesion',
            'rol_en_sesion_display',
            'asistencia',
            'notas',
        ]
        read_only_fields = ['id', 'user_nombre', 'user_email', 'rol_en_sesion_display']

    def get_user_nombre(self, obj):
        if obj.user:
            return obj.user.get_full_name() or obj.user.username
        return ''


class TutoringParticipantInputSerializer(serializers.Serializer):
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    rol_en_sesion = serializers.ChoiceField(choices=TutoringParticipant.ROL_CHOICES)
    asistencia = serializers.BooleanField(default=True, required=False)
    notas = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')


class TutoringObservationSerializer(serializers.ModelSerializer):
    autor_nombre = serializers.SerializerMethodField()
    autor_email = serializers.EmailField(source='autor.email', read_only=True)

    class Meta:
        model = TutoringObservation
        fields = [
            'id',
            'session',
            'autor',
            'autor_nombre',
            'autor_email',
            'tema_revisado',
            'observaciones_detalladas',
            'titulo_tema',
            'contenido',
            'created_at',
        ]
        read_only_fields = ['id', 'autor_nombre', 'autor_email', 'created_at']
        extra_kwargs = {
            'tema_revisado': {'required': False, 'allow_blank': True},
            'observaciones_detalladas': {'required': False, 'allow_blank': True},
            'titulo_tema': {'required': False, 'allow_blank': True},
            'contenido': {'required': False, 'allow_blank': True},
        }


    def get_autor_nombre(self, obj):
        if obj.autor:
            return obj.autor.get_full_name() or obj.autor.username
        return ''


class TutoringObservationInputSerializer(serializers.Serializer):
    autor = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=False, allow_null=True)
    titulo_tema = serializers.CharField(max_length=255)
    contenido = serializers.CharField()


class TutoringSessionSerializer(serializers.ModelSerializer):
    student_nombre = serializers.CharField(source='student.nombre_completo', read_only=True)
    student_matricula = serializers.CharField(source='student.matricula', read_only=True)
    semester_numero = serializers.IntegerField(source='semester.numero', read_only=True)
    semesterNumber = serializers.IntegerField(source='semester.numero', read_only=True)
    semester_id = serializers.IntegerField(source='semester.id', read_only=True)
    modalidad_display = serializers.CharField(source='get_modalidad_display', read_only=True)
    created_by_nombre = serializers.SerializerMethodField()
    participants = TutoringParticipantSerializer(many=True, read_only=True)
    observations = TutoringObservationSerializer(many=True, read_only=True)
    total_participantes = serializers.SerializerMethodField()
    total_observaciones = serializers.SerializerMethodField()

    class Meta:
        model = TutoringSession
        fields = [
            'id',
            'student',
            'student_nombre',
            'student_matricula',
            'semester',
            'semester_numero',
            'semesterNumber',
            'semester_id',
            'fecha_sesion',
            'modalidad',
            'modalidad_display',
            'resumen',
            'proxima_reunion_fecha',
            'proxima_reunion_notas',
            'created_by',
            'created_by_nombre',
            'participants',
            'observations',
            'total_participantes',
            'total_observaciones',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'student_nombre',
            'student_matricula',
            'semester_numero',
            'semesterNumber',
            'semester_id',
            'modalidad_display',
            'created_by_nombre',
            'participants',
            'observations',
            'total_participantes',
            'total_observaciones',
            'created_at',
            'updated_at',
        ]

    def get_created_by_nombre(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None

    def get_total_participantes(self, obj):
        return len(obj.participants.all())

    def get_total_observaciones(self, obj):
        return len(obj.observations.all())


class TutoringSessionCreateSerializer(serializers.ModelSerializer):
    participants = TutoringParticipantInputSerializer(many=True, required=False, default=[])
    observations = TutoringObservationInputSerializer(many=True, required=False, default=[])

    class Meta:
        model = TutoringSession
        fields = [
            'id',
            'student',
            'semester',
            'fecha_sesion',
            'modalidad',
            'resumen',
            'proxima_reunion_fecha',
            'proxima_reunion_notas',
            'participants',
            'observations',
        ]
        read_only_fields = ['id']

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        student_val = data.get('student')
        sem_val = data.get('semester')
        
        if student_val and sem_val is not None:
            try:
                if not Semester.objects.filter(pk=sem_val).exists():
                    st = Student.objects.filter(pk=student_val).first()
                    if st:
                        match_sem = st.semesters.filter(numero=sem_val).first()
                        if match_sem:
                            data['semester'] = match_sem.pk
            except Exception:
                pass
        return super().to_internal_value(data)

    def validate(self, attrs):
        student = attrs.get('student')
        semester = attrs.get('semester')

        if student and semester:
            if semester.student_id != student.id:
                raise serializers.ValidationError({
                    'semester': 'El semestre seleccionado no pertenece al estudiante indicado.'
                })

        return attrs

    def create(self, validated_data):
        participants_data = validated_data.pop('participants', [])
        observations_data = validated_data.pop('observations', [])

        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated and 'created_by' not in validated_data:
            validated_data['created_by'] = request.user

        with transaction.atomic():
            session = TutoringSession.objects.create(**validated_data)

            # Create participants
            seen_users = set()
            for p_data in participants_data:
                user_obj = p_data['user']
                if user_obj.id not in seen_users:
                    seen_users.add(user_obj.id)
                    TutoringParticipant.objects.create(
                        session=session,
                        user=user_obj,
                        rol_en_sesion=p_data['rol_en_sesion'],
                        asistencia=p_data.get('asistencia', True),
                        notas=p_data.get('notas', '')
                    )

            # Create observations
            for obs_data in observations_data:
                autor = obs_data.get('autor')
                if not autor:
                    autor = request.user if (request and request.user and request.user.is_authenticated) else session.created_by
                TutoringObservation.objects.create(
                    session=session,
                    autor=autor,
                    titulo_tema=obs_data['titulo_tema'],
                    contenido=obs_data['contenido']
                )

        return session

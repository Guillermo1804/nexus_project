import mimetypes
from rest_framework import serializers
from .models import Evidence, ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES, DOI_REGEX
from apps.students.models import Student, Semester


class EvidenceSerializer(serializers.ModelSerializer):
    student_nombre = serializers.CharField(source='student.nombre_completo', read_only=True)
    student_matricula = serializers.CharField(source='student.matricula', read_only=True)
    semester_numero = serializers.SerializerMethodField()
    created_by_nombre = serializers.SerializerMethodField()
    cargado_por_nombre = serializers.SerializerMethodField()
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    actividad_tipo_display = serializers.CharField(source='get_actividad_tipo_display', read_only=True)
    archivo_url = serializers.SerializerMethodField()

    class Meta:
        model = Evidence
        fields = [
            'id',
            'student',
            'student_nombre',
            'student_matricula',
            'semester',
            'semester_numero',
            'tipo',
            'tipo_display',
            'actividad_tipo',
            'actividad_tipo_display',
            'actividad_id',
            'titulo',
            'descripcion',
            'archivo_adjunto',
            'archivo_url',
            'enlace_url',
            'url_doi',
            'mime_type',
            'file_size_bytes',
            'fecha_carga',
            'cargado_por',
            'cargado_por_nombre',
            'created_by',
            'created_by_nombre',
            'created_at'
        ]
        read_only_fields = [
            'id',
            'student_nombre',
            'student_matricula',
            'semester_numero',
            'tipo_display',
            'actividad_tipo_display',
            'archivo_url',
            'mime_type',
            'file_size_bytes',
            'cargado_por',
            'cargado_por_nombre',
            'created_by',
            'created_by_nombre',
            'created_at'
        ]

    def get_semester_numero(self, obj):
        return obj.semester.numero if obj.semester else None

    def get_created_by_nombre(self, obj):
        user = obj.created_by or obj.cargado_por
        if user:
            return user.get_full_name() or user.email
        return ""

    def get_cargado_por_nombre(self, obj):
        return self.get_created_by_nombre(obj)

    def get_archivo_url(self, obj):
        if obj.archivo_adjunto:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.archivo_adjunto.url)
            return obj.archivo_adjunto.url
        return None


class EvidenceCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Evidence
        fields = [
            'id',
            'student',
            'semester',
            'tipo',
            'actividad_tipo',
            'actividad_id',
            'titulo',
            'descripcion',
            'archivo_adjunto',
            'enlace_url',
            'url_doi',
            'cargado_por',
            'fecha_carga'
        ]
        extra_kwargs = {
            'semester': {'required': False, 'allow_null': True},
            'actividad_id': {'required': False, 'allow_null': True},
            'descripcion': {'required': False, 'allow_blank': True},
            'archivo_adjunto': {'required': False, 'allow_null': True},
            'enlace_url': {'required': False, 'allow_blank': True},
            'url_doi': {'required': False, 'allow_blank': True},
            'cargado_por': {'required': False, 'allow_null': True},
            'fecha_carga': {'required': False}
        }


    def validate_titulo(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("El título de la evidencia es obligatorio.")
        return value.strip()

    def validate(self, attrs):
        student = attrs.get('student')
        semester = attrs.get('semester')
        tipo = attrs.get('tipo', Evidence.TIPO_ARCHIVO)
        archivo = attrs.get('archivo_adjunto')
        enlace = attrs.get('enlace_url', '')

        if semester and student and semester.student_id != student.id:
            raise serializers.ValidationError({
                'semester': "El semestre seleccionado no pertenece al estudiante asignado."
            })

        if tipo == Evidence.TIPO_ARCHIVO:
            if not archivo:
                raise serializers.ValidationError({
                    'archivo_adjunto': "Debe adjuntar un archivo para evidencias de tipo Archivo Local."
                })
            if archivo.size > MAX_FILE_SIZE_BYTES:
                raise serializers.ValidationError({
                    'archivo_adjunto': f"El archivo excede el tamaño máximo permitido de 15MB ({archivo.size} bytes)."
                })
            
            content_type = getattr(archivo, 'content_type', None)
            if not content_type:
                guessed, _ = mimetypes.guess_type(archivo.name)
                content_type = guessed
            
            if content_type and content_type not in ALLOWED_MIME_TYPES:
                raise serializers.ValidationError({
                    'archivo_adjunto': f"Tipo de archivo '{content_type}' no permitido. Formatos admitidos: PDF, PNG, JPG, DOCX, ZIP."
                })
            attrs['mime_type'] = content_type or 'application/octet-stream'
            attrs['file_size_bytes'] = archivo.size

        elif tipo == Evidence.TIPO_DOI:
            if not enlace or not enlace.strip():
                raise serializers.ValidationError({
                    'enlace_url': "Debe proporcionar una URL válida o identificador DOI."
                })
            enlace_clean = enlace.strip()
            if not DOI_REGEX.match(enlace_clean):
                raise serializers.ValidationError({
                    'enlace_url': "El identificador DOI o enlace externo no cumple con el formato válido."
                })
            attrs['enlace_url'] = enlace_clean
            attrs['mime_type'] = 'text/uri-list'
            attrs['file_size_bytes'] = 0

        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        return super().create(validated_data)

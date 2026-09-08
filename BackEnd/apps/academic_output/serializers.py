from rest_framework import serializers
from .models import Publication, AcademicEvent, ResearchStay, OtherProduct
from apps.students.models import Student, Semester
from apps.evidence.models import Evidence


class PublicationSerializer(serializers.ModelSerializer):
    student_nombre = serializers.CharField(source='student.nombre_completo', read_only=True)
    student_matricula = serializers.CharField(source='student.matricula', read_only=True)
    semester_numero = serializers.IntegerField(source='semester.numero', read_only=True)
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    evidencia_titulo = serializers.CharField(source='evidencia.titulo', read_only=True)

    class Meta:
        model = Publication
        fields = [
            'id',
            'student',
            'student_nombre',
            'student_matricula',
            'semester',
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
            'evidencia_titulo',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id',
            'student_nombre',
            'student_matricula',
            'semester_numero',
            'tipo_display',
            'estado_display',
            'evidencia_titulo',
            'created_at',
            'updated_at'
        ]


class PublicationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Publication
        fields = [
            'id',
            'student',
            'semester',
            'titulo',
            'autores_texto',
            'tipo',
            'revista_editorial',
            'estado',
            'fecha_publicacion',
            'doi_url',
            'evidencia'
        ]
        extra_kwargs = {
            'semester': {'required': False, 'allow_null': True},
            'estado': {'required': False},
            'fecha_publicacion': {'required': False, 'allow_null': True},
            'doi_url': {'required': False, 'allow_blank': True},
            'evidencia': {'required': False, 'allow_null': True}
        }

    def validate(self, attrs):
        student = attrs.get('student')
        semester = attrs.get('semester')
        if student and semester and semester.student_id != student.id:
            raise serializers.ValidationError({
                'semester': "El semestre seleccionado no pertenece al estudiante asignado."
            })
        return attrs


class AcademicEventSerializer(serializers.ModelSerializer):
    student_nombre = serializers.CharField(source='student.nombre_completo', read_only=True)
    student_matricula = serializers.CharField(source='student.matricula', read_only=True)
    semester_numero = serializers.IntegerField(source='semester.numero', read_only=True)
    tipo_evento_display = serializers.CharField(source='get_tipo_evento_display', read_only=True)
    modalidad_display = serializers.CharField(source='get_modalidad_display', read_only=True)
    evidencia_titulo = serializers.CharField(source='evidencia.titulo', read_only=True)

    class Meta:
        model = AcademicEvent
        fields = [
            'id',
            'student',
            'student_nombre',
            'student_matricula',
            'semester',
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
            'evidencia_titulo',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id',
            'student_nombre',
            'student_matricula',
            'semester_numero',
            'tipo_evento_display',
            'modalidad_display',
            'evidencia_titulo',
            'created_at',
            'updated_at'
        ]


class AcademicEventCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicEvent
        fields = [
            'id',
            'student',
            'semester',
            'tipo_evento',
            'nombre_evento',
            'titulo_ponencia',
            'fecha_presentacion',
            'sede_lugar',
            'modalidad',
            'evidencia'
        ]
        extra_kwargs = {
            'semester': {'required': False, 'allow_null': True},
            'modalidad': {'required': False},
            'evidencia': {'required': False, 'allow_null': True}
        }

    def validate(self, attrs):
        student = attrs.get('student')
        semester = attrs.get('semester')
        if student and semester and semester.student_id != student.id:
            raise serializers.ValidationError({
                'semester': "El semestre seleccionado no pertenece al estudiante asignado."
            })
        return attrs


class ResearchStaySerializer(serializers.ModelSerializer):
    student_nombre = serializers.CharField(source='student.nombre_completo', read_only=True)
    student_matricula = serializers.CharField(source='student.matricula', read_only=True)
    semester_numero = serializers.IntegerField(source='semester.numero', read_only=True)
    evidencia_titulo = serializers.CharField(source='evidencia.titulo', read_only=True)

    class Meta:
        model = ResearchStay
        fields = [
            'id',
            'student',
            'student_nombre',
            'student_matricula',
            'semester',
            'semester_numero',
            'institucion_receptora',
            'pais',
            'fecha_inicio',
            'fecha_fin',
            'responsable_estancia',
            'objetivos',
            'resultados',
            'evidencia',
            'evidencia_titulo',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id',
            'student_nombre',
            'student_matricula',
            'semester_numero',
            'evidencia_titulo',
            'created_at',
            'updated_at'
        ]


class ResearchStayCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResearchStay
        fields = [
            'id',
            'student',
            'semester',
            'institucion_receptora',
            'pais',
            'fecha_inicio',
            'fecha_fin',
            'responsable_estancia',
            'objetivos',
            'resultados',
            'evidencia'
        ]
        extra_kwargs = {
            'semester': {'required': False, 'allow_null': True},
            'objetivos': {'required': False, 'allow_blank': True},
            'resultados': {'required': False, 'allow_blank': True},
            'evidencia': {'required': False, 'allow_null': True}
        }

    def validate(self, attrs):
        student = attrs.get('student')
        semester = attrs.get('semester')
        if student and semester and semester.student_id != student.id:
            raise serializers.ValidationError({
                'semester': "El semestre seleccionado no pertenece al estudiante asignado."
            })
        fecha_inicio = attrs.get('fecha_inicio')
        fecha_fin = attrs.get('fecha_fin')
        if fecha_inicio and fecha_fin and fecha_fin < fecha_inicio:
            raise serializers.ValidationError({
                'fecha_fin': "La fecha de fin no puede ser anterior a la fecha de inicio."
            })
        return attrs


class OtherProductSerializer(serializers.ModelSerializer):
    student_nombre = serializers.CharField(source='student.nombre_completo', read_only=True)
    student_matricula = serializers.CharField(source='student.matricula', read_only=True)
    semester_numero = serializers.IntegerField(source='semester.numero', read_only=True)
    tipo_producto_display = serializers.CharField(source='get_tipo_producto_display', read_only=True)
    evidencia_titulo = serializers.CharField(source='evidencia.titulo', read_only=True)

    class Meta:
        model = OtherProduct
        fields = [
            'id',
            'student',
            'student_nombre',
            'student_matricula',
            'semester',
            'semester_numero',
            'tipo_producto',
            'tipo_producto_display',
            'titulo',
            'descripcion',
            'fecha_registro',
            'evidencia',
            'evidencia_titulo',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id',
            'student_nombre',
            'student_matricula',
            'semester_numero',
            'tipo_producto_display',
            'evidencia_titulo',
            'created_at',
            'updated_at'
        ]


class OtherProductCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = OtherProduct
        fields = [
            'id',
            'student',
            'semester',
            'tipo_producto',
            'titulo',
            'descripcion',
            'fecha_registro',
            'evidencia'
        ]
        extra_kwargs = {
            'semester': {'required': False, 'allow_null': True},
            'fecha_registro': {'required': False},
            'evidencia': {'required': False, 'allow_null': True}
        }

    def validate(self, attrs):
        student = attrs.get('student')
        semester = attrs.get('semester')
        if student and semester and semester.student_id != student.id:
            raise serializers.ValidationError({
                'semester': "El semestre seleccionado no pertenece al estudiante asignado."
            })
        return attrs


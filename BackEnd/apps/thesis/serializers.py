from rest_framework import serializers
from .models import ThesisProgress, default_thesis_components
from apps.students.models import Student, Semester


class ThesisProgressSerializer(serializers.ModelSerializer):
    student_nombre = serializers.CharField(source='student.nombre_completo', read_only=True)
    student_matricula = serializers.CharField(source='student.matricula', read_only=True)
    semester_numero = serializers.IntegerField(source='semester.numero', read_only=True)
    registrado_por_nombre = serializers.CharField(source='registrado_por.get_full_name', read_only=True)

    class Meta:
        model = ThesisProgress
        fields = [
            'id',
            'student',
            'student_nombre',
            'student_matricula',
            'semester',
            'semester_numero',
            'porcentaje_avance',
            'componentes_json',
            'observaciones',
            'registrado_por',
            'registrado_por_nombre',
            'fecha_registro',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id',
            'student_nombre',
            'student_matricula',
            'semester_numero',
            'registrado_por_nombre',
            'created_at',
            'updated_at'
        ]


class ThesisProgressCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ThesisProgress
        fields = [
            'id',
            'student',
            'semester',
            'porcentaje_avance',
            'componentes_json',
            'observaciones',
            'registrado_por',
            'fecha_registro'
        ]
        extra_kwargs = {
            'observaciones': {'required': False, 'allow_blank': True},
            'fecha_registro': {'required': False},
            'componentes_json': {'required': False},
            'registrado_por': {'required': False},
            'semester': {'required': False}
        }


    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        student_val = data.get('student')
        sem_val = data.get('semester')
        
        if student_val:
            try:
                st = Student.objects.filter(pk=student_val).first() if not isinstance(student_val, Student) else student_val
                if st:
                    if sem_val is not None:
                        # 1. Direct valid Semester PK belonging to student
                        sem_obj = Semester.objects.filter(pk=sem_val).first()
                        if sem_obj and sem_obj.student_id == st.id:
                            data['semester'] = sem_obj.pk
                        else:
                            # 2. Maybe sem_val is the semester numero (1..6)
                            match_num = st.semesters.filter(numero=sem_val).first()
                            if match_num:
                                data['semester'] = match_num.pk
                            else:
                                active = st.semesters.filter(is_active=True).first() or st.semesters.first()
                                if active:
                                    data['semester'] = active.pk
                    else:
                        active = st.semesters.filter(is_active=True).first() or st.semesters.first()
                        if active:
                            data['semester'] = active.pk
            except Exception:
                pass
        return super().to_internal_value(data)

    def validate_porcentaje_avance(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError("El porcentaje de avance debe estar entre 0 y 100.")
        return value

    def validate_componentes_json(self, value):
        if value is None:
            return default_thesis_components()
        if not isinstance(value, dict):
            raise serializers.ValidationError("El desglose de componentes debe ser un objeto JSON.")
        
        valid_keys = {'protocolo', 'estadoArte', 'marcoTeorico', 'metodologia', 'analisis', 'redaccion'}
        for key, val in value.items():
            if key in valid_keys:
                if not isinstance(val, (int, float)) or val < 0 or val > 100:
                    raise serializers.ValidationError(f"El componente '{key}' debe ser un valor numérico entre 0 y 100.")
        return value

    def validate(self, attrs):
        student = attrs.get('student')
        semester = attrs.get('semester')
        if student:
            if semester:
                if semester.student_id != student.id:
                    matched = student.semesters.filter(numero=semester.numero).first()
                    if not matched:
                        matched = student.semesters.filter(is_active=True).first() or student.semesters.first()
                    
                    if matched:
                        attrs['semester'] = matched
                    else:
                        raise serializers.ValidationError({
                            'semester': "El semestre seleccionado no pertenece al estudiante asignado."
                        })
            else:
                active_sem = student.semesters.filter(is_active=True).first() or student.semesters.first()
                if active_sem:
                    attrs['semester'] = active_sem
                else:
                    raise serializers.ValidationError({
                        'semester': "El estudiante no tiene semestres registrados."
                    })
        return attrs

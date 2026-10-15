from django.db.models import Prefetch

from ..models import Semester, Student, ThesisProgress


class ThesisHistoryService:
    """Servicio para calcular y construir el histórico de avances de tesis por semestre."""

    def __init__(self, student):
        self.student_id = student.pk if isinstance(student, Student) else student

    @staticmethod
    def _actor_name(user):
        if not user:
            return ''
        full_name = f'{user.first_name} {user.last_name}'.strip()
        return full_name or user.email

    def build_history(self):
        """
        Devuelve la lista de avances de tesis ordenada cronológicamente por semestre,
        con deltas de avance y detección de estancamiento.
        """
        progresses = ThesisProgress.objects.filter(
            student_id=self.student_id
        ).select_related('semester', 'registrado_por').order_by('semester__numero', 'created_at')

        historico = []
        prev_percentage = 0

        for progress in progresses:
            current_percentage = progress.porcentaje_avance
            delta_porcentaje = current_percentage - prev_percentage
            estancamiento_detectado = (delta_porcentaje == 0)

            historico.append({
                'id': progress.id,
                'semestre_numero': progress.semester.numero,
                'fecha': progress.fecha_registro.isoformat() if hasattr(progress.fecha_registro, 'isoformat') else str(progress.fecha_registro),
                'porcentaje_avance': current_percentage,
                'delta_porcentaje': delta_porcentaje,
                'estancamiento_detectado': estancamiento_detectado,
                'componentes_json': progress.componentes_json,
                'observaciones': progress.observaciones,
                'registrado_por_nombre': self._actor_name(progress.registrado_por),
            })

            prev_percentage = current_percentage

        return {
            'student_id': self.student_id,
            'matricula': Student.objects.get(pk=self.student_id).matricula,
            'total_registros': len(historico),
            'historico': historico,
        }
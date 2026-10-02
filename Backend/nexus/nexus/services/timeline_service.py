from django.db.models import Prefetch

from ..models import Agreement, Evidence, Semester, Student, ThesisProgress, TutoringSession


class TimelineService:
    def __init__(self, student):
        self.student_id = student.pk if isinstance(student, Student) else student

    @staticmethod
    def _actor(user):
        if not user:
            return ''
        full_name = f'{user.first_name} {user.last_name}'.strip()
        return full_name or user.email

    def build(self):
        semesters = Semester.objects.filter(student_id=self.student_id).prefetch_related(
            Prefetch('tutoring_sessions', queryset=TutoringSession.objects.select_related('created_by')),
            Prefetch(
                'tutoring_sessions__agreements',
                queryset=Agreement.objects.select_related('responsable'),
                to_attr='timeline_agreements',
            ),
            Prefetch('thesis_progresses', queryset=ThesisProgress.objects.select_related('registrado_por')),
            Prefetch('evidences', queryset=Evidence.objects.select_related('created_by')),
        ).order_by('numero')

        semestres = []
        # La numeración de sesiones corre a lo largo de toda la trayectoria: numerarlas
        # por semestre repetiría «Sesión 1» en cada uno y la lista dejaría de leerse.
        inicio = 0
        for semester in semesters:
            eventos = self._events(semester, inicio)
            inicio += len(semester.tutoring_sessions.all())
            semestres.append({
                'id': semester.id,
                'numero': semester.numero,
                'activo': semester.is_active,
                'eventos': eventos,
            })
        return semestres

    def _events(self, semester, numeracion_inicial=0):
        events = []
        sessions = list(semester.tutoring_sessions.all())
        for index, session in enumerate(sorted(sessions, key=lambda item: (item.fecha_sesion, item.id)), numeracion_inicial + 1):
            events.append({
                'id': f'tutoria-{session.id}',
                'tipo': 'TUTORIA',
                'fecha': session.fecha_sesion.isoformat(),
                'titulo': f'Sesión de tutoría {index} ({session.get_modalidad_display()})',
                'descripcion': session.resumen,
                'actor': self._actor(session.created_by),
                'metadata': {
                    'modalidad': session.modalidad,
                    'proxima_reunion': session.proxima_reunion_fecha.isoformat() if session.proxima_reunion_fecha else None,
                },
            })
            for agreement in session.timeline_agreements:
                effective_status = Agreement.Status.OVERDUE if agreement.is_vencido else agreement.estado
                events.append({
                    'id': f'acuerdo-{agreement.id}',
                    'tipo': 'ACUERDO',
                    'fecha': session.fecha_sesion.isoformat(),
                    'titulo': f'Acuerdo: {agreement.descripcion[:80]}',
                    'descripcion': agreement.descripcion,
                    'actor': self._actor(agreement.responsable),
                    'estado': agreement.estado,
                    'estado_efectivo': effective_status,
                    'fecha_limite': agreement.fecha_limite.isoformat(),
                    'metadata': {'fecha_limite': agreement.fecha_limite.isoformat()},
                })

        for progress in semester.thesis_progresses.all():
            events.append({
                'id': f'tesis-{progress.id}',
                'tipo': 'TESIS',
                'fecha': progress.fecha_registro.isoformat(),
                'titulo': f'Avance de tesis: {progress.porcentaje_avance}%',
                'descripcion': progress.observaciones,
                'actor': self._actor(progress.registrado_por),
                'porcentaje': progress.porcentaje_avance,
                'metadata': {'porcentaje': progress.porcentaje_avance},
            })

        for evidence in semester.evidences.all():
            event = {
                'id': f'evidencia-{evidence.id}',
                'tipo': 'EVIDENCIA',
                'fecha': evidence.fecha_carga.isoformat(),
                'titulo': evidence.titulo,
                'descripcion': evidence.descripcion,
                'actor': self._actor(evidence.created_by),
                'metadata': {'tipo_evidencia': evidence.tipo},
            }
            if evidence.archivo_adjunto:
                event['archivo_url'] = evidence.archivo_adjunto.url
            elif evidence.enlace_url:
                event['enlace_url'] = evidence.enlace_url
            events.append(event)

        # Varios eventos comparten fecha (los acuerdos heredan la de su sesión), así que
        # `orden` fija la secuencia real dentro del día y el orden deja de depender del id.
        for position, event in enumerate(events):
            event['orden'] = position

        return sorted(events, key=lambda event: (event['fecha'], event['orden']))

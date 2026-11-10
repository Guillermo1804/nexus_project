from django.utils import timezone

from ..models import (
    AcademicEvent,
    Agreement,
    CommitteeMembership,
    Evidence,
    OtherProduct,
    Publication,
    ResearchStay,
    Student,
    ThesisProgress,
    TutoringSession,
)
from ..permissions import can_access_student
from ..serializers import (
    AcademicEventSerializer,
    AgreementSerializer,
    EvidenceSerializer,
    OtherProductSerializer,
    PublicationSerializer,
    ResearchStaySerializer,
    ThesisProgressSerializer,
    TutoringSessionSerializer,
)


class DossierReportEngine:
    """Build the complete, authorization-scoped student trajectory report."""

    @staticmethod
    def _name(user):
        if user is None:
            return ''
        return f'{user.first_name} {user.last_name}'.strip() or user.email

    @classmethod
    def _student_queryset(cls):
        return Student.objects.select_related('user').prefetch_related(
            'semesters',
            'academic_committee__memberships__user',
            'tutoring_sessions__participants__user',
            'tutoring_sessions__observations__autor',
            'tutoring_sessions__agreements__responsable',
            'agreements__responsable',
            'thesis_progresses__registrado_por',
            'publication_set__evidencia',
            'academicevent_set__evidencia',
            'researchstay_set__evidencia',
            'otherproduct_set__evidencia',
            'evidences',
        )

    @classmethod
    def build(cls, user, student_id, request=None):
        if not can_access_student(user, student_id):
            return None
        student = cls._student_queryset().filter(pk=student_id).first()
        if student is None:
            return None

        context = {'request': request}
        semesters = list(student.semesters.all())
        tutoring = list(student.tutoring_sessions.all())
        agreements = list(student.agreements.all())
        thesis = list(student.thesis_progresses.all())
        publications = list(student.publication_set.all())
        events = list(student.academicevent_set.all())
        stays = list(student.researchstay_set.all())
        other_products = list(student.otherproduct_set.all())
        evidences = list(student.evidences.all())
        memberships = list(
            student.academic_committee.memberships.all()
        ) if hasattr(student, 'academic_committee') else []
        advisor = next(
            (membership.user for membership in memberships if membership.role == CommitteeMembership.Role.ADVISOR),
            None,
        )
        coadvisor = next(
            (membership.user for membership in memberships if membership.role == CommitteeMembership.Role.CO_ADVISOR),
            None,
        )
        current_semester = max(semesters, key=lambda semester: semester.numero, default=None)
        today = timezone.localdate()
        overdue = [
            agreement for agreement in agreements
            if agreement.estado != Agreement.Status.COMPLETED
            and agreement.fecha_limite < today
        ]
        latest_thesis = max(
            thesis,
            key=lambda progress: (progress.fecha_registro, progress.id),
            default=None,
        )

        return {
            'generado_el': timezone.now(),
            'generado_por': cls._name(user),
            'estudiante': {
                'id': student.id,
                'matricula': student.matricula,
                'nombre_completo': student.nombre_completo,
                'programa_doctoral': student.programa_doctoral,
                'cohorte': student.cohorte,
                'fecha_ingreso': student.fecha_ingreso,
                'estatus_activo': student.estatus_activo,
            },
            'comite': {
                'asesor': cls._name(advisor),
                'coasesor': cls._name(coadvisor),
                'miembros': [
                    {
                        'nombre': cls._name(membership.user),
                        'rol': membership.get_role_display(),
                    }
                    for membership in memberships
                    if membership.user_id not in {getattr(advisor, 'id', None), getattr(coadvisor, 'id', None)}
                ],
            },
            'resumen_ejecutivo': {
                'semestre_actual': current_semester.numero if current_semester else None,
                'porcentaje_tesis_actual': latest_thesis.porcentaje_avance if latest_thesis else 0,
                'total_tutorias': len(tutoring),
                'total_acuerdos': len(agreements),
                'acuerdos_concluidos': sum(
                    agreement.estado == Agreement.Status.COMPLETED for agreement in agreements
                ),
                'acuerdos_pendientes': sum(
                    agreement.estado in {Agreement.Status.PENDING, Agreement.Status.IN_PROGRESS}
                    and agreement not in overdue
                    for agreement in agreements
                ),
                'acuerdos_vencidos': len(overdue),
                'publicaciones_count': len(publications),
                'congresos_count': sum(event.tipo_evento == 'CONGRESO' for event in events),
                'estancias_count': len(stays),
            },
            'secciones_detalladas': {
                'semestres': [
                    {
                        'id': semester.id,
                        'numero': semester.numero,
                        'fecha_inicio': semester.fecha_inicio,
                        'fecha_fin': semester.fecha_fin,
                        'is_active': semester.is_active,
                    }
                    for semester in sorted(semesters, key=lambda item: item.numero)
                ],
                'tutorias': TutoringSessionSerializer(tutoring, many=True, context=context).data,
                'acuerdos': AgreementSerializer(agreements, many=True, context=context).data,
                'tesis_historico': ThesisProgressSerializer(thesis, many=True, context=context).data,
                'publicaciones': PublicationSerializer(publications, many=True, context=context).data,
                'eventos': AcademicEventSerializer(events, many=True, context=context).data,
                'estancias': ResearchStaySerializer(stays, many=True, context=context).data,
                'otros_productos': OtherProductSerializer(other_products, many=True, context=context).data,
                'evidencias': EvidenceSerializer(evidences, many=True, context=context).data,
            },
        }

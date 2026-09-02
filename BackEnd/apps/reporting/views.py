from django.http import HttpResponse
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.exceptions import PermissionDenied, NotFound
from rest_framework.negotiation import DefaultContentNegotiation

from apps.students.models import Student
from apps.agreements.models import Agreement
from apps.identity.permissions import IsAssignedAdvisorOrStudent
from apps.reporting.serializers import FullDossierSerializer
from apps.reporting.excel_export import generate_student_excel_dossier, generate_cohort_summary_excel
from apps.reporting.pdf_export import generate_student_pdf_dossier


class ExportContentNegotiation(DefaultContentNegotiation):
    """
    Negociador de contenido que no filtra renderers por el query param 'format',
    permitiendo que las vistas de exportación manejen formatos binarios (xlsx, pdf).
    """
    def filter_renderers(self, renderers, format):
        return renderers


class StudentFullDossierView(APIView):
    """
    GET /api/v1/reporting/students/{id}/full-dossier/
    
    Cédula Oficial Consolidada (Full Dossier) del expediente doctoral completo (HU-27).
    Retorna un DTO consolidado integral optimizado con prefetch_related y select_related (<500ms).
    
    Aislamiento RBAC:
    - Coordinador / Superuser: Acceso global a cualquier doctorando.
    - Asesor: Acceso restringido a doctorandos bajo su comité tutorial activo.
    - Estudiante: Acceso exclusivo a su propio expediente.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk=None, student_id=None, *args, **kwargs):
        target_id = pk if pk is not None else student_id
        
        try:
            student = Student.objects.select_related('user').prefetch_related(
                'semesters',
                'committee_members__user',
                'tutoring_sessions__semester',
                'tutoring_sessions__created_by',
                'tutoring_sessions__participants__user',
                'tutoring_sessions__observations__autor',
                'agreements__responsable',
                'agreements__session',
                'agreements__audit_logs__user',
                'thesis_progresses__semester',
                'publications__semester',
                'publications__evidencia',
                'academic_events__semester',
                'academic_events__evidencia',
                'research_stays__evidencia',
                'other_products__evidencia',
                'evidences__semester',
                'evidences__created_by',
            ).get(pk=target_id)
        except Student.DoesNotExist:
            raise NotFound(detail=f"Estudiante con ID {target_id} no encontrado.")

        # RBAC Check
        user = request.user
        role = getattr(user, 'role', None)

        if not (user.is_superuser or role == 'COORDINADOR'):
            if role == 'ESTUDIANTE':
                if student.user != user:
                    raise PermissionDenied("No tiene autorización para consultar el expediente de otro estudiante.")
            elif role == 'ASESOR':
                is_member = student.committee_members.filter(user=user, is_active=True).exists()
                if not is_member:
                    raise PermissionDenied("No tiene autorización para consultar el expediente de un estudiante fuera de su comité tutorial.")
            else:
                raise PermissionDenied("Rol de usuario sin permisos para acceder a esta información.")

        # 1. Auto-actualización de acuerdos vencidos para el estudiante
        today = timezone.now().date()
        Agreement.objects.filter(
            student=student,
            fecha_limite__lt=today
        ).exclude(
            estado__in=[Agreement.STATUS_CONCLUIDO, Agreement.STATUS_VENCIDO]
        ).update(
            estado=Agreement.STATUS_VENCIDO,
            updated_at=timezone.now()
        )

        # 2. Recolección de datos relacionados
        committee = list(student.committee_members.filter(is_active=True).order_by('rol_comite', 'user__last_name'))
        semesters = list(student.semesters.all().order_by('numero'))
        tutoring_sessions = list(student.tutoring_sessions.all().order_by('-fecha_sesion', '-id'))
        agreements = list(student.agreements.all().order_by('-fecha_limite', '-created_at'))
        thesis_progress = list(student.thesis_progresses.all().order_by('-fecha_registro', '-created_at'))
        publications = list(student.publications.all().order_by('-fecha_publicacion', '-created_at'))
        academic_events = list(student.academic_events.all().order_by('-fecha_presentacion', '-created_at'))
        research_stays = list(student.research_stays.all().order_by('-fecha_inicio', '-created_at'))
        other_products = list(student.other_products.all().order_by('-fecha_registro', '-created_at'))
        evidences = list(student.evidences.all().order_by('-fecha_carga', '-created_at'))

        # 3. Cálculo de KPIs
        total_tutorias = len(tutoring_sessions)
        total_acuerdos = len(agreements)
        acuerdos_concluidos = sum(1 for a in agreements if a.estado == Agreement.STATUS_CONCLUIDO)
        acuerdos_pendientes = sum(1 for a in agreements if a.estado == Agreement.STATUS_PENDIENTE)
        acuerdos_en_proceso = sum(1 for a in agreements if a.estado == Agreement.STATUS_EN_PROCESO)
        acuerdos_vencidos = sum(1 for a in agreements if a.estado == Agreement.STATUS_VENCIDO or (a.fecha_limite and a.fecha_limite < today and a.estado != Agreement.STATUS_CONCLUIDO))

        tasa_cumplimiento = (
            round((acuerdos_concluidos / total_acuerdos * 100), 1)
            if total_acuerdos > 0 else 0.0
        )

        latest_thesis = thesis_progress[0] if thesis_progress else None
        ultimo_porcentaje_tesis = latest_thesis.porcentaje_avance if latest_thesis else None
        ultima_actualizacion_tesis = latest_thesis.fecha_registro if latest_thesis else None

        kpis = {
            'total_tutorias': total_tutorias,
            'total_acuerdos': total_acuerdos,
            'acuerdos_concluidos': acuerdos_concluidos,
            'acuerdos_pendientes': acuerdos_pendientes,
            'acuerdos_en_proceso': acuerdos_en_proceso,
            'acuerdos_vencidos': acuerdos_vencidos,
            'tasa_cumplimiento_acuerdos': tasa_cumplimiento,
            'ultimo_porcentaje_tesis': ultimo_porcentaje_tesis,
            'ultima_actualizacion_tesis': ultima_actualizacion_tesis,
            'total_publicaciones': len(publications),
            'total_eventos_academicos': len(academic_events),
            'total_estancias_investigacion': len(research_stays),
            'total_otros_productos': len(other_products),
            'total_evidencias': len(evidences),
        }

        dossier_data = {
            'student': student,
            'committee': committee,
            'semesters': semesters,
            'tutoring_sessions': tutoring_sessions,
            'agreements': agreements,
            'thesis_progress': thesis_progress,
            'publications': publications,
            'academic_events': academic_events,
            'research_stays': research_stays,
            'other_products': other_products,
            'evidences': evidences,
            'kpis': kpis,
            'generated_at': timezone.now(),
            'generated_by': user,
        }

        serializer = FullDossierSerializer(dossier_data, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class StudentExportView(APIView):
    """
    Endpoint para la exportación del expediente integral del estudiante (HU-28).
    Soporta formato Excel multi-hoja (.xlsx) y Cédula Oficial PDF (.pdf).

    GET /api/v1/reporting/students/{id}/export/?format={xlsx|pdf}
    """
    permission_classes = [permissions.IsAuthenticated]
    content_negotiation_class = ExportContentNegotiation

    def get(self, request, pk=None, student_id=None, *args, **kwargs):
        target_id = pk if pk is not None else student_id
        try:
            student = Student.objects.select_related('user').get(pk=target_id)
        except Student.DoesNotExist:
            raise NotFound(detail=f"Estudiante con ID {target_id} no encontrado.")

        # RBAC Check
        user = request.user
        role = getattr(user, 'role', None)

        if not (user.is_superuser or role == 'COORDINADOR'):
            if role == 'ESTUDIANTE':
                if student.user != user:
                    raise PermissionDenied("No tiene autorización para exportar el expediente de otro estudiante.")
            elif role == 'ASESOR':
                is_member = student.committee_members.filter(user=user, is_active=True).exists()
                if not is_member:
                    raise PermissionDenied("No tiene autorización para exportar el expediente de un estudiante fuera de su comité tutorial.")
            else:
                raise PermissionDenied("Rol de usuario sin permisos para acceder a esta exportación.")

        export_format = request.query_params.get('format', 'xlsx').lower()

        if export_format == 'xlsx':
            excel_bytes = generate_student_excel_dossier(student)
            filename = f"Expediente_{student.matricula}.xlsx"
            response = HttpResponse(
                excel_bytes,
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            response['Access-Control-Expose-Headers'] = 'Content-Disposition'
            return response

        elif export_format == 'pdf':
            pdf_bytes = generate_student_pdf_dossier(student)
            filename = f"Expediente_{student.matricula}.pdf"
            response = HttpResponse(
                pdf_bytes,
                content_type='application/pdf'
            )
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            response['Access-Control-Expose-Headers'] = 'Content-Disposition'
            return response

        else:
            return Response(
                {
                    "format": ["Formato de exportación no soportado. Valores válidos: 'xlsx', 'pdf'."]
                },
                status=status.HTTP_400_BAD_REQUEST
            )


class GlobalStudentsExportView(APIView):
    """
    Endpoint para la exportación global del resumen de cohorte / listado de estudiantes (HU-28).

    GET /api/v1/reporting/export-students/?format={xlsx|pdf}
    """
    permission_classes = [permissions.IsAuthenticated]
    content_negotiation_class = ExportContentNegotiation

    def get(self, request, *args, **kwargs):
        user = request.user
        role = getattr(user, 'role', None)

        if user.is_superuser or role == 'COORDINADOR':
            students_qs = Student.objects.all().order_by('matricula')
        elif role == 'ASESOR':
            students_qs = Student.objects.filter(
                committee_members__user=user,
                committee_members__is_active=True
            ).distinct().order_by('matricula')
        elif role == 'ESTUDIANTE':
            students_qs = Student.objects.filter(user=user).order_by('matricula')
        else:
            students_qs = Student.objects.none()

        export_format = request.query_params.get('format', 'xlsx').lower()

        if export_format == 'xlsx':
            excel_bytes = generate_cohort_summary_excel(students_qs)
            timestamp = timezone.now().strftime('%Y%m%d_%H%M')
            filename = f"Listado_Estudiantes_{timestamp}.xlsx"
            response = HttpResponse(
                excel_bytes,
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            response['Access-Control-Expose-Headers'] = 'Content-Disposition'
            return response
        else:
            return Response(
                {
                    "format": ["Formato de exportación global soportado actualmente: 'xlsx'."]
                },
                status=status.HTTP_400_BAD_REQUEST
            )

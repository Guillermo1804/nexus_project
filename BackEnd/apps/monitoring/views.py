from datetime import timedelta
from django.utils import timezone
from django.db.models import Q
from django.apps import apps
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.exceptions import PermissionDenied, NotFound

from apps.students.models import Student
from apps.tutoring.models import TutoringSession
from apps.agreements.models import Agreement


class CoordinatorDashboardView(APIView):
    """
    GET /api/v1/monitoring/coordinator-dashboard/
    
    Endpoint analítico de alto rendimiento para Coordinadores y Asesores.
    Calcula mediante agregaciones ORM optimizadas (sin N+1):
    - KPIs institucionales (estudiantes activos, tutorías, acuerdos, tasa de cumplimiento, promedio de tesis).
    - Semáforo de riesgo (Atención Crítica, Preventiva, Al Día).
    - Tabla priorizada de atención a estudiantes ordenada por criticidad.
    - Distribución y avance promedio por cohorte.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        role = getattr(user, 'role', None)

        # RBAC: Acceso reservado a Coordinador, Asesor o Superusuario
        if not (user.is_superuser or role in ['COORDINADOR', 'ADMIN', 'ASESOR']):
            raise PermissionDenied("Acceso denegado: El dashboard institucional está reservado para la coordinación académica.")

        today = timezone.now().date()
        period_filter = request.query_params.get('period') or request.query_params.get('ciclo')

        # 1. Actualización en lote de acuerdos vencidos en la BD
        Agreement.objects.filter(
            fecha_limite__lt=today
        ).exclude(
            estado__in=[Agreement.STATUS_CONCLUIDO, Agreement.STATUS_VENCIDO]
        ).update(
            estado=Agreement.STATUS_VENCIDO,
            updated_at=timezone.now()
        )

        # 2. Querysets optimizados (filtrados opcionalmente por cohorte/ciclo)
        students_qs = Student.objects.filter(estatus_activo=True)
        if period_filter and period_filter != 'TODOS':
            # Si el filtro coincide con una cohorte (ej. 2026-A, 2025-B, etc.), filtramos por cohorte o semestres vigentes
            students_qs = students_qs.filter(
                Q(cohorte=period_filter) | Q(cohorte__iexact=period_filter)
            )

        students_qs = students_qs.prefetch_related(
            'committee_members__user',
            'tutoring_sessions',
            'agreements',
            'thesis_progresses'
        ).order_by('matricula')

        total_estudiantes_activos = students_qs.count()

        # KPIs globales de acuerdos
        all_agreements = Agreement.objects.filter(student__estatus_activo=True)
        total_acuerdos = all_agreements.count()
        total_acuerdos_activos = all_agreements.filter(
            estado__in=[Agreement.STATUS_PENDIENTE, Agreement.STATUS_EN_PROCESO]
        ).count()
        total_acuerdos_vencidos = all_agreements.filter(estado=Agreement.STATUS_VENCIDO).count()
        total_acuerdos_concluidos = all_agreements.filter(estado=Agreement.STATUS_CONCLUIDO).count()
        tasa_cumplimiento = (
            round((total_acuerdos_concluidos / total_acuerdos * 100), 1)
            if total_acuerdos > 0 else 0.0
        )

        total_tutorias_periodo = TutoringSession.objects.filter(student__estatus_activo=True).count()

        # Evaluación detallada por estudiante
        evaluated_students = []
        critica_count = 0
        preventiva_count = 0
        al_dia_count = 0
        cohort_map = {}
        all_thesis_progress_values = []

        for st in students_qs:
            # A) Tutorías
            sessions = sorted(st.tutoring_sessions.all(), key=lambda s: s.fecha_sesion, reverse=True)
            latest_session = sessions[0] if sessions else None
            dias_sin_tutoria = (today - latest_session.fecha_sesion).days if latest_session else None
            no_tutoria_gt_60 = (dias_sin_tutoria is None) or (dias_sin_tutoria > 60)
            no_tutoria_gt_45 = (dias_sin_tutoria is not None) and (dias_sin_tutoria > 45)

            # B) Acuerdos
            st_agreements = list(st.agreements.all())
            vencidos_count = 0
            has_overdue_gt_15 = False
            has_due_soon_lte_5 = False

            for ag in st_agreements:
                if ag.estado == Agreement.STATUS_VENCIDO or (ag.fecha_limite < today and ag.estado != Agreement.STATUS_CONCLUIDO):
                    vencidos_count += 1
                    if (today - ag.fecha_limite).days > 15:
                        has_overdue_gt_15 = True
                elif ag.estado != Agreement.STATUS_CONCLUIDO:
                    dias_restantes = (ag.fecha_limite - today).days
                    if 0 <= dias_restantes <= 5:
                        has_due_soon_lte_5 = True

            # C) Tesis
            thesis_list = sorted(
                st.thesis_progresses.all(),
                key=lambda p: (p.fecha_registro, p.created_at),
                reverse=True
            )
            avance_tesis = thesis_list[0].porcentaje_avance if thesis_list else 0
            all_thesis_progress_values.append(avance_tesis)

            # D) Asesor Principal
            advisor_name = "Sin asignar"
            for cm in st.committee_members.all():
                if cm.is_active and cm.rol_comite == 'ASESOR_PRINCIPAL':
                    advisor_name = cm.user.get_full_name() if (hasattr(cm.user, 'get_full_name') and cm.user.get_full_name()) else getattr(cm.user, 'email', str(cm.user))
                    break
            if advisor_name == "Sin asignar":
                for cm in st.committee_members.all():
                    if cm.is_active:
                        advisor_name = cm.user.get_full_name() if (hasattr(cm.user, 'get_full_name') and cm.user.get_full_name()) else getattr(cm.user, 'email', str(cm.user))
                        break

            # E) Nivel de Riesgo
            if has_overdue_gt_15 or no_tutoria_gt_60:
                nivel_riesgo = "CRITICO"
                badge_color = "#A14D98"
                badge_bg = "#F8F1FF"
                critica_count += 1
                risk_order = 0
            elif has_due_soon_lte_5 or no_tutoria_gt_45 or vencidos_count > 0:
                nivel_riesgo = "PREVENTIVO"
                badge_color = "#B57136"
                badge_bg = "#FEF8F3"
                preventiva_count += 1
                risk_order = 1
            else:
                nivel_riesgo = "AL_DIA"
                badge_color = "#437E5C"
                badge_bg = "#E9FEF1"
                al_dia_count += 1
                risk_order = 2

            # Cohorte tracking
            cohorte = st.cohorte or "Sin Cohorte"
            if cohorte not in cohort_map:
                cohort_map[cohorte] = []
            cohort_map[cohorte].append(avance_tesis)

            dias_sort_value = dias_sin_tutoria if dias_sin_tutoria is not None else 9999
            dias_display = f"{dias_sin_tutoria} días" if dias_sin_tutoria is not None else "Sin sesiones"

            evaluated_students.append({
                "id": st.id,
                "matricula": st.matricula,
                "nombre": st.nombre_completo,
                "cohorte": st.cohorte,
                "asesor_principal": advisor_name,
                "dias_sin_tutoria": dias_sin_tutoria,
                "dias_sin_tutoria_display": dias_display,
                "acuerdos_vencidos": vencidos_count,
                "avance_tesis": avance_tesis,
                "nivel_riesgo": nivel_riesgo,
                "badge_color": badge_color,
                "badge_bg": badge_bg,
                "_risk_order": risk_order,
                "_dias_sort": dias_sort_value
            })

        # Ordenar tabla priorizada: Riesgo (CRITICO -> PREVENTIVO -> AL_DIA), luego días sin tutoría desc, luego acuerdos vencidos desc
        evaluated_students.sort(
            key=lambda x: (x["_risk_order"], -x["_dias_sort"], -x["acuerdos_vencidos"], x["matricula"])
        )

        # Limpiar llaves privadas de ordenamiento
        for item in evaluated_students:
            del item["_risk_order"]
            del item["_dias_sort"]

        # Promedio global de tesis
        promedio_avance_tesis = (
            round(sum(all_thesis_progress_values) / len(all_thesis_progress_values), 1)
            if all_thesis_progress_values else 0.0
        )

        # Distribución por cohorte
        distribucion_cohorte = []
        for cohorte_name in sorted(cohort_map.keys()):
            avances = cohort_map[cohorte_name]
            prom_cohorte = round(sum(avances) / len(avances), 1) if avances else 0.0
            distribucion_cohorte.append({
                "cohorte": cohorte_name,
                "promedio_avance": prom_cohorte,
                "total_estudiantes": len(avances)
            })

        return Response({
            "kpis": {
                "total_estudiantes_activos": total_estudiantes_activos,
                "total_tutorias_periodo": total_tutorias_periodo,
                "total_acuerdos_activos": total_acuerdos_activos,
                "total_acuerdos_vencidos": total_acuerdos_vencidos,
                "tasa_cumplimiento_acuerdos": tasa_cumplimiento,
                "promedio_avance_tesis": promedio_avance_tesis,
            },
            "semaforo_riesgo": {
                "atencion_critica": critica_count,
                "atencion_preventiva": preventiva_count,
                "alumnos_al_dia": al_dia_count,
                "total_evaluados": len(evaluated_students),
            },
            "tabla_priorizada": evaluated_students,
            "distribucion_cohorte": distribucion_cohorte,
        }, status=status.HTTP_200_OK)


class AlertsView(APIView):
    """
    GET /api/v1/monitoring/alerts/
    
    Identifica reactivamente:
    1. Acuerdos con estado VENCIDO o fecha_limite < hoy (no concluidos).
    2. Acuerdos por vencer (fecha_limite <= today + 5 días y estado != 'CONCLUIDO').
    3. Alumnos con seguimiento incompleto (> 60 días sin tutoría registrada o sin ninguna tutoría).
    
    Respeta el RBAC aislando por estudiante, asesor (comité asignado) o coordinador/admin.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        today = timezone.now().date()
        
        # 1. Update overdue agreements status in DB
        Agreement.objects.filter(
            fecha_limite__lt=today
        ).exclude(
            estado__in=[Agreement.STATUS_CONCLUIDO, Agreement.STATUS_VENCIDO]
        ).update(
            estado=Agreement.STATUS_VENCIDO,
            updated_at=timezone.now()
        )
        
        # Base QuerySets depending on User Role
        student_param = request.query_params.get('student')
        
        # Scope students
        if user.is_superuser or getattr(user, 'role', None) in ['COORDINADOR', 'ADMIN']:
            students_qs = Student.objects.filter(estatus_activo=True)
            agreements_qs = Agreement.objects.select_related('student', 'responsable')
        elif getattr(user, 'role', None) == 'ASESOR':
            students_qs = Student.objects.filter(
                estatus_activo=True,
                committee_members__user=user,
                committee_members__is_active=True
            ).distinct()
            agreements_qs = Agreement.objects.filter(
                Q(student__committee_members__user=user, student__committee_members__is_active=True) |
                Q(responsable=user) |
                Q(created_by=user)
            ).select_related('student', 'responsable').distinct()
        elif getattr(user, 'role', None) == 'ESTUDIANTE':
            students_qs = Student.objects.filter(estatus_activo=True, user=user)
            agreements_qs = Agreement.objects.filter(
                Q(student__user=user) | Q(responsable=user)
            ).select_related('student', 'responsable').distinct()
        else:
            students_qs = Student.objects.none()
            agreements_qs = Agreement.objects.none()

        if student_param:
            students_qs = students_qs.filter(id=student_param)
            agreements_qs = agreements_qs.filter(student_id=student_param)

        alerts = []

        # A) VENCIDOS
        vencidos = agreements_qs.filter(
            Q(estado=Agreement.STATUS_VENCIDO) |
            (Q(fecha_limite__lt=today) & ~Q(estado=Agreement.STATUS_CONCLUIDO))
        ).order_by('fecha_limite')

        for ag in vencidos:
            responsable_nombre = ag.responsable.get_full_name() if hasattr(ag.responsable, 'get_full_name') and ag.responsable.get_full_name() else getattr(ag.responsable, 'email', str(ag.responsable))
            alerts.append({
                "id": f"alert-vencido-{ag.id}",
                "tipo": "VENCIDO",
                "titulo": f"Acuerdo Vencido: {ag.descripcion[:40]}",
                "mensaje": f"El acuerdo '{ag.descripcion}' asignado a {responsable_nombre} venció el {ag.fecha_limite}.",
                "severidad": "ALTA",
                "student_id": ag.student_id,
                "student_nombre": ag.student.nombre_completo,
                "fecha": str(ag.fecha_limite),
                "metadata": {
                    "agreement_id": ag.id,
                    "responsable": responsable_nombre,
                    "estado": ag.estado,
                    "fecha_limite": str(ag.fecha_limite),
                }
            })

        # B) POR VENCER (fecha_limite <= today + 5 días y fecha_limite >= today y estado != 'CONCLUIDO')
        five_days_ahead = today + timedelta(days=5)
        por_vencer = agreements_qs.filter(
            fecha_limite__gte=today,
            fecha_limite__lte=five_days_ahead
        ).exclude(
            estado=Agreement.STATUS_CONCLUIDO
        ).order_by('fecha_limite')

        for ag in por_vencer:
            dias_restantes = (ag.fecha_limite - today).days
            responsable_nombre = ag.responsable.get_full_name() if hasattr(ag.responsable, 'get_full_name') and ag.responsable.get_full_name() else getattr(ag.responsable, 'email', str(ag.responsable))
            dias_texto = "vence hoy" if dias_restantes == 0 else (f"{dias_restantes} día restante" if dias_restantes == 1 else f"{dias_restantes} días restantes")
            alerts.append({
                "id": f"alert-por-vencer-{ag.id}",
                "tipo": "POR_VENCER",
                "titulo": f"Acuerdo por Vencer: {ag.descripcion[:40]}",
                "mensaje": f"El acuerdo '{ag.descripcion}' asignado a {responsable_nombre} vencerá el {ag.fecha_limite} ({dias_texto}).",
                "severidad": "MEDIA",
                "student_id": ag.student_id,
                "student_nombre": ag.student.nombre_completo,
                "fecha": str(ag.fecha_limite),
                "metadata": {
                    "agreement_id": ag.id,
                    "responsable": responsable_nombre,
                    "dias_restantes": dias_restantes,
                    "estado": ag.estado,
                    "fecha_limite": str(ag.fecha_limite),
                }
            })

        # C) FALTA SEGUIMIENTO (> 60 días sin tutoría registrada o sin tutoría)
        for st in students_qs:
            latest_session = TutoringSession.objects.filter(student=st).order_by('-fecha_sesion').first()
            if latest_session:
                dias_sin_tutoria = (today - latest_session.fecha_sesion).days
                if dias_sin_tutoria > 60:
                    alerts.append({
                        "id": f"alert-seguimiento-{st.id}",
                        "tipo": "FALTA_SEGUIMIENTO",
                        "titulo": f"Seguimiento Incompleto: {st.nombre_completo}",
                        "mensaje": f"El estudiante {st.nombre_completo} ({st.matricula}) no registra sesiones de tutoría en los últimos {dias_sin_tutoria} días.",
                        "severidad": "ALTA" if dias_sin_tutoria > 90 else "MEDIA",
                        "student_id": st.id,
                        "student_nombre": st.nombre_completo,
                        "fecha": str(latest_session.fecha_sesion),
                        "metadata": {
                            "student_id": st.id,
                            "matricula": st.matricula,
                            "dias_sin_tutoria": dias_sin_tutoria,
                            "ultima_sesion": str(latest_session.fecha_sesion),
                        }
                    })
            else:
                alerts.append({
                    "id": f"alert-sin-tutoria-{st.id}",
                    "tipo": "FALTA_SEGUIMIENTO",
                    "titulo": f"Sin Tutorías Registradas: {st.nombre_completo}",
                    "mensaje": f"El estudiante {st.nombre_completo} ({st.matricula}) no cuenta con ninguna sesión de tutoría registrada.",
                    "severidad": "ALTA",
                    "student_id": st.id,
                    "student_nombre": st.nombre_completo,
                    "fecha": str(today),
                    "metadata": {
                        "student_id": st.id,
                        "matricula": st.matricula,
                        "dias_sin_tutoria": None,
                        "ultima_sesion": None,
                    }
                })

        return Response({
            "total_alertas": len(alerts),
            "alertas": alerts
        }, status=status.HTTP_200_OK)


class TimelineView(APIView):
    """
    GET /api/v1/monitoring/timeline/?student=<id>
    
    Recoge y unifica cronológicamente los 8 tipos de nodos:
    1. TUTORIA (📘, #6365EF)
    2. ACUERDO (📝, semáforo: PENDIENTE #57949D, EN_PROCESO #B57136, CONCLUIDO #437E5C, VENCIDO #A14D98)
    3. TESIS (📊, #2C1867)
    4. EVIDENCIA (📎, #57949D)
    5. PUBLICACION (🎓, #6365EF)
    6. CONGRESO (🏛️, #57949D)
    7. ESTANCIA (🌍, #2C1867)
    8. PRODUCTO (📦, #B57136)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        student_id = request.query_params.get('student')
        
        if not student_id:
            # If user is student, default to their student id
            if getattr(user, 'role', None) == 'ESTUDIANTE' and hasattr(user, 'student_profile'):
                student_id = user.student_profile.id
            else:
                return Response(
                    {"detail": "Parámetro 'student' es requerido."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        try:
            student = Student.objects.get(id=student_id)
        except (Student.DoesNotExist, ValueError):
            student = Student.objects.first()
            if not student:
                raise NotFound("Estudiante no encontrado.")

        # RBAC Check
        if not (user.is_superuser or getattr(user, 'role', None) in ['COORDINADOR', 'ADMIN']):
            if getattr(user, 'role', None) == 'ESTUDIANTE' and student.user != user:
                raise PermissionDenied("No tiene permisos para consultar el expediente de este estudiante.")
            elif getattr(user, 'role', None) == 'ASESOR':
                if not student.committee_members.filter(user=user, is_active=True).exists():
                    raise PermissionDenied("No es miembro del comité tutorial activo de este estudiante.")

        events = []

        # 1. TUTORIAS
        tutoring_qs = TutoringSession.objects.filter(student=student).prefetch_related(
            'participants__user', 'observations__autor', 'semester'
        ).order_by('-fecha_sesion')

        for session in tutoring_qs:
            participants_data = [
                {
                    "nombre": p.user.get_full_name() if hasattr(p.user, 'get_full_name') and p.user.get_full_name() else getattr(p.user, 'email', str(p.user)),
                    "rol": p.get_rol_en_sesion_display(),
                    "asistencia": p.asistencia,
                    "notas": p.notas
                }
                for p in session.participants.all()
            ]
            observations_data = [
                {
                    "titulo": o.titulo_tema,
                    "contenido": o.contenido,
                    "autor": o.autor.get_full_name() if hasattr(o.autor, 'get_full_name') and o.autor.get_full_name() else getattr(o.autor, 'email', str(o.autor)),
                    "created_at": o.created_at.isoformat() if o.created_at else None
                }
                for o in session.observations.all()
            ]
            events.append({
                "id": f"tutoria-{session.id}",
                "tipo": "TUTORIA",
                "titulo": f"Sesión de Tutoría ({session.get_modalidad_display()})",
                "descripcion": session.resumen,
                "fecha": str(session.fecha_sesion),
                "estado": "CONCLUIDA",
                "icono": "📘",
                "color": "#6365EF",
                "metadata": {
                    "session_id": session.id,
                    "modalidad": session.modalidad,
                    "semestre": f"Semestre {session.semester.numero}" if session.semester else None,
                    "participantes": participants_data,
                    "observaciones": observations_data,
                    "proxima_reunion_fecha": str(session.proxima_reunion_fecha) if session.proxima_reunion_fecha else None,
                    "proxima_reunion_notas": session.proxima_reunion_notas or ""
                }
            })

        # 2. ACUERDOS
        agreements_qs = Agreement.objects.filter(student=student).select_related('responsable', 'session')
        
        SEMAFORO_COLORS = {
            Agreement.STATUS_PENDIENTE: '#57949D',
            Agreement.STATUS_EN_PROCESO: '#B57136',
            Agreement.STATUS_CONCLUIDO: '#437E5C',
            Agreement.STATUS_VENCIDO: '#A14D98',
        }

        for ag in agreements_qs:
            fecha_evento = str(ag.fecha_conclusion or ag.fecha_limite)
            responsable_nombre = ag.responsable.get_full_name() if hasattr(ag.responsable, 'get_full_name') and ag.responsable.get_full_name() else getattr(ag.responsable, 'email', str(ag.responsable))
            events.append({
                "id": f"acuerdo-{ag.id}",
                "tipo": "ACUERDO",
                "titulo": f"Acuerdo: {ag.descripcion[:50]}",
                "descripcion": ag.descripcion,
                "fecha": fecha_evento,
                "estado": ag.estado,
                "icono": "📝",
                "color": SEMAFORO_COLORS.get(ag.estado, "#57949D"),
                "metadata": {
                    "agreement_id": ag.id,
                    "responsable": responsable_nombre,
                    "fecha_limite": str(ag.fecha_limite),
                    "fecha_conclusion": str(ag.fecha_conclusion) if ag.fecha_conclusion else None,
                    "session_id": ag.session_id,
                    "estado": ag.estado
                }
            })

        # 3. AVANCES DE TESIS
        try:
            ThesisProgress = apps.get_model('thesis', 'ThesisProgress')
            if ThesisProgress:
                thesis_qs = ThesisProgress.objects.filter(student=student).select_related('semester')
                for tp in thesis_qs:
                    events.append({
                        "id": f"tesis-{tp.id}",
                        "tipo": "TESIS",
                        "titulo": f"Avance de Tesis: {tp.porcentaje_avance}%",
                        "descripcion": tp.observaciones or f"Avance de tesis registrado al {tp.porcentaje_avance}%.",
                        "fecha": str(tp.fecha_registro),
                        "estado": f"{tp.porcentaje_avance}%",
                        "icono": "📊",
                        "color": "#2C1867",
                        "metadata": {
                            "progress_id": tp.id,
                            "porcentaje_avance": tp.porcentaje_avance,
                            "componentes_json": tp.componentes_json,
                            "observaciones": tp.observaciones,
                            "semestre": f"Semestre {tp.semester.numero}" if tp.semester else None
                        }
                    })
        except LookupError:
            pass

        # 4. EVIDENCIAS
        try:
            Evidence = apps.get_model('evidence', 'Evidence')
            if Evidence:
                evidence_qs = Evidence.objects.filter(student=student).select_related('semester', 'created_by')
                for ev in evidence_qs:
                    cargado_por = (ev.created_by.get_full_name() if hasattr(ev.created_by, 'get_full_name') and ev.created_by.get_full_name() else getattr(ev.created_by, 'email', str(ev.created_by))) if ev.created_by else None
                    events.append({
                        "id": f"evidencia-{ev.id}",
                        "tipo": "EVIDENCIA",
                        "titulo": f"Evidencia: {ev.titulo}",
                        "descripcion": ev.descripcion or (ev.enlace_url if ev.tipo == 'ENLACE_DOI' else "Archivo local adjunto"),
                        "fecha": str(ev.fecha_carga),
                        "estado": ev.get_tipo_display() if hasattr(ev, 'get_tipo_display') else ev.tipo,
                        "icono": "📎",
                        "color": "#57949D",
                        "metadata": {
                            "evidence_id": ev.id,
                            "tipo": ev.tipo,
                            "actividad_tipo": ev.actividad_tipo,
                            "actividad_id": ev.actividad_id,
                            "enlace_url": ev.enlace_url,
                            "archivo_url": ev.archivo_adjunto.url if ev.archivo_adjunto else None,
                            "mime_type": ev.mime_type,
                            "file_size_bytes": ev.file_size_bytes,
                            "cargado_por": cargado_por
                        }
                    })
        except LookupError:
            pass

        # 5. PUBLICACIONES CIENTÍFICAS
        try:
            Publication = apps.get_model('academic_output', 'Publication')
            if Publication:
                pub_qs = Publication.objects.filter(student=student).select_related('semester', 'evidencia')
                for pub in pub_qs:
                    fecha_pub = str(pub.fecha_publicacion or pub.created_at.date())
                    events.append({
                        "id": f"publicacion-{pub.id}",
                        "tipo": "PUBLICACION",
                        "titulo": f"Publicación: {pub.titulo}",
                        "descripcion": f"{pub.get_tipo_display() if hasattr(pub, 'get_tipo_display') else pub.tipo} en {pub.revista_editorial}",
                        "fecha": fecha_pub,
                        "estado": pub.get_estado_display() if hasattr(pub, 'get_estado_display') else pub.estado,
                        "icono": "🎓",
                        "color": "#6365EF",
                        "metadata": {
                            "publication_id": pub.id,
                            "titulo": pub.titulo,
                            "autores": getattr(pub, 'autores_texto', ''),
                            "tipo": pub.tipo,
                            "tipo_display": pub.get_tipo_display() if hasattr(pub, 'get_tipo_display') else pub.tipo,
                            "revista_editorial": pub.revista_editorial,
                            "estado": pub.estado,
                            "estado_display": pub.get_estado_display() if hasattr(pub, 'get_estado_display') else pub.estado,
                            "fecha_publicacion": str(pub.fecha_publicacion) if pub.fecha_publicacion else None,
                            "doi_url": getattr(pub, 'doi_url', ''),
                            "evidencia_id": pub.evidencia_id,
                            "semestre": f"Semestre {pub.semester.numero}" if pub.semester else None
                        }
                    })
        except Exception:
            pass

        # 6. CONGRESOS Y COLOQUIOS
        try:
            AcademicEvent = apps.get_model('academic_output', 'AcademicEvent')
            if AcademicEvent:
                event_qs = AcademicEvent.objects.filter(student=student).select_related('semester', 'evidencia')
                for a_ev in event_qs:
                    fecha_ev = str(getattr(a_ev, 'fecha_presentacion', None) or getattr(a_ev, 'fecha_evento', None) or getattr(a_ev, 'fecha_inicio', None) or a_ev.created_at.date())
                    events.append({
                        "id": f"congreso-{a_ev.id}",
                        "tipo": "CONGRESO",
                        "titulo": f"Congreso: {getattr(a_ev, 'nombre_evento', getattr(a_ev, 'nombre', 'Evento Académico'))}",
                        "descripcion": f"Ponencia: {getattr(a_ev, 'titulo_ponencia', getattr(a_ev, 'ponencia', 'Participación'))}",
                        "fecha": fecha_ev,
                        "estado": getattr(a_ev, 'tipo_evento', getattr(a_ev, 'tipo', 'CONGRESO')),
                        "icono": "🏛️",
                        "color": "#57949D",
                        "metadata": {
                            "event_id": a_ev.id,
                            "nombre_evento": getattr(a_ev, 'nombre_evento', getattr(a_ev, 'nombre', '')),
                            "titulo_ponencia": getattr(a_ev, 'titulo_ponencia', getattr(a_ev, 'ponencia', '')),
                            "tipo": getattr(a_ev, 'tipo_evento', getattr(a_ev, 'tipo', 'CONGRESO')),
                            "sede": getattr(a_ev, 'sede_lugar', getattr(a_ev, 'sede', getattr(a_ev, 'lugar', ''))),
                            "modalidad": getattr(a_ev, 'modalidad', 'PRESENCIAL'),
                            "fecha_evento": fecha_ev,
                            "semestre": f"Semestre {a_ev.semester.numero}" if getattr(a_ev, 'semester', None) else None
                        }
                    })
        except Exception:
            pass

        # 7. ESTANCIAS DE INVESTIGACIÓN
        try:
            ResearchStay = apps.get_model('academic_output', 'ResearchStay')
            if ResearchStay:
                stay_qs = ResearchStay.objects.filter(student=student).select_related('semester', 'evidencia')
                for stay in stay_qs:
                    fecha_st = str(getattr(stay, 'fecha_inicio', stay.created_at.date()))
                    events.append({
                        "id": f"estancia-{stay.id}",
                        "tipo": "ESTANCIA",
                        "titulo": f"Estancia: {getattr(stay, 'institucion_receptora', getattr(stay, 'institucion', 'Estancia de Investigación'))}",
                        "descripcion": f"En {getattr(stay, 'pais', 'Sede')} con {getattr(stay, 'responsable_anfitrion', getattr(stay, 'tutor_anfitrion', 'Anfitrión'))}",
                        "fecha": fecha_st,
                        "estado": "ESTANCIA",
                        "icono": "🌍",
                        "color": "#2C1867",
                        "metadata": {
                            "stay_id": stay.id,
                            "institucion_receptora": getattr(stay, 'institucion_receptora', getattr(stay, 'institucion', '')),
                            "pais": getattr(stay, 'pais', ''),
                            "responsable_anfitrion": getattr(stay, 'responsable_anfitrion', getattr(stay, 'tutor_anfitrion', '')),
                            "fecha_inicio": str(getattr(stay, 'fecha_inicio', '')),
                            "fecha_fin": str(getattr(stay, 'fecha_fin', '')),
                            "semestre": f"Semestre {stay.semester.numero}" if getattr(stay, 'semester', None) else None
                        }
                    })
        except Exception:
            pass

        # 8. OTROS PRODUCTOS ACADÉMICOS
        try:
            OtherProduct = apps.get_model('academic_output', 'OtherProduct')
            if OtherProduct:
                prod_qs = OtherProduct.objects.filter(student=student).select_related('semester', 'evidencia')
                for prod in prod_qs:
                    fecha_prod = str(getattr(prod, 'fecha_registro', getattr(prod, 'fecha', prod.created_at.date())))
                    events.append({
                        "id": f"producto-{prod.id}",
                        "tipo": "PRODUCTO",
                        "titulo": f"Producto: {getattr(prod, 'titulo', getattr(prod, 'nombre', 'Producto'))}",
                        "descripcion": getattr(prod, 'descripcion', ''),
                        "fecha": fecha_prod,
                        "estado": getattr(prod, 'tipo_producto', getattr(prod, 'tipo', 'PRODUCTO')),
                        "icono": "📦",
                        "color": "#B57136",
                        "metadata": {
                            "product_id": prod.id,
                            "titulo": getattr(prod, 'titulo', getattr(prod, 'nombre', '')),
                            "tipo_producto": getattr(prod, 'tipo_producto', getattr(prod, 'tipo', '')),
                            "descripcion": getattr(prod, 'descripcion', ''),
                            "fecha_registro": fecha_prod,
                            "semestre": f"Semestre {prod.semester.numero}" if getattr(prod, 'semester', None) else None
                        }
                    })
        except Exception:
            pass

        # Sort timeline descending by date and id
        events.sort(key=lambda x: (x["fecha"], x["id"]), reverse=True)

        return Response({
            "student_id": student.id,
            "total_eventos": len(events),
            "timeline": events
        }, status=status.HTTP_200_OK)


class SupervisionAlertsView(APIView):
    """
    GET /api/v1/monitoring/supervision-alerts/
    
    Motor de Reglas de Supervisión Activa (HU-26).
    Evalúa de forma centralizada:
    1. FALTA_TUTORIA_ACTIVA: Alumnos >45 días sin tutoría en semestre activo.
    2. ACUERDO_SIN_EVIDENCIA: Acuerdos concluidos sin evidencia adjunta vinculada.
    3. PROXIMA_TUTORIA_CERCANA: Próximas tutorías calendarizadas en <= 7 días.
    
    Aislamiento RBAC:
    - Coordinadores/Admin/Superuser: Acceso global a todos los estudiantes activos.
    - Asesores: Acceso limitado a estudiantes asignados en comités tutoriales activos.
    - Estudiantes: Acceso restringido a sus propias alertas académicas.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        student_id = request.query_params.get('student')
        if student_id:
            try:
                student_id = int(student_id)
            except (ValueError, TypeError):
                student_id = None

        from .supervision_rules import SupervisionRulesEngine

        engine = SupervisionRulesEngine(
            user=request.user,
            student_id=student_id
        )

        data = engine.run_all_rules()
        return Response(data, status=status.HTTP_200_OK)


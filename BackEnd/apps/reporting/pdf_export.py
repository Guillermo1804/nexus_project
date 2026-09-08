"""
Motor de exportación documental en formato PDF institucional
para el expediente del estudiante en el Sistema N.E.X.U.S. (HU-28).
"""
import io
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas
from django.utils import timezone


class NumberedCanvas(canvas.Canvas):
    """
    Canvas de doble pasada para calcular el total de páginas
    y renderizar encabezados y pies de página institucionales en cada página.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()

        # Margen: 36 pt (0.5 in)
        page_width, page_height = letter

        # Running Top Header
        self.setFont('Helvetica-Bold', 7)
        self.setFillColor(colors.HexColor('#2C1867'))
        self.drawString(36, page_height - 25, "SISTEMA N.E.X.U.S. | NÚCLEO DE EXPEDIENTE Y SEGUIMIENTO UNIVERSITARIO SUPERIOR")
        self.setFont('Helvetica', 7)
        self.setFillColor(colors.HexColor('#64748B'))
        self.drawRightString(page_width - 36, page_height - 25, "EXPEDIENTE ACADÉMICO OFICIAL")

        self.setStrokeColor(colors.HexColor('#E4E7EC'))
        self.setLineWidth(0.5)
        self.line(36, page_height - 28, page_width - 36, page_height - 28)

        # Running Bottom Footer
        self.line(36, 32, page_width - 36, 32)
        self.setFont('Helvetica', 7)
        self.setFillColor(colors.HexColor('#64748B'))
        emision = timezone.now().strftime('%d/%m/%Y %H:%M:%S')
        self.drawString(36, 22, f"Documento oficial emitido por la Coordinación de Posgrado | Fecha de emisión: {emision}")
        self.drawRightString(page_width - 36, 22, f"Página {self._pageNumber} de {page_count}")

        self.restoreState()


def generate_student_pdf_dossier(student) -> bytes:
    """
    Genera una cédula oficial en PDF del expediente del estudiante
    utilizando ReportLab con estilos tipográficos institucionales y tablas formateadas.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=40,
        bottomMargin=42
    )

    # Ancho imprimible = 612 - 72 = 540 pt
    content_width = 540

    styles = getSampleStyleSheet()

    # Colores institucionales
    c_primary = colors.HexColor('#6365EF')
    c_dark = colors.HexColor('#2C1867')
    c_light_bg = colors.HexColor('#F5F7FB')
    c_border = colors.HexColor('#E4E7EC')
    c_text_dark = colors.HexColor('#1E293B')
    c_text_muted = colors.HexColor('#64748B')
    c_white = colors.white

    # Píldoras de acuerdos
    c_pen_bg, c_pen_tx = colors.HexColor('#F6FCFE'), colors.HexColor('#57949D')
    c_pro_bg, c_pro_tx = colors.HexColor('#FEF8F3'), colors.HexColor('#B57136')
    c_con_bg, c_con_tx = colors.HexColor('#E9FEF1'), colors.HexColor('#437E5C')
    c_ven_bg, c_ven_tx = colors.HexColor('#F8F1FF'), colors.HexColor('#A14D98')

    # Estilos tipográficos
    style_main_title = ParagraphStyle(
        'MainTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18,
        textColor=c_white,
        alignment=1
    )
    style_sub_title = ParagraphStyle(
        'SubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#E0E7FF'),
        alignment=1
    )
    style_section_title = ParagraphStyle(
        'SectionTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=c_white
    )
    style_label = ParagraphStyle(
        'Label',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=c_text_dark
    )
    style_val = ParagraphStyle(
        'Val',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=c_text_dark
    )
    style_th = ParagraphStyle(
        'TableHead',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9.5,
        textColor=c_white,
        alignment=1
    )
    style_td = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=9.5,
        textColor=c_text_dark
    )
    style_td_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9.5,
        textColor=c_text_dark
    )
    style_td_center = ParagraphStyle(
        'TableCellCenter',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=9.5,
        textColor=c_text_dark,
        alignment=1
    )
    style_empty = ParagraphStyle(
        'EmptyText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=7.5,
        leading=9.5,
        textColor=c_text_muted,
        alignment=1
    )

    story = []

    # -----------------------------------------------------------------
    # ENCABEZADO INSTITUCIONAL / BANNER SUPERIOR
    # -----------------------------------------------------------------
    banner_data = [
        [
            Paragraph("SISTEMA N.E.X.U.S. — EXPEDIENTE DOCTORAL OFICIAL", style_main_title)
        ],
        [
            Paragraph("CÉDULA INSTITUCIONAL DE SEGUIMIENTO ACADÉMICO Y PRODUCCIÓN CIENTÍFICA", style_sub_title)
        ]
    ]
    banner_table = Table(banner_data, colWidths=[content_width])
    banner_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), c_primary),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ]))
    story.append(banner_table)
    story.append(Spacer(1, 8))

    def make_section_header(title_text):
        t = Table([[Paragraph(title_text.upper(), style_section_title)]], colWidths=[content_width])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), c_dark),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        return t

    # -----------------------------------------------------------------
    # 1. DATOS GENERALES DEL ESTUDIANTE
    # -----------------------------------------------------------------
    story.append(make_section_header("1. Datos Generales del Estudiante"))

    info_rows = [
        [
            Paragraph("Matrícula:", style_label),
            Paragraph(student.matricula, style_val),
            Paragraph("Estatus:", style_label),
            Paragraph("Activo" if student.estatus_activo else "Inactivo", style_val),
        ],
        [
            Paragraph("Estudiante:", style_label),
            Paragraph(student.nombre_completo, style_val),
            Paragraph("Cohorte:", style_label),
            Paragraph(student.cohorte, style_val),
        ],
        [
            Paragraph("Programa Doctoral:", style_label),
            Paragraph(student.programa_doctoral, style_val),
            Paragraph("Correo Institucional:", style_label),
            Paragraph(student.user.email if student.user else "Sin asignar", style_val),
        ],
    ]
    info_table = Table(info_rows, colWidths=[100, 180, 100, 160])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), c_light_bg),
        ('BACKGROUND', (2, 0), (2, -1), c_light_bg),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 6))

    # -----------------------------------------------------------------
    # 2. COMITÉ TUTORIAL ACTIVO Y SEMESTRES
    # -----------------------------------------------------------------
    story.append(make_section_header("2. Comité Tutorial y Periodos"))

    comm_members = student.committee_members.select_related('user').all()
    comm_data = [[
        Paragraph("Rol en Comité", style_th),
        Paragraph("Académico", style_th),
        Paragraph("Correo Institucional", style_th),
        Paragraph("Fecha Asignación", style_th),
        Paragraph("Estatus", style_th)
    ]]

    if comm_members.exists():
        for m in comm_members:
            comm_data.append([
                Paragraph(m.get_rol_comite_display(), style_td_bold),
                Paragraph(m.user.get_full_name() or m.user.username, style_td),
                Paragraph(m.user.email, style_td),
                Paragraph(m.fecha_asignacion.strftime('%d/%m/%Y') if m.fecha_asignacion else "N/A", style_td_center),
                Paragraph("Activo" if m.is_active else "Inactivo", style_td_center)
            ])
    else:
        comm_data.append([
            Paragraph("Sin miembros asignados al comité tutorial", style_empty),
            "", "", "", ""
        ])

    comm_table = Table(comm_data, colWidths=[120, 160, 140, 70, 50])
    ts_comm = [
        ('BACKGROUND', (0, 0), (-1, 0), c_primary),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 2.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
    ]
    if not comm_members.exists():
        ts_comm.append(('SPAN', (0, 1), (4, 1)))
    comm_table.setStyle(TableStyle(ts_comm))
    story.append(comm_table)
    story.append(Spacer(1, 6))

    # -----------------------------------------------------------------
    # 3. AVANCE DE TESIS DOCTORAL
    # -----------------------------------------------------------------
    story.append(make_section_header("3. Avance de Tesis Doctoral (HU-15/16)"))

    thesis_qs = student.thesis_progresses.select_related('semester').all().order_by('semester__numero', '-fecha_registro')
    thesis_data = [[
        Paragraph("Semestre", style_th),
        Paragraph("% Global", style_th),
        Paragraph("Protocolo", style_th),
        Paragraph("Marco T.", style_th),
        Paragraph("Metodología", style_th),
        Paragraph("Análisis", style_th),
        Paragraph("Redacción", style_th),
        Paragraph("Observaciones", style_th),
    ]]

    if thesis_qs.exists():
        for tp in thesis_qs:
            c = tp.componentes_json or {}
            sem_name = f"Sem. {tp.semester.numero}" if tp.semester else "N/A"
            obs = tp.observaciones or "Sin observaciones"
            thesis_data.append([
                Paragraph(sem_name, style_td_center),
                Paragraph(f"<b>{tp.porcentaje_avance}%</b>", style_td_center),
                Paragraph(f"{c.get('protocolo', 0)}%", style_td_center),
                Paragraph(f"{c.get('marcoTeorico', 0)}%", style_td_center),
                Paragraph(f"{c.get('metodologia', 0)}%", style_td_center),
                Paragraph(f"{c.get('analisis', 0)}%", style_td_center),
                Paragraph(f"{c.get('redaccion', 0)}%", style_td_center),
                Paragraph(obs, style_td),
            ])
    else:
        thesis_data.append([
            Paragraph("No se han registrado porcentajes de avance de tesis", style_empty),
            "", "", "", "", "", "", ""
        ])

    thesis_table = Table(thesis_data, colWidths=[50, 50, 50, 50, 55, 50, 50, 185])
    ts_th = [
        ('BACKGROUND', (0, 0), (-1, 0), c_primary),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 2.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
    ]
    if not thesis_qs.exists():
        ts_th.append(('SPAN', (0, 1), (7, 1)))
    thesis_table.setStyle(TableStyle(ts_th))
    story.append(thesis_table)
    story.append(Spacer(1, 6))

    # -----------------------------------------------------------------
    # 4. SESIONES DE TUTORÍA Y SEGUIMIENTO
    # -----------------------------------------------------------------
    story.append(make_section_header("4. Sesiones de Tutoría Realizadas"))

    tutoring_qs = student.tutoring_sessions.select_related('semester', 'created_by').prefetch_related('participants__user', 'observations__autor').all().order_by('-fecha_sesion')
    tut_data = [[
        Paragraph("ID", style_th),
        Paragraph("Fecha", style_th),
        Paragraph("Modalidad", style_th),
        Paragraph("Resumen de Sesión / Temas", style_th),
        Paragraph("Participantes", style_th),
        Paragraph("Próx. Reunión", style_th),
    ]]

    if tutoring_qs.exists():
        for t in tutoring_qs:
            parts = ", ".join([p.user.get_full_name() or p.user.username for p in t.participants.all()]) or "N/A"
            obs_preview = ""
            if t.observations.exists():
                obs_preview = "<br/><i>Obs: " + "; ".join([f"[{o.titulo_tema}] {o.contenido}" for o in t.observations.all()[:2]]) + "</i>"
            resumen_html = f"<b>Sem. {t.semester.numero if t.semester else '-'}:</b> {t.resumen}{obs_preview}"

            tut_data.append([
                Paragraph(f"SES-{t.id:03d}", style_td_center),
                Paragraph(t.fecha_sesion.strftime('%d/%m/%Y'), style_td_center),
                Paragraph(t.get_modalidad_display(), style_td_center),
                Paragraph(resumen_html, style_td),
                Paragraph(parts, style_td),
                Paragraph(t.proxima_reunion_fecha.strftime('%d/%m/%Y') if t.proxima_reunion_fecha else "No agendada", style_td_center),
            ])
    else:
        tut_data.append([
            Paragraph("No se han registrado sesiones de tutoría", style_empty),
            "", "", "", "", ""
        ])

    tut_table = Table(tut_data, colWidths=[45, 55, 60, 200, 115, 65])
    ts_tut = [
        ('BACKGROUND', (0, 0), (-1, 0), c_primary),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 2.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
    ]
    if not tutoring_qs.exists():
        ts_tut.append(('SPAN', (0, 1), (5, 1)))
    tut_table.setStyle(TableStyle(ts_tut))
    story.append(tut_table)
    story.append(Spacer(1, 6))

    # -----------------------------------------------------------------
    # 5. ACUERDOS Y COMPROMISOS ACADÉMICOS
    # -----------------------------------------------------------------
    story.append(make_section_header("5. Acuerdos y Compromisos Académicos (HU-11 a HU-14)"))

    agr_qs = student.agreements.select_related('responsable').all().order_by('-fecha_limite')
    agr_data = [[
        Paragraph("ID", style_th),
        Paragraph("Descripción del Acuerdo", style_th),
        Paragraph("Responsable", style_th),
        Paragraph("Límite", style_th),
        Paragraph("Estado", style_th),
        Paragraph("Conclusión", style_th),
    ]]

    if agr_qs.exists():
        for a in agr_qs:
            st_color = '#437E5C' if a.estado == 'CONCLUIDO' else ('#B57136' if a.estado == 'EN_PROCESO' else ('#A14D98' if a.estado == 'VENCIDO' else '#57949D'))
            status_html = f"<font color='{st_color}'><b>{a.get_estado_display()}</b></font>"

            agr_data.append([
                Paragraph(f"ACU-{a.id:03d}", style_td_center),
                Paragraph(a.descripcion, style_td),
                Paragraph(a.responsable.get_full_name() or a.responsable.username, style_td),
                Paragraph(a.fecha_limite.strftime('%d/%m/%Y') if a.fecha_limite else "-", style_td_center),
                Paragraph(status_html, style_td_center),
                Paragraph(a.fecha_conclusion.strftime('%d/%m/%Y') if a.fecha_conclusion else "-", style_td_center),
            ])
    else:
        agr_data.append([
            Paragraph("No se han registrado acuerdos o compromisos académicos", style_empty),
            "", "", "", "", ""
        ])

    agr_table = Table(agr_data, colWidths=[45, 200, 115, 60, 60, 60])
    ts_agr = [
        ('BACKGROUND', (0, 0), (-1, 0), c_primary),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 2.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
    ]
    if not agr_qs.exists():
        ts_agr.append(('SPAN', (0, 1), (5, 1)))
    agr_table.setStyle(TableStyle(ts_agr))
    story.append(agr_table)
    story.append(Spacer(1, 6))

    # -----------------------------------------------------------------
    # 6. PRODUCCIÓN ACADÉMICA (PUBLICACIONES, CONGRESOS, ESTANCIAS)
    # -----------------------------------------------------------------
    story.append(make_section_header("6. Producción Académica y Científica (HU-17 a HU-20)"))

    pubs_qs = student.publications.all().order_by('-fecha_publicacion')
    events_qs = student.academic_events.all().order_by('-fecha_presentacion')
    stays_qs = student.research_stays.all().order_by('-fecha_inicio')
    others_qs = student.other_products.all().order_by('-fecha_registro')

    prod_summary_data = [
        [
            Paragraph("Publicaciones:", style_label),
            Paragraph(f"{pubs_qs.count()} producto(s)", style_val),
            Paragraph("Congresos / Coloquios:", style_label),
            Paragraph(f"{events_qs.count()} evento(s)", style_val),
        ],
        [
            Paragraph("Estancias de Inv.:", style_label),
            Paragraph(f"{stays_qs.count()} estancia(s)", style_val),
            Paragraph("Otros Productos:", style_label),
            Paragraph(f"{others_qs.count()} producto(s)", style_val),
        ]
    ]
    prod_sum_table = Table(prod_summary_data, colWidths=[110, 160, 110, 160])
    prod_sum_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), c_light_bg),
        ('BACKGROUND', (2, 0), (2, -1), c_light_bg),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(prod_sum_table)
    story.append(Spacer(1, 4))

    # Detalle de Publicaciones
    if pubs_qs.exists():
        pub_data = [[
            Paragraph("Tipo", style_th),
            Paragraph("Título de Publicación", style_th),
            Paragraph("Revista / Editorial", style_th),
            Paragraph("Estado", style_th),
            Paragraph("Fecha", style_th),
        ]]
        for p in pubs_qs:
            pub_data.append([
                Paragraph(p.get_tipo_display(), style_td),
                Paragraph(f"<b>{p.titulo}</b><br/><i>Autores: {p.autores_texto}</i>", style_td),
                Paragraph(p.revista_editorial, style_td),
                Paragraph(p.get_estado_display(), style_td_center),
                Paragraph(p.fecha_publicacion.strftime('%d/%m/%Y') if p.fecha_publicacion else "-", style_td_center),
            ])
        pub_t = Table(pub_data, colWidths=[80, 220, 120, 60, 60])
        pub_t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4E50DC')),
            ('GRID', (0, 0), (-1, -1), 0.5, c_border),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('RIGHTPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(pub_t)
        story.append(Spacer(1, 4))

    # Detalle de Eventos
    if events_qs.exists():
        ev_data = [[
            Paragraph("Tipo Evento", style_th),
            Paragraph("Nombre del Evento", style_th),
            Paragraph("Ponencia", style_th),
            Paragraph("Sede / Modalidad", style_th),
            Paragraph("Fecha", style_th),
        ]]
        for e in events_qs:
            ev_data.append([
                Paragraph(e.get_tipo_evento_display(), style_td),
                Paragraph(e.nombre_evento, style_td),
                Paragraph(e.titulo_ponencia, style_td),
                Paragraph(f"{e.sede_lugar} ({e.get_modalidad_display()})", style_td),
                Paragraph(e.fecha_presentacion.strftime('%d/%m/%Y') if e.fecha_presentacion else "-", style_td_center),
            ])
        ev_t = Table(ev_data, colWidths=[90, 130, 140, 120, 60])
        ev_t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4E50DC')),
            ('GRID', (0, 0), (-1, -1), 0.5, c_border),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('RIGHTPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(ev_t)
        story.append(Spacer(1, 4))

    # Detalle de Estancias
    if stays_qs.exists():
        st_data = [[
            Paragraph("Institución Receptora", style_th),
            Paragraph("País", style_th),
            Paragraph("Anfitrión / Responsable", style_th),
            Paragraph("Periodo", style_th),
        ]]
        for s in stays_qs:
            periodo = f"{s.fecha_inicio.strftime('%d/%m/%Y')} al {s.fecha_fin.strftime('%d/%m/%Y')}"
            st_data.append([
                Paragraph(s.institucion_receptora, style_td),
                Paragraph(s.pais, style_td_center),
                Paragraph(s.responsable_estancia, style_td),
                Paragraph(periodo, style_td_center),
            ])
        st_t = Table(st_data, colWidths=[180, 80, 160, 120])
        st_t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4E50DC')),
            ('GRID', (0, 0), (-1, -1), 0.5, c_border),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('RIGHTPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(st_t)
        story.append(Spacer(1, 4))

    # Detalle de Otros Productos
    if others_qs.exists():
        oth_data = [[
            Paragraph("Tipo", style_th),
            Paragraph("Título", style_th),
            Paragraph("Descripción", style_th),
            Paragraph("Fecha Registro", style_th),
        ]]
        for o in others_qs:
            oth_data.append([
                Paragraph(o.get_tipo_producto_display(), style_td),
                Paragraph(o.titulo, style_td_bold),
                Paragraph(o.descripcion, style_td),
                Paragraph(o.fecha_registro.strftime('%d/%m/%Y') if o.fecha_registro else "-", style_td_center),
            ])
        oth_t = Table(oth_data, colWidths=[100, 150, 210, 80])
        oth_t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4E50DC')),
            ('GRID', (0, 0), (-1, -1), 0.5, c_border),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('RIGHTPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(oth_t)
        story.append(Spacer(1, 4))

    # -----------------------------------------------------------------
    # 7. EVIDENCIAS Y REPOSITORIO DOI (HU-21/22)
    # -----------------------------------------------------------------
    story.append(make_section_header("7. Evidencias Documentales y Repositorio DOI"))

    evi_qs = student.evidences.all().order_by('-fecha_carga')
    evi_data = [[
        Paragraph("ID", style_th),
        Paragraph("Tipo", style_th),
        Paragraph("Actividad", style_th),
        Paragraph("Título de la Evidencia", style_th),
        Paragraph("Archivo / DOI URL", style_th),
        Paragraph("Fecha", style_th),
    ]]

    if evi_qs.exists():
        for e in evi_qs:
            recurso = e.enlace_url if e.tipo == 'ENLACE_DOI' else (e.archivo_adjunto.name.split('/')[-1] if e.archivo_adjunto else "-")
            evi_data.append([
                Paragraph(f"EVI-{e.id:03d}", style_td_center),
                Paragraph(e.get_tipo_display(), style_td_center),
                Paragraph(e.get_actividad_tipo_display(), style_td_center),
                Paragraph(e.titulo, style_td),
                Paragraph(recurso, style_td),
                Paragraph(e.fecha_carga.strftime('%d/%m/%Y') if e.fecha_carga else "-", style_td_center),
            ])
    else:
        evi_data.append([
            Paragraph("No se han adjuntado evidencias documentales ni enlaces DOI", style_empty),
            "", "", "", "", ""
        ])

    evi_table = Table(evi_data, colWidths=[45, 65, 65, 175, 130, 60])
    ts_evi = [
        ('BACKGROUND', (0, 0), (-1, 0), c_primary),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 2.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
    ]
    if not evi_qs.exists():
        ts_evi.append(('SPAN', (0, 1), (5, 1)))
    evi_table.setStyle(TableStyle(ts_evi))
    story.append(evi_table)
    story.append(Spacer(1, 14))

    # -----------------------------------------------------------------
    # SECCIÓN DE FIRMAS Y VALIDEZ OFICIAL
    # -----------------------------------------------------------------
    signatures_block = [
        [
            Paragraph("____________________________________________<br/><b>Director / Asesor Principal</b><br/>Comité Tutorial", style_td_center),
            Paragraph("____________________________________________<br/><b>Coordinador del Programa</b><br/>Posgrado en Ciencias", style_td_center),
        ]
    ]
    sig_table = Table(signatures_block, colWidths=[270, 270])
    sig_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(KeepTogether([sig_table]))

    doc.build(story, canvasmaker=NumberedCanvas)
    return buffer.getvalue()

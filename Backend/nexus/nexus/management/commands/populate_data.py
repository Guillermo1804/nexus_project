import os
import datetime
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from nexus.models import (
    CustomUser,
    Student,
    Semester,
    AcademicCommittee,
    CommitteeMembership,
    AdminAuditLog,
    TutoringSession,
    TutoringParticipant,
    TutoringObservation,
    Agreement,
    AgreementAuditLog,
    ThesisProgress,
    Evidence,
    Publication,
    AcademicEvent,
    ResearchStay,
    OtherProduct,
)


class Command(BaseCommand):
    help = "Puebla la base de datos con datos realistas simulando 2 semanas de uso de la plataforma N.E.X.U.S."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Iniciando generación de datos institucionales de N.E.X.U.S...."))
        populate()
        self.stdout.write(self.style.SUCCESS("Base de datos poblada exitosamente con datos representativos."))


# Seis semanas de uso simulado, de la más antigua a la más reciente.
# `vencimiento` son los días respecto a HOY, no respecto a la sesión: así el semáforo
# muestra de todo en lugar de salirse todo vencido, porque todas las sesiones ya pasaron.
PLAN_SEMANAL = [
    {
        "modalidad": "PRESENCIAL",
        "resumen": "Alineación del protocolo, delimitación del problema y calendarización del primer semestre.",
        "tema": "Diseño metodológico inicial",
        "observacion": "La delimitación es pertinente. Se sugiere explicitar la contribución esperada antes de avanzar a la fase piloto.",
        "acuerdos": [
            ("Presentar anteproyecto ampliado con justificación y marco conceptual.", -33, Agreement.Status.COMPLETED),
            ("Construir el instrumento de recolección de datos del piloto.", -26, Agreement.Status.COMPLETED),
        ],
        "tesis_pct": 8,
        "evidencias": [("Cronograma de investigación", "Diagrama de Gantt del primer semestre con hitos y responsables.", "doi")],
    },
    {
        "modalidad": "VIRTUAL",
        "resumen": "Revisión del estado del arte y depuración de la base bibliográfica inicial.",
        "tema": "Estado del arte",
        "observacion": "Buen criterio de inclusión y exclusión. Faltan trabajos de 2025 en el área de analítica longitudinal.",
        "acuerdos": [
            ("Completar matriz de comparación de literatura reciente.", -19, Agreement.Status.COMPLETED),
            ("Depurar la base bibliográfica dejando sólo artículos indexados.", -12, Agreement.Status.COMPLETED),
        ],
        "tesis_pct": 15,
        "evidencias": [("Matriz de comparación bibliográfica", "Cuestionario con 48 referencias y criterios de evaluación.", "doi")],
    },
    {
        "modalidad": "PRESENCIAL",
        "resumen": "Definición de la fase piloto: muestra, variables y protocolo de recolección.",
        "tema": "Fase piloto y muestra",
        "observacion": "La muestra propuesta es defendible. Conviene reportar el poder estadístico del diseño antes de recolectar.",
        "acuerdos": [
            ("Definir tamaño de muestra y justificación estadística.", -19, Agreement.Status.COMPLETED),
            ("Redactar el protocolo de recolección de datos del piloto.", 12, Agreement.Status.IN_PROGRESS),
            ("Someter el protocolo al comité de ética institucional.", 19, Agreement.Status.IN_PROGRESS),
        ],
        "tesis_pct": 24,
        "evidencias": [("Justificación del tamaño de muestra", "Cálculo de poder estadístico y supuesto mínimos.", "doi")],
    },
    {
        "modalidad": "VIRTUAL",
        "resumen": "Ejecución del piloto y primeras pruebas del pipeline de procesamiento.",
        "tema": "Resultados preliminares",
        "observacion": "El pipeline procesa el lote completo sin errores. Falta versionar el entorno de ejecución.",
        "acuerdos": [
            ("Ejecutar el piloto completo y depurar incidencias del pipeline.", -6, Agreement.Status.OVERDUE),
            ("Documentar el entorno reproducible del experimento.", 5, Agreement.Status.IN_PROGRESS),
        ],
        "tesis_pct": 33,
        "evidencias": [
            ("Registro de ejecución del piloto", "Bitácora del lote con tiempos y registros de error.", "archivo"),
            ("Script de preprocessing", "Notebook de limpieza y normalización de las_series.", "archivo"),
        ],
    },
    {
        "modalidad": "PRESENCIAL",
        "resumen": "Análisis de resultados del piloto y ajuste del diseño experimental.",
        "tema": "Análisis e interpretación",
        "observacion": "Los resultados respaldan la hipótesis de trabajo. Se requiere comparar contra los baselines de la literatura.",
        "acuerdos": [
            ("Comparar el modelo propuesto contra los baselines publicados.", -2, Agreement.Status.OVERDUE),
            ("Incorporar análisis de sensibilidad al pipeline.", 9, Agreement.Status.PENDING),
            ("Envío del abstract al congreso internacional del programa.", 16, Agreement.Status.PENDING),
        ],
        "tesis_pct": 41,
        "evidencias": [("Gráficas comparativas del piloto", "Curvas de desempeño del modelo frente a la línea base.", "archivo")],
    },
    {
        "modalidad": "HIBRIDA",
        "resumen": "Consolidación de resultados y apertura del borrador del manuscrito.",
        "tema": "Redacción del manuscrito",
        "observacion": "Avance sostenido y buena disposición para la redacción. Revisar figuras en formato de publicación.",
        "acuerdos": [
            ("Cerrar el análisis de sensibilidad con todos los parámetros.", 3, Agreement.Status.PENDING),
            ("Redactar los capítulos 1 y 2 del manuscrito.", 11, Agreement.Status.PENDING),
        ],
        "tesis_pct": 48,
        "evidencias": [("Borrador del manuscrito", "Capítulos de introducción y trabajos relacionados.", "archivo")],
    },
]

def componentes_tesis(porcentaje):
    """Reparte el avance global entre los seis componentes reglamentarios.

    Los pesos suman 100, así que el conjunto siempre cuadra con el porcentaje que
    ve el usuario en la interfaz.
    """
    pesos = [
        ("Protocolo de Investigación", 10),
        ("Estado del Arte y Antecedentes", 15),
        ("Marco Teórico y Conceptual", 15),
        ("Metodología y Diseño Experimental", 25),
        ("Análisis e Interpretación de Resultados", 20),
        ("Redacción del Documento de Tesis", 15),
    ]
    asignado = 0
    componentes = {}
    for nombre, peso in pesos:
        parte = round(porcentaje * peso / 100)
        asignado += parte
        componentes[nombre] = {
            "porcentaje": parte,
            "estado": "CONCLUIDO" if parte >= peso else "EN PROCESO" if parte > 0 else "PENDIENTE",
        }
    # El redondeo por componente deja residuo: se ajusta el último para que sume bien.
    ultimo = pesos[-1][0]
    componentes[ultimo]["porcentaje"] += porcentaje - asignado
    if componentes[ultimo]["porcentaje"] < 0:
        componentes[ultimo]["porcentaje"] = 0
    return componentes


PLAN_PRODUCCION = [
    ("Artículo JCR Q1", "ACEPTADO", -33),
    ("Artículo de conferencia", "ACEPTADO", -19),
    ("Capítulo de libro", "ENVIADO", -5),
]


def populate():
    default_password = "Admin1234!"
    now = timezone.now()
    today = timezone.localdate()

    with transaction.atomic():
        # ---------------------------------------------------------------------
        # 1. USUARIOS INSTITUCIONALES
        # ---------------------------------------------------------------------
        def create_or_update_user(email, first_name, last_name, role, is_superuser=False):
            user, created = CustomUser.objects.get_or_create(
                email=email,
                defaults={
                    "first_name": first_name,
                    "last_name": last_name,
                    "role": role,
                    "is_active": True,
                    "is_staff": is_superuser,
                    "is_superuser": is_superuser,
                },
            )
            user.first_name = first_name
            user.last_name = last_name
            user.role = role
            user.is_active = True
            if is_superuser:
                user.is_staff = True
                user.is_superuser = True
            user.set_password(default_password)
            user.save()
            return user

        # Administrador del Sistema
        admin = create_or_update_user("admin@nexus.com", "Sistema", "Administrador", CustomUser.Role.SYSTEM_ADMIN, is_superuser=True)

        # Coordinadores
        coord1 = create_or_update_user("memosanchez101@gmail.com", "Alejandro", "Zárate", CustomUser.Role.PROGRAM_COORDINATOR)
        coord2 = create_or_update_user("coordinacion@nexus.edu", "Carmen", "Valenzuela", CustomUser.Role.PROGRAM_COORDINATOR)
        coord3 = create_or_update_user("jorge@nexus.com", "Jorge", "Medina", CustomUser.Role.PROGRAM_COORDINATOR)

        # Control escolar conserva su cuenta como coordinación académica global.
        control_escolar = create_or_update_user("control.escolar@nexus.edu", "Sofía", "Herrera", CustomUser.Role.PROGRAM_COORDINATOR)

        # Tutores / Asesores
        tutor1 = create_or_update_user("roberto.gomez@nexus.edu", "Roberto", "Gómez Peña", CustomUser.Role.TUTOR)
        tutor2 = create_or_update_user("elena.soto@nexus.edu", "Elena", "Soto Paredes", CustomUser.Role.TUTOR)
        tutor_test = create_or_update_user("tutor_test@nexus.edu", "Javier", "Morales", CustomUser.Role.TUTOR)

        # Miembros del Comité (Coasesores y Vocales)
        coadvisor1 = create_or_update_user("marco.tellez@nexus.edu", "Marco Aurelio", "Téllez", CustomUser.Role.COMMITTEE_MEMBER)
        vocal1 = create_or_update_user("patricia.arredondo@nexus.edu", "Patricia", "Arredondo", CustomUser.Role.COMMITTEE_MEMBER)
        secretary1 = create_or_update_user("fernando.delrazo@nexus.edu", "Fernando", "Del Razo", CustomUser.Role.COMMITTEE_MEMBER)

        # Estudiantes (Cuentas de usuario asociadas)
        est_user1 = create_or_update_user("ana.morales@nexus.edu", "Ana Laura", "Morales Vega", CustomUser.Role.STUDENT)
        est_user2 = create_or_update_user("carlos.mendoza@nexus.edu", "Carlos", "Mendoza Ruiz", CustomUser.Role.STUDENT)
        est_user3 = create_or_update_user("mariana.castillo@nexus.edu", "Mariana", "Castillo Ríos", CustomUser.Role.STUDENT)
        est_user4 = create_or_update_user("diego.fuentes@nexus.edu", "Diego Armando", "Fuentes Solís", CustomUser.Role.STUDENT)
        est_user5 = create_or_update_user("alejandro.zarate@nexus.edu", "Alejandro", "Zárate Jr.", CustomUser.Role.STUDENT)

        # ---------------------------------------------------------------------
        # 2. DOCTORANDOS (Student)
        # ---------------------------------------------------------------------
        students_info = [
            {
                "user": est_user1,
                "matricula": "DOC240001",
                "nombre_completo": "Ana Laura Morales Vega",
                "programa_doctoral": "Doctorado en Ciencias Computacionales",
                "fecha_ingreso": datetime.date(2024, 1, 15),
                "cohorte": "2024-A",
                "semestres_count": 4,
                "tutor": tutor1,
                "coadvisor": coadvisor1,
                "thesis_pct": 70,
            },
            {
                "user": est_user2,
                "matricula": "DOC240002",
                "nombre_completo": "Carlos Mendoza Ruiz",
                "programa_doctoral": "Doctorado en Inteligencia Artificial",
                "fecha_ingreso": datetime.date(2024, 8, 15),
                "cohorte": "2024-B",
                "semestres_count": 3,
                "tutor": tutor2,
                "coadvisor": vocal1,
                "thesis_pct": 50,
            },
            {
                "user": est_user3,
                "matricula": "DOC250001",
                "nombre_completo": "Mariana Castillo Ríos",
                "programa_doctoral": "Doctorado en Sistemas y Ciberseguridad",
                "fecha_ingreso": datetime.date(2025, 1, 15),
                "cohorte": "2025-A",
                "semestres_count": 2,
                "tutor": tutor1,
                "coadvisor": tutor2,
                "thesis_pct": 35,
            },
            {
                "user": est_user4,
                "matricula": "DOC250002",
                "nombre_completo": "Diego Armando Fuentes Solís",
                "programa_doctoral": "Doctorado en Ciencias Computacionales",
                "fecha_ingreso": datetime.date(2025, 8, 15),
                "cohorte": "2025-B",
                "semestres_count": 1,
                "tutor": tutor1,
                "coadvisor": coadvisor1,
                "thesis_pct": 10,
            },
            {
                "user": est_user5,
                "matricula": "DOC260001",
                "nombre_completo": "Alejandro Zárate Jr.",
                "programa_doctoral": "Doctorado en Inteligencia Artificial",
                "fecha_ingreso": datetime.date(2026, 1, 15),
                "cohorte": "2026-A",
                "semestres_count": 1,
                "tutor": tutor2,
                "coadvisor": vocal1,
                "thesis_pct": 5,
            },
        ]

        # Calendario semestral anclado a hoy: el último semestre es el que está en
        # curso, de modo que la interfaz nunca muestre un semestre «activo» ya cerrado.
        semesters_calendar = [
            (
                numero,
                today - datetime.timedelta(days=30 * 6 * (6 - numero)),
                today - datetime.timedelta(days=30 * 6 * (6 - numero) - 150),
            )
            for numero in range(1, 7)
        ]

        for sdata in students_info:
            student, _ = Student.objects.update_or_create(
                matricula=sdata["matricula"],
                defaults={
                    "user": sdata["user"],
                    "nombre_completo": sdata["nombre_completo"],
                    "programa_doctoral": sdata["programa_doctoral"],
                    "fecha_ingreso": sdata["fecha_ingreso"],
                    "cohorte": sdata["cohorte"],
                    "estatus_activo": True,
                },
            )

            # -----------------------------------------------------------------
            # 3. SEMESTRES (Semester 1 a 6)
            # -----------------------------------------------------------------
            count = sdata["semestres_count"]
            active_sem = None
            created_semesters = []
            for idx in range(count):
                num, ini, fin = semesters_calendar[idx]
                is_active = (idx == count - 1)
                sem, _ = Semester.objects.update_or_create(
                    student=student,
                    numero=num,
                    defaults={
                        "fecha_inicio": ini,
                        "fecha_fin": fin,
                        "is_active": is_active,
                    },
                )
                created_semesters.append(sem)
                if is_active:
                    active_sem = sem

            # -----------------------------------------------------------------
            # 4. COMITÉ ACADÉMICO (AcademicCommittee)
            # -----------------------------------------------------------------
            committee, _ = AcademicCommittee.objects.get_or_create(student=student)
            ac1, _ = CommitteeMembership.objects.get_or_create(
                committee=committee, user=sdata["tutor"], role=CommitteeMembership.Role.ADVISOR,
            )
            CommitteeMembership.objects.get_or_create(
                committee=committee, user=sdata["coadvisor"], role=CommitteeMembership.Role.CO_ADVISOR,
            )
            CommitteeMembership.objects.get_or_create(
                committee=committee, user=vocal1, role=CommitteeMembership.Role.COMMITTEE_MEMBER,
            )

            # -----------------------------------------------------------------
            # 5. BITÁCORA DE AUDITORÍA (AdminAuditLog)
            # -----------------------------------------------------------------
            AdminAuditLog.objects.get_or_create(
                action=AdminAuditLog.Action.COMMITTEE_ASSIGNED,
                actor=coord1,
                target_user=sdata["tutor"],
                committee_assignment=ac1,
                defaults={
                    "details": {
                        "student_matricula": student.matricula,
                        "role": CommitteeMembership.Role.ADVISOR,
                        "timestamp": (now - datetime.timedelta(days=14)).isoformat(),
                    }
                },
            )

            # -----------------------------------------------------------------
            # 6-9. SIMULACIÓN DE SEIS SEMANAS
            # -----------------------------------------------------------------
            # Un bloque por semana, de la más antigua a la más reciente, para que
            # las pantallas de los tres sprints muestren una trayectoria viva:
            # tutorías con minutas, acuerdos en todos sus estados, avances de
            # tesis y evidencias. Todo es idempotente: volver a ejecutar el
            # comando no duplica nada.
            total_semanas = len(PLAN_SEMANAL)
            semanas_por_semestre = 2
            for indice, plan in enumerate(PLAN_SEMANAL):
                # Las semanas más recientes caen en el semestre en curso y las anteriores
                # retroceden por semestres completos. Repartirlas de forma intercalada
                # haría que «Sesión 3» fuese más reciente que «Sesión 6».
                retrocede = (total_semanas - 1 - indice) // semanas_por_semestre
                semestre = created_semesters[max(0, len(created_semesters) - 1 - retrocede)]
                fecha_sesion = today - datetime.timedelta(days=7 * (total_semanas - indice))
                es_ultima = indice == total_semanas - 1

                # --- Tutoría, participantes y minuta -----------------------------
                sesion, _ = TutoringSession.objects.get_or_create(
                    student=student,
                    semester=semestre,
                    fecha_sesion=fecha_sesion,
                    defaults={
                        "modalidad": plan["modalidad"],
                        "resumen": plan["resumen"],
                        # Sólo la última sesión deja rendezvous pendiente: el resto ya
                        # cumplió su próxima reunión, que es lo que pasa en la práctica.
                        "proxima_reunion_fecha": (today + datetime.timedelta(days=7)) if es_ultima else fecha_sesion + datetime.timedelta(days=7),
                        "proxima_reunion_notas": "Traer resultados del piloto y figuras comparativas." if es_ultima else "Compromisos de la sesión anterior revisados.",
                        "created_by": sdata["tutor"],
                    },
                )
                TutoringParticipant.objects.get_or_create(
                    session=sesion, user=sdata["tutor"], defaults={"rol_en_sesion": "Asesor Principal", "asistencia": True}
                )
                TutoringParticipant.objects.get_or_create(
                    session=sesion, user=sdata["user"], defaults={"rol_en_sesion": "Doctorando", "asistencia": True}
                )
                if indice % 2 == 1:
                    TutoringParticipant.objects.get_or_create(
                        session=sesion, user=sdata["coadvisor"], defaults={"rol_en_sesion": "Coasesor", "asistencia": True}
                    )
                    TutoringObservation.objects.get_or_create(
                        session=sesion,
                        autor=sdata["coadvisor"],
                        defaults={"tema_revisado": plan["tema"], "observaciones_detalladas": plan["observacion"]},
                    )
                else:
                    TutoringObservation.objects.get_or_create(
                        session=sesion,
                        autor=sdata["tutor"],
                        defaults={"tema_revisado": plan["tema"], "observaciones_detalladas": plan["observacion"]},
                    )

                # --- Acuerdos y bitácora de estados ------------------------------
                for descripcion, vencimiento, estado in plan["acuerdos"]:
                    # El vencimiento se mide desde hoy, no desde la sesión: así el
                    # semáforo reparte entre concluidos, vencidos y por cumplir.
                    fecha_limite = today + datetime.timedelta(days=vencimiento)
                    # El estado efectivo se recalcula: un acuerdo con fecha pasada y sin
                    # concluir aparece vencido, que es lo que el semáforo debe mostrar.
                    estado_real = Agreement.Status.OVERDUE if estado != Agreement.Status.COMPLETED and fecha_limite < today else estado
                    acuerdo, _ = Agreement.objects.get_or_create(
                        student=student,
                        descripcion=descripcion,
                        defaults={
                            "session": sesion,
                            "responsable": sdata["user"],
                            "fecha_limite": fecha_limite,
                            "estado": estado_real,
                            "fecha_conclusion": fecha_limite if estado_real == Agreement.Status.COMPLETED else None,
                            "created_by": sdata["tutor"],
                        },
                    )
                    # El alta siempre se anota, como hace la vista al crear el acuerdo:
                    # si no, un acuerdo recién creado muestra la bitácora vacía.
                    AgreementAuditLog.objects.get_or_create(
                        agreement=acuerdo,
                        estado_anterior="",
                        estado_nuevo=acuerdo.estado,
                        defaults={
                            "user": sdata["tutor"],
                            "comentario": f"Compromiso registrado en la sesión del {fecha_sesion.strftime('%d/%m/%Y')}.",
                        },
                    )
                    if estado_real == Agreement.Status.COMPLETED:
                        AgreementAuditLog.objects.get_or_create(
                            agreement=acuerdo,
                            estado_anterior=Agreement.Status.PENDING,
                            estado_nuevo=Agreement.Status.COMPLETED,
                            defaults={"user": sdata["user"], "comentario": "Entregable recibido y revisado por el asesor."},
                        )
                    elif estado_real == Agreement.Status.IN_PROGRESS:
                        AgreementAuditLog.objects.get_or_create(
                            agreement=acuerdo,
                            estado_anterior=Agreement.Status.PENDING,
                            estado_nuevo=Agreement.Status.IN_PROGRESS,
                            defaults={"user": sdata["user"], "comentario": "Trabajo iniciado; avance visible en el repositorio institucional."},
                        )

                # --- Avance de tesis ---------------------------------------------
                ThesisProgress.objects.get_or_create(
                    student=student,
                    semester=semestre,
                    fecha_registro=fecha_sesion,
                    defaults={
                        "porcentaje_avance": plan["tesis_pct"],
                        "componentes_json": componentes_tesis(plan["tesis_pct"]),
                        "observaciones": plan["observacion"],
                        "registrado_por": sdata["tutor"],
                    },
                )

                # --- Evidencias --------------------------------------------------
                for numero, (titulo, descripcion, tipo) in enumerate(plan["evidencias"], start=1):
                    Evidence.objects.get_or_create(
                        student=student,
                        titulo=f"{titulo}",
                        defaults={
                            "semester": semestre,
                            "tipo": Evidence.EvidenceType.LOCAL_FILE if tipo == "archivo" else Evidence.EvidenceType.DOI_LINK,
                            "actividad_tipo": Evidence.ActivityType.THESIS,
                            "descripcion": descripcion,
                            "enlace_url": "" if tipo == "archivo" else f"https://nexus.edu/evidencias/{student.id}/{indice + 1}-{numero}",
                            "fecha_carga": fecha_sesion + datetime.timedelta(days=numero),
                            "created_by": sdata["user"],
                        },
                    )

            # Evidencia de enlace, una vez y fuera de la cadencia semanal.
            Evidence.objects.get_or_create(
                student=student,
                titulo="Constancia de Aceptación de Ponencia CICOP 2026",
                defaults={
                    "semester": active_sem,
                    "tipo": Evidence.EvidenceType.DOI_LINK,
                    "actividad_tipo": Evidence.ActivityType.OTHER,
                    "descripcion": "Constancia con firma electrónica institucional y folio de registro.",
                    "enlace_url": "https://cicop2026.org/certificates/val-48892",
                    "fecha_carga": today - datetime.timedelta(days=19),
                    "created_by": sdata["user"],
                },
            )

            # -----------------------------------------------------------------
            # 9. PRODUCCIÓN CIENTÍFICA Y ESTANCIAS
            # -----------------------------------------------------------------
            for indice, (tipo_producto, estado, dias) in enumerate(PLAN_PRODUCCION, start=1):
                Publication.objects.get_or_create(
                    student=student,
                    titulo=f"{tipo_producto} sobre analítica longitudinal en posgrado {student.id}-{indice}",
                    defaults={
                        "semester": active_sem,
                        "autores_texto": f"{student.nombre_completo}, {sdata['tutor'].first_name} {sdata['tutor'].last_name}",
                        "tipo": tipo_producto,
                        "revista_editorial": "IEEE Transactions on Neural Networks and Learning Systems",
                        "estado": estado,
                        "fecha_publicacion": today - datetime.timedelta(days=dias),
                        "doi_url": f"https://doi.org/10.1109/TNNLS.2026.{student.id}{indice:02d}",
                    },
                )

            ResearchStay.objects.get_or_create(
                student=student,
                institucion_receptora="Centro de Investigación en Computación (CIC - IPN)",
                defaults={
                    "semester": active_sem,
                    "pais": "México",
                    "fecha_inicio": today - datetime.timedelta(days=42),
                    "fecha_fin": today + datetime.timedelta(days=45),
                    "responsable_estancia": "Dr. Fernando Del Razo",
                    "objetivos": "Validación experimental en clúster de alto rendimiento y GPU distribuida.",
                    "resultados": "Generación de benchmarks reproducibles y análisis comparativo preliminar.",
                },
            )

            AcademicEvent.objects.get_or_create(
                student=student,
                nombre_evento="Congreso Internacional de Computación y Posgrados Científicos (CICOP 2026)",
                defaults={
                    "semester": active_sem,
                    "tipo_evento": "CONGRESO_INTERNACIONAL",
                    "titulo_ponencia": "Modelos Asimétricos y Visualización Longitudinal de Datos Académicos",
                    "fecha_presentacion": today - datetime.timedelta(days=19),
                    "sede_lugar": "Ciudad de México / Virtual",
                    "modalidad": "HIBRIDA",
                },
            )

            OtherProduct.objects.get_or_create(
                student=student,
                titulo="NEXUS Benchmark Toolkit",
                defaults={
                    "semester": active_sem,
                    "tipo_producto": "SOFTWARE",
                    "descripcion": "Librería Python para el procesamiento longitudinal de métricas de tutoría y seguimiento.",
                    "fecha_registro": today - datetime.timedelta(days=12),
                },
            )

        # ---------------------------------------------------------------------
        # 10. AUDITORÍA GENERAL DE ADMINISTRACIÓN
        # ---------------------------------------------------------------------
        for u in [tutor1, tutor2, coadvisor1, vocal1, secretary1]:
            AdminAuditLog.objects.get_or_create(
                action=AdminAuditLog.Action.INSTITUTIONAL_USER_CREATED,
                actor=admin,
                target_user=u,
                defaults={
                    "details": {
                        "email": u.email,
                        "role": u.role,
                        "created_at": (now - datetime.timedelta(days=14)).isoformat(),
                    }
                },
            )


if __name__ == "__main__":
    import django
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "nexus.settings")
    django.setup()
    populate()
    print("Datos institucionales poblados correctamente.")

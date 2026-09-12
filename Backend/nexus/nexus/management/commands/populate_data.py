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

        # Administrador Académico / Escolar
        academic_admin = create_or_update_user("control.escolar@nexus.edu", "Sofía", "Herrera", CustomUser.Role.ACADEMIC_ADMIN)

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
                "matricula": "DOC-2024-001",
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
                "matricula": "DOC-2024-002",
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
                "matricula": "DOC-2025-001",
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
                "matricula": "DOC-2025-002",
                "nombre_completo": "Diego Armando Fuentes Solís",
                "programa_doctoral": "Doctorado en Ciencias Computacionales",
                "fecha_ingreso": datetime.date(2025, 8, 15),
                "cohorte": "2025-B",
                "semestres_count": 1,
                "tutor": tutor_test,
                "coadvisor": secretary1,
                "thesis_pct": 15,
            },
            {
                "user": est_user5,
                "matricula": "305065465406",
                "nombre_completo": "Alejandro Zárate Jr.",
                "programa_doctoral": "Doctorado en Ciencias",
                "fecha_ingreso": datetime.date(2026, 1, 15),
                "cohorte": "2026-A",
                "semestres_count": 1,
                "tutor": tutor_test,
                "coadvisor": coadvisor1,
                "thesis_pct": 20,
            },
        ]

        # Fechas canónicas semestrales
        semesters_calendar = [
            (1, datetime.date(2024, 1, 15), datetime.date(2024, 6, 30)),
            (2, datetime.date(2024, 8, 15), datetime.date(2024, 12, 20)),
            (3, datetime.date(2025, 1, 15), datetime.date(2025, 6, 30)),
            (4, datetime.date(2025, 8, 15), datetime.date(2025, 12, 20)),
            (5, datetime.date(2026, 1, 15), datetime.date(2026, 6, 30)),
            (6, datetime.date(2026, 8, 15), datetime.date(2026, 12, 20)),
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
                if is_active:
                    active_sem = sem

            # -----------------------------------------------------------------
            # 4. COMITÉ ACADÉMICO (AcademicCommittee)
            # -----------------------------------------------------------------
            # Asesor Principal
            ac1, _ = AcademicCommittee.objects.update_or_create(
                student=student,
                user=sdata["tutor"],
                rol_comite=AcademicCommittee.Role.PRINCIPAL_ADVISOR,
                defaults={"fecha_asignacion": today - datetime.timedelta(days=14), "is_active": True},
            )
            # Coasesor
            ac2, _ = AcademicCommittee.objects.update_or_create(
                student=student,
                user=sdata["coadvisor"],
                rol_comite=AcademicCommittee.Role.CO_ADVISOR,
                defaults={"fecha_asignacion": today - datetime.timedelta(days=14), "is_active": True},
            )
            # Vocal
            ac3, _ = AcademicCommittee.objects.update_or_create(
                student=student,
                user=vocal1,
                rol_comite=AcademicCommittee.Role.VOCAL,
                defaults={"fecha_asignacion": today - datetime.timedelta(days=14), "is_active": True},
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
                        "rol_comite": AcademicCommittee.Role.PRINCIPAL_ADVISOR,
                        "timestamp": (now - datetime.timedelta(days=14)).isoformat(),
                    }
                },
            )

            # -----------------------------------------------------------------
            # 6. TUTORÍAS (TutoringSession, Participant, Observation)
            # -----------------------------------------------------------------
            # Sesión 1: Hace 10 días
            sess1, _ = TutoringSession.objects.get_or_create(
                student=student,
                semester=active_sem,
                fecha_sesion=today - datetime.timedelta(days=10),
                defaults={
                    "modalidad": TutoringSession.Modality.IN_PERSON,
                    "resumen": "Revisión exhaustiva del protocolo y definición de los experimentos de la fase piloto.",
                    "proxima_reunion_fecha": today - datetime.timedelta(days=3),
                    "proxima_reunion_notas": "Traer avances del análisis estadístico y gráficas comparativas.",
                    "created_by": sdata["tutor"],
                },
            )
            TutoringParticipant.objects.get_or_create(
                session=sess1, user=sdata["tutor"], defaults={"rol_en_sesion": "Asesor Principal", "asistencia": True}
            )
            TutoringParticipant.objects.get_or_create(
                session=sess1, user=sdata["user"], defaults={"rol_en_sesion": "Doctorando", "asistencia": True}
            )
            TutoringObservation.objects.get_or_create(
                session=sess1,
                autor=sdata["tutor"],
                defaults={
                    "tema_revisado": "Fase Piloto y Metodología",
                    "observaciones_detalladas": "El estudiante presenta solidez en la justificación. Se recomienda afinar el tamaño de muestra.",
                },
            )

            # Sesión 2: Hace 3 días (la más reciente)
            sess2, _ = TutoringSession.objects.get_or_create(
                student=student,
                semester=active_sem,
                fecha_sesion=today - datetime.timedelta(days=3),
                defaults={
                    "modalidad": TutoringSession.Modality.HYBRID,
                    "resumen": "Evaluación de resultados intermedios y preparación del borrador de artículo científico.",
                    "proxima_reunion_fecha": today + datetime.timedelta(days=11),
                    "proxima_reunion_notas": "Revisión final de figuras y referencias en formato IEEE.",
                    "created_by": sdata["tutor"],
                },
            )
            TutoringParticipant.objects.get_or_create(
                session=sess2, user=sdata["tutor"], defaults={"rol_en_sesion": "Asesor Principal", "asistencia": True}
            )
            TutoringParticipant.objects.get_or_create(
                session=sess2, user=sdata["coadvisor"], defaults={"rol_en_sesion": "Coasesor", "asistencia": True}
            )
            TutoringParticipant.objects.get_or_create(
                session=sess2, user=sdata["user"], defaults={"rol_en_sesion": "Doctorando", "asistencia": True}
            )
            TutoringObservation.objects.get_or_create(
                session=sess2,
                autor=sdata["coadvisor"],
                defaults={
                    "tema_revisado": "Redacción de Manuscrito JCR",
                    "observaciones_detalladas": "Se observa buen progreso. Es indispensable contrastar contra los modelos baseline de la literatura.",
                },
            )

            # -----------------------------------------------------------------
            # 7. ACUERDOS Y COMPROMISOS (Agreement con Semáforos)
            # -----------------------------------------------------------------
            # A. CONCLUIDO (hace 8 días)
            agr1, _ = Agreement.objects.get_or_create(
                session=sess1,
                student=student,
                descripcion="Entrega de revisión bibliográfica y estado del arte indexado en Scopus.",
                defaults={
                    "responsable": sdata["user"],
                    "fecha_limite": today - datetime.timedelta(days=8),
                    "estado": Agreement.Status.COMPLETED,
                    "fecha_conclusion": today - datetime.timedelta(days=8),
                    "created_by": sdata["tutor"],
                },
            )
            AgreementAuditLog.objects.get_or_create(
                agreement=agr1,
                estado_anterior=Agreement.Status.PENDING,
                estado_nuevo=Agreement.Status.COMPLETED,
                defaults={"user": sdata["tutor"], "comentario": "Revisión aprobada sin observaciones."},
            )

            # B. EN PROCESO (vence en 5 días)
            agr2, _ = Agreement.objects.get_or_create(
                session=sess2,
                student=student,
                descripcion="Implementación del pipeline de pruebas automatizadas y benchmark de latencia.",
                defaults={
                    "responsable": sdata["user"],
                    "fecha_limite": today + datetime.timedelta(days=5),
                    "estado": Agreement.Status.IN_PROGRESS,
                    "created_by": sdata["tutor"],
                },
            )
            AgreementAuditLog.objects.get_or_create(
                agreement=agr2,
                estado_anterior=Agreement.Status.PENDING,
                estado_nuevo=Agreement.Status.IN_PROGRESS,
                defaults={"user": sdata["user"], "comentario": "Código cargado al repositorio institucional."},
            )

            # C. PENDIENTE (vence en 12 días)
            Agreement.objects.get_or_create(
                session=sess2,
                student=student,
                descripcion="Envío del abstract y registro al Congreso Internacional de Ciencias Computacionales.",
                defaults={
                    "responsable": sdata["user"],
                    "fecha_limite": today + datetime.timedelta(days=12),
                    "estado": Agreement.Status.PENDING,
                    "created_by": sdata["tutor"],
                },
            )

            # D. VENCIDO (venció hace 2 días para activar el semáforo magenta)
            Agreement.objects.get_or_create(
                session=sess1,
                student=student,
                descripcion="Validación de las cartas de autorización del comité de ética institucional.",
                defaults={
                    "responsable": sdata["user"],
                    "fecha_limite": today - datetime.timedelta(days=2),
                    "estado": Agreement.Status.OVERDUE,
                    "created_by": sdata["tutor"],
                },
            )

            # -----------------------------------------------------------------
            # 8. AVANCE DE TESIS (ThesisProgress con los 6 componentes)
            # -----------------------------------------------------------------
            pct = sdata["thesis_pct"]
            ThesisProgress.objects.update_or_create(
                student=student,
                semester=active_sem,
                defaults={
                    "porcentaje_avance": pct,
                    "componentes_json": {
                        "Protocolo de Investigación (10%)": "Aprobado",
                        "Estado del Arte y Antecedentes (15%)": "Completado",
                        "Marco Teórico y Conceptual (15%)": "En revisión",
                        "Metodología y Diseño Experimental (25%)": "En ejecución",
                        "Análisis e Interpretación de Resultados (20%)": "Preliminar",
                        "Redacción del Documento de Tesis (15%)": "Borrador de capítulos 1 y 2",
                    },
                    "observaciones": f"Trayectoria doctoral en curso regular con avance global acumulado del {pct}%. Cumple con los hitos reglamentarios.",
                    "registrado_por": sdata["tutor"],
                    "fecha_registro": today - datetime.timedelta(days=3),
                },
            )

            # -----------------------------------------------------------------
            # 9. PRODUCCIÓN CIENTÍFICA, EVENTOS Y ESTANCIAS
            # -----------------------------------------------------------------
            # Publicación
            Publication.objects.get_or_create(
                student=student,
                titulo=f"Deep Learning Architectures for Distributed Trajectory Analytics in Posgraduate Systems",
                defaults={
                    "semester": active_sem,
                    "autores_texto": f"{student.nombre_completo}, {sdata['tutor'].first_name} {sdata['tutor'].last_name}",
                    "tipo": "Artículo JCR Q1",
                    "revista_editorial": "IEEE Transactions on Neural Networks and Learning Systems",
                    "estado": "ACEPTADO",
                    "fecha_publicacion": today - datetime.timedelta(days=6),
                    "doi_url": f"https://doi.org/10.1109/TNNLS.2026.{student.id}0421",
                },
            )

            # Evento Académico
            AcademicEvent.objects.get_or_create(
                student=student,
                nombre_evento="Congreso Internacional de Computación y Posgrados Científicos (CICOP 2026)",
                defaults={
                    "semester": active_sem,
                    "tipo_evento": "CONGRESO_INTERNACIONAL",
                    "titulo_ponencia": "Modelos Asimétricos y Visualización Longitudinal de Datos Académicos",
                    "fecha_presentacion": today - datetime.timedelta(days=8),
                    "sede_lugar": "Ciudad de México / Virtual",
                    "modalidad": "HIBRIDA",
                },
            )

            # Estancia de Investigación
            ResearchStay.objects.get_or_create(
                student=student,
                institucion_receptora="Centro de Investigación en Computación (CIC - IPN)",
                defaults={
                    "semester": active_sem,
                    "pais": "México",
                    "fecha_inicio": today - datetime.timedelta(days=12),
                    "fecha_fin": today + datetime.timedelta(days=45),
                    "responsable_estancia": "Dr. Fernando Del Razo",
                    "objetivos": "Validación experimental en clúster de alto rendimiento y GPU distribuida.",
                    "resultados": "Generación de benchmarks reproducibles y análisis comparativo preliminar.",
                },
            )

            # Otro Producto
            OtherProduct.objects.get_or_create(
                student=student,
                titulo="NEXUS Benchmark Toolkit v1.0",
                defaults={
                    "semester": active_sem,
                    "tipo_producto": "SOFTWARE",
                    "descripcion": "Librería Python para el procesamiento longitudinal de métricas de tutoría y seguimiento.",
                    "fecha_registro": today - datetime.timedelta(days=5),
                },
            )

            # Evidencia Digital
            Evidence.objects.get_or_create(
                student=student,
                titulo="Constancia de Aceptación de Ponencia CICOP 2026",
                defaults={
                    "semester": active_sem,
                    "tipo": Evidence.EvidenceType.DOI_LINK,
                    "actividad_tipo": "EVENTO",
                    "descripcion": "Constancia con firma electrónica institucional y folio de registro.",
                    "enlace_url": "https://cicop2026.org/certificates/val-48892",
                    "fecha_carga": today - datetime.timedelta(days=7),
                    "created_by": sdata["user"],
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

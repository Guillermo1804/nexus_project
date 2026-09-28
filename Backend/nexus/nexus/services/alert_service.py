from datetime import timedelta

from django.db.models import Case, IntegerField, Q, Value, When
from django.utils import timezone

from ..models import Agreement
from ..permissions import permissions_for_user


def agreement_alerts_for_user(user, student_id=None):
    """Return the agreement alerts visible to a user, ordered by severity and deadline."""
    today = timezone.localdate()
    deadline = today + timedelta(days=7)
    queryset = Agreement.objects.exclude(estado=Agreement.Status.COMPLETED).filter(
        fecha_limite__lte=deadline,
    )

    if 'academic.read.global' not in permissions_for_user(user):
        queryset = queryset.filter(
            Q(student__user=user) | Q(student__academic_committee__memberships__user=user),
        )
    if student_id is not None:
        queryset = queryset.filter(student_id=student_id)

    queryset = queryset.annotate(
        alert_priority=Case(
            When(fecha_limite__lt=today, then=Value(0)),
            default=Value(1),
            output_field=IntegerField(),
        ),
    ).select_related('student', 'responsable').distinct().order_by('alert_priority', 'fecha_limite', 'id')

    alerts = []
    overdue_count = 0
    upcoming_count = 0
    for agreement in queryset:
        responsible_name = f'{agreement.responsable.first_name} {agreement.responsable.last_name}'.strip()
        responsible_name = responsible_name or agreement.responsable.email
        alert = {
            'agreement_id': agreement.id,
            'student_id': agreement.student_id,
            'student_nombre': agreement.student.nombre_completo,
            'descripcion': agreement.descripcion,
            'responsable_nombre': responsible_name,
            'fecha_limite': agreement.fecha_limite,
        }
        if agreement.fecha_limite < today:
            days = (today - agreement.fecha_limite).days
            overdue_count += 1
            alert.update(
                nivel='CRITICO',
                dias_retraso=days,
                mensaje=f'Acuerdo vencido hace {days} {"día" if days == 1 else "días"}.',
            )
        else:
            days = (agreement.fecha_limite - today).days
            upcoming_count += 1
            alert.update(
                nivel='ADVERTENCIA',
                dias_restantes=days,
                mensaje='Vence hoy.' if days == 0 else f'Vence en {days} {"día" if days == 1 else "días"}.',
            )
        alerts.append(alert)

    return {
        'total_alertas': len(alerts),
        'vencidos_count': overdue_count,
        'proximos_vencer_count': upcoming_count,
        'alertas': alerts,
    }

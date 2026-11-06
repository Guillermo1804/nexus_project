from datetime import date
from unittest.mock import patch

from django.db import transaction
from django.test import TestCase

from nexus.models import Agreement, CustomUser, Semester, Student, TutoringSession
from nexus.services.realtime_events import publish_agreement_event, student_group_name


class RealtimeEventPublishingTests(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(
            email='events-realtime@example.com',
            password='password',
        )
        self.student = Student.objects.create(
            user=self.user,
            matricula='EVENTS001',
            nombre_completo='Eventos Tiempo Real',
            cohorte='2026',
        )
        semester = Semester.objects.create(
            student=self.student,
            numero=1,
            fecha_inicio=date(2026, 1, 1),
            fecha_fin=date(2026, 12, 31),
        )
        session = TutoringSession.objects.create(
            student=self.student,
            semester=semester,
            fecha_sesion=date(2026, 10, 1),
            resumen='Seguimiento',
        )
        self.agreement = Agreement.objects.create(
            session=session,
            student=self.student,
            descripcion='Acuerdo de prueba',
            responsable=self.user,
            fecha_limite=date(2026, 12, 1),
        )

    @patch('nexus.services.realtime_events.get_channel_layer')
    def test_publishes_complete_event_after_commit(self, get_channel_layer):
        channel_layer = get_channel_layer.return_value
        with patch('nexus.services.realtime_events.async_to_sync') as async_to_sync:
            group_send = async_to_sync.return_value

            with self.captureOnCommitCallbacks(execute=True):
                publish_agreement_event(self.agreement, 'agreement.created')

            async_to_sync.assert_called_once_with(channel_layer.group_send)
            group_send.assert_called_once()
            group_name, message = group_send.call_args.args

        self.assertEqual(group_name, student_group_name(self.student.id))
        self.assertEqual(message['type'], 'realtime.event')
        self.assertEqual(message['event']['event_type'], 'agreement.created')
        self.assertEqual(message['event']['entity_id'], self.agreement.id)
        self.assertEqual(message['event']['payload']['id'], self.agreement.id)

    @patch('nexus.services.realtime_events.get_channel_layer')
    def test_does_not_publish_when_transaction_rolls_back(self, get_channel_layer):
        with patch('nexus.services.realtime_events.async_to_sync') as async_to_sync:
            try:
                with transaction.atomic():
                    publish_agreement_event(self.agreement, 'agreement.updated')
                    raise RuntimeError('rollback')
            except RuntimeError:
                pass

            async_to_sync.assert_not_called()

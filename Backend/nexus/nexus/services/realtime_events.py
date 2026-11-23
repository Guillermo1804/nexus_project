import logging
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from django.utils import timezone
from uuid import uuid4

from ..serializers import AgreementSerializer

logger = logging.getLogger('nexus.realtime')

SCHEMA_VERSION = 1


def publish_agreement_event(agreement, event_type):
    """Schedule a complete agreement event after its transaction commits."""
    payload = AgreementSerializer(agreement).data
    event = {
        'type': 'realtime.event',
        'event': {
            'schema_version': SCHEMA_VERSION,
            'event_id': str(uuid4()),
            'event_type': event_type,
            'entity': 'agreement',
            'entity_id': agreement.id,
            'student_id': agreement.student_id,
            'version': agreement.updated_at.isoformat(),
            'occurred_at': timezone.now().isoformat(),
            'payload': payload,
        },
    }

    def send_event():
        try:
            channel_layer = get_channel_layer()
            if channel_layer is None:
                logger.error('No channel layer configured for agreement event %s', event['event']['event_id'])
                return
            async_to_sync(channel_layer.group_send)(
                student_group_name(agreement.student_id),
                event,
            )
            logger.info(
                'agreement_event_published',
                extra={
                    'event_id': event['event']['event_id'],
                    'event_type': event_type,
                    'student_id': agreement.student_id,
                    'entity_id': agreement.id,
                },
            )
        except Exception:
            logger.exception(
                'agreement_event_publish_failed',
                extra={
                    'event_id': event['event']['event_id'],
                    'event_type': event_type,
                    'student_id': agreement.student_id,
                    'entity_id': agreement.id,
                },
            )

    transaction.on_commit(send_event)


def student_group_name(student_id):
    return f'student.{student_id}'

import logging

from django.conf import settings
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from .realtime_auth import user_can_access_student
from .services.realtime_events import student_group_name

logger = logging.getLogger('nexus.realtime')


class StudentRealtimeConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        if not settings.REALTIME_ENABLED:
            logger.info('websocket_rejected', extra={'reason': 'feature_disabled'})
            await self.close(code=4403)
            return

        try:
            self.student_id = int(self.scope['url_route']['kwargs']['student_id'])
        except (KeyError, TypeError, ValueError):
            logger.info('websocket_rejected', extra={'reason': 'invalid_student_id'})
            await self.close(code=4400)
            return

        if not await user_can_access_student(self.scope['user'], self.student_id):
            logger.info(
                'websocket_rejected',
                extra={'reason': 'forbidden', 'student_id': self.student_id},
            )
            await self.close(code=4403)
            return

        self.group_name = student_group_name(self.student_id)
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept(subprotocol='nexus.jwt')
        logger.info(
            'websocket_connected',
            extra={'student_id': self.student_id, 'channel_name': self.channel_name},
        )
        await self.send_json({
            'type': 'connection.ready',
            'student_id': self.student_id,
        })

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
            logger.info(
                'websocket_disconnected',
                extra={
                    'student_id': self.student_id,
                    'channel_name': self.channel_name,
                    'close_code': close_code,
                },
            )

    async def realtime_event(self, event):
        try:
            await self.send_json(event['event'])
        except Exception:
            logger.exception(
                'websocket_delivery_failed',
                extra={
                    'student_id': getattr(self, 'student_id', None),
                    'event_id': event.get('event', {}).get('event_id'),
                },
            )
            raise

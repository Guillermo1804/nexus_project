import logging

from channels.db import database_sync_to_async
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed, InvalidToken, TokenError

from .permissions import can_access_student

JWT_SUBPROTOCOL = 'nexus.jwt'
logger = logging.getLogger('nexus.realtime')


def _token_from_subprotocols(subprotocols):
    try:
        token_index = subprotocols.index(JWT_SUBPROTOCOL) + 1
    except ValueError:
        return None
    return subprotocols[token_index] if token_index < len(subprotocols) else None


@database_sync_to_async
def authenticate_token(token):
    if not token:
        return None
    try:
        validated_token = JWTAuthentication().get_validated_token(token)
        user = JWTAuthentication().get_user(validated_token)
    except (AuthenticationFailed, InvalidToken, TokenError):
        return None
    return user if user.is_active else None


@database_sync_to_async
def user_can_access_student(user, student_id):
    return can_access_student(user, student_id)


class JWTWebSocketMiddleware:
    """Authenticate WebSocket handshakes using a token subprotocol."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        token = _token_from_subprotocols(scope.get('subprotocols', []))
        user = await authenticate_token(token)
        if user is None:
            logger.info('websocket_authentication_rejected', extra={'reason': 'invalid_token'})
            await send({'type': 'websocket.close', 'code': 4401})
            return

        scope = dict(scope)
        scope['user'] = user
        return await self.app(scope, receive, send)

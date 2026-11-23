"""
ASGI config for nexus project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.1/howto/deployment/asgi/
"""

import os

from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nexus.settings')

django_application = get_asgi_application()
from .realtime_auth import JWTWebSocketMiddleware
from .realtime_routing import websocket_urlpatterns

application = ProtocolTypeRouter({
    'http': django_application,
    'websocket': JWTWebSocketMiddleware(URLRouter(websocket_urlpatterns)),
})

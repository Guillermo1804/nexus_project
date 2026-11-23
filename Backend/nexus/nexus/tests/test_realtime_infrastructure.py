from django.conf import settings
from django.test import SimpleTestCase


class RealtimeInfrastructureTests(SimpleTestCase):
    def test_asgi_application_is_configured_without_activating_websocket_routes(self):
        from nexus.asgi import application

        self.assertEqual(settings.ASGI_APPLICATION, 'nexus.asgi.application')
        self.assertIn('http', application.application_mapping)
        self.assertIn('websocket', application.application_mapping)

    def test_development_without_redis_uses_in_memory_channel_layer(self):
        self.assertEqual(
            settings.CHANNEL_LAYERS['default']['BACKEND'],
            'channels.layers.InMemoryChannelLayer',
        )

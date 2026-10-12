from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
import django.conf


@require_http_methods(["GET"])
def health_check(request):
    """
    Vista simple de salud para navegadores modernos.
    
    Los navegadores modernos (Chrome, Firefox, etc.) solicitan automáticamente
    /health para verificar si el servidor está vivo antes de establecer conexiones HTTPS.
    
    Esta vista responde con un 200 OK y un JSON simple para confirmar que el servidor
    está operativo.
    """
    return JsonResponse({
        'status': 'ok',
        'service': 'nexus',
        'timestamp': django.conf.settings.DATABASES['default']['ENGINE']
    })
from django.conf import settings
from django.http import HttpResponse


class DevelopmentCorsMiddleware:
    """Allow the configured frontend origin to call the API during development."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        origin = request.headers.get('Origin')
        if request.method == 'OPTIONS' and origin in settings.CORS_ALLOWED_ORIGINS:
            response = HttpResponse(status=204)
            response['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
            response['Access-Control-Allow-Headers'] = 'Authorization, Content-Type'
        else:
            response = self.get_response(request)

        if origin in settings.CORS_ALLOWED_ORIGINS:
            response['Access-Control-Allow-Origin'] = origin
            response['Vary'] = 'Origin'
        return response

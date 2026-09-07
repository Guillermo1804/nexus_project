import json

from django.contrib.auth import authenticate, login, logout
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie


INVALID_CREDENTIALS = 'Credenciales invalidas.'


def _json_body(request):
    try:
        body = json.loads(request.body or '{}')
    except (TypeError, ValueError):
        return None
    return body if isinstance(body, dict) else None


def _user_payload(user):
    return {
        'id': user.id,
        'username': user.get_username(),
        'is_staff': user.is_staff,
    }


def _method_not_allowed(methods):
    return JsonResponse({'detail': 'Metodo no permitido.'}, status=405, headers={'Allow': ', '.join(methods)})


def login_view(request):
    if request.method != 'POST':
        return _method_not_allowed(['POST'])

    data = _json_body(request)
    username = data.get('username') if data else None
    password = data.get('password') if data else None
    if not isinstance(username, str) or not isinstance(password, str) or not username or not password:
        return JsonResponse({'detail': INVALID_CREDENTIALS}, status=401)

    user = authenticate(request, username=username, password=password)
    if user is None or not user.is_active:
        return JsonResponse({'detail': INVALID_CREDENTIALS}, status=401)

    login(request, user)
    return JsonResponse({'authenticated': True, 'user': _user_payload(user)})


def logout_view(request):
    if request.method != 'POST':
        return _method_not_allowed(['POST'])
    if not request.user.is_authenticated:
        return JsonResponse({'detail': 'No autenticado.'}, status=401)

    logout(request)
    return HttpResponse(status=204)


@ensure_csrf_cookie
def session_view(request):
    if request.method != 'GET':
        return _method_not_allowed(['GET'])
    if not request.user.is_authenticated:
        return JsonResponse({'detail': 'No autenticado.'}, status=401)

    return JsonResponse({'authenticated': True, 'user': _user_payload(request.user)})
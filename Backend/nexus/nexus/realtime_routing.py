from django.urls import re_path

from .consumers import StudentRealtimeConsumer


websocket_urlpatterns = [
    re_path(r'^ws/students/(?P<student_id>[0-9]+)/$', StudentRealtimeConsumer.as_asgi()),
]

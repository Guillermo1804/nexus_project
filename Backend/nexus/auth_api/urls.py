from django.urls import path

from . import views


app_name = 'auth_api'

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('session/', views.session_view, name='session'),
]
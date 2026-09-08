from django.conf import settings
from django.db import models
from django.utils import timezone


class Student(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='student_profile',
    )
    matricula = models.CharField(max_length=20, unique=True, db_index=True)
    nombre_completo = models.CharField(max_length=255)
    programa_doctoral = models.CharField(max_length=255, default='Doctorado en Ciencias')
    fecha_ingreso = models.DateField(default=timezone.localdate, null=True, blank=True)
    cohorte = models.CharField(max_length=20, db_index=True)
    estatus_activo = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.matricula} - {self.nombre_completo}'

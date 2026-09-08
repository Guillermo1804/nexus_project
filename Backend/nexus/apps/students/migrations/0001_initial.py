import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Student',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('matricula', models.CharField(db_index=True, max_length=20, unique=True)),
                ('nombre_completo', models.CharField(max_length=255)),
                ('programa_doctoral', models.CharField(default='Doctorado en Ciencias', max_length=255)),
                ('fecha_ingreso', models.DateField(blank=True, default=django.utils.timezone.localdate, null=True)),
                ('cohorte', models.CharField(db_index=True, max_length=20)),
                ('estatus_activo', models.BooleanField(db_index=True, default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='student_profile', to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]

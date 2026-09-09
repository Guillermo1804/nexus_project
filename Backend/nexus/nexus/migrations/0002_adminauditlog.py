from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('nexus', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='AdminAuditLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(choices=[('ROLE_ASSIGNED', 'Rol asignado'), ('INSTITUTIONAL_USER_CREATED', 'Cuenta institucional creada'), ('COMMITTEE_ASSIGNED', 'Asociacion creada'), ('COMMITTEE_STATUS_CHANGED', 'Estado de asociacion cambiado')], db_index=True, max_length=40)),
                ('details', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('actor', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='admin_audit_actions', to=settings.AUTH_USER_MODEL)),
                ('committee_assignment', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='admin_audit_logs', to='nexus.academiccommittee')),
                ('target_user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='admin_audit_targets', to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
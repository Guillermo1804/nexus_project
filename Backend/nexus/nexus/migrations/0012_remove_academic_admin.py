from django.db import migrations, models


LEGACY_ROLE = 'ACADEMIC_ADMIN'
REPLACEMENT_ROLE = 'PROGRAM_COORDINATOR'


def migrate_academic_admins(apps, schema_editor):
    CustomUser = apps.get_model('nexus', 'CustomUser')
    OutstandingToken = apps.get_model('token_blacklist', 'OutstandingToken')
    affected_ids = list(CustomUser.objects.filter(role=LEGACY_ROLE).values_list('id', flat=True))
    if affected_ids:
        CustomUser.objects.filter(id__in=affected_ids).update(role=REPLACEMENT_ROLE)
        tokens = OutstandingToken.objects.filter(user_id__in=affected_ids)
        through = apps.get_model('token_blacklist', 'BlacklistedToken')
        through.objects.bulk_create(
            [through(token=token) for token in tokens],
            ignore_conflicts=True,
        )


class Migration(migrations.Migration):
    dependencies = [
        ('nexus', '0011_evidence_evidence_valid_activity_type'),
        ('token_blacklist', '0013_alter_blacklistedtoken_options_and_more'),
    ]

    operations = [
        migrations.RunPython(migrate_academic_admins, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='customuser',
            name='role',
            field=models.CharField(
                choices=[
                    ('STUDENT', 'Estudiante'),
                    ('TUTOR', 'Tutor'),
                    ('COMMITTEE_MEMBER', 'Miembro del comité'),
                    ('PROGRAM_COORDINATOR', 'Coordinador del programa'),
                    ('SYSTEM_ADMIN', 'Administrador del sistema'),
                ],
                default='STUDENT',
                max_length=30,
            ),
        ),
    ]

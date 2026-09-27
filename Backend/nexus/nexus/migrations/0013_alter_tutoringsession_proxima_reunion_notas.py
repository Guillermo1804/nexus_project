from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('nexus', '0012_remove_academic_admin'),
    ]

    operations = [
        migrations.AlterField(
            model_name='tutoringsession',
            name='proxima_reunion_notas',
            field=models.CharField(blank=True, default='', max_length=500),
        ),
    ]

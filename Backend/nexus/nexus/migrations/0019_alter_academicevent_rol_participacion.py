from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('nexus', '0018_otherproduct_enlace_web_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='academicevent',
            name='rol_participacion',
            field=models.CharField(
                choices=[('PONENTE', 'Ponente'), ('ASISTENTE', 'Asistente')],
                default='PONENTE',
                max_length=50,
            ),
        ),
    ]

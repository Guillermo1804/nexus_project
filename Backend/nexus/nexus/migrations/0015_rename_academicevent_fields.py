# Generated migration for AcademicEvent field renames
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('nexus', '0014_alter_publication_estado_alter_publication_tipo'),
    ]

    operations = [
        migrations.RenameField(
            model_name='academicevent',
            old_name='fecha_presentacion',
            new_name='fecha_evento',
        ),
        migrations.RenameField(
            model_name='academicevent',
            old_name='titulo_ponencia',
            new_name='titulo_trabajo',
        ),
        migrations.RenameField(
            model_name='academicevent',
            old_name='sede_lugar',
            new_name='lugar',
        ),
        migrations.AlterField(
            model_name='academicevent',
            name='tipo_evento',
            field=models.CharField(choices=[('CONGRESO', 'Congreso'), ('COLOQUIO', 'Coloquio'), ('SIMPOSIO', 'Simposio')], max_length=50),
        ),
        migrations.AlterField(
            model_name='academicevent',
            name='modalidad',
            field=models.CharField(choices=[('PRESENCIAL', 'Presencial'), ('VIRTUAL', 'Virtual'), ('HIBRIDA', 'Híbrida')], default='PRESENCIAL', max_length=20),
        ),
        migrations.AddField(
            model_name='academicevent',
            name='rol_participacion',
            field=models.CharField(choices=[('PONENTE', 'Ponente'), ('CONFERENCISTA_MAGISTRAL', 'Conferencista Magistral'), ('ASISTENTE', 'Asistente')], default='PONENTE', max_length=50),
        ),
    ]
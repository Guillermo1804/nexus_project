from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def group_legacy_memberships(apps, schema_editor):
    LegacyMembership = apps.get_model('nexus', 'LegacyCommitteeMembership')
    AcademicCommittee = apps.get_model('nexus', 'AcademicCommittee')
    duplicate_coadvisors = list(
        LegacyMembership.objects.filter(rol_comite='COASESOR')
        .values('student_id')
        .annotate(total=models.Count('id'))
        .filter(total__gt=1)
        .values_list('student_id', flat=True)
    )
    if duplicate_coadvisors:
        raise RuntimeError(
            'No se puede migrar: múltiples coasesores para estudiante(s): '
            + ', '.join(map(str, duplicate_coadvisors))
        )

    committees = {
        student_id: AcademicCommittee.objects.create(student_id=student_id)
        for student_id in LegacyMembership.objects.values_list('student_id', flat=True).distinct()
    }
    role_map = {
        'ASESOR_PRINCIPAL': 'ASESOR',
        'COASESOR': 'COASESOR',
        'MIEMBRO_COMITE': 'COMMITTEE_MEMBER',
    }
    for membership in LegacyMembership.objects.all().iterator():
        membership.committee_id = committees[membership.student_id].id
        membership.rol_comite = role_map[membership.rol_comite]
        membership.save(update_fields=['committee', 'rol_comite'])


class Migration(migrations.Migration):
    dependencies = [('nexus', '0006_alter_student_matricula_and_more')]

    operations = [
        migrations.RenameModel('AcademicCommittee', 'LegacyCommitteeMembership'),
        migrations.RemoveConstraint(
            model_name='legacycommitteemembership',
            name='unique_student_user_committee_role',
        ),
        migrations.CreateModel(
            name='AcademicCommittee',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('student', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='academic_committee', to='nexus.student')),
            ],
        ),
        migrations.AddField(
            model_name='legacycommitteemembership',
            name='committee',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='memberships', to='nexus.academiccommittee'),
        ),
        migrations.RunPython(group_legacy_memberships, migrations.RunPython.noop),
        migrations.RemoveField(model_name='legacycommitteemembership', name='student'),
        migrations.RemoveField(model_name='legacycommitteemembership', name='fecha_asignacion'),
        migrations.RemoveField(model_name='legacycommitteemembership', name='is_active'),
        migrations.RemoveField(model_name='legacycommitteemembership', name='created_at'),
        migrations.RemoveField(model_name='legacycommitteemembership', name='updated_at'),
        migrations.AlterField(
            model_name='legacycommitteemembership',
            name='committee',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='memberships', to='nexus.academiccommittee'),
        ),
        migrations.RenameField(model_name='legacycommitteemembership', old_name='rol_comite', new_name='role'),
        migrations.AlterField(
            model_name='legacycommitteemembership',
            name='role',
            field=models.CharField(choices=[('ASESOR', 'Asesor'), ('COASESOR', 'Coasesor'), ('COMMITTEE_MEMBER', 'Miembro del comité')], max_length=30),
        ),
        migrations.AlterField(
            model_name='legacycommitteemembership',
            name='user',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='committee_memberships', to=settings.AUTH_USER_MODEL),
        ),
        migrations.RenameModel('LegacyCommitteeMembership', 'CommitteeMembership'),
        migrations.AddConstraint(
            model_name='committeemembership',
            constraint=models.UniqueConstraint(fields=('committee', 'user', 'role'), name='unique_committee_user_role'),
        ),
        migrations.AddConstraint(
            model_name='committeemembership',
            constraint=models.UniqueConstraint(condition=models.Q(('role', 'COASESOR')), fields=('committee',), name='unique_committee_coadvisor'),
        ),
    ]

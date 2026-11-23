from datetime import timedelta

from channels.testing import WebsocketCommunicator
from channels.db import database_sync_to_async
from channels.layers import get_channel_layer
from django.test import TransactionTestCase, override_settings
from rest_framework_simplejwt.tokens import AccessToken

from nexus.asgi import application
from nexus.models import AcademicCommittee, CommitteeMembership, CustomUser, Student


@database_sync_to_async
def create_other_student():
    user = CustomUser.objects.create_user(
        email='other-realtime@example.com',
        password='password',
        role=CustomUser.Role.STUDENT,
    )
    return Student.objects.create(
        user=user,
        matricula='REALTIME002',
        nombre_completo='Otro Estudiante',
        cohorte='2026',
    )


@database_sync_to_async
def create_assigned_tutor(student):
    tutor = CustomUser.objects.create_user(
        email='tutor-realtime@example.com',
        password='password',
        role=CustomUser.Role.TUTOR,
    )
    committee = AcademicCommittee.objects.create(student=student)
    CommitteeMembership.objects.create(
        committee=committee,
        user=tutor,
        role=CommitteeMembership.Role.ADVISOR,
    )
    return tutor


@database_sync_to_async
def create_coordinator():
    return CustomUser.objects.create_user(
        email='coordinator-realtime@example.com',
        password='password',
        role=CustomUser.Role.PROGRAM_COORDINATOR,
    )


@database_sync_to_async
def deactivate_user(user):
    CustomUser.objects.filter(pk=user.pk).update(is_active=False)


class RealtimeAuthenticationTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.student_user = CustomUser.objects.create_user(
            email='student-realtime@example.com',
            password='password',
            role=CustomUser.Role.STUDENT,
        )
        self.student = Student.objects.create(
            user=self.student_user,
            matricula='REALTIME001',
            nombre_completo='Estudiante Tiempo Real',
            cohorte='2026',
        )
        self.token = str(AccessToken.for_user(self.student_user))

    async def connect(self, user_token, student_id):
        communicator = WebsocketCommunicator(
            application,
            f'/ws/students/{student_id}/',
            subprotocols=['nexus.jwt', user_token],
        )
        connected, _ = await communicator.connect()
        return communicator, connected

    async def test_student_with_valid_token_can_connect(self):
        communicator, connected = await self.connect(self.token, self.student.id)

        self.assertTrue(connected)
        self.assertEqual(await communicator.receive_json_from(), {
            'type': 'connection.ready',
            'student_id': self.student.id,
        })
        await communicator.disconnect()

    async def test_missing_token_is_rejected(self):
        communicator = WebsocketCommunicator(
            application,
            f'/ws/students/{self.student.id}/',
            subprotocols=['nexus.jwt'],
        )

        connected, _ = await communicator.connect()

        self.assertFalse(connected)

    async def test_expired_token_is_rejected(self):
        expired_token = AccessToken.for_user(self.student_user)
        expired_token.set_exp(lifetime=timedelta(seconds=-1))

        communicator, connected = await self.connect(str(expired_token), self.student.id)

        self.assertFalse(connected)

    async def test_inactive_user_is_rejected(self):
        await deactivate_user(self.student_user)

        communicator, connected = await self.connect(self.token, self.student.id)

        self.assertFalse(connected)

    async def test_student_cannot_subscribe_to_another_student(self):
        other_student = await create_other_student()

        communicator, connected = await self.connect(self.token, other_student.id)

        self.assertFalse(connected)
        await communicator.disconnect()

    async def test_nonexistent_student_is_rejected(self):
        communicator, connected = await self.connect(self.token, 999999)

        self.assertFalse(connected)
        await communicator.disconnect()

    async def test_committee_member_can_subscribe_to_assigned_student(self):
        tutor = await create_assigned_tutor(self.student)

        communicator, connected = await self.connect(str(AccessToken.for_user(tutor)), self.student.id)

        self.assertTrue(connected)
        await communicator.disconnect()

    async def test_coordinator_with_global_permission_can_subscribe(self):
        coordinator = await create_coordinator()

        communicator, connected = await self.connect(str(AccessToken.for_user(coordinator)), self.student.id)

        self.assertTrue(connected)
        await communicator.disconnect()

    async def test_connected_client_receives_group_event(self):
        communicator, connected = await self.connect(self.token, self.student.id)

        self.assertTrue(connected)
        await communicator.receive_json_from()
        await get_channel_layer().group_send(
            f'student.{self.student.id}',
            {
                'type': 'realtime.event',
                'event': {
                    'schema_version': 1,
                    'event_id': 'event-test-1',
                    'event_type': 'agreement.created',
                    'entity': 'agreement',
                    'entity_id': 1,
                    'student_id': self.student.id,
                    'version': '2026-11-06T13:00:00+00:00',
                    'occurred_at': '2026-11-06T13:00:00+00:00',
                    'payload': {'id': 1},
                },
            },
        )

        event = await communicator.receive_json_from()

        self.assertEqual(event['event_type'], 'agreement.created')
        self.assertEqual(event['payload']['id'], 1)
        await communicator.disconnect()

    async def test_student_tutor_and_coordinator_receive_the_same_group_event(self):
        tutor = await create_assigned_tutor(self.student)
        coordinator = await create_coordinator()
        communicators = []
        for user in (self.student_user, tutor, coordinator):
            communicator, connected = await self.connect(
                str(AccessToken.for_user(user)),
                self.student.id,
            )
            self.assertTrue(connected)
            await communicator.receive_json_from()
            communicators.append(communicator)

        await get_channel_layer().group_send(
            f'student.{self.student.id}',
            {
                'type': 'realtime.event',
                'event': {
                    'schema_version': 1,
                    'event_id': 'event-three-clients',
                    'event_type': 'agreement.status_changed',
                    'entity': 'agreement',
                    'entity_id': 9,
                    'student_id': self.student.id,
                    'version': '2026-11-06T13:00:00+00:00',
                    'occurred_at': '2026-11-06T13:00:00+00:00',
                    'payload': {'id': 9, 'status': 'COMPLETED'},
                },
            },
        )

        for communicator in communicators:
            event = await communicator.receive_json_from()
            self.assertEqual(event['event_id'], 'event-three-clients')
            await communicator.disconnect()

    @override_settings(REALTIME_ENABLED=False)
    async def test_feature_flag_rejects_websocket_but_keeps_rest_available(self):
        communicator, connected = await self.connect(self.token, self.student.id)

        self.assertFalse(connected)
        await communicator.disconnect()

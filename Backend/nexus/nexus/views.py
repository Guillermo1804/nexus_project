from rest_framework import viewsets, generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Publication, Student, Agreement
from .serializers import PublicationSerializer, StudentSerializer, AgreementSerializer
from .permissions import can_access_student

class GlobalAcademicOverviewView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        student_id = request.query_params.get('student')
        if not student_id:
            return Response({'error': 'student parameter is required'}, status=400)

        try:
            student = Student.objects.get(id=student_id)
        except Student.DoesNotExist:
            return Response({'error': 'Student not found'}, status=404)

        publications = Publication.objects.filter(student=student)
        agreements = Agreement.objects.filter(student=student)
        tutoring_sessions = TutoringSession.objects.filter(student=student)

        data = {
            'student': StudentSerializer(student).data,
            'publications': PublicationSerializer(publications, many=True).data,
            'agreements': AgreementSerializer(agreements, many=True).data,
            'tutoring_sessions': TutoringSessionSerializer(tutoring_sessions, many=True).data,
        }

        return Response(data)




class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all()
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        student_id = self.request.query_params.get('student')
        if student_id:
            return self.queryset.filter(id=student_id)
        return self.queryset

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [can_access_student(write=True)]
        return super().get_permissions()

class PublicationViewSet(viewsets.ModelViewSet):
    queryset = Publication.objects.all()
    serializer_class = PublicationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        student_id = self.request.query_params.get('student')
        if student_id:
            return self.queryset.filter(student_id=student_id)
        return self.queryset

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [can_access_student(write=True)]
        return super().get_permissions()
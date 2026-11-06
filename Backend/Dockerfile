FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY nexus ./nexus

WORKDIR /app/nexus
EXPOSE 8000

CMD ["sh", "-c", "python manage.py migrate && if [ \"${NEXUS_SERVER:-asgi}\" = \"runserver\" ]; then python manage.py runserver 0.0.0.0:8000; else daphne -b 0.0.0.0 -p 8000 nexus.asgi:application; fi"]
#!/usr/bin/env python
import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "nexus.settings")
django.setup()

from nexus.management.commands.populate_data import populate

if __name__ == "__main__":
    print("Iniciando generación de datos representativos (2 semanas de uso)...")
    populate()
    print("¡Listo! Todas las tablas han sido pobladas exitosamente.")
    print("Contraseña por defecto para todas las cuentas: Admin1234!")

"""Búsqueda de texto insensible a acentos.

SQLite trata `LIKE` como insensible a mayúsculas sólo para ASCII, así que en una
aplicación en español «analisis» no encontraba «análisis». Se registra aquí una
función `unaccent` en cada conexión nueva y se usa mediante `Unaccent` en los
filtros de texto; en otros motores se degrada a la comparación normal.
"""
import unicodedata

from django.db.backends.signals import connection_created
from django.db.models import CharField, Func
from django.dispatch import receiver


def remove_accents(value):
    if not isinstance(value, str):
        return value
    decomposed = unicodedata.normalize('NFD', value)
    return ''.join(char for char in decomposed if unicodedata.category(char) != 'Mn')


@receiver(connection_created)
def register_unaccent(sender, connection, **kwargs):
    if connection.vendor != 'sqlite':
        return
    connection.connection.create_function('nexus_unaccent', 1, remove_accents, deterministic=True)


class Unaccent(Func):
    """Envuelve una expresión para comparar sin acentos.

    >>> Unaccent('Análisis').output_field
    CharField()
    """

    function = 'nexus_unaccent'
    arity = 1
    output_field = CharField()
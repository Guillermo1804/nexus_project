# Documentacion tecnica de GTEA

## 1. Descripcion general

GTEA (Gestor de Talleres y Eventos Academicos) es una API REST construida con Django y Django REST Framework. Gestiona usuarios con roles, categorias, sedes, aulas, eventos e inscripciones.

La aplicacion principal es `GTEA_Project_API`. Django expone las mismas rutas en dos prefijos:

- `/` (por ejemplo, `POST /auth/login/`)
- `/api/` (por ejemplo, `POST /api/auth/login/`)

La base de datos configurada es MySQL. Las migraciones propias de la aplicacion se encuentran en `GTEA_Project_API/migrations/`.

## 2. Arquitectura del proyecto

| Archivo o carpeta | Responsabilidad |
|---|---|
| `manage.py` | Punto de entrada para comandos de Django: migraciones, servidor, shell y comprobaciones. |
| `GTEA_Project_API/settings.py` | Configuracion de Django, base de datos, middleware, CORS, REST Framework y archivos media. |
| `GTEA_Project_API/urls.py` | Registro de todas las rutas de la API y de `/media/`. |
| `GTEA_Project_API/models.py` | Modelos ORM que representan las tablas propias y reglas basicas del dominio. |
| `GTEA_Project_API/serializers.py` | Convierte modelos a JSON y valida JSON recibido por la API. |
| `GTEA_Project_API/authentication.py` | Configura autenticacion por token y utilidades para cookies de token. |
| `GTEA_Project_API/permissions.py` | Permisos reutilizables basados en autenticacion y grupos. |
| `GTEA_Project_API/views/` | Logica HTTP: lectura, creacion, edicion, borrado y reglas de negocio. |
| `GTEA_Project_API/migrations/` | Historial de cambios del esquema de la base de datos. |
| `media/eventos/` | Archivos de imagen subidos para las portadas de eventos. |
| `Dockerfile`, `entrypoint.sh` | Elementos de ejecucion y despliegue en contenedor. |

Flujo de una peticion:

```text
Cliente -> URL -> View -> Serializer -> Model/ORM -> MySQL
                         |
                         +-> Response JSON
```

## 3. Base de datos

### 3.1 Relaciones principales

```text
Django User 1 ---- N Administradores
Django User 1 ---- N Alumnos
Django User 1 ---- N Organizadores
Django User 1 ---- N Eventos (como organizador)

Sedes 1 ---- N Aulas
Sedes 1 ---- N Eventos
Categorias 1 ---- N Eventos
Aulas 1 ---- N Eventos
Eventos 1 ---- N Inscripciones
Alumnos 1 ---- N Inscripciones
Eventos N ---- N Alumnos (a traves de Inscripciones)
```

Los perfiles `Administradores`, `Alumnos` y `Organizadores` se relacionan con `auth_user` mediante `ForeignKey`, no mediante `OneToOneField`. Por tanto, la base permite mas de un perfil del mismo tipo para un usuario, aunque el flujo normal de la API crea un perfil por usuario.

### 3.2 Tablas propias de GTEA

#### `Administradores`

Perfil adicional para un usuario administrador.

| Campo | Tipo / configuracion | Descripcion |
|---|---|---|
| `id` | `BigAutoField`, PK | Identificador del perfil. |
| `user_id` | FK a `auth_user`, `CASCADE` | Usuario asociado. |
| `clave_admin` | `varchar(255)`, nullable | Clave o dato adicional del administrador. |
| `creation` | `datetime`, auto al crear | Fecha de alta. |
| `update` | `datetime`, nullable | Fecha de actualizacion; el modelo no la actualiza automaticamente. |

#### `Alumnos`

Perfil adicional para alumnos.

| Campo | Tipo / configuracion | Descripcion |
|---|---|---|
| `id` | `BigAutoField`, PK | Identificador del perfil. |
| `user_id` | FK a `auth_user`, `CASCADE` | Usuario asociado. |
| `matricula` | `varchar(255)`, nullable | Matricula escolar. |
| `ocupacion` | `varchar(255)`, nullable | Ocupacion del alumno. |
| `creation` | `datetime`, auto al crear | Fecha de alta. |
| `update` | `datetime`, nullable | Fecha de actualizacion manual. |

#### `Organizadores`

Perfil adicional para organizadores.

| Campo | Tipo / configuracion | Descripcion |
|---|---|---|
| `id` | `BigAutoField`, PK | Identificador del perfil. |
| `user_id` | FK a `auth_user`, `CASCADE` | Usuario asociado. |
| `id_trabajador` | `varchar(255)`, nullable | Identificador laboral. |
| `creation` | `datetime`, auto al crear | Fecha de alta. |
| `update` | `datetime`, nullable | Fecha de actualizacion manual. |

#### `Categorias`

Clasifica los eventos.

| Campo | Tipo / configuracion | Descripcion |
|---|---|---|
| `id` | `BigAutoField`, PK | Identificador. |
| `nombre` | `varchar(120)` | Nombre de la categoria. |
| `descripcion` | `text`, opcional | Descripcion. |
| `icon` | `varchar(100)`, opcional | Identificador o nombre de icono. |
| `color` | `varchar(30)`, opcional | Color usado por el cliente. |
| `activa` | `boolean`, default `True` | Permite ocultar categorias activas de los listados. |
| `creation` | `datetime`, auto al crear | Fecha de alta. |
| `update` | `datetime`, auto al guardar | Ultima actualizacion. |

#### `Sedes`

Representa una ubicacion fisica.

| Campo | Tipo / configuracion | Descripcion |
|---|---|---|
| `id` | `BigAutoField`, PK | Identificador. |
| `nombre` | `varchar(200)` | Nombre de la sede. |
| `domicilio` | `text`, opcional | Direccion. |
| `telefono` | `varchar(30)`, opcional | Telefono. |
| `email` | `email`, opcional | Correo de contacto. |
| `pisos` | `integer`, default `1` | Numero de pisos. |
| `notas` | `text`, opcional | Notas administrativas. |
| `instalaciones` | `JSON`, default `[]` | Lista o estructura libre de instalaciones. |
| `activa` | `boolean`, default `True` | Control de visibilidad en listados. |
| `creation` | `datetime`, auto al crear | Fecha de alta. |
| `update` | `datetime`, auto al guardar | Ultima actualizacion. |

#### `Aulas`

Espacio perteneciente a una sede.

| Campo | Tipo / configuracion | Descripcion |
|---|---|---|
| `id` | `BigAutoField`, PK | Identificador. |
| `sede_id` | FK a `Sedes`, `CASCADE` | Sede propietaria. Al borrar la sede se borran sus aulas. |
| `nombre` | `varchar(200)` | Nombre del aula. |
| `capacidad` | `integer`, default `30` | Cupo fisico. |
| `piso` | `integer`, default `1` | Piso donde se encuentra. |
| `tipo` | `varchar(100)`, opcional | Tipo de aula. |
| `estado` | `varchar(20)`, default `disponible` | `disponible`, `en-uso` o `mantenimiento`. |
| `creation` | `datetime`, auto al crear | Fecha de alta. |
| `update` | `datetime`, auto al guardar | Ultima actualizacion. |

#### `Eventos`

Entidad central de talleres y actividades.

| Campo | Tipo / configuracion | Descripcion |
|---|---|---|
| `id` | `BigAutoField`, PK | Identificador. |
| `titulo` | `varchar(200)` | Titulo del evento. |
| `categoria_id` | FK a `Categorias`, `SET_NULL`, opcional | Categoria del evento. |
| `descripcion` | `text`, opcional | Informacion del evento. |
| `imagen_portada` | `URL`, opcional | URL de la imagen de portada. |
| `fecha_inicio`, `fecha_fin` | `date` | Fechas del evento. |
| `hora_inicio`, `hora_fin` | `time` | Horarios del evento. |
| `modalidad` | `varchar(20)` | `Presencial` o `Virtual`. |
| `sede_id` | FK a `Sedes`, `SET_NULL`, opcional | Ubicacion fisica. |
| `aula_id` | FK a `Aulas`, `SET_NULL`, opcional | Aula asignada. |
| `cupo_maximo` | `integer`, default `30` | Numero maximo de inscritos confirmados. |
| `costo_entrada` | `decimal(10,2)`, default `0` | Precio del evento. |
| `lista_espera` | `boolean`, default `False` | Permite aceptar alumnos cuando se llena el cupo. |
| `publicar_inmediatamente` | `boolean`, default `True` | Al crear, decide si el estado inicial es `Activo`. |
| `es_organizador` | `boolean`, default `True` | Indicador auxiliar usado por el cliente. |
| `organizador_id` | FK a `auth_user`, `SET_NULL`, opcional | Usuario que creo o administra el evento. |
| `status` | `varchar(20)`, default `Borrador` | `Activo`, `Borrador`, `Finalizado` o `Cancelado`. |
| `creation` | `datetime`, auto al crear | Fecha de alta. |
| `update` | `datetime`, auto al guardar | Ultima actualizacion. |

La propiedad calculada `inscritos` cuenta unicamente inscripciones cuyo `tipo` es `inscrito`; no cuenta la lista de espera.

#### `Inscripciones`

Relaciona un alumno con un evento.

| Campo | Tipo / configuracion | Descripcion |
|---|---|---|
| `id` | `BigAutoField`, PK | Identificador. |
| `evento_id` | FK a `Eventos`, `CASCADE` | Evento asociado. |
| `alumno_id` | FK a `Alumnos`, `CASCADE` | Alumno asociado. |
| `tipo` | `varchar(20)`, default `inscrito` | `inscrito` o `lista_espera`. |
| `creation` | `datetime`, auto al crear | Momento de inscripcion, usado para ordenar la espera. |

Existe una restriccion `unique_together(evento, alumno)`: un alumno no puede tener dos registros para el mismo evento, aunque cambie el tipo.

### 3.3 Tablas de Django y DRF

Ademas de las tablas anteriores, `migrate` crea tablas del framework:

- `auth_user`: credenciales y datos basicos (`username`, email, nombre, password hash, `is_active`).
- `auth_group`, `auth_user_groups`: grupos que representan los roles.
- `authtoken_token`: token de autenticacion asociado a un usuario.
- `django_migrations`: migraciones aplicadas.
- `django_session`: sesiones de Django.
- `django_content_type`, `auth_permission`, `auth_group_permissions`: permisos internos del framework.

Los nombres de grupo esperados son exactamente `alumno`, `organizador` y `administrador`.

## 4. Que hace `models.py`

`models.py` define las clases ORM. Cada clase hereda de `django.db.models.Model` y Django la convierte en una tabla. Los campos generan columnas, las relaciones `ForeignKey` generan claves foraneas y `Meta.unique_together` genera una restriccion de unicidad.

Tambien contiene:

- `BearerTokenAuthentication`, una variante de `TokenAuthentication` cuyo prefijo es `Bearer`.
- Choices para limitar estados, modalidad y tipo de inscripcion.
- Metodos `__str__` para representacion legible en admin o shell.
- `Eventos.inscritos`, propiedad que calcula el numero de inscritos confirmados.

`post_save`, `receiver`, `AbstractUser` y `settings` aparecen importados en el archivo, pero no hay signals ni modelos personalizados que los utilicen actualmente.

## 5. Serializers

`serializers.py` define el contrato JSON entre la API y la base de datos.

- `UserSerializer`: serializa usuarios, permite recibir password y rol, y usa el email como username cuando no se envia username. Al crear, guarda la password con hash mediante `set_password`.
- `AdminSerializer`, `AlumnoSerializer`, `OrganizadorSerializer`: serializan el perfil y exponen en solo lectura nombre, apellido, email y `is_active` desde `auth_user`.
- `CategoriaSerializer` y `SedeSerializer`: serializacion directa de sus modelos.
- `AulaSerializer`: agrega `sede_nombre` en solo lectura.
- `EventoSerializer`: agrega nombres de categoria, sede, aula y organizador; tambien expone `inscritos` e `is_full`.
- `InscripcionSerializer`: agrega titulo del evento y nombre completo del alumno.

En eventos, las vistas aceptan tanto nombres `snake_case` como algunos nombres `camelCase`, por ejemplo `categoriaId`, `fechaInicio`, `cupoMaximo` e `imagenPortada`.

## 6. Autenticacion y permisos

### Login

`POST /auth/login/` o `POST /api/auth/login/` recibe las credenciales aceptadas por `ObtainAuthToken`. Si el usuario esta activo y pertenece a un grupo valido, crea o recupera su token y devuelve la informacion del perfil junto con:

```json
{
  "token": "...",
  "rol": "alumno"
}
```

El contenido adicional depende del rol: perfil de alumno, perfil de organizador o datos del usuario administrador.

### Header de autenticacion

Las peticiones protegidas deben enviar:

```http
Authorization: Bearer <token>
```

El proyecto tambien registra `TokenAuthentication` como compatibilidad con el formato `Token <token>`. La autenticacion por cookie esta implementada en `CookieTokenAuthentication`, pero no es la clase predeterminada en `settings.py`.

`GET /auth/logout/` elimina el token del usuario autenticado.

### Reglas generales

- La mayoria de vistas exige `IsAuthenticated`.
- El rol se determina por pertenencia a grupos de Django, no por un campo `rol` dentro de los perfiles.
- En eventos, un administrador puede ver y modificar todos; un organizador solo ve y modifica sus propios eventos; otros usuarios autenticados pueden consultar eventos.
- Solo un administrador puede cambiar roles o activar/desactivar perfiles.
- Algunas vistas antiguas de alta (`AlumnosView`, `OrganizadoresView`, `AdminView`, categorias y sedes) no declaran `permission_classes`; el comportamiento exacto queda sujeto a autenticacion y a los metodos implementados en cada clase.

## 7. Vistas y endpoints

Todas las rutas siguientes tambien funcionan con el prefijo `/api/`.

### Autenticacion

| Metodo | Ruta | Funcion |
|---|---|---|
| `POST` | `/auth/login/` | Autenticar y devolver token y rol. |
| `GET` | `/auth/logout/` | Eliminar el token actual. |

### Usuarios y perfiles

| Metodo | Ruta | Funcion |
|---|---|---|
| `GET` | `/admins/` | Lista administradores. |
| `GET` | `/admins/detail/?id={id}` | Detalle de administrador. |
| `POST` | `/admins/detail/` | Crea usuario, grupo administrador y perfil. |
| `GET` | `/admins/edit/` | Cuenta admins, organizadores y alumnos activos. |
| `PUT` | `/admins/edit/` | Edita datos del administrador. Requiere `id`. |
| `DELETE` | `/admins/edit/?id={id}` | Elimina el usuario y, por cascada, su perfil. |
| `PATCH` | `/admins/{id}/` | Cambia `is_active`; solo administrador. |
| `GET` | `/alumnos/` | Lista alumnos. |
| `GET` | `/alumnos/detail/?id={id}` | Detalle de alumno. |
| `POST` | `/alumnos/detail/` | Crea usuario, grupo alumno y perfil. |
| `PUT` | `/alumnos/edit/` | Edita perfil propio o, con permisos, otro perfil. |
| `DELETE` | `/alumnos/edit/?id={id}` | Elimina el usuario y su perfil. |
| `PATCH` | `/alumnos/{id}/` | Cambia `is_active`; solo administrador. |
| `GET` | `/alumnos/perfil/` | Devuelve el perfil del alumno autenticado. |
| `PUT` | `/alumnos/perfil/` | Actualiza nombre, email, matricula y ocupacion. |
| `GET` | `/organizadores/` | Lista organizadores. |
| `GET` | `/organizadores/detail/?id={id}` | Detalle de organizador. |
| `POST` | `/organizadores/detail/` | Crea usuario, grupo organizador y perfil. |
| `PUT` | `/organizadores/edit/` | Edita datos del organizador. Requiere `id`. |
| `DELETE` | `/organizadores/edit/?id={id}` | Elimina usuario y perfil. |
| `PATCH` | `/organizador/{id}/` | Cambia `is_active`; solo administrador. |
| `POST` | `/users/{id}/cambiar-rol/` | Cambia el grupo y crea el perfil correspondiente; solo administrador. |

### Categorias

| Metodo | Ruta | Funcion |
|---|---|---|
| `GET` | `/categorias/` | Lista categorias activas ordenadas por nombre. |
| `POST` | `/categorias/` | Crea una categoria. |
| `GET` | `/categorias/detail/?id={id}` | Consulta una categoria. |
| `POST` | `/categorias/detail/` | Crea una categoria como ruta compatible. |
| `PUT` | `/categorias/edit/` | Edita nombre, descripcion, icon y color. Requiere `id`. |
| `DELETE` | `/categorias/edit/?id={id}` | Elimina definitivamente la categoria. |

### Sedes y aulas

| Metodo | Ruta | Funcion |
|---|---|---|
| `GET` | `/sedes/` | Lista sedes activas. |
| `POST` | `/sedes/` | Crea una sede. |
| `GET` | `/sedes/detail/?id={id}` | Consulta una sede. |
| `POST` | `/sedes/detail/` | Crea una sede como ruta compatible. |
| `PUT` | `/sedes/edit/` | Edita datos de sede. Requiere `id`. |
| `DELETE` | `/sedes/edit/?id={id}` | Elimina la sede y sus aulas por cascada. |
| `GET` | `/aulas/` | Lista aulas; admite `?sede_id={id}`. |
| `POST` | `/aulas/` | Crea un aula. |
| `GET` | `/aulas/detail/?id={id}` | Consulta un aula o lista si no se envia id. |
| `POST` | `/aulas/detail/` | Crea un aula. |
| `PUT` | `/aulas/edit/` | Edita un aula. Requiere `id`. |
| `DELETE` | `/aulas/edit/?id={id}` | Elimina un aula. |

Los valores aceptados para `estado` de aula son `disponible`, `en-uso` y `mantenimiento`.

### Eventos

| Metodo | Ruta | Funcion |
|---|---|---|
| `GET` | `/eventos/public/` | Catalogo publico sin token; solo eventos `Activo`. |
| `GET` | `/eventos/` | Lista eventos autenticados. Admin ve todos; organizador ve los propios. |
| `POST` | `/eventos/` | Crea evento como admin u organizador autenticado. |
| `GET` | `/eventos/detail/?id={id}` | Consulta un evento. |
| `PUT` | `/eventos/edit/` | Edita evento; requiere `id`, `evento_id` o `eventoId`. |
| `DELETE` | `/eventos/edit/?id={id}` | Elimina evento si el usuario puede modificarlo. |
| `POST` | `/eventos/imagen-upload/` | Sube PNG/JPG de hasta 5 MB y devuelve URL absoluta. |

Al crear un evento, `publicar_inmediatamente=true` establece `status=Activo`; de lo contrario queda en `Borrador` salvo que se indique otro estado valido. El organizador se asigna siempre al usuario autenticado.

### Inscripciones

| Metodo | Ruta | Funcion |
|---|---|---|
| `GET` | `/inscripciones/` | Consulta una inscripcion por `?id=`; la ruta esta registrada para compatibilidad. |
| `POST` | `/inscripciones/` | Inscribe al alumno autenticado usando `evento_id` o `eventoId`. |
| `GET` | `/inscripciones/detail/?id={id}` | Consulta una inscripcion. |
| `PUT` | `/inscripciones/edit/` | Cambia `tipo` de una inscripcion. |
| `DELETE` | `/inscripciones/edit/?id={id}` | Elimina una inscripcion. |
| `GET` | `/inscripciones/mis-eventos/` | Eventos inscritos o en espera del alumno autenticado. |
| `GET` | `/inscripciones/lista-espera/?evento={id}` | Lista la espera de un evento. |
| `POST` | `/inscripciones/lista-espera/` | Agrega manualmente alumno a espera con `evento_id` y `alumno_id`. |
| `DELETE` | `/inscripciones/cancel/?evento_id={id}&alumno_id={id}` | Cancela y promueve al primero de la espera si corresponde. |

## 8. Reglas de negocio importantes

### Inscripcion y cupo

1. Se localiza el perfil `Alumnos` del usuario autenticado.
2. Si ya existe una fila para el par evento/alumno, se devuelve error 400.
3. Se cuentan solo las filas con `tipo=inscrito`.
4. Si el cupo no esta lleno, se crea una inscripcion confirmada.
5. Si esta lleno y `lista_espera=true`, se crea una inscripcion de espera.
6. Si esta lleno y no hay lista de espera, se devuelve HTTP 409.
7. Al cancelar una inscripcion confirmada, se promueve a la persona mas antigua de la lista de espera.

Las operaciones de alta, cancelacion y promocion usan transacciones atomicas. La restriccion unica de la base tambien evita duplicados.

### Estados mostrados al alumno

`/inscripciones/mis-eventos/` traduce los estados internos a estados de cliente:

- `lista_espera` -> `lista-espera`
- evento `Cancelado` -> `cancelado`
- evento `Finalizado` o fecha final anterior al dia actual -> `completado`
- cualquier otro caso -> `proximo`

El campo `tiene_certificado` se devuelve actualmente siempre como `false`.

### Reportes

`GET /reportes/resumen/` devuelve:

- totales de eventos por estado;
- total de inscripciones confirmadas y en espera;
- categorias activas, sedes activas y alumnos activos;
- estadisticas por categoria: eventos e inscritos;
- top 10 de eventos por inscritos, incluyendo espera y cupo;
- estadisticas por sede: eventos e inscritos.

## 9. Archivos de imagen

`POST /eventos/imagen-upload/` recibe `multipart/form-data` con el campo `imagen` (tambien acepta `file`). Solo admite `image/png` y `image/jpeg`, con limite de 5 MB.

El archivo se guarda en `MEDIA_ROOT/eventos/` con un nombre UUID. La respuesta incluye `imagen_url`, que luego se guarda en `Eventos.imagen_portada`. Django expone los archivos bajo `/media/`; en produccion es preferible que los sirva el proxy web.

## 10. Configuracion y ejecucion

Variables principales de entorno:

| Variable | Uso | Valor por defecto |
|---|---|---|
| `SECRET_KEY` | Clave secreta de Django. | Valor de desarrollo incluido en settings. |
| `DEBUG` | Activa modo debug y CORS abierto. | `False` |
| `DB_NAME` | Base MySQL. | `gtea_proyecto_api` |
| `DB_USER` | Usuario MySQL. | `root` |
| `DB_PASSWORD` | Password MySQL. | vacio |
| `DB_HOST` | Host MySQL. | `127.0.0.1` |
| `DB_PORT` | Puerto MySQL. | `3307` |
| `ALLOWED_HOSTS` | Hosts permitidos separados por coma. | `127.0.0.1,localhost,...` |
| `CORS_ALLOWED_ORIGINS` | Origenes CORS separados por coma. | localhost Angular |
| `CSRF_TRUSTED_ORIGINS` | Origenes confiables para CSRF. | dominios configurados |

Comandos habituales:

```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py check
python manage.py runserver 8000
```

El panel administrativo de Django esta disponible en `/django-admin/`.

## 11. Observaciones para mantenimiento

- Los borrados de perfiles eliminan el `auth_user`; por `CASCADE` tambien eliminan su perfil y token relacionado.
- El borrado de una sede elimina sus aulas, pero los eventos conservan su fila y dejan `sede_id` en `NULL` por `SET_NULL`.
- El borrado de un aula o categoria deja los eventos y pone la relacion en `NULL`.
- Las vistas usan nombres historicos como `CreateAPIView` aunque algunas implementan `GET`, `PUT` o `DELETE` manualmente; el nombre de la clase no describe por si solo todos sus metodos.
- `activa=False` se usa para filtrar categorias y sedes en listados principales, pero las operaciones de borrado actuales hacen borrado fisico.
- Los metodos `__str__` de los perfiles intentan usar `first_name` y `last_name` directamente en el perfil; esos campos pertenecen a `perfil.user`. Si se muestran esos objetos en admin o shell, convendria corregirlos a `self.user.first_name` y `self.user.last_name`.
- Las migraciones son la fuente de verdad historica del esquema; despues de cambiar `models.py` se debe ejecutar `python manage.py makemigrations` y `python manage.py migrate`.

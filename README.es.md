# HttpKeeper

**Envía peticiones HTTP desde un fichero `.http` y lee la respuesta en el editor.** Sin cuenta, sin nube, sin muro de pago, sin telemetría.

Fork mantenido de [REST Client](https://github.com/Huachao/vscode-restclient), de **Huachao Mao** (MIT): 7,5 millones de instalaciones, 4,9 estrellas y sin una versión nueva desde junio de 2022. El mismo formato `.http`, los mismos ajustes, recogido y puesto al día.

![La petición a la izquierda, la respuesta a la derecha](https://raw.githubusercontent.com/TecniartGalicia/httpkeeper/master/media/shots/01-send.png)

## Por qué existe este fork

El original no está roto: está parado. Su repositorio acumula **529 incidencias y 61 propuestas de cambio** que nadie fusiona, y el motivo es concreto: el proyecto **no tenía ni una prueba**. Fusionar sesenta y un parches de desconocidos sin red es echarlo a cara o cruz, así que nadie lo hizo en cuatro años.

Por eso lo primero que se hizo aquí no fue una función. Fue la red.

| | Original | HttpKeeper |
|---|---|---|
| Pruebas | 0 | **37** (16 unitarias, 21 de integración contra un servidor de verdad) |
| Vulnerabilidades en dependencias | 75 (6 críticas) | **0** |
| Paquetes | 1.487 | **399** |
| Telemetría | Application Insights | **ninguna** |

`aws-amplify` —el SDK entero de AWS, con GraphQL, DataStore y predicción automática— entraba para hacer un inicio de sesión de Cognito. Ahora son sesenta líneas que hablan con Cognito por HTTP: **1.088 paquetes menos**.

## Lo que se arregló

Tres fallos que sus usuarios llevaban años sufriendo: la respuesta que **no aparecía en Cursor**, una petición reenviada que salía con las cabeceras ya manipuladas, y un JSONPath con varios resultados que devolvía solo el primero sin decir nada.

Y dos propuestas **rechazadas** después de probarlas: una que decía arreglar IPv6 y lo que hacía era romper `localhost`, y la más votada de todas, que ejecutaba órdenes del sistema tomadas del propio fichero `.http`.

## Lo que se añadió

Tres cosas pedidas desde 2018, cada una con sus votos:

**Ejecutar todas las peticiones de un fichero, en orden** (+62 votos). Cada una usa lo que devolvieron las anteriores.

![El token de una respuesta usado en la petición siguiente](https://raw.githubusercontent.com/TecniartGalicia/httpkeeper/master/media/shots/02-chain.png)

**Comprobaciones escritas en el fichero** (+59 votos), como comentarios `@`, de modo que cualquier otra herramienta que lea el formato las ignore:

```http
# @name login
POST {{host}}/auth
Content-Type: application/json

{"user": "ana"}

# @assert status == 200
# @assert body.$.token exists
# @assert header.content-type contains json
# @assert time < 2000
```

**Un ejecutor de terminal** (+44 votos). El mismo fichero, en tu integración continua:

```console
$ httpkeeper api.http
  ok   login                200  184 ms
  ok   facturas             200    9 ms

2 peticiones, todo en verde
```

![El mismo fichero, ejecutado en la terminal integrada](https://raw.githubusercontent.com/TecniartGalicia/httpkeeper/master/media/shots/04-runner.png)

Devuelve 0 si todas las comprobaciones pasan y 1 si falla alguna. Con `--json` para las máquinas. Eso es todo lo que un servidor de integración necesita.

## Venir desde REST Client

No hay que hacer nada. El formato `.http` es idéntico —lo usa hasta JetBrains— y **tus ajustes `rest-client.*` se siguen leyendo**, así que ocho años de configuración siguen funcionando. Los tuyos propios de `httpkeeper.*` mandan en cuanto los pongas. El historial, las cookies y los entornos se leen de la misma carpeta `~/.rest-client`, así que también te los llevas.

La interfaz está en castellano y en inglés.

## Lo que no hace

Ni interfaz tipo Postman, ni colecciones en la nube, ni sincronización de equipo, ni cuentas. El producto es un fichero de texto en tu repositorio y así se queda.

El ejecutor de terminal usa su propio lector del formato: método, dirección, cabeceras, cuerpo escrito y cuerpo desde fichero con `< ruta`. El cURL pegado y los formularios multiparte funcionan en el editor, todavía no en la terminal.

## Reconocimiento

Todo el comportamiento bien resuelto que hay aquí dentro es obra de Huachao Mao, y sigue bajo MIT. Los cambios se le ofrecen de vuelta. Si el original vuelve a la vida, mejor para todos.

---

Argalla · Tecniart Galicia, S.L. — [English](README.md)

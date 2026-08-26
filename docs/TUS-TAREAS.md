# Tus tareas — HttpKeeper

**Estado (2026-08-26): PUBLICADA.** 1.0.0 está en el Marketplace de Visual Studio, en Open VSX y en GitHub.

| | |
|---|---|
| Marketplace | https://marketplace.visualstudio.com/items?itemName=argalla.httpkeeper |
| Open VSX | https://open-vsx.org/extension/argalla/httpkeeper |
| Repositorio | https://github.com/TecniartGalicia/httpkeeper |
| Instalar | `ext install argalla.httpkeeper` |

Los secretos `VSCE_PAT` y `OVSX_PAT` ya están en el repositorio: a partir de ahora **`git tag vX.Y.Z && git push --tags` publica solo** en las dos tiendas y adjunta el `.vsix` a la publicación de GitHub, después de pasar toda la batería en Linux. Si una tienda ya tiene la versión, se la salta.

---

## 1. Llegar al público — [MARKETING.md](MARKETING.md)

El plan completo, con calendario y **todos los textos listos para pegar** (A–I): la incidencia de cortesía al autor, los comentarios en las incidencias más votadas del original (#1394 «piden mantenedor», #1434 Cursor, #267, #724, #432), Show HN, hilo de X, LinkedIn, Reddit y el guion del artículo. Lo publicas tú desde tus cuentas; yo redacto y contesto a los comentarios.

Orden: hoy A y B; mañana C y D; día 3 E, F y G; día 4 H; día 5 I. Apunta cada uno en la tabla del final del plan.

## 2. Mirar la ficha con ojos de cliente

Las capturas y el GIF están en `media/shots/`. Si algo no te convence, `npm run demo` los rehace y una versión nueva (`1.0.1`) actualiza la ficha.

---

## Cumplimiento de copyright (auditado el 2026-08-26)

| Exigencia | Cómo se cumple |
|---|---|
| MIT del original: conservar el aviso de copyright y el permiso | `LICENSE` lleva `Copyright (c) 2016 - present Huachao Mao` verbatim y el texto MIT completo; añade el nuestro sin quitar el suyo |
| Atribución | README (ambos idiomas), CHANGELOG, `contributors` del manifiesto, y los 840 commits del autor original conservados en el historial |
| Licencias de las dependencias | 171 paquetes de producción: MIT, ISC, BSD-2, BSD-3 y Apache-2.0. Ninguno copyleft ni desconocido |
| BSD y Apache: reproducir el aviso en la distribución binaria | `THIRD-PARTY-NOTICES.txt` viaja en el `.vsix` con la licencia de cada paquete |
| Marca | Nombre propio (HttpKeeper), icono propio, «REST Client» sólo para nombrar el original; ningún activo gráfico suyo viaja aquí |
| Comprobación continua | `npm run audit` falla si cualquiera de las anteriores deja de cumplirse |

## Lo que queda pendiente en el producto (no urgente)

- `adal-node` (Azure AD) está deprecado por Microsoft. Migrarlo no se puede probar sin credenciales de Azure, así que se queda con las versiones parcheadas por `overrides`.
- Cuatro propuestas del original quedaron por revisar: #1359, #1427, #1336 y #664.
- El runner de terminal no entiende todavía cURL pegado ni formularios multiparte; en el editor sí funcionan.

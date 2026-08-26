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

## 1. Redes (lo redacto yo, lo publicas tú)

Todavía no hay borradores. Dime cuándo y los escribo para X, LinkedIn y, si quieres, dev.to y Reddit.

Un aviso que conviene tener pensado: esto es un fork de un proyecto muy querido con 7,5 millones de instalaciones. El mensaje tiene que ser «recogido y mantenido, con crédito al autor», nunca «mejor que el suyo». En `docs/PRS-REVISADOS.md` está el trabajo hecho sobre sus 61 propuestas, que es el argumento honesto.

## 2. Avisar al autor original (opcional, pero elegante)

Un mensaje breve a Huachao Mao —una incidencia en su repositorio o un correo— diciendo que existe el fork, que conserva su crédito y su licencia, y que los cambios se le ofrecen de vuelta. Lo redacto cuando quieras; lo envías tú.

## 3. Mirar la ficha con ojos de cliente

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

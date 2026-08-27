# Tus tareas — HttpKeeper

**Estado (2026-08-27): 1.1.0 lista** (formato JetBrains completo, streaming, herramientas para agentes y el runner en todas partes). Se publica con la etiqueta `v1.1.0`: el flujo de release pasa la batería en Linux, publica en el Marketplace y en Open VSX y adjunta el `.vsix` y `httpkeeper-cli.js` a la publicación de GitHub.

| | |
|---|---|
| Marketplace | https://marketplace.visualstudio.com/items?itemName=argalla.httpkeeper |
| Open VSX | https://open-vsx.org/extension/argalla/httpkeeper |
| Repositorio | https://github.com/TecniartGalicia/httpkeeper |
| Instalar | `ext install argalla.httpkeeper` |

---

## 1. Publicar el runner en npm (cinco minutos, y necesita tu sesión)

npm exige un inicio de sesión interactivo, así que esto es lo único de la publicación que no puedo hacer yo. El paquete está preparado y probado (`npm pack --dry-run`: 4 ficheros, 12 KB, sin dependencias):

```powershell
cd C:\Users\kirne\Desktop\Apps\restclient-fork
npm run build
npm run preparar-npm
cd npm
npm login          # abre el navegador; cuenta de npm de Argalla (o créala en npmjs.com)
npm publish --access public
```

Con eso funcionan `npx httpkeeper api.http` y la configuración MCP del README (`npx httpkeeper mcp`). La acción de GitHub **no** depende de npm: descarga el runner de la publicación de GitHub.

## 2. Anunciar la 1.1.0 donde la pedían — [MARKETING.md](MARKETING.md)

Cada función nueva cierra incidencias concretas del original. Un comentario distinto en cada una, corto, factual, con enlace; te los dejo escritos en el cuadro como con los anteriores:

| Incidencia | Qué se anuncia |
|---|---|
| #229, #627 | `http-client.env.json` público/privado |
| #182, #845, #1148 | `import`, `run #nombre`, variables entre ficheros |
| #279 | `{{$secret}}` |
| #493 | SSE en vivo en el panel |
| #173 | `WEBSOCKET` |
| #432 | `--junit`, npm, acción de GitHub |

Y el hilo #1394 (donde ya estamos) merece una línea: «1.1.0 out: JetBrains format, streaming, agents».

## 3. Mirar la ficha con ojos de cliente

Las capturas y el GIF están en `media/shots/` (nuevo plano `05-stream.png`, la respuesta de una API de modelos llegando evento a evento). `npm run demo` los rehace.

---

## Cumplimiento de copyright (auditado el 2026-08-26, revisado con la 1.1.0)

| Exigencia | Cómo se cumple |
|---|---|
| MIT del original: conservar el aviso de copyright y el permiso | `LICENSE` lleva `Copyright (c) 2016 - present Huachao Mao` verbatim y el texto MIT completo; añade el nuestro sin quitar el suyo |
| Atribución | README (ambos idiomas), CHANGELOG, `contributors` del manifiesto, y los 840 commits del autor original conservados en el historial |
| Licencias de las dependencias | 171 paquetes de producción: MIT, ISC, BSD-2, BSD-3 y Apache-2.0. Ninguno copyleft ni desconocido. La 1.1.0 **no añade ninguna dependencia** (WebSocket y MCP van con lo que trae Node) |
| BSD y Apache: reproducir el aviso en la distribución binaria | `THIRD-PARTY-NOTICES.txt` viaja en el `.vsix` con la licencia de cada paquete |
| Marca | Nombre propio (HttpKeeper), icono propio, «REST Client» sólo para nombrar el original; ningún activo gráfico suyo viaja aquí |
| Comprobación continua | `npm run audit` falla si cualquiera de las anteriores deja de cumplirse |

## Lo que queda pendiente en el producto (no urgente)

- Del formato JetBrains: `run #x (@var = valor)` con variables en línea y los scripts `> {% … %}` (JS aislado; sólo con el aislamiento probado, la lección del #532).
- `adal-node` (Azure AD) está deprecado por Microsoft. Migrarlo no se puede probar sin credenciales de Azure.
- Cuatro propuestas del original quedaron por revisar: #1359, #1427, #1336 y #664.
- Chino simplificado (la infraestructura de traducción ya está; falta la traducción).

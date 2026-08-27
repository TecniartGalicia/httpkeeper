# HttpKeeper, nivel 2 — análisis de mejoras

> **Estado 2026-08-27: EJECUTADO y publicado como 1.1.0.** Las cuatro fases están hechas y auditadas (52 pruebas, runner 15/15, MCP 14/14, auditoría 0 fallos, `.vsix` instalado en limpio). Lo que quedó fuera: `run` con variables en línea y los scripts `{% %}` de JetBrains; la publicación en npm es del humano (ver `TUS-TAREAS.md`).

Fecha: 2026-08-27. Estado de partida: 1.0.0 publicada, «fork mantenido de REST Client». La pregunta es qué lo convierte en **el cliente HTTP en texto que la gente elige en 2026**, no en un REST Client con parches.

## 1. Lo que dice el mercado (cifras de hoy)

| Extensión | Instalaciones | Valoración | Última versión |
|---|---|---|---|
| REST Client | 7,52 M | 4,91 (388) | 2022-08 |
| **Thunder Client** | 7,47 M | **2,39 (751)** | 2026-08 |
| httpyac | 135 k | 4,96 (27) | 2025-03 |
| HttpKeeper | 1.ᵉʳ día | — | 2026-08 |

Tres lecturas:

1. **Thunder Client tiene 751 valoraciones y un 2,39**: siete millones de usuarios enfadados por el muro de pago. Es el mayor grupo de gente buscando alternativa que existe en la tienda, y hoy no tiene un destino claro en formato texto. «Sin muro de pago» ya está en nuestra primera frase; falta que nos encuentren.
2. **httpyac es el más completo** (GraphQL, gRPC, WebSocket, MQTT, scripts) pero lleva 17 meses sin versión y, en palabras del hilo #1394, «hace posible lo difícil y complica lo fácil». Su hueco es el nuestro: lo fácil, fácil.
3. **JetBrains es el estándar del formato** en la otra mitad del mundo. Todo `.http` que genera IntelliJ, Copilot o ChatGPT sale con su sintaxis. Ningún cliente de VS Code la lee completa.

## 2. Lo que pide la gente (votos abiertos en el original, agrupados)

| Familia | Incidencias | Votos | Estado en 1.0 |
|---|---|---|---|
| Entornos, ficheros compartidos y variables entre ficheros | #182, #229, #627, #845, #1148, #943, #402 | **~235** | nada |
| Streaming (SSE, WebSocket) | #493, #173 | 72 | nada |
| Scripts en el fichero | #521 | 29 | rechazado como exec de shell; el JS aislado es otra cosa |
| Secretos y OAuth interactivo | #279, #302 | 48 | `$dotenv` y `$processEnv` heredados |
| Pruebas, secuencia, CLI | #267, #724, #444, #432 | 191 | **hecho** |

La familia grande no es una función: es **leer el formato JetBrains entero**. Es la mejora con más votos, la que más gente trae (equipos mixtos IntelliJ/VS Code) y la que nadie tiene completa.

## 3. Lo que el código permite

- El núcleo (secuencia, aserciones, runner) está desacoplado del editor: 637 líneas sin `vscode`. Cualquier cosa que se apoye ahí sirve a la vez para el editor, la terminal y —ver §4.C— para agentes.
- La respuesta llega como un buffer completo (`got`, `responseType: 'buffer'`): el streaming exige tocar `httpClient.ts` y el panel, no el parser.
- No hay rastro de `http-client.env.json`, `import`, `EventSource` ni `WebSocket`. Todo es terreno nuevo, sin deuda que deshacer.
- El nombre `httpkeeper` está libre en npm.

## 4. Las cuatro palancas, por orden

### A. Formato JetBrains completo — «tus ficheros funcionan sin tocarlos»

- `http-client.env.json` y `http-client.private.env.json` junto al fichero: entornos sin ajustes de VS Code, versionables, con la parte privada fuera de git (#229, #627).
- `import ./comun.http` y `run #nombre`: ficheros compartidos y peticiones reutilizables (#182, #845).
- Variables de petición entre ficheros (#1148, #943) y variables compartidas (#402).
- `{{$secret NOMBRE}}` sobre el almacén de secretos de VS Code, para que un `.http` se pueda commitear entero (#279).

Por qué es el salto: convierte «fork de REST Client» en «el cliente que lee el estándar». Cada equipo que use IntelliJ y VS Code, y cada fichero que escriba una IA, funciona a la primera. Esfuerzo: dos semanas. Riesgo: bajo (parser y proveedores de variables, con pruebas).

### B. Streaming — «prueba tu API de IA desde un fichero»

- `text/event-stream` pintado evento a evento en el panel, con `# @assert` sobre los eventos y soporte en el runner (#493).
- WebSocket básico: abrir, enviar, ver mensajes (#173).

Por qué: en 2026 toda API de modelos (OpenAI, Anthropic, Ollama, la nuestra de LiteLLM) responde en streaming, y ni REST Client ni Thunder lo muestran en vivo. Es la demostración que más se comparte. Esfuerzo: dos semanas (stream de `got` + render incremental en el webview). Riesgo: medio (cuidar memoria y cancelación).

### C. El cliente HTTP que usan los agentes — donde no hay nadie

- Herramienta de modelo de lenguaje en VS Code (`vscode.lm.registerTool`): Copilot Chat o Claude en el editor pueden **enviar la petición del fichero abierto y leer la respuesta** («¿por qué me devuelve 401?» → el agente la ejecuta y lo ve).
- Servidor MCP (`httpkeeper mcp`) sobre el runner: Claude Code, Cursor o cualquier agente ejecuta ficheros `.http` como herramienta, con la salida `--json` que ya existe.
- Siempre con confirmación del usuario configurable: un agente no envía nada sin permiso.

Por qué: es la única de las cuatro que **nadie tiene**, encaja con hacia dónde va el editor, y nos cuesta poco porque el núcleo ya no depende del editor. Es el titular de la 2.0. Esfuerzo: dos o tres semanas. Riesgo: medio (seguridad; diseñarlo cerrado por defecto).

### D. El runner en todas partes — distribución, no funciones

- Publicar `httpkeeper` en npm: `npx httpkeeper api.http` en cualquier CI sin VS Code. Un canal de descubrimiento nuevo.
- Acción de GitHub (`TecniartGalicia/httpkeeper-action`) y salida `--junit` para que GitHub y GitLab pinten los resultados como pruebas.
- cURL pegado y multiparte en el runner (las dos limitaciones documentadas).

Por qué: quien adopta el runner en CI instala la extensión después. Esfuerzo: una semana. Riesgo: bajo.

### Lo que también suma y cuesta poco

- **Chino simplificado** (y japonés, portugués de Brasil): la base de REST Client es en buena parte china; la infraestructura de traducción ya está y se comprueba sola. Un README en zh-CN.
- **Ficha**: categoría «Testing» (existe y no la usamos), y una comparación honesta con Thunder Client centrada en el muro de pago: es la búsqueda que más gente está haciendo.
- **Scripts aislados** (`> {% ... %}` de JetBrains): JS en una caja sin `require`, sin `process`, con límite de tiempo. Paridad con JetBrains y httpyac. Después de A, y sólo con el aislamiento probado: la lección del #532.

### Lo que no hacer

Interfaz gráfica (es el terreno de Thunder y perderíamos lo que nos hace ligeros), nube y cuentas (es lo que la gente huye), gRPC/MQTT/AMQP (nicho de httpyac, mucho coste, poco público), extensión web para vscode.dev (obligaría a reescribir el transporte).

## 5. Hoja de ruta propuesta

| Versión | Contenido | Semanas | Con qué se anuncia |
|---|---|---|---|
| 1.1 | A: formato JetBrains completo + `$secret` | 2 | #229, #627, #182, #845, #1148 (~235 votos) |
| 1.2 | B: SSE en panel y runner; WebSocket básico | 2 | #493, #173; demo con una API de IA |
| 1.3 | D: npm, acción de GitHub, `--junit`, cURL y multiparte en el runner | 1 | dev.to, r/devops |
| 2.0 | C: herramienta para agentes + servidor MCP; scripts aislados | 3 | Show HN de verdad: «el cliente HTTP que usan los agentes» |

Ocho semanas. Cada versión es una ola de comunicación legítima, que es exactamente lo que el plan de público necesita: publicar pequeño y a menudo. En paralelo, zh-CN y la ficha.

**Recomendación:** empezar por A. Es la de más votos, la de menos riesgo, la que trae más gente nueva, y deja el parser preparado para todo lo demás.

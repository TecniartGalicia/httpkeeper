# Comentarios para anunciar la 1.1.0 (uno por incidencia, distintos, publicados por el humano)

Repositorio: https://github.com/Huachao/vscode-restclient — Marketplace: https://marketplace.visualstudio.com/items?itemName=argalla.httpkeeper

## #229 / #627 — ficheros de entorno de JetBrains

> HttpKeeper 1.1.0 (maintained fork) now reads `http-client.env.json` and `http-client.private.env.json` next to the `.http` file, the JetBrains way: the private one wins and belongs in `.gitignore`, the public one is what the team shares. Environments from the files show up in the environment picker alongside the ones from settings. Same format, so an IntelliJ project works unchanged in VS Code. https://github.com/TecniartGalicia/httpkeeper#the-jetbrains-format-complete-235-votes

## #182 / #845 / #1148 — import, run y variables entre ficheros

> This is in HttpKeeper 1.1.0 (maintained fork): `import ./common.http` brings in a file's `@variables` and its named requests, `run #login` executes one of them, and `{{login.response.body.$.token}}` resolves in any file that imports the one with `login`, once it has been sent. Same syntax as IntelliJ. The terminal runner understands it too. https://github.com/TecniartGalicia/httpkeeper#the-jetbrains-format-complete-235-votes

## #279 — secretos

> HttpKeeper 1.1.0 (maintained fork) adds `{{$secret NAME}}`: the value lives in VS Code's encrypted secret storage and is asked for the first time the file uses it, so the `.http` file can be committed whole. In CI the same file takes `--secret NAME=value` or `HTTPKEEPER_SECRET_NAME`. https://github.com/TecniartGalicia/httpkeeper

## #493 — text/event-stream

> HttpKeeper 1.1.0 (maintained fork) paints `text/event-stream` responses in the panel as the events arrive — the way LLM APIs answer — and Cancel keeps what came in. `# @assert sse.count == 3` / `sse.last` work in the editor and in the terminal runner. Screenshot: https://raw.githubusercontent.com/TecniartGalicia/httpkeeper/master/media/shots/05-stream.png

## #173 — WebSocket

> HttpKeeper 1.1.0 (maintained fork) has a basic `WEBSOCKET wss://…` with the JetBrains syntax: messages in the body separated by `===`, `# @timeout 3000` to say how long to listen, and a transcript (`>>` sent, `<<` received) as the response, with `ws.count` / `ws.last` assertions. It uses the WebSocket built into Node 22+, no extra dependency. https://github.com/TecniartGalicia/httpkeeper#streaming-72

## #432 — runner de terminal

> Update for the maintained fork: the runner now writes JUnit (`--junit report.xml`) for GitHub/GitLab test dashboards, reads pasted `curl` commands and multipart bodies with `< file`, ships as `npx httpkeeper-cli` and as a GitHub Action (`TecniartGalicia/httpkeeper@v1`), and `httpkeeper mcp` exposes the same thing to agents over MCP. https://github.com/TecniartGalicia/httpkeeper#the-runner-everywhere-44

## #1394 — el hilo del mantenedor (una línea)

> 1.1.0 is out: the full JetBrains format (env files, import/run, secrets), SSE and WebSocket, tools for agents (VS Code language-model tools and an MCP server) and the runner on npm and as a GitHub Action. Changelog: https://github.com/TecniartGalicia/httpkeeper/blob/master/CHANGELOG.md

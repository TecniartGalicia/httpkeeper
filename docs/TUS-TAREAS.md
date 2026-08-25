# Tus tareas — HttpKeeper 1.0.0

Todo lo que se podía hacer sin ti está hecho. Esto es lo que necesita tu mano o tu permiso, en orden.

**Estado:** listo para publicar, **sin publicar**, tal y como pediste.

---

## 1. Decir «publica»

En cuanto lo digas, yo hago (por este orden):

1. `git push` del repositorio a `github.com/TecniartGalicia/httpkeeper` (hoy sólo existe en local).
2. Etiqueta `v1.0.0`.
3. Marketplace de Visual Studio, Open VSX y publicación de GitHub con el `.vsix`.

Nada de eso está hecho todavía. El repositorio **no existe aún en GitHub**: crearlo es publicar el código, y no lo hago hasta que lo digas.

## 2. Dos secretos en el repositorio (si quieres que publique el CI)

Si prefieres que publique la máquina en vez de yo a mano, el repositorio necesita dos secretos:

| Secreto | De dónde sale |
|---|---|
| `VSCE_PAT` | Azure DevOps → token con permiso *Marketplace: Manage* para el editor `argalla` |
| `OVSX_PAT` | open-vsx.org → *Access Tokens* |

Con ellos puestos, `git tag v1.0.0 && git push --tags` publica en las dos tiendas y adjunta el `.vsix`. El flujo comprueba antes que la etiqueta cuadra con `package.json`, que el crédito a Huachao Mao sigue en el README y en la licencia, y pasa toda la batería. Si una tienda ya tiene esa versión, se la salta en vez de fallar.

Si prefieres que lo haga yo a mano, no hace falta ningún secreto: publico con tu PAT como en las anteriores.

## 3. Mirar la ficha antes de que la vea nadie

- **Capturas**: `media/shots/` — cuatro imágenes y un GIF de 0,27 MB, grabados con la extensión de verdad contra un servidor local. Si alguna no te gusta, `npm run demo` las vuelve a hacer.
- **Textos**: [README.md](../README.md) (inglés, es el que muestra el Marketplace) y [README.es.md](../README.es.md).
- Las imágenes de la ficha se sirven desde `raw.githubusercontent.com`, así que **hasta que el repositorio no esté subido, en el Marketplace saldrían rotas**. Por eso el orden es: subir el repo primero, publicar después.

## 4. Redes, cuando esté publicada

Lo redacto yo, lo publicas tú (como siempre). Todavía no hay borradores: los escribo cuando digas, para que hablen de algo que ya se pueda instalar.

Un aviso que sí conviene tener pensado: esto es un fork de un proyecto muy querido con 7,5 millones de instalaciones. El mensaje tiene que ser «recogido y mantenido, con crédito al autor», nunca «mejor que el suyo». En `docs/PRS-REVISADOS.md` está el trabajo hecho sobre sus 61 propuestas, que es el argumento honesto.

---

## Lo que ya está hecho (para que no lo repases)

| | |
|---|---|
| Pruebas | 37 (16 unitarias + 21 de integración contra un servidor real) |
| Runner de terminal | 11 comprobaciones de punta a punta |
| El `.vsix` instalado | se instala en un VS Code limpio y se ejercita ahí (`npm run test:vsix`) |
| Auditoría | 60 comprobaciones, 0 fallos (`npm run audit`) |
| Vulnerabilidades | 0 en dependencias de producción |
| Idiomas | inglés y castellano, interfaz completa, comprobado que no falta ni sobra ninguna clave |
| Icono | propio; ningún activo del proyecto original viaja aquí |
| Licencia | MIT, con el copyright de Huachao Mao intacto y el nuestro añadido |
| Paquete | 1,03 MB, 34 ficheros, sin código fuente ni mapas dentro |

Todo eso se vuelve a comprobar de una vez con `npm run check`.

## Lo que queda pendiente en el producto (no bloquea publicar)

- `adal-node` (Azure AD) está deprecado por Microsoft. Migrarlo no se puede probar sin credenciales de Azure, así que se queda con las versiones parcheadas por `overrides`.
- Cuatro propuestas del original quedaron por revisar: #1359, #1427, #1336 y #664.
- El runner de terminal no entiende todavía cURL pegado ni formularios multiparte; en el editor sí funcionan.

# HttpKeeper — plan auditado

Argalla · Tecniart Galicia, S.L. · 24 de agosto de 2026

Fork mantenido de [REST Client](https://github.com/Huachao/vscode-restclient) (MIT, © Huachao Mao), la extensión de cliente HTTP con 7,5 millones de instalaciones y nota 4,9 que lleva **desde junio de 2022 sin un release**.

El análisis de mercado está en `ideasVs/14-FASE0-CLIENTE-HTTP.md`. Este documento es el plan de ejecución.

---

## 1. Lo que se comprobó antes de escribir una línea

| Sonda | Resultado |
|---|---|
| ¿Ha entrado el fabricante del editor? | **No.** VS Code 1.134 no tiene **ni un comando** de HTTP ni el lenguaje `.http` (volcado de sus 3.115 comandos) |
| ¿Funciona el código de 2022 en VS Code 1.134? | **Sí.** Tres pruebas de integración escritas para esto: GET, POST con cabeceras y cuerpo, y sustitución de variables. Las tres en verde |
| ¿Compila hoy? | **Sí**, con TypeScript 5.4 y `skipLibCheck`. Los únicos errores vienen de los tipos de `@aws-amplify`, no del código propio |
| ¿Cuánto es? | **7.508 líneas** en 77 ficheros · **cero tests** · 32 dependencias de producción |
| ¿Qué arrastra? | **75 vulnerabilidades** en dependencias de producción: **6 críticas**, 24 altas. Y telemetría (`src/utils/telemetry.ts`, Application Insights) |
| ¿Cuánto pesa? | Bundle de **4,79 MB**; `@aws-amplify` son 17 MB en disco para una función usada en 2 ficheros |
| ¿Está libre el nombre? | `argalla.httpkeeper` libre en Marketplace y en Open VSX |

**El diagnóstico en una frase:** el producto funciona y la gente lo quiere; lo que falta es mantenimiento, y lo que impide mantenerlo es que **sin una sola prueba nadie se atreve a mergear los 61 PRs abiertos**.

---

## 2. Decisiones

| # | Decisión | Motivo | Alternativa descartada |
|---|---|---|---|
| **D1** | **Fork, no reescritura** | 7.508 líneas que ya hacen lo que 7,5M de personas usan a diario. Reescribir sería tirar ocho años de casos límite | Empezar de cero |
| **D2** | **Compatibilidad total del formato `.http`** | Es un estándar de facto: JetBrains usa el mismo. Los ficheros de todo el mundo funcionan desde el minuto uno | Formato propio |
| **D3** | **Los ajustes `rest-client.*` se siguen leyendo** como respaldo de los propios | Quien migre no pierde su configuración de ocho años. Es la diferencia entre probar la alternativa y no probarla | Obligar a reconfigurar |
| **D4** | **Comandos e identificadores propios** (`httpkeeper.*`) | Dos extensiones no pueden pelearse por el mismo id de comando si alguien tiene las dos instaladas | Reusar `rest-client.*` |
| **D5** | **Tests antes que funciones** | Es la causa raíz del estancamiento y la única ventaja real que traemos. Sin red no se pueden mergear 61 PRs ajenos | Empezar por lo vistoso |
| **D6** | **Fuera la telemetría**, sin sustituto | La queja número uno del nicho es la privacidad y el abuso. Cero red salvo las peticiones que el usuario pide | Telemetría anónima «inofensiva» |
| **D7** | **Adelgazar dependencias**, empezando por las vulnerables | 6 vulnerabilidades críticas en algo que usan millones. `@aws-amplify` (17 MB) por una función de dos ficheros | Dejarlo como está |
| **D8** | **Crédito explícito y visible** al autor original, en README, ficha y licencia | Es MIT y es legítimo, pero un fork sin crédito es una mala forma de empezar. Y los cambios se ofrecen de vuelta | Publicar sin más |
| **D9** | **Gratis, sin cuenta, sin nube, sin límites** | Es literalmente la queja del líder odiado: 55 % de sus reseñas negativas son por el muro de pago | Modelo freemium |
| **D10** | Las tres funciones grandes —**secuencias, aserciones, runner de CLI**— van después de la 1.0 | Son las peticiones más votadas (+62, +59, +44) y lo que responde a Thunder Client, pero primero hay que tener base sana | Meterlas en la primera versión |

---

## 3. Fases

| Fase | Contenido | Criterio de salida |
|---|---|---|
| **F1 · Red de seguridad** | Suite de integración que envía peticiones reales contra un servidor local: métodos, cabeceras, cuerpo, variables, entornos, redirecciones, errores, timeouts | La suite cubre lo que tocan los 61 PRs |
| **F2 · Limpieza** | Telemetría fuera, dependencias vulnerables actualizadas, `@aws-amplify` sustituido, bundle por debajo de 1 MB | 0 vulnerabilidades críticas y altas · suite en verde |

| **F3 · Identidad** | Renombrado, icono, README bilingüe con crédito, CI en tres plataformas, l10n ES/EN | Publicable |
| **F4 · Deuda de la comunidad** | Revisar los 61 PRs y mergear los que pasen la suite. Cerrar los issues ya resueltos | Cada merge con su prueba |
| **F5 · Publicación** | Marketplace y Open VSX el mismo día | Instalable desde tienda |
| **F6 · Lo que llevan ocho años pidiendo** | Secuencias · aserciones · runner de CLI | Cada una con pruebas |

### Estado de F2 · 24 de agosto

| | Antes | Ahora |
|---|---|---|
| Vulnerabilidades en producción | **75** (6 críticas, 24 altas) | **5** (0 críticas, 4 altas) |
| Paquetes | 1.487 | 399 |
| Bundle | 4,79 MB | 3,11 MB |
| Telemetría | Application Insights | **ninguna** |

Hecho: telemetría eliminada de raíz (fichero, decorador, ajuste, clave y dependencia); `aws-amplify` sustituido por 60 líneas que hablan con Cognito por HTTP —**1.088 paquetes menos**—; `xmldom` migrado a `@xmldom/xmldom`; `jsonpath-plus` y `httpsnippet` actualizados; tipos de Node alineados.

**Pendiente, y a propósito:** `adal-node` (deprecado por Microsoft, arrastra `axios` y `uuid`) da soporte a la autenticación de Azure AD. Su sustituto es `@azure/msal-node`, pero **no hay forma de probar esa migración sin credenciales de Azure**, y la regla de este plan es que nada se toca sin prueba. Queda anotado como el siguiente trabajo de F2, con su prueba antes.

---

## 4. Pruebas

La suite arranca un servidor HTTP local y comprueba el comportamiento de punta a punta, porque es lo único que demuestra que un cliente HTTP funciona.

| # | Prueba | Estado |
|---|---|---|
| P-01 | GET simple: llega la petición y se muestra la respuesta | **verde** |
| P-02 | POST con cabeceras y cuerpo | **verde** |
| P-03 | Variables de fichero (`@var` y `{{var}}`) | **verde** |
| P-05 | Códigos 4xx y 5xx: se muestran con su cuerpo, no se tragan | **verde** |
| P-06 | Sigue una redirección hasta el destino | **verde** |
| P-07 | Una respuesta lenta acaba llegando | **verde** |
| P-08 | Varias peticiones separadas por `###`: se envía la del cursor | **verde** |
| P-09 | Formato de respuesta: JSON indentado, texto plano, XML | **verde** (3) |
| P-10 | Un ajuste heredado de `rest-client` se respeta (D3) | **verde** |
| P-12 | JSONPath extrae un valor de la respuesta anterior | **verde** |
| P-13 | XPath extrae un valor de una respuesta XML | **verde** |
| P-14 | Se lee una cabecera de la respuesta anterior | **verde** |
| P-04 | Variables de entorno y cambio de entorno | pendiente |
| P-11 | Ninguna petición de red que no haya pedido el usuario (D6) | pendiente |
| P-15 | Generación de snippet de código (cubre `httpsnippet`) | pendiente |

**15 pruebas en verde.** Dos aprendizajes que quedan en el código: la extensión
**reutiliza** el documento de respuesta entre peticiones —así que una prueba no
puede buscar «un documento nuevo»— y por defecto **la respuesta se lleva el
foco**, lo que hacía que la segunda petición de una cadena se ejecutase sobre el
documento equivocado.

## 5. Riesgos

| Riesgo | Control |
|---|---|
| Heredar 529 issues y no poder con la comunidad | Se cierran de entrada los ya resueltos; se etiqueta el resto. Nunca se promete lo que no se va a hacer |
| El autor original vuelve | Crédito visible desde el primer día y los cambios se le ofrecen de vuelta. Si vuelve, mejor para todos |
| Romper a los usuarios que migran | D3: los ajustes viejos se siguen leyendo. Y el formato es idéntico |
| Thunder Client rectifica y cierra la fuga | No se controla. Es un argumento para ir pronto, no para correr y hacerlo mal |
| Que el fork sea peor que el original | La suite existe justo para eso: nada se mergea sin prueba |
| Dependencias con 6 vulnerabilidades críticas | F2 es bloqueante para publicar |

## 6. Lo que este plan no cubre

Interfaz gráfica tipo Postman, colecciones en la nube, sincronización entre equipos, y cualquier cosa que necesite una cuenta. El producto es un fichero de texto en tu repositorio y así se queda.

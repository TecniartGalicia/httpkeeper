// Vigía diario de los hilos donde HttpKeeper ha hablado.
//
// Lee el registro de docs/MARKETING.md (toda URL de incidencia que aparezca
// ahí queda vigilada sola), más las incidencias del propio repositorio y las
// reseñas de las dos tiendas. Guarda lo que ya vio en vigia/estado.json y solo
// cuenta como novedad lo que no estaba: comentarios de otros, reacciones que
// suben, incidencias nuevas, reseñas nuevas. El informe va a vigia/ (uno por
// día) y una copia al escritorio; si hay algo, avisa con una notificación.
//
// No publica nada. Responder sigue siendo cosa del humano.
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CARPETA = path.join(RAIZ, 'vigia');
const ESTADO = path.join(CARPETA, 'estado.json');
const NOSOTROS = 'TecniartGalicia';
const REPO_PROPIO = 'TecniartGalicia/httpkeeper';
// Repositorios cuyas incidencias nuevas y comentarios interesan enteros (no
// solo hilos concretos): el nuestro y el de la organización comunitaria.
const REPOS_VIGILADOS = [REPO_PROPIO, 'vscode-restclient/vscode-restclient'];
const ORGANIZACION = 'vscode-restclient';
const EXTENSION = 'argalla.httpkeeper';
const AHORA = new Date();

fs.mkdirSync(CARPETA, { recursive: true });
const estado = fs.existsSync(ESTADO) ? JSON.parse(fs.readFileSync(ESTADO, 'utf8')) : { primeraVez: true };
// La primera pasada fija el punto de partida: lo anterior no es novedad.
const desde = estado.ultimaComprobacion ? new Date(estado.ultimaComprobacion) : AHORA;
const PROBAR_AVISO = process.argv.includes('--aviso');

// Con token hay 5.000 peticiones/hora; sin él, 60. Para un vistazo diario
// bastan las 60, así que si el gestor de credenciales no responde se sigue.
let token = '';
try {
    const cred = execSync('git credential fill', { input: 'protocol=https\nhost=github.com\n\n', encoding: 'utf8', timeout: 15000 });
    token = /^password=(.*)$/m.exec(cred)?.[1] ?? '';
} catch { /* anónimo */ }

const gh = async (ruta) => {
    const r = await fetch(`https://api.github.com${ruta}`, {
        headers: { accept: 'application/vnd.github+json', 'user-agent': 'httpkeeper-vigia', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    });
    if (!r.ok) throw new Error(`${ruta}: HTTP ${r.status}`);
    return r.json();
};
const json = async (url, opciones) => { const r = await fetch(url, opciones); if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`); return r.json(); };

const corto = (s, n = 220) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const fecha = (iso) => iso.slice(0, 16).replace('T', ' ') + ' UTC';
const reaccionesTexto = (r) => {
    const partes = [];
    for (const [k, v] of Object.entries(r ?? {})) if (!['url', 'total_count'].includes(k) && v > 0) partes.push(`${k}:${v}`);
    return partes.length ? partes.join(' ') : 'ninguna';
};

const novedades = [];
const resumen = [];
const problemas = [];
const nuevoEstado = { ultimaComprobacion: AHORA.toISOString(), comentarios: {}, incidencias: {}, cifras: {} };

// --- 1. Hilos del registro ---------------------------------------------------
const plan = fs.readFileSync(path.join(RAIZ, 'docs', 'MARKETING.md'), 'utf8');
const hilos = [...new Set([...plan.matchAll(/https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/issues\/(\d+)/g)].map((m) => `${m[1]}/${m[2]}#${m[3]}`))];

for (const hilo of hilos) {
    const [repo, numero] = hilo.split('#');
    try {
        const inc = await gh(`/repos/${repo}/issues/${numero}`);
        const comentarios = await gh(`/repos/${repo}/issues/${numero}/comments?per_page=100`);
        const clave = hilo;
        const previo = estado.incidencias?.[clave] ?? {};
        const linea = [`**${hilo}** — ${corto(inc.title, 70)} (${inc.state}, ${inc.comments} comentarios)`];

        // Reacciones a la incidencia si es nuestra.
        if (inc.user?.login === NOSOTROS) {
            const total = inc.reactions?.total_count ?? 0;
            if (total !== (previo.reacciones ?? 0) && !estado.primeraVez) novedades.push(`${hilo}: la incidencia pasa de ${previo.reacciones ?? 0} a ${total} reacciones (${reaccionesTexto(inc.reactions)})`);
            linea.push(`  reacciones a la incidencia: ${reaccionesTexto(inc.reactions)}`);
        }
        if (inc.state !== (previo.estado ?? inc.state)) novedades.push(`${hilo}: ahora está ${inc.state}`);
        nuevoEstado.incidencias[clave] = { estado: inc.state, reacciones: inc.reactions?.total_count ?? 0, comentarios: inc.comments };

        // Comentarios de otros desde la última vez.
        const ajenos = comentarios.filter((c) => c.user?.login !== NOSOTROS && new Date(c.created_at) > desde);
        for (const c of ajenos) {
            novedades.push(`${hilo}: comentario de **${c.user.login}** (${fecha(c.created_at)}): «${corto(c.body)}»\n  ${c.html_url}`);
        }

        // Reacciones a nuestros comentarios.
        for (const c of comentarios.filter((c) => c.user?.login === NOSOTROS)) {
            const total = c.reactions?.total_count ?? 0;
            const antes = estado.comentarios?.[c.id]?.reacciones ?? 0;
            if (total !== antes && !estado.primeraVez) novedades.push(`${hilo}: nuestro comentario pasa de ${antes} a ${total} reacciones (${reaccionesTexto(c.reactions)})\n  ${c.html_url}`);
            nuevoEstado.comentarios[c.id] = { reacciones: total };
            linea.push(`  nuestro comentario (${fecha(c.created_at)}): ${reaccionesTexto(c.reactions)}`);
        }
        resumen.push(linea.join('\n'));
    } catch (e) {
        problemas.push(`${hilo}: ${e.message}`);
    }
}

// --- 2. Repositorios enteros: incidencias y comentarios de otros -------------
for (const repoVigilado of REPOS_VIGILADOS) {
    try {
        const lista = await gh(`/repos/${repoVigilado}/issues?state=all&sort=updated&direction=desc&per_page=50`);
        for (const i of lista) {
            const esPR = !!i.pull_request;
            const clave = `${repoVigilado}#${i.number}`;
            if (!estado.incidencias?.[clave] && !estado.primeraVez && i.user?.login !== NOSOTROS) {
                novedades.push(`${esPR ? 'PR' : 'Incidencia'} nueva en ${repoVigilado}: **#${i.number}** «${corto(i.title, 90)}» de ${i.user.login}
  ${i.html_url}`);
            }
            nuevoEstado.incidencias[clave] = { estado: i.state, comentarios: i.comments };
            if (new Date(i.updated_at) > desde && i.comments > 0) {
                const cs = await gh(`/repos/${repoVigilado}/issues/${i.number}/comments?per_page=100`);
                for (const c of cs.filter((c) => c.user?.login !== NOSOTROS && new Date(c.created_at) > desde)) {
                    novedades.push(`${repoVigilado}#${i.number}: comentario de **${c.user.login}** (${fecha(c.created_at)}): «${corto(c.body)}»
  ${c.html_url}`);
                }
            }
        }
        const repo = await gh(`/repos/${repoVigilado}`);
        if (repoVigilado === REPO_PROPIO) {
            nuevoEstado.cifras.estrellas = repo.stargazers_count;
            nuevoEstado.cifras.forks = repo.forks_count;
        } else {
            // El repo de la organización: si nos dan permiso de escritura o cambia el último commit, es noticia.
            const permiso = repo.permissions?.admin ? 'admin' : repo.permissions?.push ? 'escritura' : 'lectura';
            if (estado.org?.permiso && estado.org.permiso !== permiso) novedades.push(`${repoVigilado}: nuestro permiso pasa de ${estado.org.permiso} a **${permiso}**`);
            if (estado.org?.ultimoPush && estado.org.ultimoPush !== repo.pushed_at) novedades.push(`${repoVigilado}: hay commits nuevos (último ${fecha(repo.pushed_at)})
  ${repo.html_url}/commits`);
            nuevoEstado.org = { ...(nuevoEstado.org ?? {}), permiso, ultimoPush: repo.pushed_at };
            resumen.push(`**${repoVigilado}** — permiso: ${permiso}; último commit ${fecha(repo.pushed_at)}`);
        }
    } catch (e) {
        problemas.push(`${repoVigilado}: ${e.message}`);
    }
}

// --- 2b. La organización: nuestro rol y quién está dentro --------------------
try {
    const pertenencia = await gh(`/user/memberships/orgs/${ORGANIZACION}`);
    const miembros = (await gh(`/orgs/${ORGANIZACION}/members?per_page=100`)).map((m) => m.login).sort();
    if (estado.org?.rol && estado.org.rol !== pertenencia.role) novedades.push(`Organización ${ORGANIZACION}: nuestro rol pasa de ${estado.org.rol} a **${pertenencia.role}**`);
    const nuevos = miembros.filter((m) => !(estado.org?.miembros ?? miembros).includes(m));
    if (nuevos.length && !estado.primeraVez) novedades.push(`Organización ${ORGANIZACION}: miembros nuevos: **${nuevos.join(', ')}**`);
    nuevoEstado.org = { ...(nuevoEstado.org ?? {}), rol: pertenencia.role, miembros };
    resumen.push(`**Organización ${ORGANIZACION}** — rol: ${pertenencia.role}; miembros: ${miembros.join(', ')}`);
} catch (e) {
    problemas.push(`organización: ${e.message}`);
}

// --- 3. Tiendas: cifras y reseñas -------------------------------------------
try {
    const q = await json('https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json;api-version=3.0-preview.1' },
        body: JSON.stringify({ filters: [{ criteria: [{ filterType: 7, value: EXTENSION }], pageNumber: 1, pageSize: 1 }], flags: 914 }),
    });
    const e = q.results?.[0]?.extensions?.[0];
    const st = Object.fromEntries((e?.statistics ?? []).map((s) => [s.statisticName, s.value]));
    nuevoEstado.cifras.instalaciones = st.install ?? 0;
    nuevoEstado.cifras.valoracion = st.averagerating ?? null;
    nuevoEstado.cifras.valoraciones = st.ratingcount ?? 0;

    const [pub, ext] = EXTENSION.split('.');
    const rs = await json(`https://marketplace.visualstudio.com/_apis/public/gallery/publishers/${pub}/extensions/${ext}/reviews?count=100&filterOptions=1`, {
        headers: { accept: 'application/json;api-version=3.0-preview.1' },
    });
    for (const r of rs.reviews ?? []) {
        if (new Date(r.updatedDate) > desde) novedades.push(`Reseña en el Marketplace: ${r.rating} estrellas de ${r.userDisplayName ?? 'alguien'}: «${corto(r.text)}»`);
    }
} catch (e) {
    problemas.push(`marketplace: ${e.message}`);
}
try {
    const ov = await json(`https://open-vsx.org/api/${EXTENSION.replace('.', '/')}`);
    nuevoEstado.cifras.openvsx = ov.downloadCount ?? 0;
    const rv = await json(`https://open-vsx.org/api/${EXTENSION.replace('.', '/')}/reviews`);
    for (const r of rv.reviews ?? []) {
        if (new Date(r.timestamp) > desde) novedades.push(`Reseña en Open VSX: ${r.rating} estrellas de ${r.user?.loginName ?? 'alguien'}: «${corto(r.comment)}»`);
    }
} catch (e) {
    problemas.push(`open vsx: ${e.message}`);
}

// --- 4. Informe --------------------------------------------------------------
const delta = (k) => {
    const a = estado.cifras?.[k], b = nuevoEstado.cifras[k];
    return a === undefined || b === undefined ? `${b ?? '?'}` : `${b} (${b - a >= 0 ? '+' : ''}${b - a})`;
};
const c = nuevoEstado.cifras;
const dia = AHORA.toISOString().slice(0, 10);
const informe = [
    `# Vigía HttpKeeper — ${dia} ${AHORA.toTimeString().slice(0, 5)}`,
    '',
    estado.primeraVez ? '_Primera pasada: esto fija el punto de partida; las novedades empiezan mañana._' : `_Novedades desde ${fecha(estado.ultimaComprobacion)}._`,
    '',
    '## Novedades',
    '',
    novedades.length ? novedades.map((n) => `- ${n}`).join('\n') : '- Nada nuevo.',
    '',
    '## Cifras',
    '',
    `- Marketplace: ${delta('instalaciones')} instalaciones${c.valoracion ? `, ${c.valoracion} estrellas (${c.valoraciones})` : ', sin valoraciones'}`,
    `- Open VSX: ${delta('openvsx')} descargas`,
    `- GitHub: ${delta('estrellas')} estrellas, ${delta('forks')} forks`,
    '',
    '## Estado de los hilos',
    '',
    resumen.map((r) => `- ${r}`).join('\n') || '- (ninguno en el registro)',
    '',
    problemas.length ? `## Fallos al consultar\n\n${problemas.map((p) => `- ${p}`).join('\n')}\n` : '',
    `_Vigilados: ${hilos.join(', ')} · los repos ${REPOS_VIGILADOS.join(' y ')} · la organización ${ORGANIZACION} · reseñas de ${EXTENSION}. Para vigilar otro hilo basta con que su URL esté en el registro de docs/MARKETING.md._`,
    '',
].join('\n');

fs.writeFileSync(path.join(CARPETA, `${dia}.md`), informe);
fs.writeFileSync(path.join(CARPETA, 'ultimo.md'), informe);
fs.writeFileSync(path.join(os.homedir(), 'Desktop', 'HttpKeeper-vigia.md'), informe);
fs.writeFileSync(ESTADO, JSON.stringify(nuevoEstado, null, 2));
console.log(informe);

// WhatsApp a uno mismo, si hay número apuntado: primero la app de WhatsApp
// para Windows (UI Automation, sin depender del foco); si falla, WhatsApp Web
// en el Chrome controlado. Falla en silencio: el informe y el aviso de
// Windows siguen siendo la fuente de verdad.
if ((novedades.length || PROBAR_AVISO) && !process.argv.includes('--sin-whatsapp')) {
    if (!novedades.length) novedades.push('Prueba del aviso: el vigía funciona y llega por WhatsApp.');
    const titulares = novedades.slice(0, 6).map((n) => '• ' + n.split('\n')[0].replace(/\*\*/g, '')).join('\n');
    const mensaje = `HttpKeeper · ${novedades.length} novedad${novedades.length === 1 ? '' : 'es'} (${dia} ${AHORA.toTimeString().slice(0, 5)})\n${titulares}${novedades.length > 6 ? '\n…' : ''}\nInforme: Desktop/HttpKeeper-vigia.md`;
    const carpeta = path.join(os.homedir(), 'handsfree-browser');
    const app = path.join(carpeta, 'whatsapp-app-enviar.py');
    const web = path.join(carpeta, 'whatsapp-enviar.mjs');
    let r = fs.existsSync(app) ? spawnSync('python', [app], { input: mensaje, encoding: 'utf8', timeout: 120_000, cwd: carpeta }) : { status: 1, stderr: 'sin script de la app' };
    if (r.status !== 0 && fs.existsSync(web)) {
        r = spawnSync(process.execPath, [web], { input: mensaje, encoding: 'utf8', timeout: 90_000, cwd: carpeta });
    }
    if (r.status !== 0) { problemas.push(`whatsapp: ${(r.stderr || r.stdout || '').trim().split('\n').pop()}`); }
}

// Aviso en Windows solo si hay algo que leer.
if ((novedades.length || PROBAR_AVISO) && process.platform === 'win32') {
    if (!novedades.length) novedades.push('Prueba del aviso: el vigía funciona.');
    const titulo = `HttpKeeper: ${novedades.length} novedad${novedades.length === 1 ? '' : 'es'}`;
    const cuerpo = corto(novedades[0].split('\n')[0].replace(/\*\*/g, ''), 120);
    const ps = `
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
$t = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
$n = $t.GetElementsByTagName('text')
$n.Item(0).AppendChild($t.CreateTextNode(${JSON.stringify(titulo)})) | Out-Null
$n.Item(1).AppendChild($t.CreateTextNode(${JSON.stringify(cuerpo)})) | Out-Null
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('HttpKeeper vigía').Show([Windows.UI.Notifications.ToastNotification]::new($t))`;
    spawnSync('powershell.exe', ['-NoProfile', '-Command', ps], { timeout: 15000 });
}

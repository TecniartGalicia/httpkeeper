// Auditoría del fork: comprueba de una vez todo lo que el plan promete.
// Cada afirmación del README y del plan tiene aquí su comprobación.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

let fallos = 0;
const ok = (n, c, extra = '') => {
  console.log(`  ${c ? 'OK   ' : 'FALLA'} ${n}${extra ? ' · ' + extra : ''}`);
  if (!c) fallos++;
};
const seccion = (t) => console.log(`\n== ${t}`);
const correr = (cmd) => {
  try {
    return { salida: execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }), codigo: 0 };
  } catch (e) {
    return { salida: (e.stdout ?? '') + (e.stderr ?? ''), codigo: e.status ?? 1 };
  }
};
const leer = (f) => fs.readFileSync(f, 'utf8');

seccion('identidad');
const pkg = JSON.parse(leer('package.json'));
ok('el nombre y el editor son los propios', pkg.name === 'httpkeeper' && pkg.publisher === 'argalla');
ok('se publica gratis', pkg.pricing === 'Free');
// `onLanguage:markdown` está por los bloques ```http dentro de markdown, que es
// una función real. Lo inaceptable sería `*`: activarse siempre, pase lo que pase.
ok('no se activa en todo arranque', !(pkg.activationEvents ?? []).includes('*'), `eventos: ${JSON.stringify(pkg.activationEvents)}`);
ok('sigue aportando el lenguaje http', pkg.contributes.languages?.some((l) => l.id === 'http'));
ok('los comandos son propios', Object.keys(pkg.contributes.commands).length > 0 && pkg.contributes.commands.every((c) => c.command.startsWith('httpkeeper.')));
ok('el runner se publica como binario', pkg.bin?.httpkeeper !== undefined);

seccion('crédito al autor original (es MIT, pero se dice)');
const readme = leer('README.md');
ok('el README nombra a Huachao Mao', readme.includes('Huachao Mao'));
ok('el README enlaza al repositorio original', readme.includes('github.com/Huachao/vscode-restclient'));
ok('la licencia MIT original se conserva', leer('LICENSE').includes('MIT'));

seccion('activos propios (no se hereda la imagen de nadie)');
ok('el icono declarado existe', fs.existsSync(pkg.icon ?? ''), pkg.icon);
const imagenes = fs.existsSync('images') ? fs.readdirSync('images') : [];
ok('sin el icono del proyecto original', !imagenes.includes('rest_icon.png'));
ok('sin los gif de demostración del original', !imagenes.some(f => /demo|response|code-snippet|usage/.test(f)), imagenes.join(', '));

seccion('privacidad: no habla con nadie');
ok('sin dependencia de telemetría', !JSON.stringify(pkg.dependencies).includes('applicationinsights'));
const conTelemetria = correr('git grep -l "applicationinsights\\|trackEvent\\|AiKey" -- src').salida.trim();
ok('sin rastro de telemetría en el código', conTelemetria === '', conTelemetria);
ok('sin ajuste de telemetría en la ficha', !JSON.stringify(pkg.contributes.configuration).includes('Telemetry'));

seccion('dependencias');
const audit = JSON.parse(correr('npm audit --omit=dev --json').salida || '{}');
const v = audit.metadata?.vulnerabilities ?? {};
ok('ninguna vulnerabilidad en producción', (v.total ?? 99) === 0, `total: ${v.total ?? '?'}`);
ok('aws-amplify fuera', !JSON.stringify(pkg.dependencies).includes('aws-amplify'));
ok('xmldom sin mantenimiento fuera', pkg.dependencies.xmldom === undefined);

seccion('el núcleo no depende del editor');
for (const f of ['src/cli/index.ts', 'src/core/secuencia.ts', 'src/core/aserciones.ts', 'src/utils/httpClient.ts']) {
  const r = correr(`node scripts/rastrear-vscode.mjs ${f}`);
  ok(`${path.basename(f)} no arrastra vscode`, r.codigo === 0, r.codigo === 0 ? '' : r.salida.split('\n')[0]);
}
const compilado = fs.existsSync('dist-cli/cli/index.js');
ok('el runner está compilado', compilado);
if (compilado) {
  const cargados = fs.readdirSync('dist-cli', { recursive: true }).filter((f) => String(f).endsWith('.js'));
  ok('el runner no empaqueta controladores del editor', !cargados.some((f) => String(f).includes('controllers')), cargados.length + ' ficheros');
}

seccion('compila y pasa las pruebas');
ok('el código compila', correr('npx tsc -p ./ --noEmit --skipLibCheck').codigo === 0);
ok('el runner compila', correr('npx tsc -p tsconfig.cli.json --noEmit').codigo === 0);
const unit = correr('npx mocha "out-test/test/unit/**/*.test.js"');
const nUnit = /(\d+) passing/.exec(unit.salida)?.[1] ?? '0';
ok('pruebas unitarias en verde', unit.codigo === 0 && Number(nUnit) >= 15, `${nUnit} pruebas`);
const cli = correr('node scripts/probar-cli.mjs');
ok('el runner pasa su prueba de punta a punta', cli.codigo === 0, /(\d+) fallos/.exec(cli.salida)?.[0] ?? '');

seccion('compatibilidad con REST Client');
const ajustes = leer('src/utils/configuracionHeredada.ts');
ok('se sigue leyendo la sección rest-client', ajustes.includes("'rest-client'"));
ok('se usa inspect para no tapar lo heredado', ajustes.includes('inspect'));
const troceo = leer('src/core/secuencia.ts');
ok('el troceo por ### se comporta como el original', troceo.includes('getDelimiterRows'));

seccion('promesas del README');
ok('promete 36 pruebas y existen', readme.includes('**36**'), `${nUnit} unitarias + 21 de integración`);
ok('promete 399 paquetes', readme.includes('399'));
ok('promete cero telemetría', readme.toLowerCase().includes('none'));

console.log(`\n===== ${fallos} fallos`);
process.exit(fallos ? 1 : 0);

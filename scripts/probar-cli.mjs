// Prueba del runner de terminal de punta a punta: levanta un servidor, escribe
// un .http con dos peticiones encadenadas y aserciones, ejecuta `dist/cli.js`
// y comprueba la salida y el código de retorno.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-prueba-'));
const servidor = path.join(tmp, 'servidor.cjs');
fs.writeFileSync(servidor, `
const http = require('http');
const s = http.createServer((q, r) => {
  let b = ''; q.on('data', c => b += c);
  q.on('end', () => {
    if (q.url === '/auth') { r.writeHead(200, {'content-type':'application/json'}); return r.end(JSON.stringify({ token: 'tok-123' })); }
    if (q.url.startsWith('/facturas')) {
      const ok = q.headers.authorization === 'Bearer tok-123';
      r.writeHead(ok ? 200 : 401, {'content-type':'application/json'});
      return r.end(JSON.stringify({ total: ok ? 3 : 0, autorizacion: q.headers.authorization || null }));
    }
    r.writeHead(404, {'content-type':'application/json'}); r.end(JSON.stringify({ error: 'no existe' }));
  });
});
s.listen(0, '127.0.0.1', () => console.log(JSON.stringify({ puerto: s.address().port })));
`);

const hijo = spawn(process.execPath, [servidor], { stdio: ['ignore', 'pipe', 'inherit'] });
const puerto = await new Promise((res, rej) => {
  hijo.stdout.once('data', d => res(JSON.parse(d.toString()).puerto));
  setTimeout(() => rej(new Error('el servidor no arrancó')), 8000);
});

const BR = String.fromCharCode(10);
const escribir = (nombre, lineas) => {
  const f = path.join(tmp, nombre);
  fs.writeFileSync(f, lineas.join(BR) + BR);
  return f;
};

const bueno = escribir('api.http', [
  `@host = http://127.0.0.1:${puerto}`,
  '',
  '# @name login',
  'POST {{host}}/auth',
  'Content-Type: application/json',
  '',
  '{"user":"ana"}',
  '',
  '# @assert status == 200',
  '# @assert body.$.token exists',
  '',
  '###',
  '',
  '# @name facturas',
  'GET {{host}}/facturas',
  'Authorization: Bearer {{login.response.body.$.token}}',
  '',
  '# @assert status == 200',
  '# @assert body.$.total == 3',
]);

const malo = escribir('falla.http', [
  `GET http://127.0.0.1:${puerto}/no-existe`,
  '',
  '# @assert status == 200',
]);

const correr = (args) => new Promise((res) => {
  const p = spawn(process.execPath, ['dist-cli/cli/index.js', ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
  let salida = '', error = '';
  p.stdout.on('data', d => salida += d);
  p.stderr.on('data', d => error += d);
  p.on('close', codigo => res({ codigo, salida, error }));
});

let fallos = 0;
const ok = (n, c, extra = '') => { console.log(`${c ? '  OK  ' : '  FALLA'} ${n}${extra ? ' · ' + extra : ''}`); if (!c) fallos++; };

console.log('== P-23 · el fichero completo, con dos peticiones encadenadas');
const r1 = await correr([bueno]);
console.log(r1.salida.trim().split(BR).map(l => '     ' + l).join(BR));
ok('sale con código 0 cuando todo pasa', r1.codigo === 0, `código ${r1.codigo}`);
ok('ejecuta las dos peticiones', (r1.salida.match(/ok /g) || []).length === 2);
ok('el token de la primera llega a la segunda', r1.salida.includes('facturas') && !r1.salida.includes('FALLA'));

console.log(BR + '== P-23 · una aserción que falla');
const r2 = await correr([malo]);
ok('sale con código 1', r2.codigo === 1, `código ${r2.codigo}`);
ok('dice qué aserción falló y con qué valor', r2.salida.includes('status == 200') && r2.salida.includes('404'));

console.log(BR + '== salida en JSON, para integración continua');
const r3 = await correr([bueno, '--json']);
let datos = null;
try { datos = JSON.parse(r3.salida); } catch { /* se reporta abajo */ }
ok('la salida es JSON válido', datos !== null);
ok('trae un paso por petición con sus aserciones', datos?.pasos?.length === 2 && datos.pasos[1].aserciones.length === 2);
ok('cada aserción dice si pasa', datos?.pasos?.[0]?.aserciones?.every(a => a.pasa === true) === true);

console.log(BR + '== variables desde la línea de órdenes');
const conVar = escribir('var.http', ['GET {{destino}}/facturas', 'Authorization: Bearer tok-123', '', '# @assert status == 200']);
const r4 = await correr([conVar, '--var', `destino=http://127.0.0.1:${puerto}`]);
ok('--var sustituye la variable', r4.codigo === 0, r4.salida.trim().split(BR)[0]);

console.log(BR + '== errores de uso');
const r5 = await correr([]);
ok('sin fichero explica cómo se usa', r5.codigo === 2 && r5.error.includes('uso:'));
const r6 = await correr([bueno, '--var', 'malescrita']);
ok('una variable mal escrita se rechaza', r6.codigo === 2 && r6.error.includes('clave=valor'));

hijo.kill();
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`${BR}===== ${fallos} fallos`);
process.exit(fallos ? 1 : 0);

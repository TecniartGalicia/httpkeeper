import * as cp from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runTests } from '@vscode/test-electron';

/** Levanta un servidor de prueba local y corre la suite contra él. */
async function main(): Promise<void> {
  delete process.env.ELECTRON_RUN_AS_NODE;
  const raiz = path.resolve(__dirname, '../../../');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rc-it-'));
  const servidor = path.join(tmp, 'servidor.js');
  // Servidor de pruebas: responde lo justo para poder afirmar qué llegó.
  fs.writeFileSync(
    servidor,
    `const http=require('http');
const s=http.createServer((q,r)=>{
  let b='';q.on('data',c=>b+=c);q.on('end',()=>{
    const u=q.url;
    const eco=()=>JSON.stringify({metodo:q.method,ruta:u,cabecera:q.headers['x-prueba']||null,agente:q.headers['user-agent']||null,recibido:b},null,1);
    if(u.startsWith('/estado/')){const c=Number(u.split('/')[2])||500;r.writeHead(c,{'content-type':'application/json'});return r.end(JSON.stringify({error:'vaya',estado:c},null,1));}
    if(u==='/redirige'){r.writeHead(302,{location:'/destino'});return r.end();}
    if(u==='/lento'){return setTimeout(()=>{r.writeHead(200,{'content-type':'application/json'});r.end(eco());},1500);}
    if(u==='/json'){r.writeHead(200,{'content-type':'application/json'});return r.end(JSON.stringify({anidado:{a:1,b:[1,2,3]}}));}
    if(u==='/texto'){r.writeHead(200,{'content-type':'text/plain'});return r.end('soy texto plano');}
    if(u==='/xml'){r.writeHead(200,{'content-type':'application/xml'});return r.end('<raiz><hijo>valor</hijo></raiz>');}
    r.writeHead(200,{'content-type':'application/json'});r.end(eco());
  });
});
s.listen(0,'127.0.0.1',()=>console.log(JSON.stringify({puerto:s.address().port})));`,
  );
  const hijo = cp.spawn(process.execPath, [servidor], { stdio: ['ignore', 'pipe', 'inherit'] });
  const puerto: string = await new Promise((res, rej) => {
    hijo.stdout!.once('data', (d) => res(String(JSON.parse(d.toString()).puerto)));
    setTimeout(() => rej(new Error('el servidor de prueba no arrancó')), 10000);
  });
  console.log(`servidor de prueba en el puerto ${puerto}`);

  try {
    await runTests({
      extensionDevelopmentPath: raiz,
      extensionTestsPath: path.resolve(__dirname, './suite/index'),
      launchArgs: [tmp, `--user-data-dir=${path.join(raiz, '.vscode-test', 'user-data')}`, '--disable-extensions'],
      extensionTestsEnv: { RC_TEST_PUERTO: puerto },
    });
  } finally {
    hijo.kill();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error('Fallaron las pruebas de integración', e);
  process.exit(1);
});

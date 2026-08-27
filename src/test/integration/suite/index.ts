import * as path from 'path';
import Mocha from 'mocha';
import { globSync } from 'glob';

export function run(): Promise<void> {
  const mocha = new Mocha({ ui: 'bdd', timeout: 30000 });
  const raiz = path.resolve(__dirname);
  // HK_SOLO=enviar corre solo esa suite: para aislar un fallo sin esperar a todas.
  const solo = process.env.HK_SOLO;
  for (const f of globSync('**/*.test.js', { cwd: raiz }).sort()) {
    if (!solo || f.includes(solo)) mocha.addFile(path.resolve(raiz, f));
  }
  return new Promise((resolve, reject) => {
    mocha.run((fallos) => (fallos > 0 ? reject(new Error(`${fallos} pruebas fallaron.`)) : resolve()));
  });
}

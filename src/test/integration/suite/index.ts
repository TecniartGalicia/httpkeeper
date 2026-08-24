import * as path from 'path';
import Mocha from 'mocha';
import { globSync } from 'glob';

export function run(): Promise<void> {
  const mocha = new Mocha({ ui: 'bdd', timeout: 30000 });
  const raiz = path.resolve(__dirname);
  for (const f of globSync('**/*.test.js', { cwd: raiz })) mocha.addFile(path.resolve(raiz, f));
  return new Promise((resolve, reject) => {
    mocha.run((fallos) => (fallos > 0 ? reject(new Error(`${fallos} pruebas fallaron.`)) : resolve()));
  });
}

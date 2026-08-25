import * as assert from 'assert';
import { trocear, ejecutarSecuencia, Bloque, PasoEjecutado } from '../../core/secuencia';
import { leerAserciones, comprobar, valorDe } from '../../core/aserciones';

const BR = String.fromCharCode(10);
const j = (...l: string[]) => l.join(BR);

describe('trocear un fichero .http', () => {
    it('P-18 · separa por ### fuera del cuerpo', () => {
        const b = trocear(j('GET http://a/1', '', '###', '', 'GET http://a/2'));
        assert.strictEqual(b.length, 2);
        assert.ok(b[0].texto.includes('/1'));
        assert.ok(b[1].texto.includes('/2'));
    });

    it('P-18 · un ### dentro del cuerpo TAMBIEN separa, como en REST Client', () => {
        // Limitacion heredada a proposito: el original parte aqui desde 2016 y
        // los ficheros de la gente cuentan con ello. Ser mas listo romperia la
        // compatibilidad, que es lo que hace este fork instalable sin trabajo.
        const b = trocear(j('POST http://a', 'Content-Type: text/markdown', '', '### Un titulo de Markdown', 'texto'));
        assert.strictEqual(b.length, 2, 'se comporta igual que el original');
    });

    it('P-18 · un ### indentado NO separa: es la salida documentada', () => {
        const b = trocear(j('POST http://a', 'Content-Type: text/markdown', '', '  ### Un titulo indentado', 'texto'));
        assert.strictEqual(b.length, 1);
    });

    it('recoge el nombre y la linea de cada bloque', () => {
        const b = trocear(j('# @name login', 'POST http://a/auth', '', '###', '', 'GET http://a/x'));
        assert.strictEqual(b[0].nombre, 'login');
        assert.strictEqual(b[1].nombre, undefined);
        assert.strictEqual(b[1].linea, 4);
    });

    it('ignora bloques vacios y separadores de mas', () => {
        assert.strictEqual(trocear(j('###', '', '###', 'GET http://a', '###', '')).length, 1);
    });
});

describe('ejecutar en secuencia', () => {
    const respuesta = (estado: number) => ({ estado, cuerpo: '{}', cabeceras: {} });

    it('P-19 · ejecuta todos los bloques en orden', async () => {
        const vistos: string[] = [];
        const pasos = await ejecutarSecuencia(trocear(j('GET http://a/1', '###', 'GET http://a/2', '###', 'GET http://a/3')), {
            enviar: async (b: Bloque) => { vistos.push(b.texto.trim()); return respuesta(200); }
        });
        assert.deepStrictEqual(vistos.map(v => v.slice(-1)), ['1', '2', '3']);
        assert.strictEqual(pasos.length, 3);
    });

    it('P-19 · cada bloque se resuelve cuando le toca, no antes', async () => {
        const hechos: PasoEjecutado[] = [];
        const alResolver: number[] = [];
        await ejecutarSecuencia(trocear(j('GET http://a/1', '###', 'GET http://a/2', '###', 'GET http://a/3')), {
            resolver: async (b) => { alResolver.push(hechos.length); return b; },
            enviar: async () => respuesta(200),
            alTerminarPaso: (p) => { hechos.push(p); }
        });
        // Al resolver el bloque n ya han terminado los n anteriores: eso es lo
        // que permite encadenar {{login.response...}}.
        assert.deepStrictEqual(alResolver, [0, 1, 2]);
    });

    it('P-20 · un fallo detiene la secuencia', async () => {
        let enviados = 0;
        const pasos = await ejecutarSecuencia(trocear(j('GET http://a/1', '###', 'GET http://a/2', '###', 'GET http://a/3')), {
            enviar: async () => { enviados++; if (enviados === 2) { throw new Error('sin conexion'); } return respuesta(200); }
        });
        assert.strictEqual(pasos.length, 2, 'no debe seguir tras el fallo');
        assert.strictEqual(pasos[1].error, 'sin conexion');
        assert.strictEqual(enviados, 2);
    });

    it('P-20 · con continuarTrasFallo llega hasta el final', async () => {
        let enviados = 0;
        const pasos = await ejecutarSecuencia(trocear(j('GET http://a/1', '###', 'GET http://a/2', '###', 'GET http://a/3')), {
            continuarTrasFallo: true,
            enviar: async () => { enviados++; if (enviados === 2) { throw new Error('vaya'); } return respuesta(200); }
        });
        assert.strictEqual(pasos.length, 3);
        assert.strictEqual(enviados, 3);
    });
});

describe('aserciones', () => {
    const r = {
        estado: 200,
        ms: 130,
        cuerpo: JSON.stringify({ token: 'abc123', total: 3, items: [{ id: 7 }], vacio: '' }),
        cabeceras: { 'Content-Type': 'application/json; charset=utf-8' }
    };

    it('lee las aserciones de un bloque', () => {
        const a = leerAserciones(j('GET http://a', '# @assert status == 200', '// @assert time < 500', 'no es una asercion'));
        assert.strictEqual(a.length, 2);
        assert.deepStrictEqual([a[0].sujeto, a[0].operador, a[0].esperado], ['status', '==', '200']);
        assert.strictEqual(a[1].operador, '<');
    });

    it('resuelve los sujetos contra la respuesta', () => {
        assert.strictEqual(valorDe('status', r), '200');
        assert.strictEqual(valorDe('time', r), '130');
        assert.strictEqual(valorDe('body.$.token', r), 'abc123');
        assert.strictEqual(valorDe('body.$.items[0].id', r), '7');
        assert.strictEqual(valorDe('headers.content-type', r), 'application/json; charset=utf-8');
        assert.strictEqual(valorDe('headers.CONTENT-TYPE', r), 'application/json; charset=utf-8', 'las cabeceras no distinguen mayusculas');
        assert.strictEqual(valorDe('body.$.no-existe', r), '');
        assert.strictEqual(valorDe('header.content-type', r), 'application/json; charset=utf-8', 'header en singular tambien vale');
    });

    it('P-21 · los siete operadores, con su caso bueno y su caso malo', () => {
        const casos: [string, boolean][] = [
            ['status == 200', true], ['status == 404', false],
            ['status != 404', true], ['status != 200', false],
            ['time < 500', true], ['time < 10', false],
            ['time > 10', true], ['time > 500', false],
            ['headers.content-type contains json', true], ['headers.content-type contains xml', false],
            ['body.$.token matches ^abc[0-9]+$', true], ['body.$.token matches ^zzz', false],
            ['body.$.token exists', true], ['body.$.vacio exists', false]
        ];
        for (const [texto, esperado] of casos) {
            const [res] = comprobar(leerAserciones('# @assert ' + texto), r);
            assert.strictEqual(res.pasa, esperado, `"${texto}" deberia ${esperado ? 'pasar' : 'fallar'} y dio "${res.obtenido}"`);
        }
    });

    it('P-22 · una expresion regular monstruosa no cuelga la interfaz', () => {
        const patron = '(a+)'.repeat(40) + '+$';
        const t0 = Date.now();
        const [res] = comprobar(leerAserciones('# @assert body.$.token matches ' + patron), r);
        assert.ok(Date.now() - t0 < 500, `tardo ${Date.now() - t0} ms`);
        assert.strictEqual(res.pasa, false);
    });

    it('P-22 · un patron invalido falla la asercion, no lanza', () => {
        const [res] = comprobar(leerAserciones('# @assert body.$.token matches ([sin-cerrar'), r);
        assert.strictEqual(res.pasa, false);
    });

    it('una respuesta sin cuerpo no rompe nada', () => {
        const res = comprobar(leerAserciones('# @assert body.$.a exists'), { ms: 5 });
        assert.strictEqual(res[0].pasa, false);
    });

    it('P-31 · un sujeto que no existe se dice, no se calla', () => {
        const r = { estado: 200, cuerpo: '{}', cabeceras: { 'content-type': 'application/json' }, ms: 5 };
        const [mal] = comprobar(leerAserciones('# @assert cabecera.content-type contains json'), r);
        assert.strictEqual(mal.pasa, false);
        assert.ok(mal.obtenido.includes('cabecera.content-type'), 'el mensaje nombra el sujeto');

        // Lo peligroso era !=: contra '' pasaba, y el fichero parecia verde.
        const [negada] = comprobar(leerAserciones('# @assert lo.que.sea != 200'), r);
        assert.strictEqual(negada.pasa, false, 'un sujeto desconocido no puede dar por buena una asercion');

        const [bien] = comprobar(leerAserciones('# @assert header.content-type contains json'), r);
        assert.strictEqual(bien.pasa, true);
    });
});

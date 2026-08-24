import { Uri, workspace, WorkspaceConfiguration } from 'vscode';

export const SECCION = 'httpkeeper';
/** Sección de REST Client: se sigue leyendo para no romper a quien migra. */
export const SECCION_HEREDADA = 'rest-client';

/** Lo único que el resto del código usa de una configuración. */
export interface Configuracion {
    get<T>(clave: string): T | undefined;
    get<T>(clave: string, porDefecto: T): T;
}

/**
 * Configuración con herencia: manda el ajuste propio si el usuario lo ha
 * tocado; si no, se usa el de REST Client; y si tampoco, el valor por defecto.
 *
 * `inspect` es lo que permite distinguir «no configurado» de «configurado con
 * el valor por defecto». Sin esa distinción, el valor por defecto de HttpKeeper
 * taparía siempre la configuración heredada y migrar costaría rehacerlo todo.
 */
export function configuracionHeredada(uri?: Uri): Configuracion {
    const propia = workspace.getConfiguration(SECCION, uri);
    const heredada = workspace.getConfiguration(SECCION_HEREDADA, uri);
    return {
        get<T>(clave: string, porDefecto?: T): any {
            const definido = valorDefinido<T>(propia, clave);
            if (definido !== undefined) {
                return definido;
            }
            const viejo = valorDefinido<T>(heredada, clave);
            if (viejo !== undefined) {
                return viejo;
            }
            return porDefecto === undefined ? propia.get<T>(clave) : propia.get<T>(clave, porDefecto);
        }
    };
}

function valorDefinido<T>(config: WorkspaceConfiguration, clave: string): T | undefined {
    const i = config.inspect<T>(clave);
    return i?.workspaceFolderValue ?? i?.workspaceValue ?? i?.globalValue;
}

/** Claves que se miran para saber si alguien viene de REST Client. */
export const CLAVES_MIGRABLES = [
    'defaultHeaders', 'environmentVariables', 'timeoutinmilliseconds', 'followredirect',
    'previewOption', 'previewResponseInUntitledDocument', 'certificates', 'proxy',
    'rememberCookiesForSubsequentRequests', 'fontSize', 'fontFamily'
];

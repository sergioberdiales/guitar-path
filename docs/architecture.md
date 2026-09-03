# Arquitectura

## Primer incremento

Sitio estático con Vite, HTML, CSS y JavaScript vanilla. Vite es la única dependencia directa y solo interviene en desarrollo y build. No hay framework, router, fuentes remotas, backend ni base de datos.

`src/main.js` carga el catálogo de la semana y sus sesiones JSON mediante `fetch`, representa la sesión seleccionada y conecta los controles. Las rutas usan `import.meta.env.BASE_URL`; `base: '/guitar-path/'` corresponde al subdirectorio del repositorio en GitHub Pages. El texto del JSON y las notas se escapan antes de insertarse en HTML. Los recursos externos solo admiten HTTP/HTTPS y se abren con `noopener noreferrer`.

## Contenido

Las sesiones están en `public/content/course/block-01/week-01/session-01.json`, `session-02.json` y `session-03.json`. Ninguna incluye progreso del usuario. `index.json` es un catálogo mínimo: conserva el orden y enumera los nombres de fichero que debe cargar la aplicación. Añadir una sesión exige crear su JSON y añadirlo a este catálogo.

| Campo | Contenido |
| --- | --- |
| `schemaVersion`, `id` | Versión del formato e identificador estable de la sesión. |
| `title`, `block`, `week`, `number` | Título, bloque y semana con `number`/`title`, número de sesión. |
| `estimatedDuration`, `objective` | Duración orientativa como texto y objetivo pedagógico. |
| `introduction` | `title`, `text`, `examples` y `takeaway`. |
| `resources` | Recursos con `id`, `type`, `title`, `author`, `youtubeId` o `url`, `approximateDuration`, `purpose`, `required` y `label` opcional. Una duración desconocida es `null`. |
| `exercises` | Lista ordenada de ejercicios; se describe debajo. |
| `closing` | `title`, `statusHelp` y `noteQuestion`. |

Cada ejercicio contiene `id`, `title`, `approximateDuration`, `explanation`, `steps`, `completion` (lista de criterios) y, opcionalmente, `takeaway`. Los pasos admiten `title`, `text`, `instructions` (lista ordenada), `examples` y `solution`. Una solución contiene `label`, `examples` y/o `text`; se representa con `<details>` cerrado de inicio. Cada ejemplo tiene `label`, `value` y opcionalmente `detail`.

Los bloques opcionales se omiten. El resto de campos utilizados por la sesión son obligatorios. Un fallo al cargar o representar el contenido muestra una pantalla de reintento sin tocar el progreso. No se incorpora un motor de esquemas ni CMS; los tests validan el contrato básico del contenido actual.

El mismo renderizador sirve las tres sesiones. `src/course.js` resuelve la sesión seleccionada a partir de `?session=<id-estable>` y construye sus enlaces. La URL sin parámetros sigue abriendo la Sesión 1; una selección desconocida también vuelve a ella. Esta navegación usa enlaces estáticos y parámetros de consulta, por lo que no necesita router ni reglas de reescritura en GitHub Pages. Mantener los IDs al corregir contenido permite conservar los estados existentes.

## Progreso local

`src/progress.js` guarda un objeto por sesión con la clave `guitar-path:progress:v1:<session-id>`:

```json
{
  "exercises": { "listen-major-minor": "practiced" },
  "actualDuration": 28,
  "note": "Me costó localizar la tercera en la segunda posición."
}
```

Todos los ejercicios empiezan en `pending`. Los únicos estados son `pending`, `practiced` y `comfortable`. Se escriben inmediatamente al cambiar un estado o editar el cierre. Los controles del ejercicio y del cierre permanecen sincronizados sin reconstruir la página. La duración admite minutos enteros positivos o `null`; la nota puede quedar vacía.

Se recuperan los estados válidos de los IDs actuales y se ignoran campos obsoletos. JSON corrupto, permisos de almacenamiento o cuota agotada no impiden practicar: se muestra un aviso y los cambios siguen en memoria. No se sobrescribe automáticamente un registro corrupto al cargar; la siguiente edición guarda la sesión actual. Otros datos del navegador no se modifican.

No se guardan aperturas de soluciones, posición de scroll ni historial de sesiones. La pantalla se abre siempre con las soluciones cerradas. El enlace inicial puede llevar al primer ejercicio pendiente cuando se recupera progreso.

## Exportación del progreso

La acción **Exportar progreso** aparece de forma secundaria en el cierre. `createProgressExport` en `src/progress.js` recibe los metadatos de las sesiones conocidas y lee sus claves de progreso en `localStorage` en el momento de exportar. La interfaz le pasa las tres sesiones cargadas desde el catálogo. No enumera el almacenamiento ni recoge claves ajenas, sesiones desconocidas o preferencias del navegador.

El formato de intercambio tiene su propia versión y conserva los IDs estables:

```json
{
  "format": "guitar-path-progress",
  "schemaVersion": 1,
  "exportedAt": "2026-08-31T14:00:00.000Z",
  "sessions": [
    {
      "sessionId": "block-01-week-01-session-01",
      "title": "Del acorde conocido a 1–3–5",
      "block": { "number": 1, "title": "Entender el mástil" },
      "week": { "number": 1, "title": "Notas e intervalos" },
      "sessionNumber": 1,
      "progress": {
        "exercises": {
          "listen-major-minor": "comfortable",
          "unpack-known-chord": "practiced",
          "map-g": "pending",
          "build-d-triads": "pending",
          "play-music": "pending"
        },
        "actualDuration": 28,
        "note": "B ↔ B♭: lo escucho.\nMe costó localizar la tercera."
      }
    }
  ]
}
```

`exportedAt` es la fecha/hora UTC en formato ISO 8601 de la exportación, no la fecha de práctica. Los estados, minutos y nota se normalizan con la misma función que el guardado actual. Las sesiones sin registro se omiten; una primera visita sin guardar produce `sessions: []`. Si falla la lectura o el JSON guardado no se puede interpretar, no se descarga una copia vacía: se muestra un aviso. Los cambios que no hayan podido guardarse no forman parte del archivo.

La función solo lee y devuelve objetos nuevos; no escribe, borra ni migra registros. El código de interfaz crea un `Blob` JSON UTF-8 con sangrado y lo descarga como `guitar-path-progress-AAAA-MM-DD.json`, usando la misma fecha UTC. El enlace temporal se elimina y su URL se libera después de iniciar la descarga.

El almacenamiento sigue siendo exclusivamente local. La exportación no contacta con ChatGPT ni con ningún servidor: compartir el fichero es una acción manual del usuario. El fichero incluye las notas libres. **No existe importación, sincronización ni historial de intentos**; exportar tampoco crea un nuevo intento ni cambia los estados `pending`, `practiced` y `comfortable`.

## Publicación en GitHub Pages

La aplicación se publica en `https://sergioberdiales.github.io/guitar-path/`. El workflow `.github/workflows/deploy-pages.yml` se ejecuta en pushes a `main` o mediante `workflow_dispatch`. El job `build` usa Node.js 22, `npm ci`, los tests y `npm run build`; sube únicamente `dist/` como artefacto. El job `deploy` configura Pages y publica ese artefacto en el entorno `github-pages`.

Solo el job de despliegue tiene permisos `pages: write` e `id-token: write`; el build únicamente puede leer el código. Se utilizan acciones oficiales fijadas por SHA y el token efímero de GitHub Actions, sin secretos personales. La concurrencia evita despliegues simultáneos sin interrumpir el que está en curso.

La opción **Settings → Pages → Source** debe ser **GitHub Actions**. El README recoge los pasos de activación y de ejecución manual. No se publica `node_modules/` ni se versiona `dist/`.

## Antes del siguiente incremento

- Probar las tres sesiones con la guitarra y ajustar el contenido a partir del uso real.
- Decidir si bastará un estado por sesión o harán falta intentos separados; hoy los cambios sustituyen el mismo registro.
- Mantener fuera de alcance la importación y cualquier catálogo amplio de posiciones hasta que exista evidencia de uso.

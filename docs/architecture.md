# Arquitectura

## Primer incremento

Sitio estático con Vite, HTML, CSS y JavaScript vanilla. Vite es la única dependencia directa y solo interviene en desarrollo y build. No hay framework, router, fuentes remotas, backend ni base de datos.

`src/main.js` carga una sesión JSON mediante `fetch`, representa su contenido y conecta los controles. La ruta usa `import.meta.env.BASE_URL`; `base: '/guitar-path/'` corresponde al subdirectorio del repositorio en GitHub Pages. El texto del JSON y las notas se escapan antes de insertarse en HTML. Los recursos externos solo admiten HTTP/HTTPS y se abren con `noopener noreferrer`.

## Contenido

La única sesión está en `public/content/course/block-01/week-01/session-01.json`. No incluye progreso del usuario.

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

Para añadir una sesión después, se puede reutilizar este formato y el mismo renderizador. La selección/ruta de nuevas sesiones queda pendiente de definir; no se crea aún un catálogo. Mantener los IDs al corregir contenido permite conservar los estados existentes.

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

## Publicación en GitHub Pages

La aplicación se publica en `https://sergioberdiales.github.io/guitar-path/`. El workflow `.github/workflows/deploy-pages.yml` se ejecuta en pushes a `main` o mediante `workflow_dispatch`. El job `build` usa Node.js 22, `npm ci`, los tests y `npm run build`; sube únicamente `dist/` como artefacto. El job `deploy` configura Pages y publica ese artefacto en el entorno `github-pages`.

Solo el job de despliegue tiene permisos `pages: write` e `id-token: write`; el build únicamente puede leer el código. Se utilizan acciones oficiales fijadas por SHA y el token efímero de GitHub Actions, sin secretos personales. La concurrencia evita despliegues simultáneos sin interrumpir el que está en curso.

La opción **Settings → Pages → Source** debe ser **GitHub Actions**. El README recoge los pasos de activación y de ejecución manual. No se publica `node_modules/` ni se versiona `dist/`.

## Antes del siguiente incremento

- Probar esta sesión con la guitarra y ajustar contenido, tamaño de texto y cantidad de scroll.
- Definir cómo seleccionar la siguiente sesión antes de añadir navegación de curso.
- Decidir si bastará un estado por sesión o harán falta intentos separados; hoy los cambios sustituyen el mismo registro.

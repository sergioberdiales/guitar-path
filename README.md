# Guitar Path

Aplicación web para acompañar un curso estructurado de guitarra y registrar el progreso del alumno.

Este primer incremento incluye únicamente **Bloque 1 → Semana 1 → Sesión 1: Del acorde conocido a 1–3–5**. No hay cuentas, backend ni sincronización.

## Arrancar

Requiere Node.js 22.12 o posterior.

```sh
npm ci
npm run dev
```

Abre la dirección local que imprime Vite, normalmente `http://localhost:5173/guitar-path/`. La sesión se carga directamente; no hay pantallas intermedias.

## Practicar

- Sigue los cinco ejercicios en orden, desplazándote por la página. En escritorio también hay un índice lateral.
- Los vídeos son opcionales y se abren en otra pestaña; no se cargan reproductores externos.
- Revela por separado D mayor y D menor después de intentar construirlos.
- Marca cada ejercicio como Pendiente, Practicado o Cómodo. Puedes cambiarlo también en el cierre.
- Registra los minutos aproximados y, si quieres, una nota. Todo se guarda automáticamente.

El progreso se recupera al volver desde el mismo navegador y origen. «Cómodo» es una percepción de esta sesión, no una certificación de dominio. Borrar los datos del navegador elimina el progreso; los modos privados o el almacenamiento bloqueado pueden impedir conservarlo. Un cambio de dominio, protocolo o puerto también cambia el almacenamiento disponible. No se guarda un historial de intentos.

## Comprobar

```sh
npm test
npm run build
npm run preview
```

Los tests usan el runner de Node, sin dependencias adicionales. Cubren persistencia, datos corruptos, estados inválidos, errores de almacenamiento y el contenido mínimo de la sesión.

Para una comprobación manual: cambia estados desde un ejercicio y desde el cierre; introduce duración y nota; recarga o cierra y vuelve a abrir; comprueba que los valores permanecen y que las soluciones vuelven a estar ocultas. Prueba también una pantalla de 375 px y navegación con teclado.

## Archivos principales

```text
public/content/course/block-01/week-01/session-01.json  Contenido pedagógico
src/main.js                                           Carga y representación de la sesión
src/progress.js                                       Lectura y guardado local
src/style.css                                        Diseño responsive
tests/                                               Pruebas con node:test
vite.config.js                                       Base /guitar-path/
.github/workflows/deploy-pages.yml                    Build y publicación en Pages
```

Consulta `docs/architecture.md` para el esquema del contenido y las decisiones del incremento.

## GitHub Pages

La URL de publicación es [sergioberdiales.github.io/guitar-path](https://sergioberdiales.github.io/guitar-path/).

`npm run build` genera un sitio estático en `dist/`. `base: '/guitar-path/'` configura las rutas del HTML, CSS, JavaScript e icono. La aplicación utiliza `import.meta.env.BASE_URL` también para cargar el contenido JSON. No se usa router ni hacen falta reglas de reescritura; los saltos entre ejercicios son anclas.

Vite necesita compilarse antes de publicar. El workflow `.github/workflows/deploy-pages.yml` instala con `npm ci`, ejecuta los tests y el build y publica **solo `dist/`** mediante las acciones oficiales de Pages. Se ejecuta en cada push a `main` y también manualmente. Las acciones se fijan a commits concretos; no se necesitan tokens personales ni secretos adicionales.

Activación inicial en GitHub, si Pages aún no está configurado:

1. Abre [Settings → Pages](https://github.com/sergioberdiales/guitar-path/settings/pages).
2. En **Build and deployment → Source**, selecciona **GitHub Actions**. No selecciones una rama ni una carpeta.
3. Abre [Actions → Deploy Guitar Path to GitHub Pages](https://github.com/sergioberdiales/guitar-path/actions/workflows/deploy-pages.yml). Si el primer intento falló porque Pages no estaba activado, usa **Run workflow**, elige `main` y confirma **Run workflow**.
4. Espera a que los jobs `build` y `deploy` terminen correctamente y abre la URL pública.

Para comprobar el build local, ejecuta `npm run preview` y abre `http://localhost:4173/guitar-path/`. El progreso del navegador en localhost no se traslada automáticamente al dominio de GitHub Pages.

Referencias: [Vite y GitHub Pages](https://vite.dev/guide/static-deploy.html#github-pages), [workflows de GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

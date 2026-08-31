import './style.css';
import { exerciseStates, loadProgress, saveProgress } from './progress.js';

const app = document.querySelector('#app');
const sessionPath = `${import.meta.env.BASE_URL}content/course/block-01/week-01/session-01.json`;
const escape = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);
const number = (value) => String(value).padStart(2, '0');
const arrow = '<span aria-hidden="true">↗</span>';
const clock = '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="7"/><path d="M10 6v4l3 2"/></svg>';

function renderExamples(examples = []) {
  if (!examples.length) return '';
  return `<div class="examples" style="--columns: ${Math.min(examples.length, 3)}">${examples.map((example) => `
    <div class="example">
      <span class="example-label">${escape(example.label)}</span>
      <p class="example-value">${escape(example.value)}</p>
      ${example.detail ? `<span class="example-detail">${escape(example.detail)}</span>` : ''}
    </div>`).join('')}</div>`;
}

function renderStep(step) {
  return `<div class="exercise-step">
    ${step.title ? `<h3>${escape(step.title)}</h3>` : ''}
    ${step.text ? `<p>${escape(step.text)}</p>` : ''}
    ${step.instructions?.length ? `<ol class="instructions">${step.instructions.map((instruction) => `<li>${escape(instruction)}</li>`).join('')}</ol>` : ''}
    ${renderExamples(step.examples)}
    ${step.solution ? `<details class="solution">
      <summary>${escape(step.solution.label)}<span class="expand-sign" aria-hidden="true">+</span></summary>
      <div class="solution-content">${renderExamples(step.solution.examples)}${step.solution.text ? `<p>${escape(step.solution.text)}</p>` : ''}</div>
    </details>` : ''}
  </div>`;
}

function resourceUrl(resource) {
  const value = resource.youtubeId
    ? `https://www.youtube.com/watch?v=${encodeURIComponent(resource.youtubeId)}`
    : resource.url;
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Invalid resource URL');
  return escape(url.href);
}

function renderResource(resource) {
  return `<a class="resource" href="${resourceUrl(resource)}" target="_blank" rel="noopener noreferrer">
    <span class="resource-meta">${escape(resource.label || resource.type)} · ${resource.required ? 'Requerido' : 'Opcional'}</span>
    <span class="resource-title">${escape(resource.title)} ${arrow}</span>
    <span class="resource-author">${escape(resource.author)}${resource.approximateDuration ? ` · ${escape(resource.approximateDuration)}` : ''}</span>
    <span class="resource-purpose">${escape(resource.purpose)}</span>
    <span class="resource-open">Abrir en ${resource.youtubeId ? 'YouTube' : 'otra pestaña'} ${arrow}<span class="sr-only"> (nueva pestaña)</span></span>
  </a>`;
}

function renderExercise(exercise, index, progress) {
  return `<article class="exercise-card" id="${escape(exercise.id)}" aria-labelledby="title-${escape(exercise.id)}">
    <header class="exercise-header">
      <span class="exercise-number" aria-hidden="true">${number(index + 1)}</span>
      <div><p class="eyebrow">Ejercicio ${index + 1}</p><h2 id="title-${escape(exercise.id)}">${escape(exercise.title)}</h2></div>
      <span class="duration">${clock}${escape(exercise.approximateDuration)}</span>
    </header>
    <div class="exercise-body">
      <p class="explanation">${escape(exercise.explanation)}</p>
      ${exercise.steps.map(renderStep).join('')}
      ${exercise.takeaway ? `<aside class="takeaway"><span class="takeaway-symbol" aria-hidden="true">↳</span><p>${escape(exercise.takeaway)}</p></aside>` : ''}
      <div class="completion"><h3>Antes de seguir</h3>${exercise.completion.map((criterion) => `<p>${escape(criterion)}</p>`).join('')}</div>
    </div>
    <footer class="exercise-footer">
      <fieldset class="status-control" aria-describedby="state-help">
        <legend>¿Cómo lo llevas?<span class="sr-only"> ${escape(exercise.title)}</span></legend>
        <div class="status-options">${Object.entries(exerciseStates).map(([state, label]) => `
          <label class="status-option"><input type="radio" name="state-${escape(exercise.id)}" data-exercise="${escape(exercise.id)}" value="${state}" ${progress.exercises[exercise.id] === state ? 'checked' : ''}><span>${label}</span></label>`).join('')}
        </div>
      </fieldset>
    </footer>
  </article>`;
}

function renderSession(session, progress) {
  const firstPending = session.exercises.find(({ id }) => progress.exercises[id] === 'pending');
  const hasPractice = Object.values(progress.exercises).some((state) => state !== 'pending');
  return `
    <header class="site-header">
      <a class="brand" href="#main" aria-label="Guitar Path, inicio de la sesión"><img src="${import.meta.env.BASE_URL}favicon.svg" width="36" height="36" alt="">Guitar<span>Path</span></a>
      <span class="header-caption">UN POCO CADA DÍA. MÁS MÚSICA.</span>
      <span class="local-label"><span aria-hidden="true" class="local-dot"></span>Tu espacio de práctica</span>
    </header>
    <div class="page-layout">
      <aside class="session-sidebar" aria-label="Índice de la sesión">
        <div class="course-context"><p class="eyebrow">Bloque ${number(session.block.number)}</p><p class="block-title">${escape(session.block.title)}</p><p class="week-label">Semana ${session.week.number} · ${escape(session.week.title)}</p></div>
        <nav aria-label="En esta sesión">
          <p class="nav-label">EN ESTA SESIÓN</p>
          <a class="nav-intro" href="#main"><span class="nav-mark" aria-hidden="true">◌</span> Punto de partida</a>
          <ol class="session-nav">${session.exercises.map((exercise, index) => `<li><a href="#${escape(exercise.id)}"><span class="nav-number">${number(index + 1)}</span><span>${escape(exercise.title)}</span><span class="nav-state" data-nav-state="${escape(exercise.id)}" data-state="${progress.exercises[exercise.id]}"><span class="sr-only">${exerciseStates[progress.exercises[exercise.id]]}</span></span></a></li>`).join('')}</ol>
          <a class="nav-closing" href="#closing"><span class="nav-mark" aria-hidden="true">↳</span> Cierre de sesión</a>
        </nav>
        <p class="sidebar-note">La guitarra en las manos.<br>El ritmo lo pones tú.</p>
      </aside>
      <main id="main" tabindex="-1">
        <section class="session-hero" aria-labelledby="session-title">
          <div class="session-kicker"><span class="session-tag">SESIÓN ${number(session.number)}</span><span>${escape(session.week.title)}</span></div>
          <h1 id="session-title">${escape(session.title)}</h1>
          <p class="objective-label">Tu objetivo de hoy</p>
          <p class="objective">${escape(session.objective)}</p>
          <div class="hero-actions"><a class="primary-button" href="#${escape(firstPending?.id || 'closing')}">${hasPractice ? 'Continuar la práctica' : 'Empezar a tocar'}<span aria-hidden="true">↓</span></a><span class="session-time">${clock}<span>${escape(session.estimatedDuration)} <span class="time-separator">·</span> ${session.exercises.length} ejercicios</span></span></div>
        </section>
        <section class="introduction" aria-labelledby="intro-title"><p class="eyebrow">El punto de partida</p><h2 id="intro-title">${escape(session.introduction.title)}</h2><p>${escape(session.introduction.text)}</p>${renderExamples(session.introduction.examples)}<p class="intro-takeaway">${escape(session.introduction.takeaway)}</p></section>
        ${session.resources.length ? `<details class="resources"><summary><span class="resource-summary-icon" aria-hidden="true">▷</span><span>Un poco de contexto<span class="summary-subtitle">${session.resources.length} recursos complementarios · Puedes ir directamente a tocar</span></span><span class="expand-sign" aria-hidden="true">+</span></summary><div class="resource-grid">${session.resources.map(renderResource).join('')}</div></details>` : ''}
        <div class="practice-divider"><p class="eyebrow">Ahora, a la guitarra</p><span>Sin prisa. Escucha y prueba.</span></div>
        <p id="state-help" class="state-help">${escape(session.closing.statusHelp)}</p>
        <div class="exercises">${session.exercises.map((exercise, index) => renderExercise(exercise, index, progress)).join('')}</div>
        <section class="closing" id="closing" aria-labelledby="closing-title">
          <p class="eyebrow">Cierre de sesión</p><h2 id="closing-title">${escape(session.closing.title)}</h2>
          <h3>Estado de ejercicios</h3>
          <div class="closing-states">${session.exercises.map((exercise, index) => `<div class="closing-state"><label for="closing-${escape(exercise.id)}"><span>${number(index + 1)}</span>${escape(exercise.title)}</label><select id="closing-${escape(exercise.id)}" data-exercise="${escape(exercise.id)}" aria-describedby="closing-state-help">${Object.entries(exerciseStates).map(([state, label]) => `<option value="${state}" ${progress.exercises[exercise.id] === state ? 'selected' : ''}>${label}</option>`).join('')}</select></div>`).join('')}</div>
          <p class="field-help" id="closing-state-help">${escape(session.closing.statusHelp)}</p>
          <div class="duration-field"><label for="actual-duration">Duración real <span>(aproximada)</span></label><div class="duration-input"><input id="actual-duration" type="number" inputmode="numeric" min="1" step="1" placeholder="—" value="${progress.actualDuration ?? ''}" aria-describedby="duration-help"><span>minutos</span></div><p class="field-help" id="duration-help">Puedes dejarla en blanco. No hace falta cronometrar.</p></div>
          <div class="note-field"><label for="session-note">${escape(session.closing.noteQuestion)} <span>(opcional)</span></label><textarea id="session-note" rows="4" placeholder="Una idea, una dificultad, algo que quieras recordar…">${escape(progress.note)}</textarea></div>
          <p class="save-feedback" id="save-feedback" role="status">Se guarda automáticamente en este navegador.</p>
        </section>
        <footer class="page-footer"><span>Guitar Path <span aria-hidden="true">/</span> Menos pantalla, más guitarra.</span><a href="#main">Volver arriba ↑</a></footer>
      </main>
    </div>
    <div class="storage-warning" id="storage-warning" role="alert" hidden></div>`;
}

function wireProgress(session, progress) {
  const feedback = document.querySelector('#save-feedback');
  const warning = document.querySelector('#storage-warning');
  const persist = () => {
    const { error } = saveProgress(session, progress);
    warning.hidden = !error;
    warning.textContent = error || '';
    feedback.textContent = error ? 'Hay cambios sin guardar. Revisa el aviso de almacenamiento.' : 'Guardado en este navegador. Puedes cerrar la sesión cuando quieras.';
  };

  app.addEventListener('change', (event) => {
    const id = event.target.dataset.exercise;
    if (!Object.hasOwn(progress.exercises, id) || !Object.hasOwn(exerciseStates, event.target.value)) return;
    progress.exercises[id] = event.target.value;
    // Synchronize both controls without rebuilding the page or losing focus.
    for (const control of app.querySelectorAll('[data-exercise]')) {
      if (control.dataset.exercise !== id) continue;
      if (control.type === 'radio') control.checked = control.value === progress.exercises[id];
      else control.value = progress.exercises[id];
    }
    for (const indicator of app.querySelectorAll('[data-nav-state]')) {
      if (indicator.dataset.navState !== id) continue;
      indicator.dataset.state = progress.exercises[id];
      indicator.querySelector('.sr-only').textContent = exerciseStates[progress.exercises[id]];
    }
    persist();
  });

  const durationInput = document.querySelector('#actual-duration');
  const updateDuration = (event) => {
    const input = event.target;
    if (!input.validity.valid) {
      input.setAttribute('aria-invalid', 'true');
      document.querySelector('#duration-help').textContent = 'Usa un número entero mayor que cero o deja el campo vacío. Este valor no se ha guardado.';
      return;
    }
    input.removeAttribute('aria-invalid');
    document.querySelector('#duration-help').textContent = 'Puedes dejarla en blanco. No hace falta cronometrar.';
    progress.actualDuration = input.value === '' ? null : input.valueAsNumber;
    persist();
  };
  durationInput.addEventListener('input', updateDuration);
  durationInput.addEventListener('blur', updateDuration);

  const noteInput = document.querySelector('#session-note');
  const updateNote = (event) => {
    progress.note = event.target.value;
    persist();
  };
  noteInput.addEventListener('input', updateNote);
  noteInput.addEventListener('blur', updateNote);
}

async function start() {
  try {
    const response = await fetch(sessionPath);
    if (!response.ok) throw new Error(`Session request failed: ${response.status}`);
    const session = await response.json();
    const { progress, error } = loadProgress(session);
    app.innerHTML = renderSession(session, progress);
    document.title = `${session.title} · Guitar Path`;
    wireProgress(session, progress);
    if (error) {
      const warning = document.querySelector('#storage-warning');
      warning.hidden = false;
      warning.textContent = error;
    }
    // Exercise anchors also work when opening a bookmarked session directly.
    if (window.location.hash) document.getElementById(window.location.hash.slice(1))?.scrollIntoView();
  } catch (error) {
    console.error('No se pudo abrir la sesión.', error);
    app.innerHTML = '<main id="main" class="loading"><p class="eyebrow">Guitar Path</p><h1>No se ha podido abrir la sesión.</h1><p>Comprueba tu conexión y vuelve a intentarlo. Tu progreso guardado no se ha modificado.</p><button class="primary-button" id="retry" type="button">Volver a intentar</button></main>';
    document.querySelector('#retry').addEventListener('click', () => window.location.reload());
  }
}

start();

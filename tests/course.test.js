import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveSession, sessionHref } from '../src/course.js';

const sessions = [
  { id: 'block-01-week-01-session-01' },
  { id: 'block-01-week-01-session-02' },
  { id: 'block-01-week-01-session-03' },
];

test('la URL raíz sigue abriendo la sesión 1', () => {
  assert.equal(resolveSession(sessions, '').id, sessions[0].id);
});

test('el parámetro estable abre las sesiones 2 y 3 sin usar rutas del servidor', () => {
  assert.equal(resolveSession(sessions, `?session=${sessions[1].id}`).id, sessions[1].id);
  assert.equal(resolveSession(sessions, `?session=${sessions[2].id}&from=practice`).id, sessions[2].id);
  assert.equal(sessionHref(sessions[1].id, '/guitar-path/'), `/guitar-path/?session=${sessions[1].id}`);
});

test('un parámetro desconocido vuelve de forma segura a la primera sesión', () => {
  assert.equal(resolveSession(sessions, '?session=unknown').id, sessions[0].id);
  assert.equal(resolveSession([], '?session=unknown'), null);
});

test('todas las sesiones reales pueden abrirse por su ID bajo el base path de Pages', () => {
  const root = new URL('../public/content/course/block-01/week-01/', import.meta.url);
  const catalog = JSON.parse(readFileSync(new URL('index.json', root), 'utf8'));
  const course = catalog.sessions.map((file) => JSON.parse(readFileSync(new URL(file, root), 'utf8')));
  for (const session of course) {
    const url = new URL(sessionHref(session.id, '/guitar-path/'), 'https://sergioberdiales.github.io');
    assert.equal(url.pathname, '/guitar-path/');
    assert.equal(resolveSession(course, url.search), session);
  }
  assert.equal(resolveSession(course), course[0]);
});

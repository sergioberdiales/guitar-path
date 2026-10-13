import { readFileSync } from 'node:fs';
import { attachPlacement, catalogEntries } from '../../src/course.js';
export const root = new URL('../../public/content/course/', import.meta.url);
export const catalog = JSON.parse(readFileSync(new URL('index.json', root), 'utf8'));
export const entries = catalogEntries(catalog);
export const sessions = entries.map((entry) => attachPlacement(entry, JSON.parse(readFileSync(new URL(entry.file, root), 'utf8'))));

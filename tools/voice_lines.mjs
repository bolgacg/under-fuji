// Prints every story text the narrator reads, as a JSON list. Used by tools/render_voice.py.
import fs from 'fs';
import vm from 'vm';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
vm.runInThisContext(fs.readFileSync(path.join(root, 'data/events.js'), 'utf8'));
const { UF } = globalThis, out = new Set();
for (const ev of Object.values(UF.EV)) { out.add(ev.text); ev.c.forEach(c => { if (c[2]) out.add(c[2]); if (c[4]) out.add(c[4]); }); }
Object.values(UF.ENDINGS).forEach(e => out.add(e.x));
out.add(UF.INTRO.join(' ')); out.add(UF.ECLIPSE);
console.log(JSON.stringify([...out]));

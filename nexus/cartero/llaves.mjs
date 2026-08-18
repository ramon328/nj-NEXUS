// Alta y baja de llaves de API.  node llaves.mjs crear "Web Clivox" | listar | revocar <id>
import crypto from 'node:crypto';
import { db, ahora } from './db.mjs';

export const hashear = (llave) => crypto.createHash('sha256').update(llave).digest('hex');

export function crear(nombre) {
  const secreto = crypto.randomBytes(24).toString('base64url');
  const llave = `ck_${secreto}`;              // ck = cartero key
  const id = crypto.randomUUID().slice(0, 8);
  db.prepare('INSERT INTO llaves (id,nombre,prefijo,hash,activa,creado) VALUES (?,?,?,?,1,?)')
    .run(id, nombre, llave.slice(0, 11), hashear(llave), ahora());
  return { id, nombre, llave };
}

// Devuelve la llave si es valida. Se guarda solo el hash: si te roban la BD,
// no se pueden reconstruir las llaves.
export function validar(llave) {
  if (!llave) return null;
  const f = db.prepare('SELECT * FROM llaves WHERE hash=? AND activa=1').get(hashear(llave));
  if (f) db.prepare('UPDATE llaves SET ultimo_uso=? WHERE id=?').run(ahora(), f.id);
  return f || null;
}

export const listar = () => db.prepare('SELECT id,nombre,prefijo,activa,creado,ultimo_uso FROM llaves').all();
export const revocar = (id) => db.prepare('UPDATE llaves SET activa=0 WHERE id=?').run(id).changes;

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === 'crear') {
    const r = crear(arg || 'sin nombre');
    console.log(`\n  Llave creada: ${r.nombre}  (id ${r.id})\n`);
    console.log(`  ${r.llave}\n`);
    console.log('  Guardala ahora: no se vuelve a mostrar.\n');
  } else if (cmd === 'revocar') { console.log(revocar(arg) ? 'revocada' : 'no existe'); }
  else { console.table(listar()); }
}

// Base de datos local del Cartero (SQLite nativo de Node 24).
// Guarda: mensajes, eventos de tracking, supresiones, llaves de API
// y el ultimo estado visto de cada pedido de Clivox (para detectar cambios).
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.dirname(fileURLToPath(import.meta.url));
export const db = new DatabaseSync(path.join(raiz, 'datos', 'cartero.db'));

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA busy_timeout = 5000');

db.exec(`
CREATE TABLE IF NOT EXISTS mensajes (
  id            TEXT PRIMARY KEY,
  idempotencia  TEXT UNIQUE,
  para          TEXT NOT NULL,
  para_nombre   TEXT,
  de            TEXT NOT NULL,
  de_nombre     TEXT,
  responder_a   TEXT,
  asunto        TEXT NOT NULL,
  html          TEXT,
  texto         TEXT,
  plantilla     TEXT,
  datos         TEXT,
  estado        TEXT NOT NULL DEFAULT 'pendiente',
  intentos      INTEGER NOT NULL DEFAULT 0,
  prox_intento  INTEGER NOT NULL DEFAULT 0,
  error         TEXT,
  message_id    TEXT,
  origen        TEXT,
  creado        INTEGER NOT NULL,
  enviado       INTEGER
);

CREATE INDEX IF NOT EXISTS ix_msg_cola  ON mensajes(estado, prox_intento);
CREATE INDEX IF NOT EXISTS ix_msg_para  ON mensajes(para, creado);
CREATE INDEX IF NOT EXISTS ix_msg_fecha ON mensajes(creado);

CREATE TABLE IF NOT EXISTS eventos (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  mensaje_id TEXT NOT NULL,
  tipo       TEXT NOT NULL,
  detalle    TEXT,
  ip         TEXT,
  agente     TEXT,
  creado     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_ev_msg ON eventos(mensaje_id, creado);

CREATE TABLE IF NOT EXISTS supresiones (
  email  TEXT PRIMARY KEY,
  motivo TEXT NOT NULL,
  nota   TEXT,
  creado INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS llaves (
  id        TEXT PRIMARY KEY,
  nombre    TEXT NOT NULL,
  prefijo   TEXT NOT NULL,
  hash      TEXT NOT NULL,
  activa    INTEGER NOT NULL DEFAULT 1,
  creado    INTEGER NOT NULL,
  ultimo_uso INTEGER
);

-- Ultimo estado conocido de cada pedido de Clivox. El vigia compara
-- contra esto para saber si el estado cambio de verdad.
-- Invitaciones de un solo uso para conectar el correo desde una URL compartible.
CREATE TABLE IF NOT EXISTS invitaciones (
  token     TEXT PRIMARY KEY,
  pin       TEXT NOT NULL,
  nota      TEXT,
  intentos  INTEGER NOT NULL DEFAULT 0,
  usada     INTEGER NOT NULL DEFAULT 0,
  expira    INTEGER NOT NULL,
  creado    INTEGER NOT NULL,
  resultado TEXT
);

CREATE TABLE IF NOT EXISTS pedidos_vistos (
  order_id     TEXT PRIMARY KEY,
  status       TEXT,
  tracking     TEXT,
  carrier      TEXT,
  updated_at   TEXT,
  actualizado  INTEGER NOT NULL
);
`);

export const ahora = () => Date.now();

/*
  =============================================================================
  FitGestão — Módulo de Persistência SQLite Nativo (node:sqlite)
  Zero dependências externas, modo WAL ativo, transações ACID atômicas.
  =============================================================================
*/

const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const DEFAULT_DB_PATH = path.join(__dirname, 'fitgestao.sqlite');
const LEGACY_JSON_PATH = path.join(__dirname, 'db.json');

let dbInstance = null;

function getDb(filePath = process.env.SQLITE_DB_PATH || DEFAULT_DB_PATH) {
  if (!dbInstance) {
    initDb(filePath);
  }
  return dbInstance;
}

function initDb(filePath = process.env.SQLITE_DB_PATH || DEFAULT_DB_PATH) {
  if (dbInstance) {
    try { dbInstance.close(); } catch {}
  }

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  dbInstance = new DatabaseSync(filePath);

  // Ativação de Pragma para robustez e concorrência ACID
  dbInstance.exec('PRAGMA journal_mode = WAL;');
  dbInstance.exec('PRAGMA foreign_keys = ON;');

  // Criação dos Schemas Relacionais
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      plan TEXT NOT NULL,
      status TEXT NOT NULL,
      accessibilityNeeds TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS resources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      available INTEGER NOT NULL,
      location TEXT NOT NULL,
      condition TEXT NOT NULL,
      notes TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      responsible TEXT NOT NULL,
      priority TEXT NOT NULL,
      status TEXT NOT NULL,
      dueDate TEXT NOT NULL,
      description TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      audience TEXT NOT NULL,
      message TEXT NOT NULL,
      date TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
    CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
  `);

  seedIfEmpty();
  return dbInstance;
}

function seedIfEmpty() {
  const countRow = dbInstance.prepare('SELECT COUNT(*) as total FROM members').get();
  if (countRow.total > 0) return;

  // Migração suave dos dados do db.json legado, se existir
  if (fs.existsSync(LEGACY_JSON_PATH)) {
    try {
      const legacyData = JSON.parse(fs.readFileSync(LEGACY_JSON_PATH, 'utf-8'));
      if (Array.isArray(legacyData.members)) {
        for (const m of legacyData.members) insertMember(m);
      }
      if (Array.isArray(legacyData.resources)) {
        for (const r of legacyData.resources) insertResource(r);
      }
      if (Array.isArray(legacyData.tasks)) {
        for (const t of legacyData.tasks) insertTask(t);
      }
      if (Array.isArray(legacyData.announcements)) {
        for (const a of legacyData.announcements) insertAnnouncement(a);
      }
      return;
    } catch (err) {
      console.error('Aviso: Falha ao migrar db.json legado, usando seed padrão:', err.message);
    }
  }

  // Seed padrão em fallback
  insertMember({
    name: 'Marina Souza',
    email: 'marina.souza@email.com',
    phone: '(67) 99900-0101',
    plan: 'Premium Inclusivo',
    status: 'Ativo',
    accessibilityNeeds: 'Preferência por alto contraste nos comunicados'
  });

  insertResource({
    name: 'Esteira 01',
    category: 'Equipamento',
    quantity: 1,
    available: 1,
    location: 'Sala Cardio',
    condition: 'Disponível',
    notes: 'Revisão preventiva em 30 dias'
  });
}

function closeDb() {
  if (dbInstance) {
    try { dbInstance.close(); } catch {}
    dbInstance = null;
  }
}

// ── CRUD: MEMBERS ─────────────────────────────────────────────────────────
function getMembers(query = '', status = '') {
  const db = getDb();
  let sql = 'SELECT * FROM members WHERE 1=1';
  const params = [];

  if (status) {
    sql += ' AND LOWER(status) = LOWER(?)';
    params.push(status);
  }
  if (query) {
    sql += ' AND (LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(phone) LIKE ?)';
    const term = `%${query.toLowerCase()}%`;
    params.push(term, term, term);
  }
  sql += ' ORDER BY createdAt DESC';
  return db.prepare(sql).all(...params);
}

function getMemberById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM members WHERE id = ?').get(id) || null;
}

function insertMember(data) {
  const db = getDb();
  const id = data.id || crypto.randomUUID();
  const createdAt = data.createdAt || new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO members (id, name, email, phone, plan, status, accessibilityNeeds, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    id,
    data.name,
    data.email,
    data.phone || '',
    data.plan || 'Mensal',
    data.status || 'Ativo',
    data.accessibilityNeeds || 'Nenhuma informada',
    createdAt,
    data.updatedAt || null
  );
  return getMemberById(id);
}

function updateMember(id, data) {
  const db = getDb();
  const current = getMemberById(id);
  if (!current) return null;

  const updated = { ...current, ...data, id, updatedAt: new Date().toISOString() };
  db.prepare(`
    UPDATE members
    SET name = ?, email = ?, phone = ?, plan = ?, status = ?, accessibilityNeeds = ?, updatedAt = ?
    WHERE id = ?
  `).run(
    updated.name,
    updated.email,
    updated.phone,
    updated.plan,
    updated.status,
    updated.accessibilityNeeds,
    updated.updatedAt,
    id
  );
  return updated;
}

function deleteMember(id) {
  const db = getDb();
  const current = getMemberById(id);
  if (!current) return null;
  db.prepare('DELETE FROM members WHERE id = ?').run(id);
  return current;
}

// ── CRUD: RESOURCES & TRANSAÇÕES ATÔMICAS ──────────────────────────────────
function getResources(query = '', status = '') {
  const db = getDb();
  let sql = 'SELECT * FROM resources WHERE 1=1';
  const params = [];

  if (status) {
    sql += ' AND LOWER(condition) = LOWER(?)';
    params.push(status);
  }
  if (query) {
    sql += ' AND (LOWER(name) LIKE ? OR LOWER(location) LIKE ?)';
    const term = `%${query.toLowerCase()}%`;
    params.push(term, term);
  }
  sql += ' ORDER BY name ASC';
  return db.prepare(sql).all(...params);
}

function getResourceById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM resources WHERE id = ?').get(id) || null;
}

function insertResource(data) {
  const db = getDb();
  const id = data.id || crypto.randomUUID();
  const createdAt = data.createdAt || new Date().toISOString();
  db.prepare(`
    INSERT INTO resources (id, name, category, quantity, available, location, condition, notes, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.name,
    data.category || 'Equipamento',
    Number(data.quantity) || 1,
    Number(data.available ?? data.quantity),
    data.location || '',
    data.condition || 'Disponível',
    data.notes || '',
    createdAt,
    data.updatedAt || null
  );
  return getResourceById(id);
}

function updateResource(id, data) {
  const db = getDb();
  const current = getResourceById(id);
  if (!current) return null;

  const updated = { ...current, ...data, id, updatedAt: new Date().toISOString() };
  db.prepare(`
    UPDATE resources
    SET name = ?, category = ?, quantity = ?, available = ?, location = ?, condition = ?, notes = ?, updatedAt = ?
    WHERE id = ?
  `).run(
    updated.name,
    updated.category,
    Number(updated.quantity),
    Number(updated.available),
    updated.location,
    updated.condition,
    updated.notes,
    updated.updatedAt,
    id
  );
  return updated;
}

function deleteResource(id) {
  const db = getDb();
  const current = getResourceById(id);
  if (!current) return null;
  db.prepare('DELETE FROM resources WHERE id = ?').run(id);
  return current;
}

// Transação Atômica: Reserva de Vaga
function reserveResource(id) {
  const db = getDb();
  db.exec('BEGIN IMMEDIATE;');
  try {
    const res = db.prepare('SELECT * FROM resources WHERE id = ?').get(id);
    if (!res) throw new Error('NOT_FOUND');
    if (res.available <= 0) throw new Error('NO_VACANCY');

    const newAvailable = res.available - 1;
    const newCondition = newAvailable === 0 ? 'Reservado' : res.condition;
    const updatedAt = new Date().toISOString();

    db.prepare('UPDATE resources SET available = ?, condition = ?, updatedAt = ? WHERE id = ?')
      .run(newAvailable, newCondition, updatedAt, id);

    db.exec('COMMIT;');
    return getResourceById(id);
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

// Transação Atômica: Liberação de Vaga
function releaseResource(id) {
  const db = getDb();
  db.exec('BEGIN IMMEDIATE;');
  try {
    const res = db.prepare('SELECT * FROM resources WHERE id = ?').get(id);
    if (!res) throw new Error('NOT_FOUND');
    if (res.available >= res.quantity) throw new Error('MAX_CAPACITY');

    const newAvailable = res.available + 1;
    const updatedAt = new Date().toISOString();

    db.prepare('UPDATE resources SET available = ?, condition = ?, updatedAt = ? WHERE id = ?')
      .run(newAvailable, 'Disponível', updatedAt, id);

    db.exec('COMMIT;');
    return getResourceById(id);
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

// ── CRUD: TASKS ───────────────────────────────────────────────────────────
function getTasks(query = '', status = '') {
  const db = getDb();
  let sql = 'SELECT * FROM tasks WHERE 1=1';
  const params = [];

  if (status) {
    sql += ' AND LOWER(status) = LOWER(?)';
    params.push(status);
  }
  if (query) {
    sql += ' AND (LOWER(title) LIKE ? OR LOWER(responsible) LIKE ?)';
    const term = `%${query.toLowerCase()}%`;
    params.push(term, term);
  }
  sql += ' ORDER BY dueDate ASC';
  return db.prepare(sql).all(...params);
}

function getTaskById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) || null;
}

function insertTask(data) {
  const db = getDb();
  const id = data.id || crypto.randomUUID();
  const createdAt = data.createdAt || new Date().toISOString();
  db.prepare(`
    INSERT INTO tasks (id, title, responsible, priority, status, dueDate, description, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.title,
    data.responsible || '',
    data.priority || 'Média',
    data.status || 'Pendente',
    data.dueDate || '',
    data.description || '',
    createdAt,
    data.updatedAt || null
  );
  return getTaskById(id);
}

function updateTask(id, data) {
  const db = getDb();
  const current = getTaskById(id);
  if (!current) return null;

  const updated = { ...current, ...data, id, updatedAt: new Date().toISOString() };
  db.prepare(`
    UPDATE tasks
    SET title = ?, responsible = ?, priority = ?, status = ?, dueDate = ?, description = ?, updatedAt = ?
    WHERE id = ?
  `).run(
    updated.title,
    updated.responsible,
    updated.priority,
    updated.status,
    updated.dueDate,
    updated.description,
    updated.updatedAt,
    id
  );
  return updated;
}

function deleteTask(id) {
  const db = getDb();
  const current = getTaskById(id);
  if (!current) return null;
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  return current;
}

// ── CRUD: ANNOUNCEMENTS ───────────────────────────────────────────────────
function getAnnouncements(query = '', audience = '') {
  const db = getDb();
  let sql = 'SELECT * FROM announcements WHERE 1=1';
  const params = [];

  if (audience) {
    sql += " AND (audience = ? OR audience = 'Todos')";
    params.push(audience);
  }
  if (query) {
    sql += ' AND (LOWER(title) LIKE ? OR LOWER(message) LIKE ?)';
    const term = `%${query.toLowerCase()}%`;
    params.push(term, term);
  }
  sql += ' ORDER BY createdAt DESC';
  return db.prepare(sql).all(...params);
}

function getAnnouncementById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM announcements WHERE id = ?').get(id) || null;
}

function insertAnnouncement(data) {
  const db = getDb();
  const id = data.id || crypto.randomUUID();
  const createdAt = data.createdAt || new Date().toISOString();
  db.prepare(`
    INSERT INTO announcements (id, title, audience, message, date, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.title,
    data.audience || 'Todos',
    data.message,
    data.date || createdAt,
    createdAt
  );
  return getAnnouncementById(id);
}

function deleteAnnouncement(id) {
  const db = getDb();
  const current = getAnnouncementById(id);
  if (!current) return null;
  db.prepare('DELETE FROM announcements WHERE id = ?').run(id);
  return current;
}

// ── DASHBOARD AGGREGATOR ──────────────────────────────────────────────────
function buildDashboard() {
  const db = getDb();
  const totalMembers = db.prepare('SELECT COUNT(*) as count FROM members').get().count;
  const activeMembers = db.prepare("SELECT COUNT(*) as count FROM members WHERE status = 'Ativo'").get().count;
  const pendingTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status != 'Concluída'").get().count;

  const resources = db.prepare('SELECT quantity, available FROM resources').all();
  const resourcesInUse = resources.reduce((sum, r) => sum + Math.max(r.quantity - r.available, 0), 0);

  const accessibilityNotes = db.prepare("SELECT COUNT(*) as count FROM members WHERE accessibilityNeeds IS NOT NULL AND accessibilityNeeds != 'Nenhuma informada'").get().count;
  const recentAnnouncements = db.prepare('SELECT * FROM announcements ORDER BY createdAt DESC LIMIT 3').all();

  return {
    totalMembers,
    activeMembers,
    pendingTasks,
    resourcesInUse,
    accessibilityNotes,
    recentAnnouncements
  };
}

module.exports = {
  getDb,
  initDb,
  closeDb,
  getMembers,
  getMemberById,
  insertMember,
  updateMember,
  deleteMember,
  getResources,
  getResourceById,
  insertResource,
  updateResource,
  deleteResource,
  reserveResource,
  releaseResource,
  getTasks,
  getTaskById,
  insertTask,
  updateTask,
  deleteTask,
  getAnnouncements,
  getAnnouncementById,
  insertAnnouncement,
  deleteAnnouncement,
  buildDashboard
};

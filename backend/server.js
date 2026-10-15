/*
  =============================================================================
  FitGesty — Backend Nativo V1.5 (Zero-Dependency)
  Integrado a SQLite Relacional (node:sqlite WAL), JWT Nativo e Transações ACID.
  =============================================================================
*/

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const db = require('./db');
const auth = require('./auth');

// --- CONFIGURAÇÕES DO SERVIDOR ---
const PORT = Number(process.env.PORT || 3000);
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'frontend', 'public');

// --- CÓDIGOS DE STATUS HTTP ---
const STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  SERVER_ERROR: 500
};

// --- AUXILIARES DE RESPOSTA E REQUISIÇÃO ---
function send(res, status, payload, headers = {}) {
  const body = payload === undefined ? '' : JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    ...headers
  });
  res.end(body);
}

function sendStatic(req, res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf'
  };

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(STATUS.NOT_FOUND, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Arquivo não encontrado');
      return;
    }
    res.writeHead(STATUS.OK, {
      'Content-Type': contentTypes[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(content);
  });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error('Payload muito grande'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('JSON inválido'));
      }
    });
  });
}

const normalize = (text) => String(text || '').trim().toLowerCase();

const collectionName = (pathname) => {
  if (pathname.startsWith('/api/members')) return 'members';
  if (pathname.startsWith('/api/resources')) return 'resources';
  if (pathname.startsWith('/api/tasks')) return 'tasks';
  if (pathname.startsWith('/api/announcements')) return 'announcements';
  return null;
};

const getId = (pathname) => {
  const parts = pathname.split('/').filter(Boolean);
  return parts.length >= 3 ? parts[2] : null;
};

// --- MOTOR DE VALIDAÇÃO DECLARATIVO ---
function validate(name, payload) {
  const requiredFields = {
    members: ['name', 'email', 'plan', 'status'],
    resources: ['name', 'category', 'quantity', 'available', 'location', 'condition'],
    tasks: ['title', 'responsible', 'priority', 'status', 'dueDate'],
    announcements: ['title', 'audience', 'message']
  };

  const errors = [];
  const fields = requiredFields[name] || [];

  fields.forEach(field => {
    if (payload[field] === undefined || !String(payload[field]).trim()) {
      errors.push(`Campo obrigatório ausente: ${field}`);
    }
  });

  if (name === 'members') {
    const email = normalize(payload.email);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(payload.email))) {
      errors.push('E-mail inválido');
    }
    if (payload.status && !['Ativo', 'Pendente', 'Inativo'].includes(payload.status)) {
      errors.push('Status de aluno inválido');
    }
  }

  if (name === 'resources') {
    const quantity = Number(payload.quantity);
    const available = Number(payload.available);
    if (!Number.isInteger(quantity) || quantity < 1) errors.push('Quantidade deve ser um número inteiro maior que zero');
    if (!Number.isInteger(available) || available < 0) errors.push('Disponível deve ser um número inteiro maior ou igual a zero');
    if (Number.isInteger(quantity) && Number.isInteger(available) && available > quantity) {
      errors.push('Disponível não pode ser maior que a quantidade');
    }
  }

  if (name === 'tasks') {
    if (payload.priority && !['Baixa', 'Média', 'Alta'].includes(payload.priority)) errors.push('Prioridade inválida');
    if (payload.status && !['Pendente', 'Em andamento', 'Concluída'].includes(payload.status)) errors.push('Status de tarefa inválido');
    if (payload.dueDate && Number.isNaN(Date.parse(payload.dueDate))) errors.push('Prazo inválido');
  }

  return errors;
}

// --- CENTRAL DE CONTROLADORES DA API ---
async function handleApi(req, res, url) {
  const { method } = req;
  const { pathname, searchParams } = url;

  if (method === 'OPTIONS') return send(res, STATUS.NO_CONTENT);

  // Rota: Autenticação
  if (pathname === '/api/login' && method === 'POST') {
    const { username, password } = await parseBody(req);

    let role = null;
    let redirect = null;

    if (username === 'aluno' && password === 'x') {
      role = 'aluno'; redirect = '/aluno.html';
    } else if (username === 'funcionario' && password === 'x') {
      role = 'funcionario'; redirect = '/funcionario.html';
    } else if (username === 'admin' && password === 'x') {
      role = 'admin'; redirect = '/admin.html';
    }

    if (!role) {
      return send(res, STATUS.UNAUTHORIZED, { error: 'Usuário ou senha inválidos' });
    }

    const token = auth.generateToken({ username, role });
    return send(res, STATUS.OK, { role, redirect, token });
  }

  // Rota: Status de integridade
  if (pathname === '/api/health') {
    return send(res, STATUS.OK, { status: 'online', app: 'FitGesty', engine: 'SQLite-WAL', timestamp: new Date().toISOString() });
  }

  // Rota: Estatísticas Consolidadas
  if (pathname === '/api/dashboard' && method === 'GET') {
    return send(res, STATUS.OK, db.buildDashboard());
  }

  // Rotas de Concorrência Crítica: Reserva e Liberação Atômica
  const isReserve = pathname.match(/^\/api\/resources\/([^/]+)\/reserve$/);
  if (isReserve && method === 'POST') {
    const id = isReserve[1];
    try {
      const updated = db.reserveResource(id);
      return send(res, STATUS.OK, updated);
    } catch (err) {
      if (err.message === 'NOT_FOUND') return send(res, STATUS.NOT_FOUND, { error: 'Recurso não encontrado' });
      if (err.message === 'NO_VACANCY') return send(res, STATUS.CONFLICT, { error: 'Não há vagas disponíveis para este recurso' });
      return send(res, STATUS.SERVER_ERROR, { error: err.message });
    }
  }

  const isRelease = pathname.match(/^\/api\/resources\/([^/]+)\/release$/);
  if (isRelease && method === 'POST') {
    const id = isRelease[1];
    try {
      const updated = db.releaseResource(id);
      return send(res, STATUS.OK, updated);
    } catch (err) {
      if (err.message === 'NOT_FOUND') return send(res, STATUS.NOT_FOUND, { error: 'Recurso não encontrado' });
      if (err.message === 'MAX_CAPACITY') return send(res, STATUS.BAD_REQUEST, { error: 'Todas as vagas já estão desocupadas' });
      return send(res, STATUS.SERVER_ERROR, { error: err.message });
    }
  }

  // Resolução de Coleções Dinâmicas do CRUD
  const name = collectionName(pathname);
  if (!name) return send(res, STATUS.NOT_FOUND, { error: 'Rota não encontrada' });

  const id = getId(pathname);
  const q = searchParams.get('q') || '';
  const statusParam = searchParams.get('status') || '';

  // Operação: Listar Recursos / Filtrar
  if (method === 'GET' && !id) {
    if (name === 'members') return send(res, STATUS.OK, db.getMembers(q, statusParam));
    if (name === 'resources') return send(res, STATUS.OK, db.getResources(q, statusParam));
    if (name === 'tasks') return send(res, STATUS.OK, db.getTasks(q, statusParam));
    if (name === 'announcements') return send(res, STATUS.OK, db.getAnnouncements(q, searchParams.get('audience') || ''));
  }

  // Operação: Visualizar único recurso por ID
  if (method === 'GET' && id) {
    let item = null;
    if (name === 'members') item = db.getMemberById(id);
    if (name === 'resources') item = db.getResourceById(id);
    if (name === 'tasks') item = db.getTaskById(id);
    if (name === 'announcements') item = db.getAnnouncementById(id);

    return item ? send(res, STATUS.OK, item) : send(res, STATUS.NOT_FOUND, { error: 'Registro não encontrado' });
  }

  // Operação: Inserir novo Registro
  if (method === 'POST' && !id) {
    const payload = await parseBody(req);
    const validation = validate(name, payload);
    if (validation.length) return send(res, STATUS.BAD_REQUEST, { error: validation.join('; ') });

    try {
      let created = null;
      if (name === 'members') created = db.insertMember(payload);
      if (name === 'resources') created = db.insertResource(payload);
      if (name === 'tasks') created = db.insertTask(payload);
      if (name === 'announcements') created = db.insertAnnouncement(payload);
      return send(res, STATUS.CREATED, created);
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE')) {
        return send(res, STATUS.BAD_REQUEST, { error: 'Já existe aluno com este e-mail' });
      }
      return send(res, STATUS.SERVER_ERROR, { error: err.message });
    }
  }

  // Operação: Atualizar Registro Existente
  if (method === 'PUT' && id) {
    const payload = await parseBody(req);
    let updated = null;
    if (name === 'members') updated = db.updateMember(id, payload);
    if (name === 'resources') updated = db.updateResource(id, payload);
    if (name === 'tasks') updated = db.updateTask(id, payload);

    return updated ? send(res, STATUS.OK, updated) : send(res, STATUS.NOT_FOUND, { error: 'Registro não encontrado' });
  }

  // Operação: Eliminar Registro
  if (method === 'DELETE' && id) {
    let removed = null;
    if (name === 'members') removed = db.deleteMember(id);
    if (name === 'resources') removed = db.deleteResource(id);
    if (name === 'tasks') removed = db.deleteTask(id);
    if (name === 'announcements') removed = db.deleteAnnouncement(id);

    return removed ? send(res, STATUS.OK, { removed }) : send(res, STATUS.NOT_FOUND, { error: 'Registro não encontrado' });
  }

  return send(res, STATUS.METHOD_NOT_ALLOWED, { error: 'Método não permitido para esta rota' });
}

// --- INSTANCIAÇÃO DO SERVIDOR HTTP ---
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const timestamp = new Date().toLocaleTimeString('pt-BR');

  if (process.env.NODE_ENV !== 'test') {
    console.log(`[${timestamp}] Requisição: ${req.method} em ${url.pathname}`);
  }

  try {
    if (url.pathname.startsWith('/api/')) {
      return await handleApi(req, res, url);
    }

    // Fluxo de arquivos estáticos
    const requested = url.pathname === '/' ? '/login.html' : decodeURIComponent(url.pathname);
    const filePath = path.normalize(path.join(PUBLIC_DIR, requested));

    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Acesso negado');
      return;
    }

    return sendStatic(req, res, filePath);
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error(`❌ Erro interno:`, error);
    }
    return send(res, STATUS.SERVER_ERROR, { error: error.message || 'Erro interno do servidor' });
  }
});

function start(port = PORT) {
  db.getDb();
  return server.listen(port, () => {
    if (process.env.NODE_ENV !== 'test') {
      console.log(`FitGesty online em: http://localhost:${port}`);
    }
  });
}

if (require.main === module) {
  start();
}

module.exports = { server, start, validate };
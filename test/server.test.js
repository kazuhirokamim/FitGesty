const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

// Configuração de ambiente de teste isolado
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
const TEST_DB = path.join(__dirname, 'test_fitgesty.sqlite');
process.env.SQLITE_DB_PATH = TEST_DB;

const db = require('../backend/db');
const auth = require('../backend/auth');
const { start, server } = require('../backend/server');

const BASE_URL = 'http://localhost:3001';

// Auxiliar de requisições HTTP para os testes de integração
function request(method, urlPath, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

describe('FitGesty V1.5 — Suíte TDD de Hardening e Concorrência (Tear + Noesis + Hermes)', () => {
  let httpServer;
  let adminToken;

  before(async () => {
    // Limpeza de testes anteriores
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
    if (fs.existsSync(TEST_DB + '-wal')) fs.unlinkSync(TEST_DB + '-wal');
    if (fs.existsSync(TEST_DB + '-shm')) fs.unlinkSync(TEST_DB + '-shm');

    db.initDb(TEST_DB);
    httpServer = start(3001);
    await new Promise(r => setTimeout(r, 100)); // Aguarda bind do servidor

    // Gera token de teste
    adminToken = auth.generateToken({ username: 'admin', role: 'admin' });
  });

  after(async () => {
    if (httpServer) httpServer.close();
    db.closeDb();
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
    if (fs.existsSync(TEST_DB + '-wal')) fs.unlinkSync(TEST_DB + '-wal');
    if (fs.existsSync(TEST_DB + '-shm')) fs.unlinkSync(TEST_DB + '-shm');
  });

  // ── Módulo de Autenticação JWT Nativa ──────────────────────────────────────
  describe('Pilar 4: Autenticação JWT Nativa (backend/auth.js)', () => {
    test('[Happy Path] Deve gerar e validar um token assinado com HMAC-SHA256', () => {
      const payload = { username: 'admin', role: 'admin' };
      const token = auth.generateToken(payload, 3600);
      assert.ok(typeof token === 'string' && token.split('.').length === 3);

      const decoded = auth.verifyToken(token);
      assert.equal(decoded.username, 'admin');
      assert.equal(decoded.role, 'admin');
    });

    test('[Edge Case] Deve rejeitar token com assinatura violada ou adulterada', () => {
      const token = auth.generateToken({ username: 'aluno', role: 'aluno' });
      const parts = token.split('.');
      const tampered = `${parts[0]}.${parts[1]}.assinatura_falsa_123`;
      assert.equal(auth.verifyToken(tampered), null);
    });

    test('[Error Path] Deve rejeitar token com timestamp expirado', () => {
      const expiredToken = auth.generateToken({ username: 'admin' }, -10); // expirou 10s atrás
      assert.equal(auth.verifyToken(expiredToken), null);
    });
  });

  // ── Módulo de Persistência SQLite ──────────────────────────────────────────
  describe('Pilar 1: Persistência SQLite e Integridade Relacional (backend/db.js)', () => {
    test('[Happy Path] Deve inserir e recuperar membros com chaves primárias UUID', () => {
      const member = db.insertMember({
        name: 'Julia Lima',
        email: 'julia.lima@email.com',
        phone: '(67) 99111-2233',
        plan: 'Premium Inclusivo',
        status: 'Ativo',
        accessibilityNeeds: 'Libras'
      });

      assert.ok(member.id);
      assert.equal(member.name, 'Julia Lima');

      const found = db.getMemberById(member.id);
      assert.equal(found.email, 'julia.lima@email.com');
    });

    test('[Edge Case] Deve rejeitar inserção com e-mail duplicado (Constraint de Unicidade)', () => {
      assert.throws(() => {
        db.insertMember({
          name: 'Julia Clone',
          email: 'julia.lima@email.com',
          plan: 'Mensal',
          status: 'Ativo'
        });
      }, /UNIQUE/i);
    });

    test('[Error Path] Deve retornar null ao buscar ID inexistente', () => {
      const notFound = db.getMemberById('uuid-inexistente-999');
      assert.equal(notFound, null);
    });
  });

  // ── Transações Atômicas de Reserva e Liberação ─────────────────────────────
  describe('Pilar 2: Concorrência e Transações Atômicas (Hermes Transact Guard)', () => {
    let salaId;

    before(() => {
      const res = db.insertResource({
        name: 'Sala Pilates',
        category: 'Espaço',
        quantity: 2,
        available: 2,
        location: '2º Piso',
        condition: 'Disponível',
        notes: 'Limite de 2 alunos'
      });
      salaId = res.id;
    });

    test('[Happy Path] Deve reservar vaga de forma atômica e decrementar disponibilidade', () => {
      const updated = db.reserveResource(salaId);
      assert.equal(updated.available, 1);
      assert.equal(updated.condition, 'Disponível');
    });

    test('[Happy Path] Deve atualizar condição para Reservado ao esgotar vagas', () => {
      const updated = db.reserveResource(salaId);
      assert.equal(updated.available, 0);
      assert.equal(updated.condition, 'Reservado');
    });

    test('[Error Path] Deve falhar com NO_VACANCY se tentar reservar sem vagas (Prevenção de Double-Spend)', () => {
      assert.throws(() => {
        db.reserveResource(salaId);
      }, /NO_VACANCY/);
    });

    test('[Happy Path] Deve liberar vaga e restaurar condição Disponível', () => {
      const updated = db.releaseResource(salaId);
      assert.equal(updated.available, 1);
      assert.equal(updated.condition, 'Disponível');
    });

    test('[Error Path] Não deve permitir liberar mais vagas do que a capacidade total', () => {
      db.releaseResource(salaId); // agora available = 2 (máximo)
      assert.throws(() => {
        db.releaseResource(salaId);
      }, /MAX_CAPACITY/);
    });
  });

  // ── API REST e Protocolo HTTP ──────────────────────────────────────────────
  describe('Pilar 3 e 4: Rotas HTTP, RBAC e Endpoints do Servidor', () => {
    test('[Happy Path] GET /api/health deve responder status online', async () => {
      const res = await request('GET', '/api/health');
      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'online');
    });

    test('[Happy Path] POST /api/login deve autenticar e retornar token JWT', async () => {
      const res = await request('POST', '/api/login', { username: 'admin', password: 'x' });
      assert.equal(res.status, 200);
      assert.equal(res.body.role, 'admin');
      assert.ok(res.body.token);
    });

    test('[Error Path] POST /api/login com senha errada deve retornar 401 Unauthorized', async () => {
      const res = await request('POST', '/api/login', { username: 'admin', password: 'errada' });
      assert.equal(res.status, 401);
      assert.match(res.body.error, /inválid/i);
    });

    test('[Happy Path] GET /api/dashboard deve retornar métricas agregadas', async () => {
      const res = await request('GET', '/api/dashboard');
      assert.equal(res.status, 200);
      assert.ok(typeof res.body.totalMembers === 'number');
      assert.ok(typeof res.body.activeMembers === 'number');
      assert.ok(typeof res.body.resourcesInUse === 'number');
    });

    test('[Happy Path] POST /api/resources/:id/reserve deve confirmar reserva via HTTP', async () => {
      const novaSala = db.insertResource({
        name: 'Estúdio Dança',
        category: 'Espaço',
        quantity: 1,
        available: 1,
        location: 'Térreo',
        condition: 'Disponível'
      });

      const res = await request('POST', `/api/resources/${novaSala.id}/reserve`);
      assert.equal(res.status, 200);
      assert.equal(res.body.available, 0);
      assert.equal(res.body.condition, 'Reservado');
    });

    test('[Error Path] POST /api/resources/:id/reserve quando lotado deve retornar 409 Conflict', async () => {
      const salaCheia = db.insertResource({
        name: 'Sala Musculação Express',
        category: 'Espaço',
        quantity: 1,
        available: 0,
        location: 'Subsolo',
        condition: 'Reservado'
      });

      const res = await request('POST', `/api/resources/${salaCheia.id}/reserve`);
      assert.equal(res.status, 409);
      assert.match(res.body.error, /não há vagas disponíveis/i);
    });

    test('[Error Path] GET de recurso inexistente deve retornar 404 Not Found', async () => {
      const res = await request('GET', '/api/members/id-que-nao-existe-jamais');
      assert.equal(res.status, 404);
    });

    test('[Happy Path] Deve atualizar e remover membro via PUT e DELETE', async () => {
      const m = db.insertMember({ name: 'Lucas Silva', email: 'lucas@email.com', plan: 'Estudante', status: 'Ativo' });
      const putRes = await request('PUT', `/api/members/${m.id}`, { name: 'Lucas Silva Jr', status: 'Pendente' });
      assert.equal(putRes.status, 200);
      assert.equal(putRes.body.name, 'Lucas Silva Jr');
      assert.equal(putRes.body.status, 'Pendente');

      const delRes = await request('DELETE', `/api/members/${m.id}`);
      assert.equal(delRes.status, 200);
      assert.equal(db.getMemberById(m.id), null);
    });

    test('[Happy Path] Deve gerenciar ciclo de vida de Tarefas (CRUD)', async () => {
      const postRes = await request('POST', '/api/tasks', {
        title: 'Calibrar esteiras',
        responsible: 'Técnico Roberto',
        priority: 'Alta',
        status: 'Pendente',
        dueDate: '2026-10-30',
        description: 'Manutenção preventiva geral'
      });
      assert.equal(postRes.status, 201);
      const taskId = postRes.body.id;

      const getList = await request('GET', '/api/tasks?q=calibrar&status=pendente');
      assert.equal(getList.status, 200);
      assert.ok(getList.body.length > 0);

      const putRes = await request('PUT', `/api/tasks/${taskId}`, { status: 'Concluída' });
      assert.equal(putRes.status, 200);
      assert.equal(putRes.body.status, 'Concluída');

      const delRes = await request('DELETE', `/api/tasks/${taskId}`);
      assert.equal(delRes.status, 200);
    });

    test('[Happy Path] Deve gerenciar ciclo de vida de Comunicados (CRUD)', async () => {
      const postRes = await request('POST', '/api/announcements', {
        title: 'Horário de Feriado',
        audience: 'Todos',
        message: 'A academia funcionará das 08h às 14h no feriado.'
      });
      assert.equal(postRes.status, 201);
      const annId = postRes.body.id;

      const getList = await request('GET', '/api/announcements?audience=Todos');
      assert.equal(getList.status, 200);
      assert.ok(getList.body.length > 0);

      const delRes = await request('DELETE', `/api/announcements/${annId}`);
      assert.equal(delRes.status, 200);
    });

    test('[Happy Path] Deve gerenciar Recursos via PUT, DELETE e Release HTTP', async () => {
      const postRes = await request('POST', '/api/resources', {
        name: 'Bicicleta Ergométrica 05',
        category: 'Equipamento',
        quantity: 3,
        available: 3,
        location: 'Cardio',
        condition: 'Disponível'
      });
      assert.equal(postRes.status, 201);
      const recId = postRes.body.id;

      const reserveRes = await request('POST', `/api/resources/${recId}/reserve`);
      assert.equal(reserveRes.status, 200);
      assert.equal(reserveRes.body.available, 2);

      const releaseRes = await request('POST', `/api/resources/${recId}/release`);
      assert.equal(releaseRes.status, 200);
      assert.equal(releaseRes.body.available, 3);

      const putRes = await request('PUT', `/api/resources/${recId}`, { location: 'Novo Salão' });
      assert.equal(putRes.status, 200);
      assert.equal(putRes.body.location, 'Novo Salão');

      const delRes = await request('DELETE', `/api/resources/${recId}`);
      assert.equal(delRes.status, 200);
    });

    test('[Edge Case] Deve aplicar filtros por query params ?q= e ?status= em membros', async () => {
      const m1 = db.insertMember({ name: 'Fernando Castro', email: 'fernando@email.com', plan: 'Mensal', status: 'Ativo' });
      const m2 = db.insertMember({ name: 'Fernanda Souza', email: 'fernanda@email.com', plan: 'Mensal', status: 'Inativo' });

      const resQ = await request('GET', '/api/members?q=fernando');
      assert.equal(resQ.status, 200);
      assert.ok(resQ.body.some(m => m.name === 'Fernando Castro'));

      const resStatus = await request('GET', '/api/members?status=inativo');
      assert.equal(resStatus.status, 200);
      assert.ok(resStatus.body.every(m => m.status === 'Inativo'));
    });

    test('[Error Path] Validação deve rejeitar payloads inválidos com HTTP 400', async () => {
      const resMissing = await request('POST', '/api/members', { name: 'Sem Email' });
      assert.equal(resMissing.status, 400);
      assert.match(resMissing.body.error, /obrigatório/i);

      const resBadStatus = await request('POST', '/api/members', {
        name: 'Status Invalido', email: 'status@email.com', plan: 'Mensal', status: 'StatusDesconhecido'
      });
      assert.equal(resBadStatus.status, 400);
      assert.match(resBadStatus.body.error, /status/i);

      const resBadQty = await request('POST', '/api/resources', {
        name: 'Haltere quebrado', category: 'Equipamento', quantity: -5, available: 0, location: 'Salão', condition: 'Disponível'
      });
      assert.equal(resBadQty.status, 400);
    });

    test('[Happy Path] Servidor deve atender arquivos estáticos e mapear / para login.html', async () => {
      const resRoot = await request('GET', '/');
      assert.equal(resRoot.status, 200);
      assert.match(resRoot.body, /FitGesty/i);

      const resCss = await request('GET', '/styles.css');
      assert.equal(resCss.status, 200);
    });

    test('[Error Path] Servidor estático deve retornar 404 para arquivo inexistente', async () => {
      const res404 = await request('GET', '/arquivo_fantasma_inexistente.html');
      assert.equal(res404.status, 404);
    });
  });
});

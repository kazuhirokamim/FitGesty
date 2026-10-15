/*
  FitGesty — app.js (Painel Administrativo / index.html)
  Corrigido: guards para null em todos os seletores, kanban funcional,
  split de recursos (equipamentos vs salas), filtro de alunos.
*/

const api = async (path, options = {}) => {
  const response = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.error || 'Erro na requisição');
  return data;
};

const state = {
  dashboard: null,
  members: [],
  resources: [],
  tasks: [],
  announcements: []
};

// ── Status Box ─────────────────────────────────────────────────────────────
const statusBox = document.querySelector('#status');
const setStatus = (message, isError = false) => {
  if (!statusBox) return;
  statusBox.textContent = message;
  statusBox.style.borderLeftColor = isError ? 'var(--danger)' : 'var(--accent)';
};

// ── Formatadores ───────────────────────────────────────────────────────────
const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-';

const escapeHtml = (value = '') =>
  String(value).replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])
  );

const formToObject = (form) =>
  Object.fromEntries(new FormData(form).entries());

// ── Carregar tudo ──────────────────────────────────────────────────────────
async function loadAll() {
  try {
    const [dashboard, members, resources, tasks, announcements] = await Promise.all([
      api('/dashboard'),
      api('/members'),
      api('/resources'),
      api('/tasks'),
      api('/announcements')
    ]);
    Object.assign(state, { dashboard, members, resources, tasks, announcements });
    renderAll();
    setStatus('Dados carregados com sucesso.');
  } catch (error) {
    setStatus(error.message, true);
  }
}

// ── Dashboard ──────────────────────────────────────────────────────────────
function renderDashboard() {
  const container = document.querySelector('#dashboardCards');
  if (!container || !state.dashboard) return;
  const d = state.dashboard;
  container.innerHTML = `
    <article class="card">
      <h3>Alunos Cadastrados</h3>
      <div class="value">${d.totalMembers ?? 0}</div>
    </article>
    <article class="card">
      <h3>Alunos Ativos</h3>
      <div class="value" style="color:var(--accent)">${d.activeMembers ?? 0}</div>
    </article>
    <article class="card">
      <h3>Tarefas Pendentes</h3>
      <div class="value" style="color:var(--warning)">${d.pendingTasks ?? 0}</div>
    </article>
    <article class="card">
      <h3>Recursos Alocados</h3>
      <div class="value">${d.resourcesInUse ?? 0}</div>
    </article>
    <article class="card">
      <h3>Alertas Acessibilidade</h3>
      <div class="value" style="color:var(--primary)">${d.accessibilityNotes ?? 0}</div>
    </article>
  `;
}

// ── Alunos ─────────────────────────────────────────────────────────────────
function renderMembers(filter = '') {
  const container = document.querySelector('#membersTable');
  if (!container) return;

  const query = filter.toLowerCase();
  const filtered = query
    ? state.members.filter(m =>
        JSON.stringify(m).toLowerCase().includes(query)
      )
    : state.members;

  if (!filtered.length) {
    container.innerHTML = `<tr><td colspan="5" class="text-muted">Nenhum aluno encontrado.</td></tr>`;
    return;
  }

  container.innerHTML = filtered.map(item => `
    <tr>
      <td>
        <strong>${escapeHtml(item.name)}</strong><br>
        <small style="color:var(--muted)">${escapeHtml(item.email)} · ${escapeHtml(item.phone)}</small>
      </td>
      <td>${escapeHtml(item.plan)}</td>
      <td>
        <span class="badge ${item.status === 'Inativo' ? 'danger' : item.status === 'Pendente' ? 'pendente' : ''}">
          ${escapeHtml(item.status)}
        </span>
      </td>
      <td>${escapeHtml(item.accessibilityNeeds || 'Nenhuma')}</td>
      <td>
        <div class="actions">
          <button onclick="toggleMemberStatus('${item.id}')">Alternar Status</button>
          <button onclick="removeItem('members', '${item.id}')">Excluir</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ── Recursos: Equipamentos (tabela) + Salas (cards) ───────────────────────
function renderResources() {
  const equipBody = document.querySelector('#resourcesTableBody');
  const cardsContainer = document.querySelector('#resourcesCardsList');

  const equipamentos = state.resources.filter(r => r.category === 'Equipamento');
  const espacos = state.resources.filter(r => r.category !== 'Equipamento');

  if (equipBody) {
    equipBody.innerHTML = equipamentos.length
      ? equipamentos.map(item => `
          <tr>
            <td><strong>${escapeHtml(item.name)}</strong></td>
            <td>${escapeHtml(item.location)}</td>
            <td>
              <span class="badge ${item.condition !== 'Disponível' ? 'danger' : ''}">
                ${escapeHtml(item.condition)}
              </span>
            </td>
            <td>${item.available} de ${item.quantity}</td>
            <td>
              <div class="actions">
                <button onclick="removeItem('resources', '${item.id}')">Excluir</button>
              </div>
            </td>
          </tr>
        `).join('')
      : `<tr><td colspan="5" class="text-muted">Nenhum equipamento cadastrado.</td></tr>`;
  }

  if (cardsContainer) {
    cardsContainer.innerHTML = espacos.length
      ? espacos.map(item => `
          <article class="item">
            <div>
              <h3>${escapeHtml(item.name)}</h3>
              <p class="meta">📍 ${escapeHtml(item.location)}</p>
              ${item.notes ? `<p style="font-size:0.85rem;color:var(--muted)">${escapeHtml(item.notes)}</p>` : ''}
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:1rem">
              <span class="badge ${item.condition !== 'Disponível' ? 'danger' : ''}">
                ${escapeHtml(item.condition)}
              </span>
              <span style="font-size:0.85rem;color:var(--muted)">${item.available}/${item.quantity} livres</span>
            </div>
            <div class="actions" style="margin-top:0.75rem">
              <button onclick="removeItem('resources', '${item.id}')">Excluir</button>
            </div>
          </article>
        `).join('')
      : `<p class="text-muted">Nenhuma sala ou espaço cadastrado.</p>`;
  }
}

// ── Tarefas (Kanban) ───────────────────────────────────────────────────────
function renderTasks() {
  const pendentesCol   = document.querySelector('#tasks-pendentes');
  const andamentoCol   = document.querySelector('#tasks-andamento');
  const concluidasCol  = document.querySelector('#tasks-concluidas');

  // Fallback para view antiga com #tasksList
  const legacyList = document.querySelector('#tasksList');

  if (!pendentesCol && !legacyList) return;

  const makeCard = (item) => `
    <article class="task-card">
      <div>
        <h3>${escapeHtml(item.title)}</h3>
        <p class="meta">👤 ${escapeHtml(item.responsible)} · 📅 ${formatDate(item.dueDate)}</p>
        ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:1rem;gap:0.5rem;flex-wrap:wrap">
        <span class="badge ${item.priority === 'Alta' ? 'danger' : item.priority === 'Média' ? 'pendente' : ''}">
          ${escapeHtml(item.priority)}
        </span>
        <div class="actions">
          ${item.status !== 'Concluída' ? `<button onclick="completeTask('${item.id}')">Concluir</button>` : ''}
          <button onclick="removeItem('tasks', '${item.id}')">Excluir</button>
        </div>
      </div>
    </article>
  `;

  const pendentes   = state.tasks.filter(t => t.status === 'Pendente');
  const andamento   = state.tasks.filter(t => t.status === 'Em andamento');
  const concluidas  = state.tasks.filter(t => t.status === 'Concluída');

  if (pendentesCol) {
    pendentesCol.innerHTML = pendentes.length
      ? pendentes.map(makeCard).join('')
      : '<p class="text-muted" style="padding:0.5rem">Nenhuma tarefa pendente.</p>';
  }
  if (andamentoCol) {
    andamentoCol.innerHTML = andamento.length
      ? andamento.map(makeCard).join('')
      : '<p class="text-muted" style="padding:0.5rem">Nenhuma em andamento.</p>';
  }
  if (concluidasCol) {
    concluidasCol.innerHTML = concluidas.length
      ? concluidas.map(makeCard).join('')
      : '<p class="text-muted" style="padding:0.5rem">Nenhuma concluída ainda.</p>';
  }

  // Suporte à lista legada
  if (legacyList && !pendentesCol) {
    legacyList.innerHTML = state.tasks.map(makeCard).join('');
  }
}

// ── Comunicados ────────────────────────────────────────────────────────────
function renderAnnouncements() {
  const container = document.querySelector('#announcementsList');
  if (!container) return;
  if (!state.announcements.length) {
    container.innerHTML = '<p class="text-muted">Nenhum comunicado publicado.</p>';
    return;
  }
  container.innerHTML = state.announcements.map(item => `
    <article class="item">
      <div>
        <h3>${escapeHtml(item.title)}</h3>
        <p class="meta">Para: ${escapeHtml(item.audience)} · ${formatDate(item.date || item.createdAt)}</p>
        <p>${escapeHtml(item.message)}</p>
      </div>
      <div class="actions" style="margin-top:1rem">
        <button onclick="removeItem('announcements', '${item.id}')">Excluir</button>
      </div>
    </article>
  `).join('');
}

function renderAll() {
  renderDashboard();
  renderMembers();
  renderResources();
  renderTasks();
  renderAnnouncements();
}

// ── Submissão de formulários ───────────────────────────────────────────────
async function handleSubmit(form, collection, transform = data => data) {
  try {
    const payload = transform(formToObject(form));
    await api(`/${collection}`, { method: 'POST', body: JSON.stringify(payload) });
    form.reset();
    await loadAll();
    setStatus('Registro criado com sucesso.');
  } catch (error) {
    setStatus(error.message, true);
  }
}

// ── Event Listeners de Formulários ────────────────────────────────────────
const memberForm = document.querySelector('#memberForm');
if (memberForm) {
  memberForm.addEventListener('submit', event => {
    event.preventDefault();
    handleSubmit(event.currentTarget, 'members', data => ({ ...data, status: data.status || 'Ativo' }));
  });
}

const resourceForm = document.querySelector('#resourceForm');
if (resourceForm) {
  resourceForm.addEventListener('submit', event => {
    event.preventDefault();
    handleSubmit(event.currentTarget, 'resources', data => ({
      ...data,
      quantity: Number(data.quantity),
      available: Number(data.available)
    }));
  });
}

const taskForm = document.querySelector('#taskForm');
if (taskForm) {
  taskForm.addEventListener('submit', event => {
    event.preventDefault();
    handleSubmit(event.currentTarget, 'tasks');
  });
}

const announcementForm = document.querySelector('#announcementForm');
if (announcementForm) {
  announcementForm.addEventListener('submit', event => {
    event.preventDefault();
    handleSubmit(event.currentTarget, 'announcements', data => ({
      ...data,
      date: new Date().toISOString()
    }));
  });
}

// ── Ações Globais ──────────────────────────────────────────────────────────
window.removeItem = async (collection, id) => {
  if (!confirm('Deseja excluir este registro?')) return;
  try {
    await api(`/${collection}/${id}`, { method: 'DELETE' });
    await loadAll();
    setStatus('Registro excluído.');
  } catch (error) {
    setStatus(error.message, true);
  }
};

window.completeTask = async (id) => {
  try {
    await api(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'Concluída' }) });
    await loadAll();
    setStatus('Tarefa marcada como concluída.');
  } catch (error) {
    setStatus(error.message, true);
  }
};

window.toggleMemberStatus = async (id) => {
  const member = state.members.find(m => m.id === id);
  if (!member) return;
  const status = member.status === 'Ativo' ? 'Inativo' : 'Ativo';
  try {
    await api(`/members/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
    await loadAll();
    setStatus('Status do aluno alterado.');
  } catch (error) {
    setStatus(error.message, true);
  }
};

// ── Filtro de Alunos ───────────────────────────────────────────────────────
const memberSearch = document.querySelector('#memberSearch');
if (memberSearch) {
  memberSearch.addEventListener('input', (e) => {
    renderMembers(e.target.value);
  });
}

// ── Máscara de Telefone ────────────────────────────────────────────────────
const phoneInput = document.querySelector('#phoneInput');
if (phoneInput) {
  phoneInput.addEventListener('input', (e) => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 6) v = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
    else if (v.length > 2) v = `(${v.slice(0,2)}) ${v.slice(2)}`;
    else if (v.length > 0) v = `(${v}`;
    e.target.value = v;
  });
}

// ── Navegação por Abas ────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    tab.classList.add('active');
    const target = document.querySelector(`#${tab.dataset.view}`);
    if (target) target.classList.add('active');
  });
});

// ── Botão Atualizar ────────────────────────────────────────────────────────
const refreshButton = document.querySelector('#refreshButton');
if (refreshButton) {
  refreshButton.addEventListener('click', loadAll);
}

// ── Acessibilidade ─────────────────────────────────────────────────────────
const contrastBtn = document.querySelector('#contrastButton');
if (contrastBtn) {
  contrastBtn.addEventListener('click', event => {
    document.body.classList.toggle('high-contrast');
    event.currentTarget.setAttribute('aria-pressed', document.body.classList.contains('high-contrast'));
  });
}

const fontBtn = document.querySelector('#fontButton');
if (fontBtn) {
  fontBtn.addEventListener('click', event => {
    document.body.classList.toggle('large-font');
    event.currentTarget.setAttribute('aria-pressed', document.body.classList.contains('large-font'));
  });
}

// ── Init ───────────────────────────────────────────────────────────────────
loadAll();
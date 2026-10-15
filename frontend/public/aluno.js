/*
  FitGestão — aluno.js (Área do Aluno)
  Corrigido: guards para null, campo condition correto, renderização robusta.
*/

// Verificação de role (flexível: aceita ambas as chaves usadas no projeto)
const userRole = localStorage.getItem('user_role') || localStorage.getItem('fit_role');
if (userRole !== 'aluno') {
  window.location.href = '/';
}

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
  resources: [],
  announcements: []
};

// ── Status ─────────────────────────────────────────────────────────────────
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

// ── Carregar Dados ─────────────────────────────────────────────────────────
async function loadAll() {
  try {
    const [dashboard, resources, announcements] = await Promise.all([
      api('/dashboard'),
      api('/resources'),
      api('/announcements')
    ]);
    Object.assign(state, { dashboard, resources, announcements });
    renderAll();
  } catch (error) {
    setStatus(error.message, true);
  }
}

// ── Dashboard Cards ────────────────────────────────────────────────────────
function renderDashboard() {
  const container = document.querySelector('#dashboardCards');
  if (!container) return;

  const activeAnn = state.announcements.filter(
    a => a.audience === 'Todos' || a.audience === 'Alunos' || a.audience === 'Todos os alunos'
  ).length;

  const availResources = state.resources.filter(r => r.available > 0).length;

  container.innerHTML = `
    <article class="card">
      <h3>Matrícula</h3>
      <div class="value" style="color:var(--accent)">Ativa</div>
    </article>
    <article class="card">
      <h3>Avisos para Alunos</h3>
      <div class="value">${activeAnn}</div>
    </article>
    <article class="card">
      <h3>Recursos Disponíveis</h3>
      <div class="value" style="color:var(--primary)">${availResources}</div>
    </article>
  `;
}

// ── Recursos: Equipamentos e Salas separados ───────────────────────────────
function renderResources() {
  // Suporte a aluno.html (tabelas separadas por categoria)
  const eqBody = document.querySelector('#tableEquipmentsBody');
  const spBody = document.querySelector('#tableSpacesBody');

  // Suporte a view alternativa com lista de cards (#resourcesList)
  const cardsList = document.querySelector('#resourcesList');

  const equipamentos = state.resources.filter(r => r.category === 'Equipamento');
  const espacos      = state.resources.filter(r => r.category !== 'Equipamento');

  // ── Tabelas (aluno.html) ──
  if (eqBody) {
    eqBody.innerHTML = equipamentos.length
      ? equipamentos.map(rec => {
          const isIndisponivel = rec.available === 0;
          const badgeClass = isIndisponivel ? 'badge-danger' : 'badge-success';
          return `<tr>
            <td><strong>${escapeHtml(rec.name)}</strong></td>
            <td>${escapeHtml(rec.location)}</td>
            <td><span class="badge ${badgeClass}">${escapeHtml(rec.condition || (isIndisponivel ? 'Indisponível' : 'Disponível'))}</span></td>
            <td><strong>${rec.available}</strong> disponíveis (de ${rec.quantity})</td>
          </tr>`;
        }).join('')
      : `<tr><td colspan="4" class="text-muted">Nenhum equipamento cadastrado.</td></tr>`;
  }

  if (spBody) {
    spBody.innerHTML = espacos.length
      ? espacos.map(rec => {
          const isIndisponivel = rec.available === 0;
          const badgeClass = isIndisponivel ? 'badge-danger' : 'badge-success';
          return `<tr>
            <td><strong>${escapeHtml(rec.name)}</strong></td>
            <td>${escapeHtml(rec.location)}</td>
            <td><span class="badge ${badgeClass}">${escapeHtml(rec.condition || (isIndisponivel ? 'Lotado' : 'Disponível'))}</span></td>
            <td><strong>${rec.available}</strong> disponíveis (de ${rec.quantity})</td>
          </tr>`;
        }).join('')
      : `<tr><td colspan="4" class="text-muted">Nenhuma sala cadastrada.</td></tr>`;
  }

  // ── Cards alternativos (#resourcesList) ──
  if (cardsList) {
    cardsList.innerHTML = state.resources.length
      ? state.resources.map(item => {
          const isIndisponivel = item.available === 0;
          return `
            <article class="item">
              <div>
                <h3>${escapeHtml(item.name)}</h3>
                <p class="meta"> ${escapeHtml(item.location)}</p>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-top:1rem">
                <span class="badge ${isIndisponivel ? 'danger' : ''}">
                  ${escapeHtml(item.condition || (isIndisponivel ? 'Indisponível' : 'Disponível'))}
                </span>
                <span style="font-size:0.85rem;color:var(--muted)">${item.available} de ${item.quantity} disponíveis</span>
              </div>
            </article>`;
        }).join('')
      : '<p class="text-muted">Nenhum recurso cadastrado.</p>';
  }
}

// ── Mural de Comunicados ───────────────────────────────────────────────────
function renderAnnouncements() {
  // Suporte a #muralContainer (aluno.html) e #announcementsList (view alternativa)
  const mural   = document.querySelector('#muralContainer');
  const listEl  = document.querySelector('#announcementsList');

  const relevant = state.announcements.filter(
    a => a.audience === 'Todos' || a.audience === 'Alunos' || a.audience === 'Todos os alunos'
  );

  const makeCard = (ann) => `
    <article class="card-announcement">
      <h3>${escapeHtml(ann.title)}</h3>
      <p class="meta" style="margin-bottom:0.5rem">
        Destinado a: ${escapeHtml(ann.audience)} · ${formatDate(ann.date || ann.createdAt)}
      </p>
      <p>${escapeHtml(ann.message)}</p>
    </article>`;

  if (mural) {
    mural.innerHTML = relevant.length
      ? relevant.map(makeCard).join('')
      : '<p class="text-muted">Nenhum comunicado no momento.</p>';
  }

  if (listEl) {
    listEl.innerHTML = relevant.length
      ? relevant.map(ann => `
          <article class="item">
            <div>
              <h3>${escapeHtml(ann.title)}</h3>
              <p class="meta">Destinado a: ${escapeHtml(ann.audience)} · ${formatDate(ann.date || ann.createdAt)}</p>
              <p>${escapeHtml(ann.message)}</p>
            </div>
          </article>`).join('')
      : '<p class="text-muted">Nenhum comunicado importante para exibir.</p>';
  }
}

function renderAll() {
  renderDashboard();
  renderResources();
  renderAnnouncements();
}

// ── Navegação por Abas ─────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    tab.classList.add('active');
    const target = document.querySelector(`#${tab.dataset.view}`);
    if (target) target.classList.add('active');
  });
});

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
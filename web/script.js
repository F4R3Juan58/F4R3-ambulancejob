const app = document.getElementById('app');
const tabButtons = document.getElementById('tab-buttons');
const closeBtn = document.getElementById('close-btn');

const tabs = {
  calls: document.getElementById('tab-calls'),
  patient: document.getElementById('tab-patient'),
  services: document.getElementById('tab-services'),
};

let currentTabs = [];
let activeTab = null;

const resourceName = typeof GetParentResourceName === 'function'
  ? GetParentResourceName()
  : 'F4R3-ambulancejob';

function post(action, data = {}) {
  fetch(`https://${resourceName}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify(data),
  }).catch(() => {});
}

function hideAllTabs() {
  Object.values(tabs).forEach((el) => el.classList.add('hidden'));
  tabButtons.innerHTML = '';
}

function setActiveTab(id) {
  activeTab = id;

  Object.entries(tabs).forEach(([tabId, el]) => {
    if (tabId === id) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });

  [...tabButtons.children].forEach((btn) => {
    const matches = btn.dataset.tab === id;
    btn.classList.toggle('active', matches);
  });
}

function renderCalls(payload) {
  const list = document.getElementById('calls-list');
  const calls = payload?.calls || [];
  list.innerHTML = '';

  if (!calls.length) {
    list.innerHTML = '<p class="muted">No hay avisos en este momento.</p>';
    return;
  }

  calls.forEach((call, idx) => {
    const wrapper = document.createElement('article');
    wrapper.className = 'card';

    wrapper.innerHTML = `
      <div class="card__title">${call.name || 'Aviso'}</div>
      <div class="muted">${call.message || ''}</div>
      <div class="card__meta">
        <span>${call.location || ''}</span>
        <span>${call.time || ''}</span>
      </div>
      <div class="card__actions">
        <button data-action="select" data-index="${idx}" class="primary">Ruta</button>
        <button data-action="copy" data-index="${idx}">Copiar</button>
      </div>
    `;

    wrapper.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const index = Number(btn.dataset.index);
        if (btn.dataset.action === 'select') {
          post('selectCall', { index });
        } else {
          post('copyCall', { index });
        }
      });
    });

    list.appendChild(wrapper);
  });
}

function renderPatient(payload) {
  const container = document.getElementById('patient-info');
  container.innerHTML = '';
  const entries = [
    { label: 'Paciente', value: payload?.patient?.name || 'Desconocido' },
    { label: 'Estado', value: payload?.patient?.status || 'Sin datos' },
    { label: 'Pulso', value: payload?.patient?.pulse || '--' },
    { label: 'Presión', value: payload?.patient?.pressure || '--' },
  ];

  entries.forEach((entry) => {
    const stat = document.createElement('div');
    stat.className = 'stat';
    stat.innerHTML = `<h3>${entry.label}</h3><p>${entry.value}</p>`;
    container.appendChild(stat);
  });
}

function renderServices(payload) {
  const container = document.getElementById('service-list');
  container.innerHTML = '';

  const services = payload?.services || [];
  if (!services.length) {
    container.innerHTML = '<p class="muted">No hay utilidades configuradas.</p>';
    return;
  }

  services.forEach((service, idx) => {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.dataset.index = idx;
    chip.innerHTML = `<strong>${service.title}</strong> <span>${service.description || ''}</span>`;
    chip.addEventListener('click', () => post('triggerService', { index: idx }));
    container.appendChild(chip);
  });
}

function renderContent(payload) {
  renderCalls(payload);
  renderPatient(payload);
  renderServices(payload);
}

function renderTabs(data) {
  hideAllTabs();
  currentTabs = data || [];

  currentTabs.forEach((tab) => {
    const btn = document.createElement('button');
    btn.className = 'tab-button';
    btn.dataset.tab = tab.id;
    btn.innerHTML = `<strong>${tab.label}</strong><small>${tab.description || ''}</small>`;
    btn.addEventListener('click', () => setActiveTab(tab.id));
    tabButtons.appendChild(btn);

    const titleEl = document.getElementById(`tab-${tab.id}-title`);
    const descEl = document.getElementById(`tab-${tab.id}-desc`);
    if (titleEl) titleEl.textContent = tab.label;
    if (descEl) descEl.textContent = tab.description || '';

    const tabEl = document.getElementById(`tab-${tab.id}`);
    if (tabEl) tabEl.classList.remove('hidden');
  });
}

function openPanel(data) {
  const { tabs: incomingTabs = [], activeTab: incomingActive = '', title = 'Panel EMS', subtitle = 'Ars Ambulance Job', payload } = data;
  document.getElementById('panel-title').textContent = title;
  document.getElementById('panel-subtitle').textContent = subtitle;
  renderTabs(incomingTabs);
  renderContent(payload);
  app.classList.remove('hidden');
  setActiveTab(incomingActive || incomingTabs[0]?.id);
}

function closePanel() {
  app.classList.add('hidden');
  activeTab = null;
  currentTabs = [];
  hideAllTabs();
}

window.addEventListener('message', (event) => {
  const data = event.data || {};

  if (data.action === 'open') {
    openPanel(data);
  } else if (data.action === 'close') {
    closePanel();
  }
});

closeBtn.addEventListener('click', () => {
  closePanel();
  post('close');
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closePanel();
    post('close');
  }
});

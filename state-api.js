/**
 * ============================================================
 * MULTIMILLONARIOS FINANCE — js/state-api.js  (Módulo 3)
 * Estado global + API Google Apps Script + Motor de Navegación.
 * ============================================================
 */

const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbwXrTj_gDl5Pc72Ay6gnWxypF3JJhrZIMk93SMOy7dEnHZG-15kuppMfH1nGmctCpTjBw/exec';

const appState = {
  activeUser: 'Brian',
  currentView: 'micro',
  microTab: 'list',

  homeBankingTotal: 0,
  bolsaTotal: 0,
  diaCobro: null,
  diasRestantes: [],
  movimientos: [],
  lastProcessedDate: null,

  currentMacroYear: new Date().getFullYear(),
  currentMacroMonth: new Date().getMonth(),
  macroData: null
};

let txModalSubtype = 'single';
let editingMovimientoId = null;
let cierreDiaPendiente = null;
let limpiarColaCandidatos = [];

let hbModalState = { hb: 0, objetivo: 0, bolsa: 0, diasCount: 0, lastEdited: 'objetivo' };

let macroDraft = null;

let currentEditingValueTarget = null;
let currentEditingServiceId = null;
let currentEditingFixedExpenseId = null;
let currentEditingFixedExpenseUser = 'Brian';

let auditTargetDay_ = 'today';

let pendingSyncCount = 0;

async function callBackend(action, payload) {
  const res = await fetch(BACKEND_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: action, payload: payload || {} })
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || ('Error en ' + action));
  return json.data;
}

async function callBackendConSync(action, payload) {
  mostrarSyncToast_();
  try {
    return await callBackend(action, payload);
  } finally {
    ocultarSyncToast_();
  }
}

async function callBackendBackground(action, payload) {
  pendingSyncCount++;
  mostrarSyncToast_();
  try {
    const res = await callBackend(action, payload);
    return res;
  } catch (err) {
    console.error('Error en sync background (' + action + '):', err);
    alert('Error de sincronización con la base de datos: ' + err.message);
    if (appState.currentView === 'macro') recargarEstadoMensual_();
    else recargarEstadoDiario_(false);
    throw err;
  } finally {
    pendingSyncCount--;
    if (pendingSyncCount <= 0) {
      pendingSyncCount = 0;
      ocultarSyncToast_();
    }
  }
}

function mostrarSyncToast_() {
  const el = document.getElementById('sync-toast');
  if (el) el.classList.add('active');
}

function ocultarSyncToast_() {
  if (pendingSyncCount > 0) return;
  const el = document.getElementById('sync-toast');
  if (el) el.classList.remove('active');
}

const moneyStates = {};

function renderMoneyInput(id) {
  const el = document.getElementById(id);
  const st = moneyStates[id];
  if (!el || !st) return;
  if (st.int === '' && !st.isDec) { el.value = ''; return; }
  const displayInt = st.int.replace(/^0+/, '') || '0';
  const formattedInt = displayInt.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  el.value = st.isDec ? (formattedInt + ',' + st.dec) : formattedInt;
  if (typeof el.selectionStart === 'number') el.selectionStart = el.selectionEnd = el.value.length;
}

function getMoneyValue(id) {
  const st = moneyStates[id];
  if (!st) return 0;
  return parseFloat((st.int || '0') + '.' + (st.dec || '').padEnd(2, '0')) || 0;
}

function setMoneyValue(id, num) {
  if (!moneyStates[id]) moneyStates[id] = { int: '', dec: '', isDec: false };
  const totalStr = Math.max(Number(num) || 0, 0).toFixed(2);
  const parts = totalStr.split('.');
  moneyStates[id].int = parts[0];
  moneyStates[id].dec = parts[1];
  moneyStates[id].isDec = true;
  renderMoneyInput(id);
}

function attachMoneyInput(id, onChange) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!moneyStates[id]) moneyStates[id] = { int: '', dec: '', isDec: false, onChange: null };
  moneyStates[id].onChange = onChange;

  if (el.dataset.moneyAttached === 'true') return;
  el.dataset.moneyAttached = 'true';

  el.addEventListener('focus', () => { if (el.select) el.select(); });

  el.addEventListener('beforeinput', (e) => {
    const st = moneyStates[id];
    const isAllSelected = typeof el.selectionStart === 'number' &&
      el.selectionStart === 0 && el.selectionEnd === el.value.length && el.value.length > 0;

    if (e.inputType === 'deleteContentBackward' || e.inputType === 'deleteContentForward' || e.inputType === 'deleteByCut') {
      e.preventDefault();
      if (isAllSelected || e.inputType === 'deleteByCut') {
        st.int = ''; st.dec = ''; st.isDec = false;
      } else if (st.isDec) {
        if (st.dec.length > 0) st.dec = st.dec.slice(0, -1); else st.isDec = false;
      } else {
        st.int = st.int.slice(0, -1);
      }
      renderMoneyInput(id); if (st.onChange) st.onChange(id);
      return;
    }

    if (e.data === ',' || e.data === '.') {
      e.preventDefault();
      if (!st.isDec) { if (st.int === '') st.int = '0'; st.isDec = true; }
      renderMoneyInput(id);
      return;
    }

    if (e.data && /^[0-9]$/.test(e.data)) {
      e.preventDefault();
      if (isAllSelected) { st.int = ''; st.dec = ''; st.isDec = false; }
      if (st.isDec) { if (st.dec.length < 2) st.dec += e.data; }
      else { if (st.int.length < 10) st.int += e.data; }
      renderMoneyInput(id); if (st.onChange) st.onChange(id);
      return;
    }

    e.preventDefault();
  });
}

function aBooleano_(v) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v === 1;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    return s === 'true' || s === '1';
  }
  return !!v;
}

function normalizarFechas_(fechas) {
  if (Array.isArray(fechas)) return fechas;
  if (typeof fechas === 'string') {
    try {
      const parsed = JSON.parse(fechas);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
    if (fechas.trim()) return [fechas.trim()];
  }
  return [];
}

function formatearMoneda_(n) {
  const num = Number(n) || 0;
  return '$ ' + num.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatearFechaISOLocal_(fecha) {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}

function hoyISO_() {
  return formatearFechaISOLocal_(new Date());
}

function sumarDiasLocal_(fecha, dias) {
  const f = new Date(fecha.getTime());
  f.setDate(f.getDate() + dias);
  return f;
}

function formatearFechaLegible_(iso) {
  if (!iso) return '--';
  const partes = iso.split('-').map(Number);
  const f = new Date(partes[0], partes[1] - 1, partes[2]);
  return f.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
}

function capitalizeInput(el) {
  if (el.value.length === 1) el.value = el.value.toUpperCase();
}

function cargarUsuarioYColorLocal_() {
  appState.activeUser = localStorage.getItem('userActive') || 'Brian';
  const colorLocal = localStorage.getItem('accentColor_' + appState.activeUser) || '#18181b';
  document.documentElement.style.setProperty('--accent-color', colorLocal);
  pintarBotonesUsuario_();
}

function pintarBotonesUsuario_() {
  const brianBtn = document.getElementById('avatar-brian');
  const virginiaBtn = document.getElementById('avatar-virginia');
  if (!brianBtn || !virginiaBtn) return;
  const activo = appState.activeUser === 'Brian' ? brianBtn : virginiaBtn;
  const inactivo = appState.activeUser === 'Brian' ? virginiaBtn : brianBtn;
  activo.classList.add('avatar-active');
  inactivo.classList.remove('avatar-active');
}

function setActiveUser(user) {
  appState.activeUser = user;
  localStorage.setItem('userActive', user);
  pintarBotonesUsuario_();
  const color = localStorage.getItem('accentColor_' + user) || '#18181b';
  document.documentElement.style.setProperty('--accent-color', color);

  const label = document.getElementById('modal-user-label');
  if (label) label.textContent = user;
  const badge = document.getElementById('tx-user-badge');
  if (badge) badge.textContent = user.charAt(0);

  if (NavStack.current() === 'settings') renderSettingsScreen_();

  if (appState.currentView === 'micro') renderMicroView();
  else renderMacroView();
}

async function setAccent(color) {
  document.documentElement.style.setProperty('--accent-color', color);
  localStorage.setItem('accentColor_' + appState.activeUser, color);
  markSelectedSwatch_(color);
  const cambios = {};
  cambios['accentColor' + appState.activeUser] = color;
  callBackendBackground('actualizarConfig', cambios);
}

function markSelectedSwatch_(color) {
  document.querySelectorAll('#screen-settings .accent-swatch').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.color === color);
  });
}

function switchView(view) {
  appState.currentView = view;
  document.getElementById('app-root').classList.toggle('theme-diario', view === 'micro');
  document.getElementById('app-root').classList.toggle('theme-mensual', view === 'macro');

  NavStack.reset();

  if (view === 'micro') {
    renderMicroView();
  } else {
    recargarEstadoMensual_();
  }
}

function onHeaderTitleTap() {
  if (NavStack.current() !== null) return;
  switchView(appState.currentView === 'micro' ? 'macro' : 'micro');
}

const SCREEN_META = {};

function registerScreenMeta(id, meta) {
  SCREEN_META[id] = meta;
}

const NavStack = {
  _stack: [],

  push(screenId) {
    this._stack.push(screenId);
    this._apply();
  },
  pop() {
    this._stack.pop();
    this._apply();
  },
  reset() {
    this._stack = [];
    this._apply();
  },
  current() {
    return this._stack.length ? this._stack[this._stack.length - 1] : null;
  },
  _apply() {
    document.querySelectorAll('.app-screen').forEach(el => el.classList.remove('screen-active'));
    const top = this.current();
    const targetId = top ? ('screen-' + top)
                         : (appState.currentView === 'micro' ? 'screen-root-micro' : 'screen-root-macro');
    const targetEl = document.getElementById(targetId);
    if (targetEl) targetEl.classList.add('screen-active');
    updateHeaderChrome_();
    updateFabState_();
  }
};

function updateHeaderChrome_() {
  const top = NavStack.current();
  const btnLeft = document.getElementById('btn-header-left');
  const titleEl = document.getElementById('root-title-text');
  const titleWrap = document.getElementById('root-title');

  if (!top) {
    btnLeft.dataset.mode = 'menu';
    btnLeft.innerHTML = '<span class="menu-line" style="width:20px;"></span><span class="menu-line" style="width:14px;"></span>';
    titleEl.textContent = appState.currentView === 'micro' ? 'Diario' : 'Mensual';
    titleWrap.onclick = onHeaderTitleTap;
    titleWrap.style.cursor = 'pointer';
  } else {
    const meta = SCREEN_META[top] || {};
    const allowBack = meta.allowBack !== false;
    btnLeft.dataset.mode = allowBack ? 'back' : 'none';
    btnLeft.innerHTML = allowBack
      ? '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"></path></svg>'
      : '';
    titleEl.textContent = meta.title || '';
    titleWrap.onclick = null;
    titleWrap.style.cursor = 'default';
  }
}

function handleHeaderLeftClick() {
  const mode = document.getElementById('btn-header-left').dataset.mode;
  if (mode === 'back') {
    NavStack.pop();
  } else if (mode === 'menu') {
    renderSettingsScreen_();
    NavStack.push('settings');
  }
}

registerScreenMeta('settings', { title: 'Ajustes' });

function renderSettingsScreen_() {
  document.getElementById('settings-active-user').textContent = appState.activeUser;
  document.getElementById('settings-shortcut-diario').classList.toggle('hidden', appState.currentView !== 'micro');
  document.getElementById('settings-shortcut-mensual').classList.toggle('hidden', appState.currentView !== 'macro');
  const currentColor = localStorage.getItem('accentColor_' + appState.activeUser) || '#18181b';
  markSelectedSwatch_(currentColor);
}

function updateFabState_() {
  const primary = document.getElementById('fab-primary');
  const secondary = document.getElementById('fab-secondary');
  if (!primary || !secondary) return;

  if (NavStack.current() !== null) {
    primary.classList.add('hidden');
    secondary.classList.add('hidden');
    return;
  }

  primary.classList.remove('hidden');

  if (appState.currentView === 'micro') {
    updateFabStateMicro_(primary, secondary);
  } else {
    secondary.classList.add('hidden');
    updateFabStateMacro_(primary);
  }
}

function handleFabPrimary() {
  if (NavStack.current() !== null) return;
  if (appState.currentView === 'micro') handleFabPrimaryMicro_();
  else handleFabPrimaryMacro_();
}

function handleFabSecondary() {
  if (NavStack.current() !== null) return;
  if (appState.currentView === 'micro') handleFabSecondaryMicro_();
}

async function recargarEstadoDiario_(conToast) {
  const data = conToast === false ? await callBackend('getEstadoDiario', {}) : await callBackendConSync('getEstadoDiario', {});
  appState.homeBankingTotal = data.homeBankingTotal;
  appState.bolsaTotal = data.bolsaTotal;
  appState.diaCobro = data.diaCobro;
  appState.diasRestantes = data.diasRestantes;
  appState.movimientos = (data.movimientos || []).map(m => {
    m.fechasAfectadas = normalizarFechas_(m.fechasAfectadas);
    return m;
  });
  appState.lastProcessedDate = data.lastProcessedDate;
  if (appState.currentView === 'micro') renderMicroView();
}

async function bootstrapEstado_() {
  const data = await callBackendConSync('getEstadoDiario', {});

  appState.homeBankingTotal = data.homeBankingTotal;
  appState.bolsaTotal = data.bolsaTotal;
  appState.diaCobro = data.diaCobro;
  appState.diasRestantes = data.diasRestantes;
  appState.movimientos = (data.movimientos || []).map(m => {
    m.fechasAfectadas = normalizarFechas_(m.fechasAfectadas);
    return m;
  });
  appState.lastProcessedDate = data.lastProcessedDate;

  localStorage.setItem('accentColor_Brian', data.accentColorBrian);
  localStorage.setItem('accentColor_Virginia', data.accentColorVirginia);
  const colorActivo = appState.activeUser === 'Brian' ? data.accentColorBrian : data.accentColorVirginia;
  document.documentElement.style.setProperty('--accent-color', colorActivo);

  const badge = document.getElementById('tx-user-badge');
  if (badge) badge.textContent = appState.activeUser.charAt(0);

  updateHeaderChrome_();
  renderMicroView();
  try {
    await chequearCierreDia_();
  } catch (e) {
    console.error('Error al chequear el cierre de día:', e);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  cargarUsuarioYColorLocal_();
  bootstrapEstado_();
});
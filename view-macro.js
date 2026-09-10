/**
 * ============================================================
 * MULTIMILLONARIOS FINANCE — js/view-macro.js (Módulo 5)
 * Motor Mensual, Gastos Fijos, Servicios, Proyecciones.
 * ============================================================
 */

registerScreenMeta('macro-config', { title: 'Sueldos y Servicios' });
registerScreenMeta('service-edit', { title: 'Servicio Fijo' });
registerScreenMeta('fixed-expense', { title: 'Gasto Fijo' });
registerScreenMeta('value-edit', { title: 'Editar Valor' });
registerScreenMeta('quick-add', { title: 'Agregar a la Proyección' });

const NOMBRES_MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

let macroLoadToken_ = 0;

function updateFabStateMacro_(primary) {
  primary.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v16m8-8H4"></path></svg>';
}

function handleFabPrimaryMacro_() {
  NavStack.push('quick-add');
}

async function recargarEstadoMensual_() {
  const year = appState.currentMacroYear;
  const month = appState.currentMacroMonth;
  const miToken = ++macroLoadToken_;

  try {
    const data = await callBackendBackground('getEstadoMensual', { year: year, month: month });
    if (miToken !== macroLoadToken_) return; 
    appState.macroData = data;
    renderMacroView();
  } catch (e) {
  }
}

function changeMonth(delta) {
  let m = appState.currentMacroMonth + delta;
  let y = appState.currentMacroYear;
  if (m < 0) { m = 11; y--; }
  if (m > 11) { m = 0; y++; }
  appState.currentMacroMonth = m;
  appState.currentMacroYear = y;

  const monthDisplay = document.getElementById('current-month-display');
  if (monthDisplay) monthDisplay.textContent = NOMBRES_MESES[m] + ' ' + y;

  recargarEstadoMensual_();
}

function renderMacroView() {
  const data = appState.macroData;
  if (!data) return;

  const monthDisplay = document.getElementById('current-month-display');
  if (monthDisplay) {
    monthDisplay.textContent = NOMBRES_MESES[data.month] + ' ' + data.year;
  }

  const esSacMonth = (data.month === 5 || data.month === 11);
  const esPrizeMonth = (data.month === 1 || data.month === 4 || data.month === 7 || data.month === 10);

  const sacBadge = document.getElementById('sac-badge');
  const prizeBadge = document.getElementById('prize-badge');
  const sacCard = document.getElementById('view-macro-sac-card');
  const prizeCard = document.getElementById('view-macro-prize-card');
  const prizeLabel = document.getElementById('macro-prize-label');

  if (sacBadge) sacBadge.classList.toggle('hidden', !esSacMonth);
  if (sacCard) sacCard.classList.toggle('hidden', !esSacMonth);

  if (prizeCard) prizeCard.classList.remove('hidden');
  if (prizeLabel) {
    prizeLabel.textContent = esPrizeMonth ? '✦ PREMIO VARIABLE Y AJUSTES' : '✦ AJUSTE DE SUELDO';
  }
  if (prizeBadge) {
    prizeBadge.textContent = esPrizeMonth ? 'Mes con Premio' : 'Ajuste de Sueldo';
    prizeBadge.classList.toggle('hidden', !esPrizeMonth && !data.premio);
  }

  const usdRate = data.usdRate || 1;

  let sacCalculado = 0;
  if (esSacMonth) {
    const sacB = data.sacBrian !== null ? data.sacBrian : (data.salaryBrian / 2);
    const sacV = data.sacVirginia !== null ? data.sacVirginia : (data.salaryVirginia / 2);
    sacCalculado = sacB + sacV;
    const sacDisplay = document.getElementById('macro-sac-display');
    if (sacDisplay) sacDisplay.textContent = formatearMoneda_(sacCalculado);
  }

  let premioCalculado = data.premio || 0;
  const prizeDisplay = document.getElementById('macro-prize-display');
  if (prizeDisplay) prizeDisplay.textContent = formatearMoneda_(premioCalculado);

  const deudas = (data.gastosFijos || []).filter(g => g.tipo === 'deuda');
  let totalDeudasARS = 0;
  deudas.forEach(d => {
    totalDeudasARS += d.moneda === 'USD' ? (d.monto * usdRate) : d.monto;
  });

  const totalIngresos = data.salaryBrian + data.salaryVirginia + sacCalculado + premioCalculado + totalDeudasARS;
  const incomeTotalEl = document.getElementById('macro-income-total');
  if (incomeTotalEl) incomeTotalEl.textContent = formatearMoneda_(totalIngresos);

  const gastosFijos = (data.gastosFijos || []).filter(g => g.tipo === 'gasto');
  let totalGastosFijosARS = 0;
  gastosFijos.forEach(g => {
    totalGastosFijosARS += g.moneda === 'USD' ? (g.monto * usdRate) : g.monto;
  });

  const deshabilitados = data.serviciosDeshabilitadosEsteMes || [];
  const serviciosHabilitados = (data.serviciosFijos || []).filter(s => !deshabilitados.includes(s.id));
  let totalServiciosARS = 0;
  serviciosHabilitados.forEach(s => {
    totalServiciosARS += s.moneda === 'USD' ? (s.monto * usdRate) : s.monto;
  });

  const totalGastos = totalGastosFijosARS + totalServiciosARS;
  const expensesTotalEl = document.getElementById('macro-expenses-total');
  if (expensesTotalEl) expensesTotalEl.textContent = formatearMoneda_(totalGastos);

  const restoNeto = totalIngresos - totalGastos;
  const balanceDisplay = document.getElementById('macro-net-balance-display');
  const statusBadge = document.getElementById('macro-net-status-badge');

  if (balanceDisplay) balanceDisplay.textContent = formatearMoneda_(restoNeto);
  if (statusBadge) {
    if (restoNeto >= 0) {
      statusBadge.textContent = 'Resto Operativo';
      statusBadge.className = 'text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-emerald-100 text-emerald-800 whitespace-nowrap shrink-0';
    } else {
      statusBadge.textContent = 'Déficit Proyectado';
      statusBadge.className = 'text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-rose-100 text-rose-800 whitespace-nowrap shrink-0';
    }
  }

  renderMacroIncomesList_(data, sacCalculado, premioCalculado, deudas, usdRate);
  renderMacroExpensesList_(gastosFijos, serviciosHabilitados, usdRate);
  renderMacroServicesToggleList_(data.serviciosFijos || [], deshabilitados, usdRate);
  renderMacroDebtsList_(deudas, usdRate);
  renderMacroFixedExpensesLists_(data.gastosFijos || [], usdRate);

  updateFabState_();
}

function renderMacroIncomesList_(data, sac, premio, deudas, usdRate) {
  const cont = document.getElementById('incomes-list');
  if (!cont) return;
  const esPrizeMonth = (data.month === 1 || data.month === 4 || data.month === 7 || data.month === 10);
  const premioNombre = esPrizeMonth ? 'Premio Variable y Ajustes' : 'Ajuste de Sueldo';

  let html = '';
  html += '<div class="flex justify-between items-center gap-2 py-1 border-b border-emerald-100/60"><span class="truncate">Sueldo Brian</span><span class="font-bold shrink-0">' + formatearMoneda_(data.salaryBrian) + '</span></div>';
  html += '<div class="flex justify-between items-center gap-2 py-1 border-b border-emerald-100/60"><span class="truncate">Sueldo Virginia</span><span class="font-bold shrink-0">' + formatearMoneda_(data.salaryVirginia) + '</span></div>';
  if (sac > 0) html += '<div class="flex justify-between items-center gap-2 text-amber-800 font-medium py-1 border-b border-emerald-100/60"><span class="truncate">SAC (Aguinaldo)</span><span class="font-bold shrink-0">' + formatearMoneda_(sac) + '</span></div>';
  if (premio !== 0) html += '<div class="flex justify-between items-center gap-2 text-emerald-800 font-medium py-1 border-b border-emerald-100/60"><span class="truncate">' + premioNombre + '</span><span class="font-bold shrink-0">' + formatearMoneda_(premio) + '</span></div>';
  
  deudas.forEach(d => {
    const montoARS = d.moneda === 'USD' ? (d.monto * usdRate) : d.monto;
    html += '<div class="flex justify-between items-center gap-2 text-emerald-700 py-1"><span class="truncate">Deuda: ' + d.descripcion + '</span><span class="font-bold shrink-0">' + formatearMoneda_(montoARS) + '</span></div>';
  });

  cont.innerHTML = html;
}

function renderMacroExpensesList_(gastosFijos, serviciosHabilitados, usdRate) {
  const cont = document.getElementById('expenses-list');
  if (!cont) return;
  let html = '';

  gastosFijos.forEach(g => {
    const montoARS = g.moneda === 'USD' ? (g.monto * usdRate) : g.monto;
    html += '<div class="flex justify-between items-center gap-2 py-1 border-b border-rose-100/60"><span class="truncate">' + g.descripcion + ' (' + g.usuario + ')</span><span class="font-bold shrink-0">' + formatearMoneda_(montoARS) + '</span></div>';
  });

  serviciosHabilitados.forEach(s => {
    const montoARS = s.moneda === 'USD' ? (s.monto * usdRate) : s.monto;
    html += '<div class="flex justify-between items-center gap-2 text-zinc-500 py-1"><span class="truncate">Servicio: ' + s.descripcion + '</span><span class="font-bold shrink-0">' + formatearMoneda_(montoARS) + '</span></div>';
  });

  cont.innerHTML = html || '<p class="text-[10px] text-zinc-400 py-1">Sin gastos fijos proyectados</p>';
}

function renderMacroServicesToggleList_(servicios, deshabilitados, usdRate) {
  const cont = document.getElementById('macro-services-toggle-list');
  const servicesTotalDisplay = document.getElementById('macro-services-total-display');
  if (!cont) return;

  let totalServiciosHab = 0;

  cont.innerHTML = servicios.map(s => {
    const isEnabled = !deshabilitados.includes(s.id);
    const montoARS = s.moneda === 'USD' ? (s.monto * usdRate) : s.monto;
    if (isEnabled) totalServiciosHab += montoARS;

    return '<label class="flex items-center justify-between p-2.5 bg-zinc-50 rounded-2xl cursor-pointer border border-zinc-100 hover:bg-zinc-100/80 transition-colors gap-2 min-w-0">' +
      '<div class="flex items-center gap-2.5 min-w-0 flex-1">' +
      '<input type="checkbox" ' + (isEnabled ? 'checked' : '') + ' onchange="toggleServicioStatus(\'' + s.id + '\', this.checked)" class="rounded border-zinc-300 accent-zinc-900 w-4 h-4 shrink-0">' +
      '<span class="text-xs font-semibold text-zinc-800 truncate">' + s.descripcion + '</span></div>' +
      '<span class="text-xs font-bold text-zinc-900 shrink-0">' + formatearMoneda_(montoARS) + '</span></label>';
  }).join('');

  if (servicesTotalDisplay) servicesTotalDisplay.textContent = formatearMoneda_(totalServiciosHab);
}

function renderMacroDebtsList_(deudas, usdRate) {
  const cont = document.getElementById('debts-list');
  const sumEl = document.getElementById('debts-total-sum');
  if (!cont) return;

  let totalSum = 0;
  if (!deudas.length) {
    cont.innerHTML = '<p class="text-[10px] text-zinc-400 text-center py-1">Sin deudas a favor registradas</p>';
    if (sumEl) sumEl.textContent = '+$ 0,00';
    return;
  }

  cont.innerHTML = deudas.map(d => {
    const montoARS = d.moneda === 'USD' ? (d.monto * usdRate) : d.monto;
    totalSum += montoARS;
    return '<div class="flex justify-between items-center p-2.5 bg-emerald-50/60 rounded-2xl border border-emerald-100 gap-2 min-w-0">' +
      '<div class="min-w-0 flex-1"><span class="font-bold text-emerald-950 block truncate text-xs">' + d.descripcion + '</span>' +
      '<span class="text-[9px] text-emerald-700/80 font-medium truncate block">' + d.usuario + '</span></div>' +
      '<span class="font-black text-emerald-800 shrink-0 text-xs">+' + formatearMoneda_(montoARS) + '</span></div>';
  }).join('');

  if (sumEl) sumEl.textContent = '+' + formatearMoneda_(totalSum);
}

function renderMacroFixedExpensesLists_(gastosFijos, usdRate) {
  const brianCont = document.getElementById('brian-fixed-list');
  const virginiaCont = document.getElementById('virginia-fixed-list');

  const brianItems = gastosFijos.filter(g => g.usuario === 'Brian');
  const virginiaItems = gastosFijos.filter(g => g.usuario === 'Virginia');

  const renderItem = (g) => {
    const montoARS = g.moneda === 'USD' ? (g.monto * usdRate) : g.monto;
    const esDeuda = (g.tipo === 'deuda' || g.tipo === 'debt');
    const esDeshabilitado = (g.monto === 0 || g.esPausado);

    let subTexto = esDeuda ? 'Deuda a favor (+)' : 'Gasto fijo (-)';
    if (g.esPausado) {
      subTexto = 'Pausado de acá en adelante';
    } else if (esDeshabilitado) {
      subTexto = 'Deshabilitado este mes';
    } else if (g.tieneExcepcionEsteMes) {
      subTexto += ' · Ajuste este mes';
    }

    return '<div onclick="openFixedExpenseModal(\'' + g.usuario + '\', \'' + g.id + '\')" class="flex justify-between items-center p-2.5 bg-zinc-50 hover:bg-zinc-100/80 rounded-2xl border border-zinc-200/70 cursor-pointer transition-colors gap-2 min-w-0">' +
      '<div class="min-w-0 flex-1"><span class="font-bold text-zinc-900 block truncate text-xs ' + (esDeshabilitado ? 'line-through text-zinc-400' : '') + '">' + g.descripcion + '</span>' +
      '<span class="text-[9px] block truncate mt-0.5 ' + (esDeshabilitado ? 'text-amber-600 font-semibold' : 'text-zinc-400 font-medium') + '">' + subTexto + '</span></div>' +
      '<span class="font-black shrink-0 text-xs ' + (esDeshabilitado ? 'text-zinc-400' : (esDeuda ? 'text-emerald-600' : 'text-zinc-900')) + '">' + (esDeshabilitado ? '$ 0,00' : ((esDeuda ? '+' : '-') + formatearMoneda_(montoARS))) + '</span></div>';
  };

  if (brianCont) {
    brianCont.innerHTML = brianItems.length ? brianItems.map(renderItem).join('') : '<p class="text-[10px] text-zinc-400 py-1">Sin gastos fijos cargados</p>';
  }
  if (virginiaCont) {
    virginiaCont.innerHTML = virginiaItems.length ? virginiaItems.map(renderItem).join('') : '<p class="text-[10px] text-zinc-400 py-1">Sin gastos fijos cargados</p>';
  }
}

function toggleIncomesCollapse() {
  const content = document.getElementById('incomes-collapse-content');
  const arrow = document.getElementById('incomes-collapse-arrow');
  if (content) content.classList.toggle('hidden');
  if (arrow) arrow.classList.toggle('rotate-180');
}
function toggleExpensesCollapse() {
  const content = document.getElementById('expenses-collapse-content');
  const arrow = document.getElementById('expenses-collapse-arrow');
  if (content) content.classList.toggle('hidden');
  if (arrow) arrow.classList.toggle('rotate-180');
}
function toggleServicesCollapse() {
  const content = document.getElementById('services-collapse-content');
  const arrow = document.getElementById('services-collapse-arrow');
  if (content) content.classList.toggle('hidden');
  if (arrow) arrow.classList.toggle('rotate-180');
}
function toggleDebtsCollapse() {
  const content = document.getElementById('debts-collapse-content');
  const arrow = document.getElementById('debts-collapse-arrow');
  if (content) content.classList.toggle('hidden');
  if (arrow) arrow.classList.toggle('rotate-180');
}

function toggleServicioStatus(servicioId, habilitado) {
  if (!appState.macroData) return;
  let deshabilitados = appState.macroData.serviciosDeshabilitadosEsteMes || [];
  if (habilitado) {
    deshabilitados = deshabilitados.filter(id => String(id) !== String(servicioId));
  } else {
    if (!deshabilitados.includes(servicioId)) deshabilitados.push(servicioId);
  }
  appState.macroData.serviciosDeshabilitadosEsteMes = deshabilitados;
  renderMacroView();

  callBackendBackground('toggleServicio', {
    servicioId: servicioId, year: appState.currentMacroYear, month: appState.currentMacroMonth, habilitado: habilitado
  });
}

function toggleAllServicesCheckboxes(e) {
  e.stopPropagation();
  const data = appState.macroData;
  if (!data || !data.serviciosFijos) return;

  const deshabilitados = data.serviciosDeshabilitadosEsteMes || [];
  const hayHabilitados = data.serviciosFijos.some(s => !deshabilitados.includes(s.id));
  const nuevoEstadoHabilitar = !hayHabilitados;

  if (nuevoEstadoHabilitar) {
    data.serviciosDeshabilitadosEsteMes = [];
  } else {
    data.serviciosDeshabilitadosEsteMes = data.serviciosFijos.map(s => s.id);
  }
  renderMacroView();

  callBackendBackground('toggleAllServiciosBatch', {
    year: appState.currentMacroYear, month: appState.currentMacroMonth, habilitarTodos: nuevoEstadoHabilitar
  });
}

function renderMacroConfigDraft_() {
  const data = appState.macroData || {};
  if (!macroDraft) {
    macroDraft = {
      usdRate: data.usdRate || 0,
      salaryBrian: data.salaryBrian || 0,
      salaryVirginia: data.salaryVirginia || 0,
      serviciosFijos: JSON.parse(JSON.stringify(data.serviciosFijos || [])),
      serviciosEliminados: []
    };
  }
  
  const usdEl = document.getElementById('display-usd-rate');
  const brianEl = document.getElementById('display-salary-brian');
  const virginiaEl = document.getElementById('display-salary-virginia');

  if (usdEl) usdEl.textContent = formatearMoneda_(macroDraft.usdRate);
  if (brianEl) brianEl.textContent = formatearMoneda_(macroDraft.salaryBrian);
  if (virginiaEl) virginiaEl.textContent = formatearMoneda_(macroDraft.salaryVirginia);

  renderMacroServicesConfigList_(macroDraft.serviciosFijos || []);
}

function renderMacroServicesConfigList_(servicios) {
  const cont = document.getElementById('macro-services-list');
  if (!cont) return;
  if (!servicios.length) {
    cont.innerHTML = '<p class="text-[10px] text-zinc-400 py-1">Sin servicios fijos creados</p>';
    return;
  }

  const rate = (macroDraft && macroDraft.usdRate) ? macroDraft.usdRate : (appState.macroData ? appState.macroData.usdRate : 1);

  cont.innerHTML = servicios.map(s => {
    let displayMonto = formatearMoneda_(s.monto) + ' ' + (s.moneda || 'ARS');
    if (s.moneda === 'USD') {
      displayMonto = formatearMoneda_(s.monto) + ' USD (≈ ' + formatearMoneda_(s.monto * rate) + ')';
    }
    return '<div onclick="openServiceEditModal(\'' + s.id + '\')" class="flex justify-between items-center p-3 bg-white hover:bg-zinc-50 rounded-2xl cursor-pointer border border-zinc-200/80 transition-colors gap-2 min-w-0 shadow-sm">' +
      '<span class="text-xs font-bold text-zinc-800 truncate flex-1">' + s.descripcion + '</span>' +
      '<span class="text-xs font-black text-zinc-900 shrink-0">' + displayMonto + '</span></div>';
  }).join('');
}

function openValueEditModal(target) {
  currentEditingValueTarget = target;
  const title = document.getElementById('root-title-text');
  const label = document.getElementById('value-edit-input-label');
  const helper = document.getElementById('value-edit-helper');
  const inputId = 'generic-value-input';

  let valorActual = 0;
  const data = (macroDraft && (target === 'usd' || target === 'salary-brian' || target === 'salary-virginia'))
    ? macroDraft
    : (appState.macroData || {});

  if (helper) helper.classList.add('hidden');

  if (target === 'usd') {
    if (title) title.textContent = 'Editar Dólar';
    if (label) label.textContent = 'Dólar Oficial (ARS)';
    valorActual = data.usdRate || 0;
  } else if (target === 'salary-brian') {
    if (title) title.textContent = 'Sueldo Brian';
    if (label) label.textContent = 'Sueldo Fijo Mensual ($)';
    valorActual = data.salaryBrian || 0;
  } else if (target === 'salary-virginia') {
    if (title) title.textContent = 'Sueldo Virginia';
    if (label) label.textContent = 'Sueldo Fijo Mensual ($)';
    valorActual = data.salaryVirginia || 0;
  } else if (target === 'prize-brian') {
    const esPrizeMonth = (data.month === 1 || data.month === 4 || data.month === 7 || data.month === 10);
    if (title) title.textContent = esPrizeMonth ? 'Premio y Ajustes' : 'Ajuste de Sueldo';
    if (label) label.textContent = 'Total Cobrado en Bolsillo ($)';
    const sueldoBase = data.salaryBrian || 0;
    const extraPrevio = data.premio || 0;
    valorActual = extraPrevio !== 0 ? (sueldoBase + extraPrevio) : sueldoBase;
    if (helper) {
      helper.textContent = 'Sueldo base de Brian: ' + formatearMoneda_(sueldoBase) + '. Se calculará la diferencia automáticamente.';
      helper.classList.remove('hidden');
    }
  } else if (target === 'sac-value') {
    if (title) title.textContent = 'Editar SAC';
    if (label) label.textContent = 'Monto Aguinaldo Este Mes ($)';
    valorActual = (data.sacBrian || 0) + (data.sacVirginia || 0);
  }

  attachMoneyInput(inputId, () => {});
  setMoneyValue(inputId, valorActual);
  NavStack.push('value-edit');
}

function handleValueSubmit() {
  const monto = getMoneyValue('generic-value-input');
  NavStack.pop();

  if (macroDraft && (currentEditingValueTarget === 'usd' || currentEditingValueTarget === 'salary-brian' || currentEditingValueTarget === 'salary-virginia')) {
    if (currentEditingValueTarget === 'usd') macroDraft.usdRate = monto;
    else if (currentEditingValueTarget === 'salary-brian') macroDraft.salaryBrian = monto;
    else if (currentEditingValueTarget === 'salary-virginia') macroDraft.salaryVirginia = monto;
    renderMacroConfigDraft_();
    return;
  }

  if (currentEditingValueTarget === 'prize-brian') {
    const data = appState.macroData || {};
    const sueldoBase = data.salaryBrian || 0;
    let diferencia = monto > 0 ? (monto - sueldoBase) : 0;
    data.premio = diferencia;
    renderMacroView();
    callBackendBackground('guardarPremio', { year: appState.currentMacroYear, month: appState.currentMacroMonth, monto: diferencia });
  } else if (currentEditingValueTarget === 'sac-value') {
    const data = appState.macroData || {};
    data.sacBrian = monto / 2;
    data.sacVirginia = monto / 2;
    renderMacroView();
    callBackendBackground('guardarSacOverride', { year: appState.currentMacroYear, month: appState.currentMacroMonth, usuario: 'Brian', monto: monto / 2 })
      .then(() => callBackendBackground('guardarSacOverride', { year: appState.currentMacroYear, month: appState.currentMacroMonth, usuario: 'Virginia', monto: monto / 2 }));
  }
}

function openServiceEditModal(serviceId) {
  currentEditingServiceId = serviceId;
  const form = document.getElementById('srv-edit-form');
  const btnDelete = document.getElementById('btn-delete-service');
  if (form) form.reset();

  attachMoneyInput('srv-modal-amount', () => {});
  attachMoneyInput('srv-modal-unit-price', () => updateServiceModalTotalFromUnits());

  const chkDirect = document.getElementById('chk-srv-is-direct');
  if (chkDirect) {
    chkDirect.checked = true;
    toggleServiceModalMode(true);
  }

  const list = (macroDraft && macroDraft.serviciosFijos)
    ? macroDraft.serviciosFijos
    : (appState.macroData ? appState.macroData.serviciosFijos : []);

  if (serviceId) {
    const s = list.find(x => String(x.id) === String(serviceId));
    if (s) {
      document.getElementById('srv-modal-name').value = s.descripcion;
      setMoneyValue('srv-modal-amount', s.monto);
      document.getElementById('srv-modal-currency').value = s.moneda || 'ARS';
      if (btnDelete) btnDelete.classList.remove('hidden');
    }
  } else {
    setMoneyValue('srv-modal-amount', 0);
    setMoneyValue('srv-modal-unit-price', 0);
    document.getElementById('srv-modal-units').value = 1;
    document.getElementById('srv-modal-currency').value = 'ARS';
    if (btnDelete) btnDelete.classList.add('hidden');
  }

  NavStack.push('service-edit');
}

function toggleServiceModalMode(isDirect) {
  const container = document.getElementById('srv-modal-units-container');
  if (container) container.classList.toggle('hidden', isDirect);
}

function updateServiceModalTotalFromUnits() {
  const units = parseInt(document.getElementById('srv-modal-units').value, 10) || 1;
  const unitPrice = getMoneyValue('srv-modal-unit-price');
  setMoneyValue('srv-modal-amount', units * unitPrice);
}

async function handleServiceSubmit() {
  const descripcion = document.getElementById('srv-modal-name').value.trim();
  const monto = getMoneyValue('srv-modal-amount');
  const moneda = document.getElementById('srv-modal-currency').value;

  if (!descripcion) { alert('Ingresá el nombre del servicio'); return; }
  if (monto <= 0) { alert('Ingresá un monto válido'); return; }

  NavStack.pop();

  if (macroDraft) {
    if (currentEditingServiceId) {
      const s = (macroDraft.serviciosFijos || []).find(x => String(x.id) === String(currentEditingServiceId));
      if (s) {
        s.descripcion = descripcion;
        s.monto = monto;
        s.moneda = moneda;
      }
    } else {
      macroDraft.serviciosFijos.push({ id: 'srv_' + Date.now(), descripcion: descripcion, monto: monto, moneda: moneda });
    }
    renderMacroConfigDraft_();
  }
}

async function deleteCurrentEditingService() {
  if (!currentEditingServiceId) return;
  NavStack.pop();

  if (macroDraft) {
    if (!currentEditingServiceId.startsWith('srv_')) {
      macroDraft.serviciosEliminados.push(currentEditingServiceId);
    }
    macroDraft.serviciosFijos = macroDraft.serviciosFijos.filter(x => String(x.id) !== String(currentEditingServiceId));
    renderMacroConfigDraft_();
  }
}

function openFixedExpenseModal(user, expenseId) {
  currentEditingFixedExpenseUser = user;
  currentEditingFixedExpenseId = expenseId;
  const userLabel = document.getElementById('fixed-user-label');
  if (userLabel) userLabel.textContent = user;

  const form = document.getElementById('fixed-expense-form');
  if (form) form.reset();

  const chkDirect = document.getElementById('chk-fixed-is-direct');
  if (chkDirect) {
    chkDirect.checked = true;
    toggleFixedMode(true);
  }

  attachMoneyInput('fixed-amount', () => {});
  attachMoneyInput('fixed-unit-price', () => updateFixedTotalFromUnits());

  const btnDelete = document.getElementById('btn-delete-fixed');
  const btnDisable = document.getElementById('btn-disable-fixed');
  const btnPause = document.getElementById('btn-pause-fixed');

  if (expenseId) {
    const g = (appState.macroData && appState.macroData.gastosFijos || []).find(x => String(x.id) === String(expenseId));
    if (g) {
      const tipoVal = (g.tipo === 'debt' || g.tipo === 'deuda') ? 'deuda' : 'gasto';
      document.getElementById('fixed-type-select').value = tipoVal;
      document.getElementById('fixed-desc').value = g.descripcion || '';
      document.getElementById('fixed-currency').value = g.moneda || 'ARS';

      const isDirect = (g.isDirect !== undefined && g.isDirect !== null) ? aBooleano_(g.isDirect) : true;
      if (chkDirect) chkDirect.checked = isDirect;
      toggleFixedMode(isDirect);

      if (!isDirect) {
        document.getElementById('fixed-units').value = g.units || 1;
        setMoneyValue('fixed-unit-price', g.unitPrice || 0);
      }
      setMoneyValue('fixed-amount', g.monto || 0);

      if (btnDelete) btnDelete.classList.remove('hidden');
      
      if (btnDisable) {
        btnDisable.classList.remove('hidden');
        if (g.tieneExcepcionEsteMes && g.monto === 0) {
          btnDisable.textContent = 'Habilitar para este mes';
          btnDisable.onclick = enableFixedExpenseThisMonth;
        } else {
          btnDisable.textContent = 'Deshabilitar solo este mes ($ 0)';
          btnDisable.onclick = disableFixedExpenseThisMonth;
        }
      }

      if (btnPause) {
        btnPause.classList.remove('hidden');
        if (g.esPausado) {
          btnPause.textContent = 'Reactivar de acá en adelante';
          btnPause.onclick = reactivateFixedExpenseFuture;
        } else {
          btnPause.textContent = 'Pausar de acá en adelante';
          btnPause.onclick = pauseFixedExpenseFuture;
        }
      }
    }
  } else {
    setMoneyValue('fixed-amount', 0);
    setMoneyValue('fixed-unit-price', 0);
    document.getElementById('fixed-units').value = 1;
    if (btnDelete) btnDelete.classList.add('hidden');
    if (btnDisable) btnDisable.classList.add('hidden');
    if (btnPause) btnPause.classList.add('hidden');
  }

  NavStack.push('fixed-expense');
}

function toggleFixedMode(isDirect) {
  const container = document.getElementById('fixed-units-container');
  if (container) container.classList.toggle('hidden', isDirect);
}

function updateFixedTotalFromUnits() {
  const units = parseInt(document.getElementById('fixed-units').value, 10) || 1;
  const unitPrice = getMoneyValue('fixed-unit-price');
  setMoneyValue('fixed-amount', units * unitPrice);
}

function handleFixedExpenseSubmit() {
  const tipo = document.getElementById('fixed-type-select').value;
  const descripcion = document.getElementById('fixed-desc').value.trim();
  const isDirect = document.getElementById('chk-fixed-is-direct').checked;
  const units = parseInt(document.getElementById('fixed-units').value, 10) || 1;
  const unitPrice = getMoneyValue('fixed-unit-price');
  const monto = getMoneyValue('fixed-amount');
  const moneda = document.getElementById('fixed-currency').value;
  const replicate = document.getElementById('chk-replicate-12-months').checked;

  if (!descripcion) { alert('Ingresá una descripción'); return; }
  if (monto < 0) { alert('Ingresá un monto válido'); return; }

  NavStack.pop();

  if (appState.macroData && appState.macroData.gastosFijos) {
    const list = appState.macroData.gastosFijos;
    let item = list.find(x => String(x.id) === String(currentEditingFixedExpenseId));

    if (!item) {
      item = {
        id: currentEditingFixedExpenseId || ('temp_fe_' + Date.now()),
        usuario: currentEditingFixedExpenseUser,
        descripcion: descripcion,
        tipo: (tipo === 'debt' || tipo === 'deuda') ? 'deuda' : 'gasto',
        isDirect: isDirect,
        units: isDirect ? 1 : units,
        unitPrice: isDirect ? monto : unitPrice,
        monto: monto,
        montoBase: monto,
        moneda: moneda,
        activoDesdeYear: appState.currentMacroYear,
        activoDesdeMonth: appState.currentMacroMonth,
        hastaYear: null,
        hastaMonth: null,
        esPausado: false,
        tieneExcepcionEsteMes: !replicate
      };
      list.push(item);
    } else {
      item.descripcion = descripcion;
      item.tipo = (tipo === 'debt' || tipo === 'deuda') ? 'deuda' : 'gasto';
      item.isDirect = isDirect;
      item.units = isDirect ? 1 : units;
      item.unitPrice = isDirect ? monto : unitPrice;
      item.monto = monto;
      item.moneda = moneda;
      if (!replicate) item.tieneExcepcionEsteMes = true;
    }
    renderMacroView();
  }

  if (replicate) {
    callBackendBackground('guardarGastoFijo', {
      id: currentEditingFixedExpenseId, usuario: currentEditingFixedExpenseUser, descripcion: descripcion, tipo: tipo,
      isDirect: isDirect, units: isDirect ? 1 : units, unitPrice: isDirect ? monto : unitPrice, monto: monto, moneda: moneda,
      activoDesdeYear: appState.currentMacroYear, activoDesdeMonth: appState.currentMacroMonth, hastaYear: null, hastaMonth: null
    });
  } else {
    callBackendBackground('guardarExcepcionGastoFijo', {
      groupId: currentEditingFixedExpenseId, year: appState.currentMacroYear, month: appState.currentMacroMonth,
      unitsOverride: isDirect ? null : units, montoOverride: monto
    });
  }
}

function disableFixedExpenseThisMonth() {
  if (!currentEditingFixedExpenseId) return;
  NavStack.pop();

  if (appState.macroData && appState.macroData.gastosFijos) {
    const item = appState.macroData.gastosFijos.find(x => String(x.id) === String(currentEditingFixedExpenseId));
    if (item) { item.monto = 0; item.tieneExcepcionEsteMes = true; }
    renderMacroView();
  }
  callBackendBackground('guardarExcepcionGastoFijo', { groupId: currentEditingFixedExpenseId, year: appState.currentMacroYear, month: appState.currentMacroMonth, montoOverride: 0 });
}

function enableFixedExpenseThisMonth() {
  if (!currentEditingFixedExpenseId) return;
  NavStack.pop();

  if (appState.macroData && appState.macroData.gastosFijos) {
    const item = appState.macroData.gastosFijos.find(x => String(x.id) === String(currentEditingFixedExpenseId));
    if (item) { item.monto = item.montoBase !== undefined ? item.montoBase : item.monto; item.tieneExcepcionEsteMes = false; }
    renderMacroView();
  }
  callBackendBackground('guardarExcepcionGastoFijo', { groupId: currentEditingFixedExpenseId, year: appState.currentMacroYear, month: appState.currentMacroMonth, montoOverride: null });
}

function pauseFixedExpenseFuture() {
  if (!currentEditingFixedExpenseId) return;
  const g = (appState.macroData && appState.macroData.gastosFijos || []).find(x => String(x.id) === String(currentEditingFixedExpenseId));
  if (!g) return;
  NavStack.pop();

  let targetMonth = appState.currentMacroMonth - 1;
  let targetYear = appState.currentMacroYear;
  if (targetMonth < 0) { targetMonth = 11; targetYear--; }

  g.esPausado = true; g.monto = 0; g.hastaYear = targetYear; g.hastaMonth = targetMonth;
  renderMacroView();

  callBackendBackground('guardarGastoFijo', {
    id: g.id, usuario: g.usuario, descripcion: g.descripcion, tipo: g.tipo, isDirect: g.isDirect, units: g.units, unitPrice: g.unitPrice,
    monto: g.montoBase !== undefined ? g.montoBase : g.monto, moneda: g.moneda,
    activoDesdeYear: g.activoDesdeYear || appState.currentMacroYear, activoDesdeMonth: (g.activoDesdeMonth !== undefined && g.activoDesdeMonth !== null) ? g.activoDesdeMonth : 0,
    hastaYear: targetYear, hastaMonth: targetMonth
  });
}

function reactivateFixedExpenseFuture() {
  if (!currentEditingFixedExpenseId) return;
  const g = (appState.macroData && appState.macroData.gastosFijos || []).find(x => String(x.id) === String(currentEditingFixedExpenseId));
  if (!g) return;
  NavStack.pop();

  g.esPausado = false; g.monto = g.montoBase !== undefined ? g.montoBase : g.monto; g.hastaYear = null; g.hastaMonth = null;
  renderMacroView();

  callBackendBackground('guardarGastoFijo', {
    id: g.id, usuario: g.usuario, descripcion: g.descripcion, tipo: g.tipo, isDirect: g.isDirect, units: g.units, unitPrice: g.unitPrice,
    monto: g.montoBase !== undefined ? g.montoBase : g.monto, moneda: g.moneda,
    activoDesdeYear: g.activoDesdeYear || appState.currentMacroYear, activoDesdeMonth: (g.activoDesdeMonth !== undefined && g.activoDesdeMonth !== null) ? g.activoDesdeMonth : 0,
    hastaYear: null, hastaMonth: null
  });
}

function deleteCurrentEditingFixedExpense() {
  if (!currentEditingFixedExpenseId) return;
  NavStack.pop();

  if (appState.macroData && appState.macroData.gastosFijos) {
    appState.macroData.gastosFijos = appState.macroData.gastosFijos.filter(x => String(x.id) !== String(currentEditingFixedExpenseId));
    renderMacroView();
  }
  callBackendBackground('eliminarGastoFijo', { id: currentEditingFixedExpenseId });
}

function saveMacroConfig() {
  if (!macroDraft) { NavStack.pop(); return; }
  const draft = macroDraft;
  NavStack.pop();

  if (appState.macroData) {
    appState.macroData.usdRate = draft.usdRate;
    appState.macroData.salaryBrian = draft.salaryBrian;
    appState.macroData.salaryVirginia = draft.salaryVirginia;
    appState.macroData.serviciosFijos = draft.serviciosFijos;
    renderMacroView();
  }

  callBackendBackground('guardarConfiguracionMacroBatch', {
    usdRate: draft.usdRate, salaryBrian: draft.salaryBrian, salaryVirginia: draft.salaryVirginia,
    serviciosFijos: draft.serviciosFijos, serviciosEliminados: draft.serviciosEliminados,
    year: appState.currentMacroYear, month: appState.currentMacroMonth
  }).then(newMacroData => {
    if (newMacroData) { appState.macroData = newMacroData; renderMacroView(); }
  });
  macroDraft = null;
}

function quickAddService() {
  NavStack.pop();
  openServiceEditModal(null);
}

function quickAddFixedExpense(user) {
  NavStack.pop();
  openFixedExpenseModal(user, null);
}
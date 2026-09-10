/**
 * ============================================================
 * MULTIMILLONARIOS FINANCE — js/view-micro.js (Módulo 4)
 * Motor Diario, Cierre de Día, Modales Transacción y HB.
 * ============================================================
 */

registerScreenMeta('hb-update', { title: 'Actualizar Home Banking', allowBack: true });
registerScreenMeta('audit', { title: 'Detalle de Presupuesto', allowBack: true });
registerScreenMeta('future-days', { title: 'Días Restantes', allowBack: true });
registerScreenMeta('day-change', { title: '☀️ Nuevo Día', allowBack: false });
registerScreenMeta('limpiar-candidato', { title: 'Limpiar Pendientes', allowBack: false });

function setMicroTab(tab) {
  appState.microTab = tab;
  const isList = tab === 'list';
  
  const segMovs = document.getElementById('seg-movimientos');
  const segReg = document.getElementById('seg-registrar');
  if (segMovs) segMovs.classList.toggle('active', isList);
  if (segReg) segReg.classList.toggle('active', !isList);
  
  const tabList = document.getElementById('micro-tab-list');
  const tabForm = document.getElementById('micro-tab-form');
  if (tabList) tabList.classList.toggle('hidden', !isList);
  if (tabForm) tabForm.classList.toggle('hidden', isList);

  if (!isList) {
    renderDayChips_();
  } else {
    resetTxForm_();
  }
  updateFabState_();
}

function updateFabStateMicro_(primary, secondary) {
  if (appState.microTab === 'list') {
    primary.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v16m8-8H4"></path></svg>';
    secondary.classList.add('hidden');
  } else {
    primary.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"></path></svg>';
    secondary.classList.remove('hidden');
  }
}

function handleFabPrimaryMicro_() {
  if (appState.microTab === 'list') {
    resetTxForm_();
    setMicroTab('form');
  } else {
    handleFormSubmit();
  }
}

function handleFabSecondaryMicro_() {
  if (appState.microTab === 'form') {
    setMicroTab('list');
  }
}

function renderDayChips_() {
  const container = document.getElementById('tx-day-chips-inner');
  if (!container) return;
  
  const hoyStr = hoyISO_();
  let days = [...appState.diasRestantes];
  if (!days.includes(hoyStr)) {
    days.unshift(hoyStr);
    days.sort();
  }

  const inputDate = document.getElementById('tx-assigned-date');
  if (!inputDate.value) inputDate.value = hoyStr;
  const selectedDate = inputDate.value;

  container.innerHTML = days.map(iso => {
    const p = iso.split('-').map(Number);
    const dateObj = new Date(p[0], p[1] - 1, p[2]);
    const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const dow = daysOfWeek[dateObj.getDay()];
    const dayNum = dateObj.getDate();
    const isSelected = iso === selectedDate;
    
    return '<button type="button" class="day-chip ' + (isSelected ? 'selected' : '') + '" onclick="selectDayChip_(\'' + iso + '\')">' +
           '<span class="day-chip-dow">' + dow + '</span>' +
           '<span class="day-chip-num">' + dayNum + '</span>' +
           '</button>';
  }).join('');
}

function selectDayChip_(iso) {
  document.getElementById('tx-assigned-date').value = iso;
  renderDayChips_();
}

function scrollDayChips_(dir) {
  const container = document.getElementById('tx-day-chips-inner');
  if (container) container.scrollBy({ left: dir * 120, behavior: 'smooth' });
}

function calcularComposicion_() {
  const dias = appState.diasRestantes;
  const liquidHB = appState.homeBankingTotal - appState.bolsaTotal;
  const gastosPorFecha = {};
  dias.forEach(f => { gastosPorFecha[f] = 0; });

  let gastosEnPeriodo = 0;
  appState.movimientos.forEach(m => {
    if (m.fromBag) return;
    const fechas = normalizarFechas_(m.fechasAfectadas);
    fechas.forEach(f => {
      if (Object.prototype.hasOwnProperty.call(gastosPorFecha, f)) {
        gastosPorFecha[f] += m.montoPorFecha;
        gastosEnPeriodo += m.montoPorFecha;
      }
    });
  });

  const objetivoBase = dias.length > 0 ? (liquidHB + gastosEnPeriodo) / dias.length : 0;
  return { objetivoBase: objetivoBase, gastosPorFecha: gastosPorFecha };
}

function presupuestoParaFecha_(fechaISO) {
  const comp = calcularComposicion_();
  return comp.objetivoBase - (comp.gastosPorFecha[fechaISO] || 0);
}

function renderMicroView() {
  const hbEl = document.getElementById('hb-total-display');
  const bolsaEl = document.getElementById('savings-bag-display');
  if (hbEl) hbEl.textContent = formatearMoneda_(appState.homeBankingTotal);
  if (bolsaEl) bolsaEl.textContent = formatearMoneda_(appState.bolsaTotal);

  const hoyStr = hoyISO_();
  const mananaStr = formatearFechaISOLocal_(sumarDiasLocal_(new Date(), 1));

  const presupuestoHoy = presupuestoParaFecha_(hoyStr);
  const presupuestoManana = presupuestoParaFecha_(mananaStr);

  const hoyEl = document.getElementById('today-budget-display');
  const mananaEl = document.getElementById('tomorrow-budget-display');
  const diasLabel = document.getElementById('days-remaining-label');
  
  if (hoyEl) hoyEl.textContent = formatearMoneda_(presupuestoHoy);
  if (mananaEl) mananaEl.textContent = formatearMoneda_(presupuestoManana);
  if (diasLabel) {
    diasLabel.textContent = 'Días restantes hasta cobro: ' + appState.diasRestantes.length +
      ' (cobrás el ' + formatearFechaLegible_(appState.diaCobro) + ')';
  }

  renderTransactionList_();
  updateFabState_();
}

function renderTransactionList_() {
  const cont = document.getElementById('transaction-list');
  if (!cont) return;
  const hoyStr = hoyISO_();
  const diasPeriodo = appState.diasRestantes || [];

  const delPeriodo = appState.movimientos.filter(m => {
    const fechas = normalizarFechas_(m.fechasAfectadas);
    return fechas.some(f => diasPeriodo.includes(f) || f >= hoyStr);
  });

  if (!delPeriodo.length) {
    cont.innerHTML = '<p class="text-[11px] text-white/50 text-center py-5">Sin movimientos registrados</p>';
    return;
  }

  cont.innerHTML = delPeriodo.map(m => {
    const titulo = m.descripcion || (m.tipo === 'divisible' ? 'Gasto divisible' : 'Gasto único');
    const fechas = normalizarFechas_(m.fechasAfectadas);
    
    let textoFechas = '';
    if (fechas.length === 1 && fechas[0] === hoyStr) {
      textoFechas = 'Hoy';
    } else {
      textoFechas = fechas.map(f => {
        const p = f.split('-').map(Number);
        return p[2] + '/' + p[1];
      }).join(', ');
    }

    const sub = m.usuario + ' · ' + textoFechas + (m.fromBag ? ' · Ahorros' : '');
    const userInitial = m.usuario ? m.usuario.charAt(0) : 'B';
    
    return '<button onclick="handleTxClick(\'' + m.id + '\')" class="w-full p-3.5 flex items-center justify-between text-left dark-glass-card hover:bg-white/15 transition-all gap-3 min-w-0">' +
      '<div class="flex items-center gap-3 min-w-0 flex-1">' +
      '<div class="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center text-xs font-bold text-white shrink-0 bg-white/10">' + userInitial + '</div>' +
      '<div class="min-w-0 flex-1"><p class="text-xs font-semibold text-white truncate">' + titulo + '</p>' +
      '<p class="text-[10px] text-white/60 truncate mt-0.5">' + sub + '</p></div>' +
      '</div>' +
      '<span class="text-xs font-extrabold text-white shrink-0">' + formatearMoneda_(m.monto) + '</span></button>';
  }).join('');
}

function handleTxClick(id) {
  prepararTxModalEdicion_(id);
  setMicroTab('form');
}

function prepararHbModal_() {
  const comp = calcularComposicion_();
  hbModalState = {
    hb: appState.homeBankingTotal,
    objetivo: Math.round(comp.objetivoBase),
    bolsa: appState.bolsaTotal,
    diasCount: appState.diasRestantes.length,
    lastEdited: 'objetivo'
  };

  const diasLabel = document.getElementById('hb-days-label');
  if (diasLabel) diasLabel.textContent = hbModalState.diasCount + ' días hasta el próximo cobro';

  setMoneyValue('hb-update-amount', hbModalState.hb);
  setMoneyValue('hb-objetivo-input', hbModalState.objetivo);
  setMoneyValue('hb-bolsa-input', hbModalState.bolsa);
  renderHbModal_();
}

function recomputeHbModal_(origen) {
  const dias = hbModalState.diasCount || 1;
  if (origen === 'objetivo') {
    hbModalState.bolsa = hbModalState.hb - (hbModalState.objetivo * dias);
  } else if (origen === 'bolsa') {
    hbModalState.objetivo = (hbModalState.hb - hbModalState.bolsa) / dias;
  } else if (hbModalState.lastEdited === 'objetivo') {
    hbModalState.bolsa = hbModalState.hb - (hbModalState.objetivo * dias);
  } else {
    hbModalState.objetivo = (hbModalState.hb - hbModalState.bolsa) / dias;
  }
  renderHbModal_();
}

function renderHbModal_() {
  const hintObjetivo = document.getElementById('hb-hint-objetivo');
  const hintBolsa = document.getElementById('hb-hint-bolsa');
  
  if (hintObjetivo) {
    hintObjetivo.innerHTML = hbModalState.lastEdited === 'bolsa'
      ? '↳ con esta Bolsa, el objetivo queda en <b class="text-[13px] font-bold text-white">' + formatearMoneda_(hbModalState.objetivo) + '/día</b>'
      : '';
  }
  if (hintBolsa) {
    hintBolsa.innerHTML = hbModalState.lastEdited === 'objetivo'
      ? '↳ con este objetivo, la Bolsa quedaría en <b class="text-[13px] font-bold text-white">' + formatearMoneda_(hbModalState.bolsa) + '</b>'
      : '';
  }

  const warnEl = document.getElementById('hb-warn-banner');
  const guardarBtn = document.getElementById('btn-guardar-hb');
  if (!warnEl || !guardarBtn) return;

  if (hbModalState.bolsa < 0) {
    const maxObjetivo = hbModalState.hb / (hbModalState.diasCount || 1);
    warnEl.textContent = 'Con este objetivo no alcanza — la Bolsa quedaría en ' +
      formatearMoneda_(hbModalState.bolsa) + '. El máximo sostenible ronda ' +
      formatearMoneda_(maxObjetivo) + '/día.';
    warnEl.classList.remove('hidden');
    guardarBtn.setAttribute('disabled', 'true');
    guardarBtn.style.opacity = '0.5';
  } else {
    warnEl.classList.add('hidden');
    guardarBtn.removeAttribute('disabled');
    guardarBtn.style.opacity = '1';
  }
}

attachMoneyInput('hb-update-amount', (id) => { hbModalState.hb = getMoneyValue(id); recomputeHbModal_(); });
attachMoneyInput('hb-objetivo-input', (id) => { hbModalState.lastEdited = 'objetivo'; hbModalState.objetivo = getMoneyValue(id); recomputeHbModal_('objetivo'); });
attachMoneyInput('hb-bolsa-input', (id) => { hbModalState.lastEdited = 'bolsa'; hbModalState.bolsa = getMoneyValue(id); recomputeHbModal_('bolsa'); });
attachMoneyInput('tx-amount', () => {});

async function saveHbAmount() {
  if (hbModalState.bolsa < 0) return;
  NavStack.pop();
  
  appState.homeBankingTotal = hbModalState.hb;
  appState.bolsaTotal = hbModalState.bolsa;
  renderMicroView();

  callBackendBackground('actualizarHB', {
    homeBankingTotal: hbModalState.hb,
    bolsaTotal: hbModalState.bolsa
  });
}

async function handleLimpiarPendientes() {
  NavStack.pop();
  mostrarSyncToast_();
  try {
    const resultado = await callBackend('limpiarMovimientosPendientes', {});
    await recargarEstadoDiario_(false);
    limpiarColaCandidatos = (resultado.candidatos || []).slice();
    procesarSiguienteCandidato_();
  } catch (e) {
    alert('Error al limpiar movimientos');
  } finally {
    ocultarSyncToast_();
  }
}

function procesarSiguienteCandidato_() {
  if (!limpiarColaCandidatos.length) {
    const comp = calcularComposicion_();
    hbModalState.hb = appState.homeBankingTotal;
    hbModalState.bolsa = appState.bolsaTotal;
    hbModalState.objetivo = Math.round(comp.objetivoBase);
    hbModalState.diasCount = appState.diasRestantes.length;
    setMoneyValue('hb-objetivo-input', hbModalState.objetivo);
    setMoneyValue('hb-bolsa-input', hbModalState.bolsa);
    recomputeHbModal_();
    return;
  }
  const candidato = limpiarColaCandidatos[0];
  const desc = document.getElementById('limpiar-candidato-desc');
  if (desc) {
    desc.textContent = (candidato.descripcion || 'Gasto divisible') + ' — ' +
      formatearMoneda_(candidato.monto) + ' en total';
  }
  NavStack.push('limpiar-candidato');
}

async function resolverCandidatoLimpiar(accion) {
  const candidato = limpiarColaCandidatos.shift();
  NavStack.pop();

  mostrarSyncToast_();
  try {
    if (accion === 'borrar') {
      await callBackend('eliminarMovimiento', { id: candidato.id });
    } else if (accion === 'single') {
      await callBackend('guardarMovimiento', {
        id: candidato.id,
        tipo: 'single',
        fechasAfectadas: [hoyISO_()],
        monto: candidato.montoPorFecha,
        descripcion: candidato.descripcion,
        usuario: candidato.usuario,
        fromBag: candidato.fromBag
      });
    }
    await recargarEstadoDiario_(false);
  } catch (e) {
    alert('Error al procesar candidato');
  } finally {
    ocultarSyncToast_();
    procesarSiguienteCandidato_();
  }
}

async function chequearCierreDia_() {
  const hoyStr = hoyISO_();

  if (!appState.lastProcessedDate) {
    try {
      const resultado = await callBackend('resolverCierreDia', { decision: 'redistribuir', tipo: 'sobrante', monto: 0 });
      appState.lastProcessedDate = resultado.lastProcessedDate;
    } catch (e) {
      console.error('No se pudo inicializar lastProcessedDate en Config:', e);
    }
    return;
  }

  if (appState.lastProcessedDate === hoyStr) return;
  if (appState.lastProcessedDate > hoyStr) return;

  const ventana = [appState.lastProcessedDate].concat(appState.diasRestantes);
  const liquidHB = appState.homeBankingTotal - appState.bolsaTotal;
  const gastosPorFecha = {};
  ventana.forEach(f => { gastosPorFecha[f] = 0; });

  let gastosEnVentana = 0;
  appState.movimientos.forEach(m => {
    if (m.fromBag) return;
    const fechas = normalizarFechas_(m.fechasAfectadas);
    fechas.forEach(f => {
      if (Object.prototype.hasOwnProperty.call(gastosPorFecha, f)) {
        gastosPorFecha[f] += m.montoPorFecha;
        gastosEnVentana += m.montoPorFecha;
      }
    });
  });

  const objetivoAyer = ventana.length > 0 ? (liquidHB + gastosEnVentana) / ventana.length : 0;
  const gastoAyer = gastosPorFecha[appState.lastProcessedDate] || 0;
  const diferencia = objetivoAyer - gastoAyer;

  if (Math.abs(diferencia) < 1) {
    const resultado = await callBackendConSync('resolverCierreDia', { decision: 'redistribuir', tipo: 'sobrante', monto: 0 });
    appState.lastProcessedDate = resultado.lastProcessedDate;
    return;
  }

  cierreDiaPendiente = { tipo: diferencia > 0 ? 'sobrante' : 'deficit', monto: Math.abs(diferencia) };
  mostrarModalCierreDia_(cierreDiaPendiente);
}

function mostrarModalCierreDia_(info) {
  const esDeficit = info.tipo === 'deficit';
  document.getElementById('day-change-title').textContent = esDeficit ? '📉 Día anterior en rojo' : '☀️ ¡Nuevo Día Detectado!';
  document.getElementById('day-change-desc').innerHTML = esDeficit
    ? 'Ayer te pasaste por <strong class="text-white">' + formatearMoneda_(info.monto) + '</strong>. ¿Cómo lo cubrimos?'
    : 'Ayer te sobraron <strong class="text-white">' + formatearMoneda_(info.monto) + '</strong>. ¿Qué hacemos?';
  document.getElementById('day-change-btn-bag').textContent = esDeficit ? 'Descontar de la Bolsa' : 'Mover a la Bolsa de Ahorro';
  document.getElementById('day-change-btn-distribute').textContent = 'Repartir entre los días que quedan';
  
  NavStack.push('day-change');
}

async function resolveDayChange(decision) {
  const info = cierreDiaPendiente;
  if (!info) return;
  NavStack.pop();

  mostrarSyncToast_();
  try {
    const resultado = await callBackend('resolverCierreDia', {
      decision: decision === 'bag' ? 'bolsa' : 'redistribuir',
      tipo: info.tipo,
      monto: info.monto
    });

    appState.bolsaTotal = resultado.bolsaTotal;
    appState.lastProcessedDate = resultado.lastProcessedDate;
    cierreDiaPendiente = null;
    await recargarEstadoDiario_(false);
  } catch (e) {
    alert('Error al cerrar día');
  } finally {
    ocultarSyncToast_();
  }
}

function setTxSubtype(tipo) {
  txModalSubtype = tipo;

  const tabSingle = document.getElementById('tab-single');
  const tabDivisible = document.getElementById('tab-divisible');
  [['single', tabSingle], ['divisible', tabDivisible]].forEach(([t, btn]) => {
    if (btn) btn.classList.toggle('active', t === tipo);
  });

  const assignContainer = document.getElementById('tx-assigned-date-container');
  const divOptions = document.getElementById('divisible-options');
  if (assignContainer) assignContainer.classList.toggle('hidden', tipo === 'divisible');
  if (divOptions) divOptions.classList.toggle('hidden', tipo !== 'divisible');
}

function handleBagCheckbox(el) {
  if (el.checked && txModalSubtype === 'divisible') {
    setTxSubtype('single');
    const fechaEl = document.getElementById('tx-assigned-date');
    if (fechaEl) fechaEl.value = hoyISO_();
    renderDayChips_();
  }
}

function resetTxForm_() {
  const form = document.getElementById('tx-form');
  if (form) form.reset();
  const fechaEl = document.getElementById('tx-assigned-date');
  if (fechaEl) fechaEl.value = hoyISO_();
  setMoneyValue('tx-amount', 0);
  setTxSubtype('single');
  editingMovimientoId = null;
  const btnDel = document.getElementById('btn-delete-tx');
  if (btnDel) btnDel.classList.add('hidden');
  renderDayChips_();
}

function resetCurrentTabOnly() {
  document.getElementById('tx-desc').value = '';
  setMoneyValue('tx-amount', 0);
  document.getElementById('tx-assigned-date').value = hoyISO_();
  document.getElementById('chk-from-bag').checked = false;
  document.getElementById('tx-days-count').value = '';
  document.getElementById('tx-divisible-start-date').value = '';
  document.getElementById('tx-custom-days').value = '';
  renderDayChips_();
}

function prepararTxModalEdicion_(movimientoId) {
  const m = appState.movimientos.find(x => String(x.id).trim() === String(movimientoId).trim());
  if (!m) { resetTxForm_(); return; }
  editingMovimientoId = m.id;
  setTxSubtype(m.tipo);
  setMoneyValue('tx-amount', m.monto);
  document.getElementById('tx-desc').value = m.descripcion || '';

  const fechas = normalizarFechas_(m.fechasAfectadas);
  document.getElementById('tx-assigned-date').value = fechas[0] || hoyISO_();

  if (m.tipo === 'divisible') {
    document.getElementById('tx-days-count').value = fechas.length || '';
    document.getElementById('tx-divisible-start-date').value = fechas[0] || hoyISO_();
    const customDaysStr = fechas.map(f => {
      const p = f.split('-').map(Number);
      return p[2];
    }).join(', ');
    document.getElementById('tx-custom-days').value = customDaysStr;
  }

  document.getElementById('chk-from-bag').checked = !!m.fromBag;
  const btnDel = document.getElementById('btn-delete-tx');
  if (btnDel) btnDel.classList.remove('hidden');
  renderDayChips_();
}

async function handleFormSubmit() {
  const monto = getMoneyValue('tx-amount');
  if (!monto || monto <= 0) { alert('Ingresá un monto válido'); return; }

  const descripcion = document.getElementById('tx-desc').value.trim();
  const fromBag = document.getElementById('chk-from-bag').checked;
  let fechasAfectadas = [];

  if (txModalSubtype === 'single') {
    const fecha = document.getElementById('tx-assigned-date').value || hoyISO_();
    fechasAfectadas = [fecha];
  } else {
    const diasCount = parseInt(document.getElementById('tx-days-count').value, 10);
    const fechaInicio = document.getElementById('tx-divisible-start-date').value;
    const customDaysRaw = document.getElementById('tx-custom-days').value.trim();

    if (customDaysRaw) {
      const base = fechaInicio ? new Date(fechaInicio + 'T00:00:00') : new Date();
      let currentMonth = base.getMonth();
      let currentYear = base.getFullYear();
      let lastDay = 0;

      fechasAfectadas = customDaysRaw.split(',')
        .map(s => parseInt(s.trim(), 10))
        .filter(dia => !isNaN(dia))
        .map(dia => {
          const enDiasRestantes = (appState.diasRestantes || []).find(fStr => {
            const p = fStr.split('-').map(Number);
            return p[2] === dia;
          });
          if (enDiasRestantes) {
            const p = enDiasRestantes.split('-').map(Number);
            lastDay = p[2];
            return enDiasRestantes;
          }

          if (dia < lastDay || (lastDay === 0 && dia < base.getDate())) {
            currentMonth++;
            if (currentMonth > 11) {
              currentMonth = 0;
              currentYear++;
            }
          }
          lastDay = dia;
          return formatearFechaISOLocal_(new Date(currentYear, currentMonth, dia));
        });
    } else if (diasCount && fechaInicio) {
      const base = new Date(fechaInicio + 'T00:00:00');
      for (let i = 0; i < diasCount; i++) {
        fechasAfectadas.push(formatearFechaISOLocal_(new Date(base.getFullYear(), base.getMonth(), base.getDate() + i)));
      }
    } else {
      fechasAfectadas = appState.diasRestantes.slice();
    }
  }

  if (!fechasAfectadas.length) { alert('Faltan fechas para este gasto'); return; }

  setMicroTab('list');
  
  const idMov = editingMovimientoId || ('tx_' + Date.now());
  const nuevoMov = {
    id: idMov,
    tipo: txModalSubtype,
    fechasAfectadas: fechasAfectadas,
    monto: monto,
    montoPorFecha: monto / fechasAfectadas.length,
    descripcion: descripcion,
    usuario: appState.activeUser,
    fromBag: fromBag
  };

  const idx = appState.movimientos.findIndex(x => String(x.id) === String(idMov));
  if (idx !== -1) {
    const movAnterior = appState.movimientos[idx];
    appState.homeBankingTotal += movAnterior.monto;
    if (movAnterior.fromBag) appState.bolsaTotal += movAnterior.monto;
    appState.movimientos[idx] = nuevoMov;
  } else {
    appState.movimientos.push(nuevoMov);
  }

  appState.homeBankingTotal -= monto;
  if (fromBag) appState.bolsaTotal -= monto;

  renderMicroView();

  callBackendBackground('guardarMovimiento', {
    id: editingMovimientoId,
    tipo: txModalSubtype,
    fechasAfectadas: fechasAfectadas,
    monto: monto,
    descripcion: descripcion,
    usuario: appState.activeUser,
    fromBag: fromBag
  }).then(() => recargarEstadoDiario_(false));
}

async function deleteCurrentEditingTransaction() {
  if (!editingMovimientoId) return;
  setMicroTab('list');
  
  const movExistente = appState.movimientos.find(x => String(x.id) === String(editingMovimientoId));
  if (movExistente) {
    appState.homeBankingTotal += movExistente.monto;
    if (movExistente.fromBag) appState.bolsaTotal += movExistente.monto;
    appState.movimientos = appState.movimientos.filter(x => String(x.id) !== String(editingMovimientoId));
    renderMicroView();
  }

  callBackendBackground('eliminarMovimiento', { id: editingMovimientoId })
    .then(() => recargarEstadoDiario_(false));
}

async function triggerSyncReload() {
  mostrarSyncToast_();
  try {
    await recargarEstadoDiario_(false);
  } catch (e) {
    alert('Error de sincronización');
  } finally {
    ocultarSyncToast_();
  }
}

function openAuditToday() {
  auditTargetDay_ = 'today';
  openBudgetAuditModalInner_();
  NavStack.push('audit');
}

function openAuditTomorrow() {
  auditTargetDay_ = 'tomorrow';
  openBudgetAuditModalInner_();
  NavStack.push('audit');
}

function openBudgetAuditModalInner_() {
  const isTomorrow = auditTargetDay_ === 'tomorrow';
  const fecha = isTomorrow ? formatearFechaISOLocal_(sumarDiasLocal_(new Date(), 1)) : hoyISO_();
  const comp = calcularComposicion_();
  const gastoDelDia = comp.gastosPorFecha[fecha] || 0;
  const disponible = comp.objetivoBase - gastoDelDia;

  const titleText = document.getElementById('root-title-text');
  if (titleText) titleText.textContent = isTomorrow ? 'Presupuesto Mañana' : 'Presupuesto de Hoy';
  
  const subtitle = document.getElementById('audit-subtitle');
  if (subtitle) subtitle.textContent = formatearFechaLegible_(fecha);

  const movimientosDelDia = appState.movimientos.filter(m => {
    if (m.fromBag) return false;
    const fechas = normalizarFechas_(m.fechasAfectadas);
    return fechas.includes(fecha);
  });

  let html = '<div class="flex justify-between items-center p-3 dark-glass-card mb-2.5">' +
    '<div><p class="font-bold text-white text-xs">Objetivo Diario</p>' +
    '<p class="text-[9px] text-white/60 font-medium">(HB − Bolsa + gastos del período) ÷ ' + appState.diasRestantes.length + ' días</p></div>' +
    '<span class="font-black text-white text-xs">+' + formatearMoneda_(comp.objetivoBase) + '</span></div>';

  if (movimientosDelDia.length) {
    html += movimientosDelDia.map(m => (
      '<div class="flex justify-between items-center p-3 bg-rose-500/20 border border-rose-500/30 rounded-2xl mb-1.5 cursor-pointer transition-colors" onclick="NavStack.pop(); handleTxClick(\'' + m.id + '\')">' +
      '<div><p class="font-bold text-rose-100 text-xs">' + (m.descripcion || (m.tipo === 'divisible' ? 'Gasto divisible' : 'Gasto único')) + '</p>' +
      '<p class="text-[9px] text-rose-200/80 font-medium">' + m.usuario + '</p></div>' +
      '<span class="font-black text-rose-200 text-xs">-' + formatearMoneda_(m.montoPorFecha) + '</span></div>'
    )).join('');
  } else {
    html += '<p class="text-[10px] text-white/50 text-center py-3">Sin egresos descontados del presupuesto asignado</p>';
  }

  const listCont = document.getElementById('audit-content-list');
  if (listCont) listCont.innerHTML = html;
  
  const totalDisp = document.getElementById('audit-total-display');
  if (totalDisp) totalDisp.textContent = formatearMoneda_(disponible);
}

function renderFutureDaysList_() {
  const cont = document.getElementById('future-days-list');
  if (!cont) return;
  const comp = calcularComposicion_();
  const hoyStr = hoyISO_();
  const futuros = appState.diasRestantes.filter(f => f > hoyStr);

  if (!futuros.length) {
    cont.innerHTML = '<p class="text-[11px] text-white/50 text-center py-3">No quedan más días en este período</p>';
    return;
  }

  cont.innerHTML = futuros.map(fecha => {
    const gasto = comp.gastosPorFecha[fecha] || 0;
    const disponible = comp.objetivoBase - gasto;
    const movs = appState.movimientos.filter(m => {
      if (m.fromBag) return false;
      const fechas = normalizarFechas_(m.fechasAfectadas);
      return fechas.includes(fecha);
    });
    let detalle = '';
    if (movs.length) {
      detalle = '<div class="mt-2 pt-2 border-t border-white/10 space-y-1">' +
        movs.map(m => '<button onclick="event.stopPropagation(); NavStack.pop(); handleTxClick(\'' + m.id + '\')" class="w-full flex justify-between text-[10px] text-white/70 hover:text-white p-1 rounded transition-colors text-left"><span>• ' +
          (m.descripcion || 'Gasto') + '</span><span class="font-semibold">-' + formatearMoneda_(m.montoPorFecha) + '</span></button>').join('') +
        '</div>';
    }
    return '<div class="p-3.5 dark-glass-card mb-2">' +
      '<div class="flex justify-between items-center">' +
      '<div><span class="font-bold text-white capitalize text-xs block">' + formatearFechaLegible_(fecha) + '</span>' +
      '<span class="text-[9px] text-white/60 font-medium">' + (gasto > 0 ? 'Gastado: ' + formatearMoneda_(gasto) : 'Sin consumos asignados') + '</span></div>' +
      '<span class="font-black text-xs text-white">' + formatearMoneda_(disponible) + '</span></div>' + detalle + '</div>';
  }).join('');
}
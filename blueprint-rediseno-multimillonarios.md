# Blueprint Técnico — Rediseño "Multimillonarios Finance"
### Header-Toggle Edition (sin Dockbar) — v1.0

**Decisiones ya confirmadas con el usuario:**
1. El selector de 7 colores de acento se **mueve al menú ☰** (Ajustes). No se elimina la personalización.
2. Todos los modales secundarios (HB, Sueldos y Servicios, Auditoría, Gasto Fijo, Servicio Fijo, Días Restantes, Cierre de Día) pasan de *bottom-sheet overlay* a **pantalla completa dentro de la misma tarjeta principal** (sin backdrop oscuro).
3. El ícono ☰ abre un panel de **Ajustes** con acceso a: color de acento, Días Restantes (si estás en Diario) y Sueldos/Servicios (si estás en Mensual).

**Fuente de verdad visual:** tus 4 mockups (`home.png`, `Mensual.png`, `diario_registrar_mov_unico.png`, `diario_registrar_mov_div.png`) ya son la aplicación de la estética del video sobre el esqueleto de `prueba.html`. Extraje colores por muestreo de píxeles directamente de esos PNG — no son estimaciones. El video (kit de UI "Emirates") solo aporta inspiración de layout (tabs superiores subrayados, selector de días en chips, tarjeta clara deslizándose sobre fondo oscuro); su acento durazno **no** se usa, porque tus mockups ya aplicados a la propia app lo resolvieron con un sistema de dos tonos (salvia/blanco) sin durazno. Se ignora por completo la mecánica de "selección de asiento" del video, como pediste.

---

## 0. Concepto central en una frase

> Un único `<main id="app-root">` con dos temas (`theme-diario` / `theme-mensual`) que se invierten al tocar el título — igual que `prueba.html` — y, dentro de la tarjeta, **todos los modales de hoy se convierten en paneles que ya existen en el DOM y solo se muestran/ocultan con una clase**, exactamente con la misma técnica que ya usa el código actual (`.classList.toggle('active', show)`), solo que reposicionados de *overlay fijo de pantalla completa* a *panel dentro de la tarjeta*. Esto es lo que permite lograr "cero pérdida de funcionalidad" con riesgo mínimo: **no reescribimos la lógica, movemos el contenedor.**

---

## 1. Sistema visual (Design Tokens)

Valores extraídos por muestreo de píxeles de tus 4 PNG (no inventados):

| Token | Valor | Uso |
|---|---|---|
| `--shell-strong` | `#536460` (salvia oscuro — idéntico al hardcodeado en `prueba.html`) | Header y tarjeta raíz, según tema activo |
| `--shell-soft` | `#ffffff` | El otro lado de la inversión |
| `--shell-canvas` | `#f1f3f6` (= `--surface-app` actual) | Fondo del contenido **dentro** de la tarjeta clara (Mensual), para que los bento-cards blancos con sombra sigan destacando y no se fundan con un blanco puro. *(Tus mocks muestran blanco puro porque la pantalla Mensual está vacía/placeholder; con contenido real conviene este matiz.)* |
| `--accent-color` | Personalizable (7 swatches existentes), default `#18181b` | **Capa 2** — ver §1.1. Sin cambios respecto a hoy. |
| Semánticos sin cambios | `emerald-*` (ingreso/deuda), `rose-*` (gasto), `amber-*` (SAC) | Se mantienen tal cual — el rediseño no toca el código de colores financieros. |

**Tipografía:** se mantiene Inter (ya cargada). Se mantiene la escala actual (título 4xl/black para el importe grande, 10-11px uppercase tracking-wide para micro-labels) porque ya coincide con lo que muestran tus mocks (números grandes en negrita, labels chicas). No se introduce una segunda familia.

**Radios:** tarjeta raíz `rounded-t-[40px]` (tal cual `prueba.html`), chips de día `rounded-full`/`rounded-2xl` con esquinas ~16px, FAB y botón trasero `rounded-full`.

**Iconografía de fila:** tus mocks reemplazan el patrón "label arriba + input abajo" por **ícono circular a la izquierda del input** ($ para monto, % para días, 📅 para fecha, avatar con inicial del usuario para descripción). Se documenta como patrón de componente en el Módulo 2, pero es un cambio puramente visual — el `id` del input real no cambia, así que ninguna función de `state-api.js` se ve afectada.

### 1.1 — Sistema de dos capas de color (resuelve la tensión "paleta fija del mock" vs "accent-color personalizable que pediste conservar")

- **Capa 1 — Shell (fija, no personalizable):** `--shell-strong` / `--shell-soft` gobiernan *solo* el header, la tarjeta raíz, el FAB circular y el ícono ☰. Es exactamente lo que se ve en tus 4 mocks, sin excepción.
- **Capa 2 — Acento personal (`--accent-color`, editable desde Ajustes):** sigue gobernando lo mismo que hoy gobierna `hero-accent-card`/`accent-bg`/`accent-text`, pero acotado a elementos **dentro** de pantallas hijas: botones primarios "Guardar…" (Gasto Fijo, Servicio, Config Macro, Value Edit, HB), el subrayado de tab activo, el chip de día seleccionado y el anillo del avatar activo (B/V). Así el usuario conserva su personalización sin romper el shell fijo del video.

Esta separación es una **recomendación de diseño**, no algo que preguntamos explícitamente — queda marcada en §11 por si preferís otra combinación al momento de generar el CSS real.

---

## 2. Arquitectura de navegación (el cambio central)

### 2.1 Dos conceptos de navegación, no confundir

| Concepto | Qué es | Tiene botón "atrás" | Ejemplos |
|---|---|---|---|
| **Root Toggle** | Tocar el título ("Diario"/"Mensual") invierte tema y vista raíz | No aplica (es un swap, no un push) | Diario ⇄ Mensual |
| **Root Tabs** | Segmentos livianos *dentro* de una raíz, sin apilar historial | No | Movimientos ⇄ Registrar · Único ⇄ Divisible (ya existían) |
| **NavStack (pantallas)** | Pantallas de detalle que se apilan sobre una raíz | Sí (flecha ← en el header) salvo decisión forzosa | HB, Auditoría, Días Restantes, Ajustes, Sueldos y Servicios, Gasto Fijo, Servicio, Value Edit, Quick Add, Cierre de Día*, Limpiar Candidato* |

\* Cierre de Día y Limpiar Candidato **no** muestran flecha atrás — igual que hoy, que tampoco tenían una X para cerrar sin decidir. Se preserva esa restricción intencional.

### 2.2 Registro completo de pantallas (`NavStack`)

| id de pantalla | Título en header | Se abre desde | ¿Back? | Reemplaza (elemento actual) |
|---|---|---|---|---|
| `hb-update` | Actualizar Home Banking | Diario | Sí | `#hb-modal` |
| `audit` | Presupuesto de Hoy / Mañana | Diario | Sí | `#budget-audit-modal` |
| `future-days` | Presupuestos Días Restantes | Diario (root) o Ajustes | Sí | `#future-days-modal` |
| `day-change` | ☀️ Nuevo Día / 📉 Día en rojo | Diario (automático) | **No** | `#day-change-modal` |
| `limpiar-candidato` | Gasto dividido pendiente | Diario (automático, en cola) | **No** | `#limpiar-candidato-modal` |
| `settings` | Ajustes | ☰ (Diario o Mensual) | Sí | swatches sueltos del header actual |
| `macro-config` | Sueldos y Servicios | Mensual (root) o Ajustes | Sí | `#macro-config-modal` |
| `service-edit` | Servicio Fijo | Mensual | Sí | `#service-edit-modal` |
| `fixed-expense` | Gasto Fijo (Brian/Virginia) | Mensual | Sí | `#fixed-expense-modal` |
| `value-edit` | Editar Valor | Mensual | Sí | `#value-edit-modal` |
| `quick-add` | Agregar a la Proyección | Mensual (FAB) | Sí | `#quick-add-modal` |

**Nota sobre "Ajustes" contextual:** si ☰ se toca estando en Diario, Ajustes muestra "Color de Acento" + acceso a "Días Restantes". Si se toca estando en Mensual, muestra "Color de Acento" + acceso a "Sueldos y Servicios". Esto evita que una pantalla diseñada para un tema (oscuro/claro) se abra heredando el tema contrario — ver regla de tema en §2.4.

### 2.3 Mecanismo técnico (Estrategia A: DOM persistente, cero re-render de inputs)

Se descartó la alternativa de inyectar/destruir HTML dinámicamente porque `attachMoneyInput()` se llama **una sola vez, al cargar el script**, sobre elementos que deben existir en el DOM desde el arranque. Si el HTML de cada pantalla se generara recién al navegar a ella, habría que re-bindear inputs de dinero cada vez, multiplicando el riesgo de romper el formateador. En cambio:

- **Cada pantalla vive permanentemente en el DOM** (igual que hoy los `<div id="...-modal">`), solo que ya no son `position: fixed; inset: 0` con backdrop, sino paneles `position: relative` dentro de la tarjeta, con clase `.app-screen` + `.screen-active` para mostrarse.
- El único cambio real en cada función `toggleXModal(show)` es **qué clase se togglea y dónde**: antes `#x-modal.classList.toggle('active', show)` (overlay fijo), ahora `show ? NavStack.push('x') : NavStack.pop()`.
- Los parámetros de "qué estoy editando" siguen viviendo en las mismas variables globales que ya existen hoy (`currentEditingFixedExpenseId`, `currentEditingServiceId`, `currentEditingValueTarget`, `editingMovimientoId`, etc.) — `NavStack` **no necesita pasar parámetros**, porque el código original ya resolvió ese problema con variables de módulo. No se inventa nada nuevo acá.

```js
// state-api.js — contrato de referencia (Módulo 3)
const NavStack = {
  _stack: [],
  push(screenId) { this._stack.push(screenId); this._apply(); },
  pop() { this._stack.pop(); this._apply(); },
  reset() { this._stack = []; this._apply(); },
  current() { return this._stack[this._stack.length - 1] || null; },
  _apply() {
    document.querySelectorAll('.app-screen').forEach(el => el.classList.remove('screen-active'));
    const top = this.current();
    const targetId = top ? ('screen-' + top)
                         : (appState.currentView === 'micro' ? 'screen-root-micro' : 'screen-root-macro');
    document.getElementById(targetId)?.classList.add('screen-active');
    updateHeaderChrome_();
  }
};

const SCREEN_META = {}; // registrado por view-micro.js / view-macro.js al cargar
function registerScreenMeta(id, meta) { SCREEN_META[id] = meta; } // {title, allowBack}

function updateHeaderChrome_() {
  const top = NavStack.current();
  const btnMenu = document.getElementById('btn-header-left');
  const title = document.getElementById('root-title-text');
  if (!top) {
    btnMenu.dataset.mode = 'menu';         // ☰ → abre Ajustes
    title.textContent = appState.currentView === 'micro' ? 'Diario' : 'Mensual';
    title.onclick = onHeaderTitleTap;      // solo tappeable en la raíz
  } else {
    const meta = SCREEN_META[top] || {};
    btnMenu.dataset.mode = meta.allowBack === false ? 'none' : 'back'; // ← o ausente
    title.textContent = meta.title || '';
    title.onclick = null;
  }
}
```

### 2.4 Regla de tema (simple a propósito)

`#app-root` lleva `theme-diario` o `theme-mensual` según **`appState.currentView` únicamente**. Empujar o sacar pantallas del `NavStack` **nunca** cambia el tema — así una pantalla como `future-days` siempre se ve oscura (nace de Diario) y `macro-config` siempre clara (nace de Mensual), sin casos especiales que mantener.

### 2.5 Botón flotante (FAB) — reemplaza al Dockbar

No hay una sola FAB fija: su ícono y acción dependen del contexto. Se calcula en `updateFabState_()`, llamada al final de cada render relevante.

| Contexto | FAB primaria (abajo-derecha) | Secundaria (abajo-izquierda) |
|---|---|---|
| Diario · tab "Movimientos" | → blanco/oscuro (según tema) → pasa a tab "Registrar" (nuevo) | — |
| Diario · tab "Registrar" | + → `handleFormSubmit()` | ← → vuelve a "Movimientos" sin guardar |
| Mensual (raíz) | + → `NavStack.push('quick-add')` | — |
| Cualquier pantalla del `NavStack` | **oculta** — cada pantalla ya trae su propio botón ancho "Guardar…" (sin cambios de código) | — |

---

## 3. Contrato de estado global compartido (para Módulo 3)

```js
const appState = {
  activeUser: 'Brian',                 // sin cambios
  currentView: 'micro',                // 'micro' | 'macro' — antes lo tocaba el Dockbar, ahora el título
  microTab: 'list',                    // NUEVO — 'list' | 'form' (Movimientos vs Registrar)

  homeBankingTotal: 0,                 // sin cambios
  bolsaTotal: 0,                       // sin cambios
  diaCobro: null,                      // sin cambios
  diasRestantes: [],                   // sin cambios
  movimientos: [],                     // sin cambios
  lastProcessedDate: null,             // sin cambios

  currentMacroYear: new Date().getFullYear(),   // sin cambios
  currentMacroMonth: new Date().getMonth(),     // sin cambios
  macroData: null                      // sin cambios
};
// NavStack y SCREEN_META viven aparte (ver §2.3), no dentro de appState.
```

Variables de módulo que **no cambian de nombre ni de forma**, solo de archivo (todas a `state-api.js` salvo que se indique otra cosa en §6-8): `moneyStates`, `txModalSubtype`, `editingMovimientoId`, `cierreDiaPendiente`, `limpiarColaCandidatos`, `hbModalState`, `macroDraft`, `currentEditingValueTarget`, `currentEditingServiceId`, `currentEditingFixedExpenseId`, `currentEditingFixedExpenseUser`, `pendingSyncCount`, `auditTargetDay_` (nueva, mínima, ver tabla §10).

**Backend (`Code.gs`): cero cambios.** Ninguna acción, esquema de hoja o payload se modifica. Esto es puramente un rediseño de frontend.

---

## 4. Módulo 1 — `index.html`

**Estructura de alto nivel** (adaptada de `prueba.html` + contenido real):

```
<html>
 <head>… manifest, script anti-flicker (sin cambios), tailwind cdn, styles.css …</head>
 <body>
  <main id="app-root" class="theme-diario">
    <header>
      <button id="btn-header-left" onclick="handleHeaderLeftClick()">☰ / ←</button>
      <div class="avatars">
        <button id="avatar-brian" onclick="setActiveUser('Brian')">B</button>
        <button id="avatar-virginia" onclick="setActiveUser('Virginia')">V</button>
      </div>
      <p id="sync-caption">Sincronizado en tiempo real</p>
    </header>

    <div id="root-title"><h1 id="root-title-text">Diario</h1></div>

    <section id="app-card" class="theme-bg-card rounded-t-[40px]">
      <!-- ===== RAÍZ DIARIO ===== -->
      <div id="screen-root-micro" class="app-screen">
        <!-- todo el contenido actual de <main id="view-micro"> -->
        <!-- tabs Movimientos/Registrar, día-chips, etc. -->
      </div>

      <!-- ===== RAÍZ MENSUAL ===== -->
      <div id="screen-root-macro" class="app-screen">
        <!-- todo el contenido actual de <main id="view-macro"> -->
      </div>

      <!-- ===== PANTALLAS DEL NAVSTACK (persistentes, ocultas por defecto) ===== -->
      <div id="screen-hb-update" class="app-screen">…contenido de #hb-modal…</div>
      <div id="screen-audit" class="app-screen">…contenido de #budget-audit-modal…</div>
      <div id="screen-future-days" class="app-screen">…</div>
      <div id="screen-day-change" class="app-screen">…</div>
      <div id="screen-limpiar-candidato" class="app-screen">…</div>
      <div id="screen-settings" class="app-screen">…NUEVO: swatches de acento + accesos contextuales…</div>
      <div id="screen-macro-config" class="app-screen">…</div>
      <div id="screen-service-edit" class="app-screen">…</div>
      <div id="screen-fixed-expense" class="app-screen">…</div>
      <div id="screen-value-edit" class="app-screen">…</div>
      <div id="screen-quick-add" class="app-screen">…</div>
    </section>

    <!-- FAB flotante, ya no hay <nav id="main-dock"> -->
    <button id="fab-primary" onclick="handleFabPrimary()"></button>
    <button id="fab-secondary" onclick="handleFabSecondary()" class="hidden"></button>
  </main>

  <script src="js/state-api.js"></script>
  <script src="js/view-micro.js"></script>
  <script src="js/view-macro.js"></script>
 </body>
</html>
```

**Reglas de implementación para quien escriba este archivo:**
- **Todos los `id` de inputs/formularios existentes se preservan literalmente** (`tx-amount`, `tx-desc`, `hb-update-amount`, `srv-modal-name`, `fixed-units`, etc.). Solo cambia el contenedor padre (de `.modal-overlay.fixed.inset-0` a `.app-screen` dentro de la tarjeta). Esto es lo que garantiza que ningún `getElementById` de `app.js` original se rompa.
- El `<script>` anti-parpadeo del `<head>` **no cambia**.
- Los scripts se cargan como `<script>` normales (sin `type="module"`, sin `defer`), en el orden `state-api.js → view-micro.js → view-macro.js`, igual que hoy con `app.js`, para que todas las funciones queden en `window` y los `onclick="..."` inline sigan funcionando exactamente igual.
- `#app-root` arranca con clase `theme-diario` (hardcodeada), consistente con `appState.currentView = 'micro'` por defecto.
- Se elimina `handleOverlayClick(event)` de la superficie pública — ya no hay backdrop en el que hacer click afuera. (Ver tabla §10.)
- Nuevo componente: fila de chips de día (Único) y fila ícono+input (patrón de §1) — usan los mismos `id` de siempre para los inputs reales; los chips solo escriben en un input oculto (ver Módulo 4, §7).

---

## 5. Módulo 2 — `styles.css`

**Se mantiene:** Tailwind CDN, `@import Inter`, `.bento-card`, `.hero-accent-card`, `.sync-toast`/`.sync-spinner`, `.capitalize-input`, `.quick-add-row/.quick-add-icon`, toda la paleta semántica (`badge-positive/negative`, pastel-green/rose).

**Se elimina:** `.slim-dock`, `.dock-indicator`, `.dock-item`, `.dock-fab` (ya no hay Dockbar). `.modal-overlay` dark backdrop + `.modal-sheet` transform-de-abajo-hacia-arriba (ya no hay overlays fijos).

**Se agrega:**

```css
/* Tema de shell — inversión Diario/Mensual, portado de prueba.html con los hex reales de tus mocks */
:root{
  --shell-strong:#536460;
  --shell-soft:#ffffff;
  --shell-canvas:#f1f3f6;
}
.theme-diario .theme-bg-header{background:var(--shell-soft);}
.theme-diario .theme-text-header{color:var(--shell-strong);}
.theme-diario .theme-bg-card{background:var(--shell-strong); color:#fff;}
.theme-diario #fab-primary{background:var(--shell-soft); color:var(--shell-strong);}

.theme-mensual .theme-bg-header{background:var(--shell-strong); color:#fff;}
.theme-mensual .theme-bg-card{background:var(--shell-canvas);}
.theme-mensual #fab-primary{background:var(--shell-strong); color:#fff;}

/* Paneles tipo "screen" — reemplazan .modal-overlay/.modal-sheet */
.app-screen{ display:none; }
.app-screen.screen-active{ display:flex; flex-direction:column; animation:screen-in .3s cubic-bezier(.16,1,.3,1); }
@keyframes screen-in{ from{opacity:0; transform:translateY(12px);} to{opacity:1; transform:translateY(0);} }

/* Chips de día (Único) */
.day-chip{ border:1px solid rgba(255,255,255,.4); border-radius:16px; }
.day-chip.selected{ background:#fff; color:var(--shell-strong); border-color:#fff; }

/* Tabs superiores (Movimientos/Registrar, Único/Divisible) */
.seg-tab{ opacity:.6; border-bottom:2px solid transparent; }
.seg-tab.active{ opacity:1; font-weight:700; border-bottom-color:currentColor; }

/* FAB */
#fab-primary, #fab-secondary{ position:absolute; bottom:20px; width:56px; height:56px; border-radius:9999px; box-shadow:0 10px 22px rgba(0,0,0,.25); }
#fab-primary{ right:20px; } #fab-secondary{ left:20px; }
```

Reutilizar `--accent-color` **solo** dentro de `.app-screen` hijas del NavStack (botones "Guardar…", subrayado de tab activo si se decide usar acento ahí, chip seleccionado si se prefiere acento en vez de blanco puro) — ver §1.1.

---

## 6. Módulo 3 — `js/state-api.js`

**Contenido exacto a incluir** (todo sin cambio de comportamiento salvo lo anotado):

1. `appState` (forma de §3).
2. `callBackend`, `callBackendConSync`, `callBackendBackground`, `mostrarSyncToast_`, `ocultarSyncToast_` — **sin cambios**. (Ajustar solo la posición CSS del toast en Módulo 2, no la lógica.)
3. `moneyStates`, `renderMoneyInput`, `getMoneyValue`, `setMoneyValue`, `attachMoneyInput` — **sin cambios**.
4. Utilidades de fecha/formato: `aBooleano_`, `normalizarFechas_`, `formatearMoneda_`, `formatearFechaISOLocal_`, `hoyISO_`, `sumarDiasLocal_`, `formatearFechaLegible_`, `capitalizeInput` — **sin cambios**.
5. `cargarUsuarioYColorLocal_`, `pintarBotonesUsuario_` (adaptada para pintar anillo/relleno en `#avatar-brian`/`#avatar-virginia` en vez de clases de pill-button), `setActiveUser` — mismo flujo, mismo llamado a `renderMicroView()`/`renderMacroView()` según vista activa.
6. `setAccent(color)` — **sin cambios** (ahora se invoca desde los swatches dentro de `#screen-settings`).
7. `switchView(view)` — mismo cuerpo, **+2 líneas nuevas**: toggle de clase `theme-diario`/`theme-mensual` en `#app-root`, y `NavStack.reset()` al principio (si cambiás de raíz con una pantalla abierta, se descarta — comportamiento a confirmar en §11).
8. **Nuevo:** `onHeaderTitleTap()` → llama a `switchView(...)` con la vista contraria, solo si `NavStack.current() === null`.
9. **Nuevo:** `NavStack`, `SCREEN_META`, `registerScreenMeta`, `updateHeaderChrome_`, `handleHeaderLeftClick()` (despacha a `NavStack.pop()` si `dataset.mode==='back'`, o `NavStack.push('settings')` si `==='menu'`, o no-op si `==='none'`) — contrato completo en §2.3.
10. **Nuevo:** dispatcher de FAB — `updateFabState_()`, `handleFabPrimary()`, `handleFabSecondary()`, que delegan a `handleFabPrimaryMicro_/handleFabSecondaryMicro_` (Módulo 4) o `handleFabPrimaryMacro_` (Módulo 5) según `appState.currentView`.
11. `bootstrapEstado_`, listener `DOMContentLoaded` — **sin cambios** de lógica (siguen llamando `renderMicroView()` y `chequearCierreDia_()`, definidas en Módulo 4).

---

## 7. Módulo 4 — `js/view-micro.js`

**Sin cambios de cuerpo** (se mueven tal cual desde `app.js`): `calcularComposicion_`, `presupuestoParaFecha_`, `renderTransactionList_`, `setTxSubtype`, `handleBagCheckbox`, `resetTxForm_`, `resetCurrentTabOnly`, `prepararTxModalEdicion_`, `chequearCierreDia_`, `resolveDayChange`, `prepararHbModal_`, `recomputeHbModal_`, `renderHbModal_`, `saveHbAmount`, `handleLimpiarPendientes`, `procesarSiguienteCandidato_`, `resolverCandidatoLimpiar`, `triggerSyncReload`, `renderFutureDaysList_`.

**Cambios puntuales (solo en el punto de mostrar/ocultar, no en la lógica de negocio):**

| Función | Antes | Ahora |
|---|---|---|
| `toggleModal(show, id)` | `#tx-modal.classList.toggle('active', show)` | `setMicroTab(show ? 'form' : 'list')` (ver abajo) — sigue llamando `prepararTxModalEdicion_`/`resetTxForm_` igual que hoy |
| `handleFormSubmit()` | termina con `toggleModal(false)` | termina con `setMicroTab('list')` |
| `deleteCurrentEditingTransaction()` | ídem | ídem |
| `toggleHbModal(show)` | overlay | `show ? NavStack.push('hb-update') : NavStack.pop()` (llama `prepararHbModal_()` en el push, igual que hoy) |
| `openBudgetAuditModal(targetDay)` | abría overlay | se separa en `openAuditToday()`/`openAuditTomorrow()`, ambas fijan `auditTargetDay_` y hacen `NavStack.push('audit')`; el cuerpo de cálculo/HTML **no cambia** |
| `toggleFutureDaysModal(show)` | overlay | `NavStack.push('future-days')`/`pop()` |
| `mostrarModalCierreDia_(info)` | `.add('active')` | `NavStack.push('day-change')` (sin `pop`, decisión forzosa) |
| `procesarSiguienteCandidato_()` | `.add('active')` por candidato | `NavStack.push('limpiar-candidato')` por candidato; si la cola queda vacía, **no** pushea nada (igual que hoy no reabría nada) |
| `resolverCandidatoLimpiar(accion)` | `.remove('active')` | `NavStack.pop()` antes de llamar al backend, igual timing que hoy |

**Nuevo en este módulo:**

- `setMicroTab(tab)`: análogo a `setTxSubtype`, pinta clases `.seg-tab.active` en "Movimientos"/"Registrar" y muestra/oculta los dos bloques internos de `#screen-root-micro`. Reemplaza la apertura de `#tx-modal`.
- `renderDayChips_()`: construye la fila de chips (Mié/Jue/Vier…) a partir de `appState.diasRestantes` (+ hoy si no está incluido). Al tocar un chip: le pone `.selected`, y escribe la fecha ISO correspondiente en el input oculto `#tx-assigned-date` — **el resto de `handleFormSubmit` no se toca**, porque sigue leyendo `document.getElementById('tx-assigned-date').value` tal cual.
- `updateFabState_()` (mitad Diario) + `handleFabPrimaryMicro_()` + `handleFabSecondaryMicro_()` — implementan la tabla de §2.5.
- `registerScreenMeta(...)` para cada pantalla que este módulo posee (`hb-update`, `audit`, `future-days`, `day-change` con `allowBack:false`, `limpiar-candidato` con `allowBack:false`), llamado una vez al cargar el script.
- Render del bloque "Ajustes cuando venís de Diario": muestra swatches de acento + fila "Días Restantes →" (`NavStack.push('future-days')`).

---

## 8. Módulo 5 — `js/view-macro.js`

**Sin cambios de cuerpo:** `NOMBRES_MESES`, `recargarEstadoMensual_`, `changeMonth`, `renderMacroView`, `renderMacroIncomesList_`, `renderMacroExpensesList_`, `renderMacroServicesToggleList_`, `renderMacroDebtsList_`, `renderMacroFixedExpensesLists_`, los 4 `toggle*Collapse`, `toggleServicioStatus`, `toggleAllServicesCheckboxes`, `renderMacroConfigDraft_`, `renderMacroServicesConfigList_`, `handleValueSubmit`, `toggleServiceModalMode`, `updateServiceModalTotalFromUnits`, `handleServiceSubmit`, `deleteCurrentEditingService`, `toggleFixedMode`, `updateFixedTotalFromUnits`, `handleFixedExpenseSubmit`, `disableFixedExpenseThisMonth`, `enableFixedExpenseThisMonth`, `pauseFixedExpenseFuture`, `reactivateFixedExpenseFuture`, `deleteCurrentEditingFixedExpense`, `saveMacroConfig`.

**Cambios puntuales (mismo patrón que Módulo 4 — solo el show/hide):**

| Función | Antes | Ahora |
|---|---|---|
| `toggleMacroConfigModal(show)` | overlay | `NavStack.push('macro-config')`/`pop()` |
| `openValueEditModal(target)` / `toggleValueEditModal(show)` | overlay | `push('value-edit')`/`pop()` |
| `openServiceEditModal(id)` / `toggleServiceEditModal(show)` | overlay | `push('service-edit')`/`pop()` |
| `openFixedExpenseModal(user, id)` / `toggleFixedExpenseModal(show)` | overlay | `push('fixed-expense')`/`pop()` |
| `toggleQuickAddModal(show)` / `quickAddService` / `quickAddFixedExpense` | overlay | `push('quick-add')`/`pop()`; los dos "quick add" hacen `pop()` + `push('service-edit'|'fixed-expense')` en cadena, igual que hoy encadenan `toggleQuickAddModal(false)` + `open...Modal(...)` |
| `saveMacroConfig()` | terminaba con `.classList.remove('active')` | termina con `NavStack.pop()` |

**Nuevo en este módulo:**
- `handleFabPrimaryMacro_()` → `NavStack.push('quick-add')`.
- `registerScreenMeta(...)` para `macro-config`, `service-edit`, `fixed-expense`, `value-edit`, `quick-add`.
- Render del bloque "Ajustes cuando venís de Mensual": swatches de acento + fila "Sueldos y Servicios →" (`NavStack.push('macro-config')`).

---

## 9. Módulo 6 — `sw.js` y `manifest.json`

**`sw.js`** — mismo Cache-First, solo se actualiza la lista de archivos (los 3 JS nuevos reemplazan a `app.js`) y se sube la versión de caché para forzar actualización en dispositivos con la PWA ya instalada:

```js
const CACHE_NAME = 'multimillonarios-cache-v4'; // v3 -> v4
// addAll: './', './index.html', './js/state-api.js', './js/view-micro.js',
//         './js/view-macro.js', './styles.css', './manifest.json',
//         './icon-192.png', './icon-512.png'
```
El resto del archivo (install/activate/fetch, passthrough de `script.google.com`) **no cambia**.

**`manifest.json`** — recomendado (opcional, no bloqueante): `theme_color` → `#536460` para que la barra de estado del OS combine con el nuevo header oscuro cuando corresponda. `background_color` puede quedar como está. Íconos sin cambios.

---

## 10. Tabla maestra "cero pérdida de funcionalidad"

Todas las funciones de `app.js` original, una por una, con su destino:

| Función original | Nuevo archivo | ¿Cambia el cuerpo? |
|---|---|---|
| `callBackend`, `callBackendConSync`, `callBackendBackground` | state-api.js | No |
| `mostrarSyncToast_`, `ocultarSyncToast_` | state-api.js | No (solo CSS de posición) |
| `renderMoneyInput`, `getMoneyValue`, `setMoneyValue`, `attachMoneyInput` | state-api.js | No |
| `aBooleano_`, `normalizarFechas_`, `formatearMoneda_`, `formatearFechaISOLocal_`, `hoyISO_`, `sumarDiasLocal_`, `formatearFechaLegible_`, `capitalizeInput` | state-api.js | No |
| `handleOverlayClick` | — | **Se elimina** (ya no hay backdrop clickeable afuera) |
| `cargarUsuarioYColorLocal_` | state-api.js | No |
| `pintarBotonesUsuario_` | state-api.js | Sí — pinta avatares en vez de pill-buttons |
| `setActiveUser` | state-api.js | No |
| `setAccent` | state-api.js | No (cambia solo desde dónde se llama) |
| `switchView` | state-api.js | Sí — +toggle de tema, +`NavStack.reset()` |
| `handleDockAdd` | — | **Se elimina**, reemplazada por `handleFabPrimary()` |
| `calcularComposicion_`, `presupuestoParaFecha_` | view-micro.js | No |
| `renderMicroView` | view-micro.js | Sí — +`updateFabState_()` al final |
| `renderTransactionList_` | view-micro.js | Sí — el onclick de cada fila llama `setMicroTab('form')` en vez de `toggleModal(true,id)` |
| `toggleHbModal`, `prepararHbModal_`, `recomputeHbModal_`, `renderHbModal_` | view-micro.js | Solo el show/hide (tabla §7) |
| `saveHbAmount` | view-micro.js | No |
| `handleLimpiarPendientes`, `procesarSiguienteCandidato_`, `resolverCandidatoLimpiar` | view-micro.js | Solo el show/hide |
| `chequearCierreDia_`, `mostrarModalCierreDia_`, `resolveDayChange` | view-micro.js | Solo el show/hide en `mostrarModalCierreDia_` |
| `setTxSubtype`, `handleBagCheckbox` | view-micro.js | No |
| `resetTxForm_`, `resetCurrentTabOnly` | view-micro.js | No |
| `toggleModal`, `prepararTxModalEdicion_` | view-micro.js | `toggleModal` se convierte en `setMicroTab` (tabla §7); `prepararTxModalEdicion_` no cambia |
| `handleFormSubmit`, `deleteCurrentEditingTransaction` | view-micro.js | Solo la línea final (tabla §7) |
| `triggerSyncReload` | view-micro.js | No |
| `openBudgetAuditModal`, `toggleBudgetAuditModal` | view-micro.js | Se separa en `openAuditToday/Tomorrow` + push/pop (tabla §7) |
| `toggleFutureDaysModal`, `renderFutureDaysList_` | view-micro.js | Solo el show/hide |
| `recargarEstadoDiario_`, `bootstrapEstado_` | state-api.js | No |
| `NOMBRES_MESES`, `recargarEstadoMensual_`, `changeMonth` | view-macro.js | No |
| `renderMacroView` y las 5 funciones `renderMacro*List_` | view-macro.js | Sí — `renderMacroView` +`updateFabState_()` al final; el resto no cambia |
| 4× `toggle*Collapse` | view-macro.js | No |
| `toggleServicioStatus`, `toggleAllServicesCheckboxes` | view-macro.js | No |
| `toggleMacroConfigModal`, `renderMacroConfigDraft_`, `renderMacroServicesConfigList_` | view-macro.js | Solo el show/hide en el primero |
| `openValueEditModal`, `toggleValueEditModal`, `handleValueSubmit` | view-macro.js | Solo el show/hide |
| `openServiceEditModal`, `toggleServiceEditModal`, `toggleServiceModalMode`, `updateServiceModalTotalFromUnits`, `handleServiceSubmit`, `deleteCurrentEditingService` | view-macro.js | Solo el show/hide |
| `openFixedExpenseModal`, `toggleFixedExpenseModal`, `toggleFixedMode`, `updateFixedTotalFromUnits`, `handleFixedExpenseSubmit`, `disable/enable/pause/reactivateFixedExpense*`, `deleteCurrentEditingFixedExpense` | view-macro.js | Solo el show/hide |
| `saveMacroConfig` | view-macro.js | Solo la línea final |
| `toggleQuickAddModal`, `quickAddService`, `quickAddFixedExpense` | view-macro.js | Solo el show/hide |
| — (nueva) `NavStack`, `SCREEN_META`, `registerScreenMeta`, `updateHeaderChrome_`, `handleHeaderLeftClick`, `onHeaderTitleTap` | state-api.js | Nuevo |
| — (nueva) `updateFabState_`, `handleFabPrimary`, `handleFabSecondary` (dispatcher) | state-api.js | Nuevo |
| — (nueva) `handleFabPrimaryMicro_`, `handleFabSecondaryMicro_`, `setMicroTab`, `renderDayChips_` | view-micro.js | Nuevo |
| — (nueva) `handleFabPrimaryMacro_` | view-macro.js | Nuevo |
| — (nueva) `auditTargetDay_`, `openAuditToday`, `openAuditTomorrow` | view-micro.js | Nuevo (reemplaza el parámetro que recibía `openBudgetAuditModal`) |

**Total: 0 funciones de negocio perdidas.** Todo lo que cambia es *quién dispara el show/hide y sobre qué contenedor*, nunca el cálculo ni la llamada al backend.

---

## 11. Supuestos de diseño abiertos (a confirmar cuando se genere el código real)

1. **`switchView` con `NavStack` no vacío:** propongo que cambiar de raíz (Diario⇄Mensual) resetee el stack (se pierde cualquier pantalla hija abierta). Alternativa: bloquear el toggle de título mientras haya una pantalla del NavStack abierta (forzar volver antes de cambiar de raíz). Lo dejo como default lo primero por ser más simple; avisame si preferís lo segundo.
2. **Capa de acento (§1.1):** decisión mía, no preguntada explícitamente. Si preferís que el shell (header/tarjeta) también respete el color de acento del usuario en vez de quedar fijo en salvia, es un cambio menor (una variable CSS en vez de dos hardcodeadas) — se puede ajustar en la implementación de Módulo 2 sin tocar los demás módulos.
3. **`--shell-canvas` en Mensual (`#f1f3f6` en vez de blanco puro):** tus mocks muestran blanco puro porque esa pantalla está vacía; asumo que con los bento-cards reales conviene un matiz de fondo. Fácil de revertir a `#ffffff` si preferís fidelidad literal al mock.
4. **Ajustes contextual (§2.2):** asumí que "Días Restantes" y "Sueldos y Servicios" solo aparecen en Ajustes cuando corresponde a la raíz activa (para no abrir una pantalla clara sobre un shell oscuro o viceversa). Si preferís verlos siempre los dos juntos, es un cambio de una función, sin impacto arquitectónico.

---

## 12. Cómo usar este documento en próximos chats

Cada módulo (§4 a §9) es **autocontenido**: podés abrir un chat nuevo, pegar solo la sección de ese módulo + este resumen de tokens/contratos (§0-3) + el archivo original correspondiente de `app.js`/`index.html`, y pedir "generá el código completo de este módulo siguiendo el blueprint". El único acoplamiento entre módulos son los `id` del DOM (§4), los nombres de función del dispatcher (§3, §6) y el registro `SCREEN_META` (§2.3) — todos documentados arriba, así que ningún chat necesita "adivinar" cómo encajan las piezas.

Orden sugerido de generación: **Módulo 2 (tokens/CSS) → Módulo 1 (HTML/esqueleto) → Módulo 3 (estado/nav) → Módulo 4 → Módulo 5 → Módulo 6.**

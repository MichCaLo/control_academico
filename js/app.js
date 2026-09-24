/* =========================================================
   NÚCLEO DE LA APLICACIÓN: estado, utilidades, modales, rutas
   ========================================================= */
const NOTA_MINIMA = 70;           // Nota mínima de aprobación
const PARCIALES = [1, 2, 3, 4];   // 4 parciales al año
const COLORES_CLASE = ['#1e5aa8', '#15a06a', '#d4a72c', '#0a2463', '#7b5cd6', '#e0701f', '#0f9bb5', '#c2417a'];
const ESTADOS = {
  P: { txt: 'Presente', icon: 'fa-check', cls: 'p' },
  A: { txt: 'Ausente', icon: 'fa-xmark', cls: 'a' },
  E: { txt: 'Excusa', icon: 'fa-file-medical', cls: 'e' }
};

// Estado en memoria (reflejo de la base de datos)
const S = { cursos: [], clases: [], estudiantes: [], asistencia: [], actividades: [] };
// Preferencias de la interfaz (selecciones actuales)
const UI = { cursoFiltro: '', busqueda: '', claseAsis: '', fechaAsis: hoy(), claseNotas: '', parcial: 1 };

let charts = [];       // gráficos de la vista actual
let modalCharts = [];  // gráficos dentro de un modal

/* ---------- Utilidades ---------- */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function hoy() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function fechaLarga(iso) {
  if (!iso) return '';
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-HN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function fechaCorta(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
const redondear = n => Math.round(n * 10) / 10;
const fmt = n => (n === null || n === undefined) ? '—' : (Number.isInteger(n) ? String(n) : n.toFixed(1));

function byId(col, id) { return S[col].find(x => x.id === id); }
function nombreEst(e) { return e ? `${e.nombres} ${e.apellidos}`.trim() : ''; }
function iniciales(e) {
  const a = (e?.nombres || '?').trim()[0] || '';
  const b = (e?.apellidos || '').trim()[0] || '';
  return (a + b).toUpperCase();
}
function cursoLabel(c) { return c ? `${c.nombre} · Sección ${c.seccion}` : 'Sin curso'; }
const ORDEN_GENERO = { F: 0, M: 1 };
function grupoGenero(e) { return ORDEN_GENERO[e?.genero] ?? 2; }
// Orden de las listas: primero estudiantes femeninas, luego masculinos (y al final sin género).
// Dentro de cada grupo, orden alfabético por nombres y luego apellidos.
function cmpEst(a, b) {
  return grupoGenero(a) - grupoGenero(b) ||
    (a.nombres || '').localeCompare(b.nombres || '', 'es', { sensitivity: 'base' }) ||
    (a.apellidos || '').localeCompare(b.apellidos || '', 'es', { sensitivity: 'base' });
}
const TITULO_GRUPO = ['Estudiantes femeninas', 'Estudiantes masculinos', 'Sin género registrado'];
const ICONO_GRUPO = ['fa-venus', 'fa-mars', 'fa-circle-question'];
function separadorGenero(lista, i, cls = 'f m n') {
  const g = grupoGenero(lista[i]);
  if (i > 0 && grupoGenero(lista[i - 1]) === g) return '';
  const n = lista.filter(x => grupoGenero(x) === g).length;
  return { g, n, titulo: TITULO_GRUPO[g], icono: ICONO_GRUPO[g], cls: ['f', 'm', 'n'][g] };
}
function cursosOrdenados() {
  return [...S.cursos].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true }) || String(a.seccion).localeCompare(String(b.seccion)));
}
function clasesOrdenadas() {
  const orden = cursosOrdenados().map(c => c.id);
  return [...S.clases].sort((a, b) => orden.indexOf(a.cursoId) - orden.indexOf(b.cursoId) || a.nombre.localeCompare(b.nombre, 'es'));
}
function estudiantesDe(cursoId) { return S.estudiantes.filter(e => e.cursoId === cursoId).sort(cmpEst); }
function clasesDe(cursoId) { return S.clases.filter(c => c.cursoId === cursoId).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')); }

function opcionesCursos(sel, conTodos = false) {
  return (conTodos ? `<option value="">Todos los cursos</option>` : '') +
    cursosOrdenados().map(c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${esc(cursoLabel(c))}</option>`).join('');
}
function opcionesClases(sel) {
  return cursosOrdenados().map(c => {
    const cls = clasesDe(c.id);
    if (!cls.length) return '';
    return `<optgroup label="${esc(cursoLabel(c))}">` +
      cls.map(k => `<option value="${k.id}" ${k.id === sel ? 'selected' : ''}>${esc(k.nombre)} — ${esc(c.nombre)} ${esc(c.seccion)}</option>`).join('') +
      `</optgroup>`;
  }).join('');
}

/* ---------- Estadísticas ---------- */
function statsEstudiante(estId, claseId = null) {
  let p = 0, a = 0, e = 0;
  S.asistencia.forEach(r => {
    if (claseId && r.claseId !== claseId) return;
    const reg = r.registros?.[estId];
    if (!reg) return;
    if (reg.estado === 'P') p++; else if (reg.estado === 'A') a++; else if (reg.estado === 'E') e++;
  });
  const t = p + a + e;
  return { p, a, e, t, pct: t ? Math.round(p * 100 / t) : null };
}
function actividadesDe(claseId, parcial) {
  return S.actividades
    .filter(a => a.claseId === claseId && Number(a.parcial) === Number(parcial))
    .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '') || a.nombre.localeCompare(b.nombre, 'es'));
}
function totalParcial(estId, claseId, parcial) {
  const acts = actividadesDe(claseId, parcial);
  if (!acts.length) return null;
  return redondear(acts.reduce((s, a) => s + (Number(a.notas?.[estId]) || 0), 0));
}
function promedioClase(estId, claseId) {
  const ps = PARCIALES.map(p => totalParcial(estId, claseId, p));
  const ev = ps.filter(x => x !== null);
  return {
    ps,
    prom: ev.length ? redondear(ev.reduce((a, b) => a + b, 0) / ev.length) : null,
    evaluados: ev.length
  };
}
function claseNota(n) {
  if (n === null || n === undefined) return '';
  return n >= NOTA_MINIMA ? 'nota-ok' : 'nota-bad';
}

/* ---------- Persistencia (DB + memoria) ---------- */
async function guardar(col, obj) {
  const { id, ...datos } = obj;
  Object.keys(datos).forEach(k => datos[k] === undefined && delete datos[k]);
  if (id) {
    await DB.establecer(col, id, datos);
    const i = S[col].findIndex(x => x.id === id);
    const nuevo = { id, ...datos };
    if (i >= 0) S[col][i] = nuevo; else S[col].push(nuevo);
    return id;
  }
  const nid = await DB.agregar(col, datos);
  S[col].push({ id: nid, ...datos });
  return nid;
}
async function borrar(col, id) {
  await DB.eliminar(col, id);
  S[col] = S[col].filter(x => x.id !== id);
}
async function conCarga(boton, fn) {
  const txt = boton ? boton.innerHTML : '';
  if (boton) { boton.disabled = true; boton.innerHTML = `<span class="spinner sm"></span> Guardando…`; }
  try {
    return await fn();
  } catch (err) {
    console.error(err);
    toast('Ocurrió un error: ' + (err.message || err), 'error');
  } finally {
    if (boton && document.body.contains(boton)) { boton.disabled = false; boton.innerHTML = txt; }
  }
}

/* ---------- Toasts ---------- */
function toast(msg, tipo = 'ok') {
  const icon = { ok: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info', warn: 'fa-triangle-exclamation' }[tipo];
  const t = document.createElement('div');
  t.className = `toast toast-${tipo}`;
  t.innerHTML = `<i class="fa-solid ${icon}"></i><span>${esc(msg)}</span>`;
  $('#toast-root').appendChild(t);
  setTimeout(() => t.classList.add('out'), 3000);
  setTimeout(() => t.remove(), 3400);
}

/* ---------- Modales ---------- */
function abrirModal({ titulo, cuerpo, pie = '', tam = '' }) {
  cerrarModal();
  const root = $('#modal-root');
  root.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal ${tam}" role="dialog" aria-modal="true">
        <div class="modal-head">
          <h3>${titulo}</h3>
          <button class="icon-btn" data-close title="Cerrar"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body">${cuerpo}</div>
        ${pie ? `<div class="modal-foot">${pie}</div>` : ''}
      </div>
    </div>`;
  const modal = $('.modal', root);
  $$('[data-close]', root).forEach(b => b.onclick = cerrarModal);
  $('.modal-backdrop', root).addEventListener('mousedown', e => {
    if (e.target.classList.contains('modal-backdrop')) cerrarModal();
  });
  document.body.classList.add('no-scroll');
  setTimeout(() => { const f = $('input:not([type=hidden]), select, textarea', modal); if (f && window.innerWidth > 700) f.focus(); }, 50);
  return modal;
}
function cerrarModal() {
  modalCharts.forEach(c => c.destroy());
  modalCharts = [];
  $('#modal-root').innerHTML = '';
  document.body.classList.remove('no-scroll');
}
function confirmar(mensaje, { titulo = 'Confirmar acción', boton = 'Eliminar', peligro = true } = {}) {
  return new Promise(res => {
    const m = abrirModal({
      titulo,
      cuerpo: `<div class="confirm"><div class="confirm-icon ${peligro ? 'danger' : ''}"><i class="fa-solid ${peligro ? 'fa-trash-can' : 'fa-circle-question'}"></i></div><p>${mensaje}</p></div>`,
      pie: `<button class="btn btn-light" data-no>Cancelar</button><button class="btn ${peligro ? 'btn-danger' : 'btn-primary'}" data-si>${boton}</button>`
    });
    $('[data-no]', m).onclick = () => { cerrarModal(); res(false); };
    $('[data-si]', m).onclick = () => { cerrarModal(); res(true); };
    $('[data-close]', m).onclick = () => { cerrarModal(); res(false); };
  });
}
function leerForm(form) {
  const o = {};
  new FormData(form).forEach((v, k) => { o[k] = typeof v === 'string' ? v.trim() : v; });
  return o;
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#modal-root').innerHTML) cerrarModal(); });

/* ---------- Componentes comunes ---------- */
function estadoVacio({ icon = 'fa-folder-open', titulo, texto = '', boton = '', accion = '' }) {
  return `<div class="empty">
    <div class="empty-icon"><i class="fa-solid ${icon}"></i></div>
    <h3>${titulo}</h3>
    ${texto ? `<p>${texto}</p>` : ''}
    ${boton ? `<button class="btn btn-primary" data-go="${accion}">${boton}</button>` : ''}
  </div>`;
}
function tarjetaStat(icon, etiqueta, valor, color, extra = '') {
  return `<div class="stat-card ${color}">
    <div class="stat-icon"><i class="fa-solid ${icon}"></i></div>
    <div><p>${etiqueta}</p><strong>${valor}</strong>${extra ? `<small>${extra}</small>` : ''}</div>
  </div>`;
}
function chipGenero(e) {
  if (e?.genero === 'M') return `<span class="genero-chip m"><i class="fa-solid fa-mars"></i> Masculino</span>`;
  if (e?.genero === 'F') return `<span class="genero-chip f"><i class="fa-solid fa-venus"></i> Femenino</span>`;
  return `<span class="genero-chip n"><i class="fa-solid fa-circle-question"></i> Sin género</span>`;
}
function avatar(e, tam = '') {
  const g = e?.genero === 'F' ? 'f' : 'm';
  return `<span class="avatar ${g} ${tam}">${esc(iniciales(e))}</span>`;
}

/* ---------- Rutas / vistas ---------- */
const VISTAS = {
  inicio: { titulo: 'Inicio', render: el => vistaInicio(el) },
  cursos: { titulo: 'Cursos y clases', render: el => vistaCursos(el) },
  estudiantes: { titulo: 'Estudiantes', render: el => vistaEstudiantes(el) },
  asistencia: { titulo: 'Control de asistencia', render: el => vistaAsistencia(el) },
  notas: { titulo: 'Control de notas', render: el => vistaNotas(el) }
};

function ir(vista) {
  if (location.hash !== '#' + vista) location.hash = vista;
  else render();
}
function render() {
  const nombre = location.hash.slice(1) || 'inicio';
  const vista = VISTAS[nombre] || VISTAS.inicio;
  charts.forEach(c => c.destroy());
  charts = [];
  $('#page-title').textContent = vista.titulo;
  $$('[data-view]').forEach(a => a.classList.toggle('active', a.dataset.view === nombre));
  // Se reemplaza el contenedor para no acumular escuchadores de eventos
  const viejo = $('#view');
  const cont = document.createElement('section');
  cont.id = 'view';
  cont.className = 'view fade-in';
  viejo.replaceWith(cont);
  vista.render(cont);
  window.scrollTo({ top: 0 });
}
// Navegación con botones data-go
document.addEventListener('click', e => {
  const b = e.target.closest('[data-go]');
  if (b && b.dataset.go) { cerrarModal(); ir(b.dataset.go); }
});

function nuevoGrafico(canvas, config, enModal = false) {
  if (typeof Chart === 'undefined' || !canvas) return null;
  Chart.defaults.font.family = "'Poppins', system-ui, sans-serif";
  Chart.defaults.color = '#6a7a93';
  const g = new Chart(canvas, config);
  (enModal ? modalCharts : charts).push(g);
  return g;
}

/* ---------- Arranque ---------- */
function pintarModo() {
  const fb = DB.modo === 'firebase';
  const intentoFallido = !fb && DB.motivoLocal && DB.motivoLocal !== 'config-sin-datos';
  const clase = fb ? 'firebase' : intentoFallido ? 'error' : 'local';
  const html = fb ? `<span class="dot"></span> Firebase conectado`
    : intentoFallido ? `<span class="dot"></span> Firebase sin conectar · modo local`
    : `<span class="dot"></span> Modo demo (local)`;
  const badge = $('#mode-badge');
  badge.className = 'mode-badge clickable ' + clase;
  badge.innerHTML = html + ` <i class="fa-solid fa-circle-info"></i>`;
  badge.title = 'Ver estado de la conexión con Firebase';
  badge.onclick = abrirDiagnostico;
  $('#mode-side').innerHTML = `<button class="mode-badge clickable ${clase}" id="mode-side-btn">${html}</button>`;
  $('#mode-side-btn').onclick = abrirDiagnostico;
  $('#page-date').textContent = fechaLarga(hoy());
  $('#anio-side').textContent = new Date().getFullYear();
}

/* ---------- Diagnóstico de conexión con Firebase ---------- */
function explicarErrorFirebase(err) {
  const code = String(err?.code || '');
  const msg = String(err?.message || err || '');
  if (code.includes('permission-denied') || /permission/i.test(msg))
    return 'Firestore rechazó el acceso: las <strong>reglas</strong> no permiten leer/escribir. Vaya a Firestore → Reglas, pegue las reglas del README y presione <strong>Publicar</strong>.';
  if (code.includes('not-found') || /does not exist|NOT_FOUND/i.test(msg))
    return 'La base de datos <strong>Firestore no está creada</strong> en ese proyecto. Vaya a Compilación → Firestore Database → <strong>Crear base de datos</strong>.';
  if (/api key not valid|API_KEY_INVALID|invalid-api-key/i.test(msg))
    return 'La <strong>apiKey</strong> no es válida. Cópiela de nuevo desde Configuración del proyecto → Tus apps.';
  if (code.includes('failed-precondition') || /Cloud Firestore API has not been used|disabled/i.test(msg))
    return 'La API de Firestore no está activada o la base aún se está creando. Espere unos minutos y recargue.';
  if (code.includes('unavailable') || code === 'timeout')
    return 'No hubo respuesta de Firebase. Revise su conexión a internet, que el <strong>projectId</strong> sea correcto y que la base de datos Firestore esté creada.';
  return 'Error: ' + esc(msg);
}

function abrirDiagnostico() {
  const r = DB.revisarConfig();
  const fb = DB.modo === 'firebase';
  const item = (ok, titulo, detalle = '') => `
    <li class="diag-item ${ok === true ? 'ok' : ok === false ? 'bad' : 'warn'}">
      <span class="diag-icon"><i class="fa-solid ${ok === true ? 'fa-circle-check' : ok === false ? 'fa-circle-xmark' : 'fa-triangle-exclamation'}"></i></span>
      <div><strong>${titulo}</strong>${detalle ? `<p>${detalle}</p>` : ''}</div>
    </li>`;

  let pasos = '';
  if (r.fuente === 'navegador') pasos += item(true, 'Configuración de Firebase',
    `Se usa la configuración que pegó en este panel (guardada en este navegador). Proyecto: <code>${esc(r.cfg.projectId)}</code>.
     <br><button class="btn btn-light btn-sm diag-mini" id="diag-descargar"><i class="fa-solid fa-download"></i> Descargar firebase-config.js corregido</button>
     <button class="btn btn-light btn-sm diag-mini danger-text" id="diag-olvidar"><i class="fa-solid fa-eraser"></i> Borrar esta configuración</button>`);
  else pasos += item(!r.errCfg && !!r.cfg, 'Archivo js/firebase-config.js',
    r.errCfg ? `El archivo tiene un <strong>error de escritura</strong> y el navegador no lo pudo leer${r.errCfg.msg && !/^Script error/i.test(r.errCfg.msg) ? `:<br><code>${esc(r.errCfg.msg)}${r.errCfg.linea ? ' (línea ' + r.errCfg.linea + ')' : ''}</code>` : '.'}<br>
      Causa más común: se copiaron las líneas <code>import { initializeApp } …</code> o <code>const app = initializeApp(…)</code>, o quedó <code>const firebaseConfig</code> escrito <strong>dos veces</strong>. El archivo debe tener solo el bloque de abajo.`
    : !r.cfg ? `El navegador <strong>no pudo leer</strong> la configuración. Casi siempre es porque el archivo tiene un error de escritura:
      <br>• Se copiaron las líneas <code>import { initializeApp } …</code> o <code>const app = initializeApp(…)</code> desde Firebase.
      <br>• Quedó <code>const firebaseConfig</code> escrito <strong>dos veces</strong> (el original y el pegado).
      <br>• Falta una coma, comilla o llave <code>}</code>.
      <br>También puede ser que el archivo no esté dentro de la carpeta <code>js</code>. Reemplace <strong>todo</strong> el contenido del archivo por el bloque de abajo con sus datos.`
    : 'Se cargó correctamente.');
  if (r.cfg) {
    pasos += item(r.apiOk, 'apiKey', r.apiOk ? `<code>${esc(String(r.cfg.apiKey).slice(0, 8))}…</code>` : 'Todavía dice <code>TU_API_KEY</code> (o está vacía). Reemplácela por su clave real.');
    pasos += item(r.proyectoOk, 'projectId', r.proyectoOk ? `<code>${esc(r.cfg.projectId)}</code>` : 'Todavía dice <code>TU_PROYECTO</code> (o está vacío).');
  }
  pasos += item(r.sdkOk, 'Librería de Firebase (internet)', r.sdkOk ? 'Cargada.' : 'No se pudo descargar la librería de Firebase. Revise su conexión a internet.');
  pasos += item(fb ? true : (DB.motivoLocal === 'conexion' ? false : null), 'Conexión con Cloud Firestore',
    fb ? '¡Conectado! Los datos se guardan en Firebase.' : DB.motivoLocal === 'conexion' ? explicarErrorFirebase(DB.errorConexion) : 'Pendiente: primero corrija los puntos anteriores.');
  if (r.esArchivo) pasos += item(null, 'Abierto como archivo local',
    'La página se abrió con doble clic (<code>file://</code>). Funciona, pero si modificó <code>firebase-config.js</code> asegúrese de estar abriendo el <strong>mismo</strong> <code>index.html</code> de esa carpeta (no una copia anterior ni el ZIP) y recargue con <strong>Ctrl + F5</strong>.');

  const ejemplo = `const firebaseConfig = {
  apiKey: "AIzaSy...su-clave...",
  authDomain: "su-proyecto.firebaseapp.com",
  projectId: "su-proyecto",
  storageBucket: "su-proyecto.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456"
};`;

  const puedeMigrar = fb && DB.hayDatosLocales();
  const m = abrirModal({
    titulo: '<i class="fa-solid fa-plug-circle-check"></i> Estado de la conexión',
    tam: 'lg',
    cuerpo: `
      <div class="diag-estado ${fb ? 'ok' : 'bad'}">
        <i class="fa-solid ${fb ? 'fa-cloud' : 'fa-cloud-arrow-down'}"></i>
        <div><strong>${fb ? 'Conectado a Firebase' : 'Usando modo local (los datos NO se guardan en Firebase)'}</strong>
        <p>${fb ? 'Proyecto: ' + esc(r.cfg.projectId) : 'Revise los puntos marcados en rojo.'}</p></div>
      </div>
      <ul class="diag-list">${pasos}</ul>
      ${fb ? '' : `
      <div class="pegar-config">
        <h4 class="card-title"><i class="fa-solid fa-paste"></i> Conectar pegando la configuración aquí (más fácil)</h4>
        <p class="small muted">En Firebase: ⚙ <strong>Configuración del proyecto → Tus apps → app Web</strong>. Copie <strong>todo</strong> el bloque que aparece (puede incluir las líneas <code>import</code>, no importa) y péguelo aquí:</p>
        <textarea id="diag-pegar" rows="7" spellcheck="false" placeholder='const firebaseConfig = {\n  apiKey: "AIzaSy...",\n  authDomain: "...",\n  projectId: "...",\n  ...\n};'></textarea>
        <div id="diag-pegar-res"></div>
        <button class="btn btn-green" id="diag-conectar"><i class="fa-solid fa-plug"></i> Guardar y conectar</button>
      </div>`}
      ${puedeMigrar ? `
      <div class="migrar">
        <div><strong><i class="fa-solid fa-cloud-arrow-up"></i> Subir los datos del modo local</strong>
        <p>Este navegador tiene datos guardados del modo local (incluye los datos de ejemplo). Puede copiarlos a Firebase y luego borrar lo que no necesite.</p></div>
        <button class="btn btn-gold" id="diag-migrar"><i class="fa-solid fa-upload"></i> Subir a Firebase</button>
      </div>` : ''}`,
    pie: `<button class="btn btn-light" data-close>Cerrar</button><button class="btn btn-primary" id="diag-recargar"><i class="fa-solid fa-rotate"></i> Recargar página</button>`
  });
  $$('[data-close]', m).forEach(b => b.onclick = cerrarModal);
  { const pc = $('.pegar-config', m); if (pc) $('.diag-list', m).before(pc); }
  $('#diag-recargar', m).onclick = () => location.reload();
  const txt = $('#diag-pegar', m);
  if (txt) {
    const vista = () => {
      const c = DB.extraerConfig(txt.value);
      const campos = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
      $('#diag-pegar-res', m).innerHTML = txt.value.trim() ? `<div class="pegar-res">${campos.map(k =>
        `<span class="${c[k] ? 'ok' : (k === 'apiKey' || k === 'projectId') ? 'bad' : 'opt'}"><i class="fa-solid ${c[k] ? 'fa-check' : 'fa-xmark'}"></i> ${k}</span>`).join('')}</div>` : '';
    };
    txt.addEventListener('input', vista);
    $('#diag-conectar', m).onclick = () => {
      const c = DB.extraerConfig(txt.value);
      if (!c.apiKey || !c.projectId) { toast('No encontré apiKey y projectId en lo que pegó. Copie el bloque completo de Firebase.', 'error'); return; }
      if (c.apiKey.startsWith('TU_') || c.projectId.startsWith('TU_')) { toast('Esos son los datos de ejemplo. Pegue los de su proyecto.', 'error'); return; }
      DB.guardarConfig(c);
      toast('Configuración guardada. Conectando…');
      setTimeout(() => location.reload(), 700);
    };
  }
  const bd = $('#diag-descargar', m);
  if (bd) bd.onclick = () => {
    const c = r.cfg;
    const cuerpo = Object.entries(c).map(([k, v]) => `  ${k}: ${JSON.stringify(v)}`).join(',\n');
    const contenido = `/* Configuración de Firebase – EduAsistencia */\nconst firebaseConfig = {\n${cuerpo}\n};\n`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([contenido], { type: 'text/javascript' }));
    a.download = 'firebase-config.js';
    a.click();
  };
  const bo = $('#diag-olvidar', m);
  if (bo) bo.onclick = () => { DB.borrarConfig(); location.reload(); };
  const bm = $('#diag-migrar', m);
  if (bm) bm.onclick = async () => {
    const ok = await confirmar('Se copiarán a Firebase todos los cursos, clases, estudiantes, asistencias y notas del modo local de este navegador. ¿Continuar?', { titulo: 'Subir datos', boton: 'Subir', peligro: false });
    if (!ok) return;
    await conCarga(null, async () => {
      toast('Subiendo datos…', 'info');
      const n = await DB.subirLocalAFirebase();
      const datos = await Promise.all(COLECCIONES.map(c => DB.obtenerTodos(c)));
      COLECCIONES.forEach((c, i) => { S[c] = datos[i]; });
      toast(`${n} registros subidos a Firebase`);
      render();
    });
  };
}

async function iniciarApp() {
  try {
    await DB.init();
    const datos = await Promise.all(COLECCIONES.map(c => DB.obtenerTodos(c)));
    COLECCIONES.forEach((c, i) => { S[c] = datos[i]; });
  } catch (err) {
    console.error(err);
    $('#loader-msg').innerHTML = `<strong>No se pudo conectar con la base de datos.</strong><br>${esc(err.message || err)}<br><small>Revise js/firebase-config.js y las reglas de Firestore.</small>`;
    $('.spinner', $('#loader')).style.display = 'none';
    return;
  }
  pintarModo();
  if (DB.modo === 'local' && DB.motivoLocal && DB.motivoLocal !== 'config-sin-datos') {
    setTimeout(() => toast('No se pudo conectar con Firebase. Toque el aviso de arriba para ver la causa.', 'error'), 600);
  }
  window.addEventListener('hashchange', render);
  render();
  $('#loader').classList.add('hide');
  setTimeout(() => $('#loader').remove(), 500);
}

/* =========================================================
   CONTROL DE ASISTENCIA
   Fecha automática (hoy) editable por el docente.
   Documento por clase y fecha: asistencia/{claseId}_{fecha}
   ========================================================= */
function vistaAsistencia(el) {
  const clases = clasesOrdenadas();
  if (!clases.length) {
    el.innerHTML = estadoVacio({ icon: 'fa-clipboard-check', titulo: 'No hay clases registradas', texto: 'Cree un curso y agregue sus clases para tomar asistencia.', boton: 'Ir a cursos', accion: 'cursos' });
    return;
  }
  if (!UI.claseAsis || !byId('clases', UI.claseAsis)) UI.claseAsis = clases[0].id;
  if (!UI.fechaAsis) UI.fechaAsis = hoy();

  const clase = byId('clases', UI.claseAsis);
  const curso = byId('cursos', clase.cursoId);
  const ests = estudiantesDe(clase.cursoId);
  const docId = `${clase.id}_${UI.fechaAsis}`;
  const existente = byId('asistencia', docId);
  const diaSemana = new Date(UI.fechaAsis + 'T00:00:00').getDay();

  // Borrador editable en memoria
  const draft = {};
  ests.forEach(e => {
    const r = existente?.registros?.[e.id];
    draft[e.id] = { estado: r?.estado || 'P', obs: r?.obs || '' };
  });

  el.innerHTML = `
    <div class="card asis-top" style="--c:${esc(clase.color || '#1e5aa8')}">
      <div class="toolbar flat">
        <label class="field grow"><span>Clase</span><select id="as-clase">${opcionesClases(UI.claseAsis)}</select></label>
        <label class="field"><span>Fecha de asistencia</span>
          <div class="date-row">
            <input type="date" id="as-fecha" value="${UI.fechaAsis}" max="${hoy()}">
            <button class="btn btn-light" id="as-hoy" title="Volver a la fecha de hoy"><i class="fa-solid fa-calendar-day"></i> Hoy</button>
          </div></label>
      </div>
      <div class="asis-info">
        <div class="asis-title">
          <span class="class-icon"><i class="fa-solid fa-book-open"></i></span>
          <div>
            <h3>${esc(clase.nombre)}</h3>
            <p>${esc(cursoLabel(curso))} · <span class="cap">${fechaLarga(UI.fechaAsis)}</span></p>
          </div>
        </div>
        <span class="chip ${existente ? 'chip-green' : 'chip-gold'}">
          <i class="fa-solid ${existente ? 'fa-pen-to-square' : 'fa-star'}"></i> ${existente ? 'Registro guardado · editando' : 'Nuevo registro'}
        </span>
      </div>
      ${diaSemana === 0 || diaSemana === 6 ? `<p class="alert warn"><i class="fa-solid fa-triangle-exclamation"></i> La fecha seleccionada es fin de semana.</p>` : ''}
    </div>

    ${ests.length ? `
    <div class="counter-row" id="as-contadores"></div>

    <div class="bulk">
      <span class="muted small">Marcar a todos como:</span>
      <button class="btn btn-sm btn-soft-green" data-todos="P"><i class="fa-solid fa-check-double"></i> Presentes</button>
      <button class="btn btn-sm btn-soft-red" data-todos="A"><i class="fa-solid fa-xmark"></i> Ausentes</button>
    </div>

    <div class="asis-list" id="as-lista">
      ${ests.map((e, i) => {
        const sep = separadorGenero(ests, i);
        const cab = sep ? `<div class="grupo-sep ${sep.cls}"><i class="fa-solid ${sep.icono}"></i> ${sep.titulo} <span>${sep.n}</span></div>` : '';
        const d = draft[e.id];
        const s = statsEstudiante(e.id, clase.id);
        return `${cab}
        <div class="asis-row estado-${d.estado}" data-id="${e.id}">
          <div class="asis-student">
            <span class="num">${i + 1}</span>
            ${avatar(e)}
            <div class="asis-name"><strong>${esc(nombreEst(e))}</strong>
              <div class="asis-sub">${chipGenero(e)}</div>
              <small>${s.pct === null ? 'Sin registros previos' : `Asistencia ${s.pct}% · ${s.a} faltas · ${s.e} excusas`}</small></div>
          </div>
          <div class="estado-group" role="radiogroup">
            ${Object.entries(ESTADOS).map(([k, v]) => `
              <button type="button" class="estado-btn ${v.cls} ${d.estado === k ? 'on' : ''}" data-estado="${k}" aria-pressed="${d.estado === k}">
                <i class="fa-solid ${v.icon}"></i><span>${v.txt}</span></button>`).join('')}
          </div>
          <div class="obs-wrap">
            <i class="fa-regular fa-comment"></i>
            <input class="obs-input" data-obs placeholder="Comentario u observación…" value="${esc(d.obs)}" maxlength="250">
          </div>
          <button class="icon-btn info" data-cal title="Ver calendario del estudiante"><i class="fa-solid fa-calendar-days"></i></button>
        </div>`;
      }).join('')}
    </div>

    <div class="sticky-save">
      ${existente ? `<button class="btn btn-light danger-text" id="as-borrar"><i class="fa-solid fa-trash"></i> <span class="hide-sm">Eliminar registro</span></button>` : '<span></span>'}
      <button class="btn btn-green btn-lg" id="as-guardar"><i class="fa-solid fa-floppy-disk"></i> Guardar asistencia</button>
    </div>` :
    estadoVacio({ icon: 'fa-user-plus', titulo: 'Este curso no tiene estudiantes', texto: `Agregue estudiantes a ${esc(cursoLabel(curso))} para tomar asistencia.`, boton: 'Agregar estudiantes', accion: 'estudiantes' })}
  `;

  const contar = () => {
    const c = { P: 0, A: 0, E: 0 };
    Object.values(draft).forEach(d => c[d.estado]++);
    const box = $('#as-contadores', el);
    if (box) box.innerHTML =
      tarjetaStat('fa-users', 'Total', ests.length, 'blue') +
      tarjetaStat('fa-circle-check', 'Presentes', c.P, 'green') +
      tarjetaStat('fa-circle-xmark', 'Ausentes', c.A, 'red') +
      tarjetaStat('fa-file-medical', 'Con excusa', c.E, 'yellow');
  };
  const marcar = (fila, estado) => {
    draft[fila.dataset.id].estado = estado;
    fila.className = `asis-row estado-${estado}`;
    $$('.estado-btn', fila).forEach(b => { const on = b.dataset.estado === estado; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  };
  contar();

  $('#as-clase', el).onchange = e => { UI.claseAsis = e.target.value; render(); };
  $('#as-fecha', el).onchange = e => { if (e.target.value) { UI.fechaAsis = e.target.value; render(); } };
  $('#as-hoy', el).onclick = () => { UI.fechaAsis = hoy(); render(); };

  if (!ests.length) return;

  $('#as-lista', el).addEventListener('click', e => {
    const fila = e.target.closest('.asis-row');
    if (!fila) return;
    const b = e.target.closest('.estado-btn');
    if (b) { marcar(fila, b.dataset.estado); contar(); return; }
    if (e.target.closest('[data-cal]')) abrirFicha(fila.dataset.id, clase.id);
  });
  $('#as-lista', el).addEventListener('input', e => {
    if (e.target.matches('[data-obs]')) draft[e.target.closest('.asis-row').dataset.id].obs = e.target.value.trim();
  });
  $$('[data-todos]', el).forEach(b => b.onclick = () => {
    $$('.asis-row', el).forEach(f => marcar(f, b.dataset.todos));
    contar();
  });

  $('#as-guardar', el).onclick = async e => {
    await conCarga(e.currentTarget, async () => {
      await guardar('asistencia', {
        id: docId, claseId: clase.id, cursoId: clase.cursoId, fecha: UI.fechaAsis,
        registros: JSON.parse(JSON.stringify(draft)), actualizado: new Date().toISOString()
      });
      toast(`Asistencia del ${fechaCorta(UI.fechaAsis)} guardada`);
      render();
    });
  };
  const bb = $('#as-borrar', el);
  if (bb) bb.onclick = async () => {
    const ok = await confirmar(`¿Eliminar el registro de asistencia de <strong>${esc(clase.nombre)}</strong> del <strong>${fechaCorta(UI.fechaAsis)}</strong>?`);
    if (ok) await conCarga(null, async () => { await borrar('asistencia', docId); toast('Registro eliminado'); render(); });
  };
}

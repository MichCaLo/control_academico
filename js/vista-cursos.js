/* =========================================================
   CURSOS Y CLASES (agregar, editar, eliminar)
   ========================================================= */
function vistaCursos(el) {
  const cursos = cursosOrdenados();
  el.innerHTML = `
    <div class="page-actions">
      <p class="page-desc">Organice sus cursos por grado y sección, y agregue las clases que imparte en cada uno.</p>
      <button class="btn btn-primary" id="nuevo-curso"><i class="fa-solid fa-plus"></i> Nuevo curso</button>
    </div>
    ${cursos.length ? `<div class="course-grid">${cursos.map(tarjetaCurso).join('')}</div>` :
      estadoVacio({ icon: 'fa-layer-group', titulo: 'No hay cursos registrados', texto: 'Comience creando su primer curso, por ejemplo "Décimo Grado", Sección "A".' })}
  `;

  $('#nuevo-curso', el).onclick = () => formCurso();
  el.addEventListener('click', async e => {
    const b = e.target.closest('button');
    if (!b) return;
    const { accion, id } = b.dataset;
    if (accion === 'editar-curso') formCurso(byId('cursos', id));
    if (accion === 'eliminar-curso') eliminarCurso(id);
    if (accion === 'nueva-clase') formClase(null, id);
    if (accion === 'editar-clase') formClase(byId('clases', id));
    if (accion === 'eliminar-clase') eliminarClase(id);
    if (accion === 'ver-estudiantes') { UI.cursoFiltro = id; UI.busqueda = ''; ir('estudiantes'); }
    if (accion === 'asis-clase') { UI.claseAsis = id; UI.fechaAsis = hoy(); ir('asistencia'); }
  });
}

function tarjetaCurso(c) {
  const clases = clasesDe(c.id);
  const n = estudiantesDe(c.id).length;
  return `
    <article class="course-card">
      <header class="course-head">
        <div>
          <h3>${esc(c.nombre)}</h3>
          <div class="course-tags">
            <span class="chip chip-gold"><i class="fa-solid fa-bookmark"></i> Sección ${esc(c.seccion)}</span>
            ${c.jornada ? `<span class="chip chip-blue"><i class="fa-regular fa-sun"></i> ${esc(c.jornada)}</span>` : ''}
            ${c.anio ? `<span class="chip chip-light">${esc(c.anio)}</span>` : ''}
          </div>
        </div>
        <div class="row-actions">
          <button class="icon-btn" data-accion="editar-curso" data-id="${c.id}" title="Editar curso"><i class="fa-solid fa-pen"></i></button>
          <button class="icon-btn danger" data-accion="eliminar-curso" data-id="${c.id}" title="Eliminar curso"><i class="fa-solid fa-trash"></i></button>
        </div>
      </header>
      <button class="course-students" data-accion="ver-estudiantes" data-id="${c.id}">
        <i class="fa-solid fa-user-graduate"></i> ${n} estudiante${n === 1 ? '' : 's'} <span>Ver lista <i class="fa-solid fa-arrow-right"></i></span>
      </button>
      <div class="class-list">
        <p class="list-label">Clases (${clases.length})</p>
        ${clases.length ? clases.map(k => `
          <div class="class-item" style="--c:${esc(k.color || '#1e5aa8')}">
            <span class="class-dot"></span>
            <div class="class-item-info">
              <strong>${esc(k.nombre)}</strong>
              <small>${[k.docente, k.horario, k.aula].filter(Boolean).map(esc).join(' · ') || 'Sin detalles'}</small>
            </div>
            <div class="row-actions">
              <button class="icon-btn" data-accion="asis-clase" data-id="${k.id}" title="Tomar asistencia"><i class="fa-solid fa-clipboard-check"></i></button>
              <button class="icon-btn" data-accion="editar-clase" data-id="${k.id}" title="Editar clase"><i class="fa-solid fa-pen"></i></button>
              <button class="icon-btn danger" data-accion="eliminar-clase" data-id="${k.id}" title="Eliminar clase"><i class="fa-solid fa-trash"></i></button>
            </div>
          </div>`).join('') : `<p class="muted small">Este curso aún no tiene clases.</p>`}
      </div>
      <button class="btn btn-outline btn-block" data-accion="nueva-clase" data-id="${c.id}"><i class="fa-solid fa-plus"></i> Agregar clase</button>
    </article>`;
}

function formCurso(curso = null) {
  const m = abrirModal({
    titulo: curso ? 'Editar curso' : 'Nuevo curso',
    cuerpo: `
      <form id="f-curso" class="form-grid">
        <label class="field span-2"><span>Nombre del curso / grado *</span>
          <input name="nombre" required placeholder="Ej. Décimo Grado, 1° BTP Informática" value="${esc(curso?.nombre)}"></label>
        <label class="field"><span>Sección *</span>
          <input name="seccion" required placeholder="Ej. A" value="${esc(curso?.seccion)}"></label>
        <label class="field"><span>Jornada</span>
          <select name="jornada">
            ${['Matutina', 'Vespertina', 'Nocturna', 'Fin de semana'].map(j => `<option ${curso?.jornada === j ? 'selected' : ''}>${j}</option>`).join('')}
          </select></label>
        <label class="field"><span>Año lectivo</span>
          <input name="anio" inputmode="numeric" value="${esc(curso?.anio || new Date().getFullYear())}"></label>
      </form>`,
    pie: `<button class="btn btn-light" data-close>Cancelar</button><button class="btn btn-primary" id="g-curso"><i class="fa-solid fa-floppy-disk"></i> Guardar</button>`
  });
  $$('[data-close]', m).forEach(b => b.onclick = cerrarModal);
  const form = $('#f-curso', m);
  const enviar = async () => {
    if (!form.reportValidity()) return;
    const d = leerForm(form);
    await conCarga($('#g-curso', m), async () => {
      await guardar('cursos', { ...(curso ? { id: curso.id } : {}), nombre: d.nombre, seccion: d.seccion.toUpperCase(), jornada: d.jornada, anio: d.anio });
      cerrarModal();
      toast(curso ? 'Curso actualizado' : 'Curso creado');
      render();
    });
  };
  $('#g-curso', m).onclick = enviar;
  form.onsubmit = e => { e.preventDefault(); enviar(); };
}

function formClase(clase = null, cursoId = null) {
  const cid = clase?.cursoId || cursoId;
  const colorActual = clase?.color || COLORES_CLASE[clasesDe(cid).length % COLORES_CLASE.length];
  const m = abrirModal({
    titulo: clase ? 'Editar clase' : 'Nueva clase',
    cuerpo: `
      <form id="f-clase" class="form-grid">
        <label class="field span-2"><span>Nombre de la clase / asignatura *</span>
          <input name="nombre" required placeholder="Ej. Matemáticas" value="${esc(clase?.nombre)}"></label>
        <label class="field span-2"><span>Curso y sección *</span>
          <select name="cursoId" required>${opcionesCursos(cid)}</select></label>
        <label class="field"><span>Docente</span>
          <input name="docente" placeholder="Ej. Lic. Ana Martínez" value="${esc(clase?.docente)}"></label>
        <label class="field"><span>Aula</span>
          <input name="aula" placeholder="Ej. Aula 12" value="${esc(clase?.aula)}"></label>
        <label class="field span-2"><span>Horario</span>
          <input name="horario" placeholder="Ej. Lun a Vie · 7:00 – 7:45" value="${esc(clase?.horario)}"></label>
        <div class="field span-2"><span>Color de la clase</span>
          <div class="color-picker">
            ${COLORES_CLASE.map(c => `<label><input type="radio" name="color" value="${c}" ${c === colorActual ? 'checked' : ''}><span style="background:${c}"></span></label>`).join('')}
          </div>
        </div>
      </form>`,
    pie: `<button class="btn btn-light" data-close>Cancelar</button><button class="btn btn-primary" id="g-clase"><i class="fa-solid fa-floppy-disk"></i> Guardar</button>`
  });
  $$('[data-close]', m).forEach(b => b.onclick = cerrarModal);
  const form = $('#f-clase', m);
  const enviar = async () => {
    if (!form.reportValidity()) return;
    const d = leerForm(form);
    await conCarga($('#g-clase', m), async () => {
      await guardar('clases', { ...(clase ? { id: clase.id } : {}), nombre: d.nombre, cursoId: d.cursoId, docente: d.docente, aula: d.aula, horario: d.horario, color: d.color || COLORES_CLASE[0] });
      // Si cambió de curso, actualizar el cursoId de sus registros de asistencia
      if (clase && clase.cursoId !== d.cursoId) {
        for (const r of S.asistencia.filter(r => r.claseId === clase.id)) await guardar('asistencia', { ...r, cursoId: d.cursoId });
      }
      cerrarModal();
      toast(clase ? 'Clase actualizada' : 'Clase agregada');
      render();
    });
  };
  $('#g-clase', m).onclick = enviar;
  form.onsubmit = e => { e.preventDefault(); enviar(); };
}

async function eliminarClaseDatos(claseId) {
  for (const r of S.asistencia.filter(r => r.claseId === claseId)) await borrar('asistencia', r.id);
  for (const a of S.actividades.filter(a => a.claseId === claseId)) await borrar('actividades', a.id);
  await borrar('clases', claseId);
}

async function eliminarClase(id) {
  const k = byId('clases', id);
  const ok = await confirmar(`¿Eliminar la clase <strong>${esc(k.nombre)}</strong>? También se borrarán sus registros de asistencia y notas. Esta acción no se puede deshacer.`);
  if (!ok) return;
  await conCarga(null, async () => {
    await eliminarClaseDatos(id);
    toast('Clase eliminada');
    render();
  });
}

async function eliminarCurso(id) {
  const c = byId('cursos', id);
  const nc = clasesDe(id).length, ne = estudiantesDe(id).length;
  const ok = await confirmar(`¿Eliminar el curso <strong>${esc(cursoLabel(c))}</strong>?<br><br>Se eliminarán también <strong>${nc} clase(s)</strong>, <strong>${ne} estudiante(s)</strong> y todos sus registros de asistencia y notas.`);
  if (!ok) return;
  await conCarga(null, async () => {
    for (const k of clasesDe(id)) await eliminarClaseDatos(k.id);
    for (const e of estudiantesDe(id)) await borrar('estudiantes', e.id);
    await borrar('cursos', id);
    toast('Curso eliminado');
    render();
  });
}

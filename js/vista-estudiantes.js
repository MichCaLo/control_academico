/* =========================================================
   ESTUDIANTES: CRUD, cuadro estadístico, ficha con calendario
   ========================================================= */
function vistaEstudiantes(el) {
  if (!S.cursos.length) {
    el.innerHTML = estadoVacio({ icon: 'fa-user-graduate', titulo: 'Primero cree un curso', texto: 'Los estudiantes se agregan por curso y sección.', boton: 'Ir a cursos', accion: 'cursos' });
    return;
  }
  if (UI.cursoFiltro && !byId('cursos', UI.cursoFiltro)) UI.cursoFiltro = '';

  el.innerHTML = `
    <div class="card toolbar">
      <label class="field"><span>Curso y sección</span>
        <select id="f-curso">${opcionesCursos(UI.cursoFiltro, true)}</select></label>
      <label class="field grow"><span>Buscar</span>
        <div class="input-icon"><i class="fa-solid fa-magnifying-glass"></i>
        <input id="f-buscar" type="search" placeholder="Nombre, apellido o identidad…" value="${esc(UI.busqueda)}"></div></label>
      <div class="toolbar-btns">
        <button class="btn btn-light" id="corregir-orden" title="Intercambiar nombres y apellidos"><i class="fa-solid fa-right-left"></i> Corregir nombres</button>
        <button class="btn btn-light" id="carga-rapida"><i class="fa-solid fa-list"></i> Carga rápida</button>
        <button class="btn btn-primary" id="nuevo-est"><i class="fa-solid fa-user-plus"></i> Nuevo estudiante</button>
      </div>
    </div>

    <div class="card">
      <div class="section-head tight">
        <h3><i class="fa-solid fa-chart-column"></i> Cuadro estadístico de asistencia</h3>
        <span class="muted small" id="est-sub"></span>
      </div>
      <div class="stats-grid mini" id="est-resumen"></div>
      <div class="chart-grid">
        <div class="chart-box donut"><canvas id="ch-total"></canvas></div>
        <div class="chart-box scroll-y"><div id="ch-barras-wrap"><canvas id="ch-barras"></canvas></div></div>
      </div>
    </div>

    <div class="card no-pad">
      <div class="table-wrap">
        <table class="table responsive" id="tabla-est">
          <thead><tr>
            <th>#</th><th>Estudiante</th><th>Género</th><th>Curso</th>
            <th class="c">Asistencias</th><th class="c">Inasistencias</th><th class="c">Excusas</th>
            <th>% Asistencia</th><th class="r">Acciones</th>
          </tr></thead>
          <tbody></tbody>
        </table>
      </div>
      <div id="tabla-vacia"></div>
    </div>`;

  const filtrados = () => {
    const q = UI.busqueda.toLowerCase();
    return S.estudiantes
      .filter(e => !UI.cursoFiltro || e.cursoId === UI.cursoFiltro)
      .filter(e => !q || `${e.nombres} ${e.apellidos} ${e.identidad || ''}`.toLowerCase().includes(q))
      .sort((a, b) => {
        if (!UI.cursoFiltro) {
          const o = cursosOrdenados().map(c => c.id);
          const d = o.indexOf(a.cursoId) - o.indexOf(b.cursoId);
          if (d) return d;
        }
        return cmpEst(a, b);
      });
  };

  const pintarEstadisticas = () => {
    charts.forEach(c => c.destroy()); charts = [];
    const lista = S.estudiantes.filter(e => !UI.cursoFiltro || e.cursoId === UI.cursoFiltro).sort(cmpEst);
    let P = 0, A = 0, E = 0;
    const filas = lista.map(e => { const s = statsEstudiante(e.id); P += s.p; A += s.a; E += s.e; return { e, s }; });
    const T = P + A + E;
    $('#est-sub', el).textContent = UI.cursoFiltro ? cursoLabel(byId('cursos', UI.cursoFiltro)) : 'Todos los cursos';
    $('#est-resumen', el).innerHTML =
      tarjetaStat('fa-users', 'Estudiantes', lista.length, 'blue') +
      tarjetaStat('fa-circle-check', 'Asistencias', P, 'green') +
      tarjetaStat('fa-circle-xmark', 'Inasistencias', A, 'red') +
      tarjetaStat('fa-file-medical', 'Días con excusa', E, 'yellow') +
      tarjetaStat('fa-percent', 'Asistencia promedio', T ? Math.round(P * 100 / T) + '%' : '—', 'gold');

    nuevoGrafico($('#ch-total', el), {
      type: 'doughnut',
      data: { labels: ['Asistencias', 'Inasistencias', 'Excusas'], datasets: [{ data: [P, A, E], backgroundColor: ['#15a06a', '#e14b4b', '#f2c230'], borderWidth: 3, borderColor: '#fff' }] },
      options: { maintainAspectRatio: false, cutout: '64%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 14 } }, title: { display: true, text: 'Total del grupo', color: '#0a2463', font: { weight: 600, size: 14 } } } }
    });
    const alto = Math.max(240, filas.length * 30 + 70);
    $('#ch-barras-wrap', el).style.height = alto + 'px';
    nuevoGrafico($('#ch-barras', el), {
      type: 'bar',
      data: {
        labels: filas.map(f => `${(f.e.nombres || '').split(' ')[0]} ${(f.e.apellidos || '').split(' ')[0]}`.trim()),
        datasets: [
          { label: 'Asistencias', data: filas.map(f => f.s.p), backgroundColor: '#15a06a', borderRadius: 4 },
          { label: 'Inasistencias', data: filas.map(f => f.s.a), backgroundColor: '#e14b4b', borderRadius: 4 },
          { label: 'Excusas', data: filas.map(f => f.s.e), backgroundColor: '#f2c230', borderRadius: 4 }
        ]
      },
      options: {
        indexAxis: 'y', maintainAspectRatio: false,
        scales: { x: { stacked: true, grid: { color: '#eef2f8' }, ticks: { precision: 0 } }, y: { stacked: true, grid: { display: false } } },
        plugins: { legend: { position: 'top', labels: { usePointStyle: true } }, title: { display: true, text: 'Por estudiante', color: '#0a2463', font: { weight: 600, size: 14 } } }
      }
    });
  };

  const pintarTabla = () => {
    const lista = filtrados();
    const tbody = $('#tabla-est tbody', el);
    tbody.innerHTML = lista.map((e, i) => {
      const nuevoCurso = i === 0 || lista[i - 1].cursoId !== e.cursoId;
      const grupo = lista.filter(x => x.cursoId === e.cursoId);
      const sep = (nuevoCurso || grupoGenero(lista[i - 1]) !== grupoGenero(e)) ? separadorGenero(grupo, grupo.indexOf(e)) : '';
      const filaSep = sep ? `<tr class="grupo-row"><td colspan="9"><div class="grupo-sep ${sep.cls}"><i class="fa-solid ${sep.icono}"></i> ${sep.titulo}${UI.cursoFiltro ? '' : ` · ${esc(cursoLabel(byId('cursos', e.cursoId)))}`} <span>${sep.n}</span></div></td></tr>` : '';
      const s = statsEstudiante(e.id);
      const c = byId('cursos', e.cursoId);
      const pct = s.pct ?? 0;
      const col = s.pct === null ? '#c5d0e0' : pct >= 90 ? '#15a06a' : pct >= 75 ? '#d4a72c' : '#e14b4b';
      return `${filaSep}<tr>
        <td data-label="#" class="muted">${i + 1}</td>
        <td data-label="Estudiante"><div class="person">${avatar(e)}<div><strong>${esc(nombreEst(e))}</strong><small>${esc(e.identidad || 'Sin identidad')}</small></div></div></td>
        <td data-label="Género">${chipGenero(e)}</td>
        <td data-label="Curso"><span class="chip chip-light">${esc(c ? `${c.nombre} ${c.seccion}` : '—')}</span></td>
        <td data-label="Asistencias" class="c"><span class="pill pill-green">${s.p}</span></td>
        <td data-label="Inasistencias" class="c"><span class="pill pill-red">${s.a}</span></td>
        <td data-label="Excusas" class="c"><span class="pill pill-yellow">${s.e}</span></td>
        <td data-label="% Asistencia"><div class="progress"><div style="width:${pct}%;background:${col}"></div></div><small class="pct">${s.pct === null ? 'Sin datos' : pct + '%'}</small></td>
        <td data-label="Acciones" class="r"><div class="row-actions">
          <button class="icon-btn info" data-accion="ver" data-id="${e.id}" title="Ver ficha y calendario"><i class="fa-solid fa-calendar-days"></i></button>
          <button class="icon-btn" data-accion="editar" data-id="${e.id}" title="Editar"><i class="fa-solid fa-pen"></i></button>
          <button class="icon-btn danger" data-accion="eliminar" data-id="${e.id}" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
        </div></td>
      </tr>`;
    }).join('');
    $('#tabla-vacia', el).innerHTML = lista.length ? '' :
      estadoVacio({ icon: 'fa-user-plus', titulo: UI.busqueda ? 'Sin resultados' : 'No hay estudiantes en este curso', texto: UI.busqueda ? 'Pruebe con otro nombre.' : 'Agregue estudiantes con el botón "Nuevo estudiante" o "Carga rápida".' });
  };

  pintarEstadisticas();
  pintarTabla();

  $('#f-curso', el).onchange = e => { UI.cursoFiltro = e.target.value; pintarEstadisticas(); pintarTabla(); };
  $('#f-buscar', el).oninput = e => { UI.busqueda = e.target.value; pintarTabla(); };
  $('#nuevo-est', el).onclick = () => formEstudiante();
  $('#carga-rapida', el).onclick = () => formCargaRapida();
  $('#corregir-orden', el).onclick = () => formCorregirOrden();
  $('#tabla-est', el).addEventListener('click', async e => {
    const b = e.target.closest('button[data-accion]');
    if (!b) return;
    const est = byId('estudiantes', b.dataset.id);
    if (b.dataset.accion === 'ver') abrirFicha(est.id);
    if (b.dataset.accion === 'editar') formEstudiante(est);
    if (b.dataset.accion === 'eliminar') {
      const ok = await confirmar(`¿Eliminar a <strong>${esc(nombreEst(est))}</strong> de la lista?`);
      if (ok) await conCarga(null, async () => { await borrar('estudiantes', est.id); toast('Estudiante eliminado'); render(); });
    }
  });
}

function formEstudiante(est = null) {
  const m = abrirModal({
    titulo: est ? 'Editar estudiante' : 'Nuevo estudiante',
    tam: 'lg',
    cuerpo: `
      <form id="f-est" class="form-grid">
        <label class="field"><span>Nombres * <small class="muted">(primero)</small></span><input name="nombres" required value="${esc(est?.nombres)}" placeholder="Ej. Axel Alexander"></label>
        <label class="field"><span>Apellidos * <small class="muted">(después)</small></span><input name="apellidos" required value="${esc(est?.apellidos)}" placeholder="Ej. Lara Muñoz"></label>
        <div class="span-2 swap-row"><button type="button" class="btn btn-light btn-sm" id="swap-nom"><i class="fa-solid fa-right-left"></i> Intercambiar nombres y apellidos</button></div>
        <label class="field span-2"><span>Curso y sección *</span><select name="cursoId" required>${opcionesCursos(est?.cursoId || UI.cursoFiltro)}</select></label>
        <label class="field"><span>N° de identidad</span><input name="identidad" value="${esc(est?.identidad)}" placeholder="0801-2010-00000"></label>
        <label class="field"><span>Género *</span><select name="genero" required>
          <option value="" ${est?.genero ? '' : 'selected'} disabled>Seleccione…</option>
          <option value="F" ${est?.genero === 'F' ? 'selected' : ''}>Femenino</option>
          <option value="M" ${est?.genero === 'M' ? 'selected' : ''}>Masculino</option></select></label>
        <label class="field"><span>Padre, madre o encargado</span><input name="encargado" value="${esc(est?.encargado)}"></label>
        <label class="field"><span>Teléfono</span><input name="telefono" type="tel" value="${esc(est?.telefono)}"></label>
        <label class="field span-2"><span>Correo electrónico</span><input name="correo" type="email" value="${esc(est?.correo)}"></label>
      </form>`,
    pie: `<button class="btn btn-light" data-close>Cancelar</button>
          ${est ? '' : `<button class="btn btn-outline" id="g-otro"><i class="fa-solid fa-plus"></i> Guardar y agregar otro</button>`}
          <button class="btn btn-primary" id="g-est"><i class="fa-solid fa-floppy-disk"></i> Guardar</button>`
  });
  $$('[data-close]', m).forEach(b => b.onclick = cerrarModal);
  const form = $('#f-est', m);
  $('#swap-nom', m).onclick = () => { const n = form.nombres.value; form.nombres.value = form.apellidos.value; form.apellidos.value = n; };
  const enviar = async (otro, boton) => {
    if (!form.reportValidity()) return;
    const d = leerForm(form);
    await conCarga(boton, async () => {
      await guardar('estudiantes', { ...(est ? { id: est.id } : {}), ...d });
      toast(est ? 'Datos actualizados' : 'Estudiante agregado');
      if (otro) {
        const curso = d.cursoId;
        form.reset();
        form.cursoId.value = curso;
        form.nombres.focus();
      } else { cerrarModal(); render(); }
    });
  };
  $('#g-est', m).onclick = e => enviar(false, e.currentTarget);
  if (!est) {
    $('#g-otro', m).onclick = e => enviar(true, e.currentTarget);
    $$('[data-close]', m).forEach(b => b.onclick = () => { cerrarModal(); render(); });
  }
  form.onsubmit = e => { e.preventDefault(); enviar(false, $('#g-est', m)); };
}

function formCargaRapida() {
  const m = abrirModal({
    titulo: 'Carga rápida de estudiantes',
    tam: 'lg',
    cuerpo: `
      <form id="f-carga" class="form-grid">
        <label class="field span-2"><span>Curso y sección *</span><select name="cursoId" required>${opcionesCursos(UI.cursoFiltro)}</select></label>
        <label class="field"><span>Orden de cada línea *</span>
          <select name="orden">
            <option value="AN">Apellidos, Nombres</option>
            <option value="NA">Nombres, Apellidos</option>
          </select></label>
        <label class="field"><span>Género (si la línea no lo indica)</span>
          <select name="genero"><option value="">Sin especificar</option><option value="M">Masculino</option><option value="F">Femenino</option></select></label>
        <label class="field span-2"><span>Lista de estudiantes (uno por línea)</span>
          <textarea name="lista" rows="9" required placeholder="Lara Muñoz, Axel Alexander, M&#10;Pérez, Denis Jaret, M&#10;Aguilar López, Andrea Sofía, F"></textarea></label>
        <p class="hint span-2"><i class="fa-solid fa-lightbulb"></i> Separe con <strong>coma</strong> o pegue dos/tres columnas desde Excel. Puede agregar una columna de género: <strong>M</strong> (masculino) o <strong>F</strong> (femenino).</p>
        <div class="span-2" id="carga-prev"></div>
      </form>`,
    pie: `<button class="btn btn-light" data-close>Cancelar</button><button class="btn btn-primary" id="g-carga"><i class="fa-solid fa-upload"></i> Agregar</button>`
  });
  $$('[data-close]', m).forEach(b => b.onclick = cerrarModal);
  const form = $('#f-carga', m);

  const interpretar = () => {
    const d = leerForm(form);
    return (d.lista || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => {
      let partes = l.split(/[,\t;]/).map(x => x.trim()).filter(Boolean);
      let genero = d.genero || '';
      const ult = (partes[partes.length - 1] || '').toUpperCase();
      if (partes.length >= 2 && /^(M|F|MASCULINO|FEMENINO|H|HOMBRE|MUJER)$/.test(ult)) {
        genero = /^(F|FEMENINO|MUJER)$/.test(ult) ? 'F' : 'M';
        partes = partes.slice(0, -1);
      }
      let nombres = partes.join(' '), apellidos = '';
      if (partes.length >= 2) {
        if (d.orden === 'AN') { apellidos = partes[0]; nombres = partes.slice(1).join(' '); }
        else { nombres = partes[0]; apellidos = partes.slice(1).join(' '); }
      }
      return { nombres, apellidos, genero };
    });
  };
  const vistaPrevia = () => {
    const filas = interpretar().slice(0, 6);
    $('#carga-prev', m).innerHTML = filas.length ? `<p class="list-label">Vista previa (así se mostrará)</p>
      <div class="prev-list">${filas.map(f => `<div class="prev-item"><strong>${esc(f.nombres)}</strong> <span>${esc(f.apellidos)}</span> ${f.genero ? chipGenero(f) : ''}</div>`).join('')}</div>` : '';
  };
  form.addEventListener('input', vistaPrevia);
  form.addEventListener('change', vistaPrevia);

  $('#g-carga', m).onclick = async e => {
    if (!form.reportValidity()) return;
    const d = leerForm(form);
    const lista = interpretar();
    await conCarga(e.currentTarget, async () => {
      for (const x of lista) {
        await guardar('estudiantes', { cursoId: d.cursoId, nombres: x.nombres, apellidos: x.apellidos, identidad: '', genero: x.genero, encargado: '', telefono: '', correo: '' });
      }
      cerrarModal();
      UI.cursoFiltro = d.cursoId;
      toast(`${lista.length} estudiante(s) agregados`);
      render();
    });
  };
}

/* ---------- Corregir nombres/apellidos invertidos ---------- */
function formCorregirOrden() {
  const cursoId = UI.cursoFiltro || cursosOrdenados()[0]?.id;
  const m = abrirModal({
    titulo: '<i class="fa-solid fa-right-left"></i> Corregir nombres y apellidos',
    tam: 'lg',
    cuerpo: `
      <p class="hint"><i class="fa-solid fa-circle-info"></i> Marque los estudiantes cuyos <strong>apellidos quedaron en el campo de nombres</strong>. Al aplicar, se intercambian para que se muestren <strong>primero los nombres y luego los apellidos</strong>.</p>
      <div class="swap-tools">
        <label class="field grow"><span>Curso y sección</span><select id="co-curso">${opcionesCursos(cursoId)}</select></label>
        <label class="check-all"><input type="checkbox" id="co-todos" checked> Seleccionar todos</label>
      </div>
      <div id="co-lista" class="swap-list"></div>`,
    pie: `<button class="btn btn-light" data-close>Cancelar</button><button class="btn btn-primary" id="co-aplicar"><i class="fa-solid fa-check"></i> Intercambiar seleccionados</button>`
  });
  $$('[data-close]', m).forEach(b => b.onclick = cerrarModal);
  const pintar = () => {
    const ests = estudiantesDe($('#co-curso', m).value);
    $('#co-lista', m).innerHTML = ests.length ? ests.map(e => `
      <label class="swap-item">
        <input type="checkbox" value="${e.id}" checked>
        <div><small>Ahora</small><span>${esc(nombreEst(e))}</span></div>
        <i class="fa-solid fa-arrow-right"></i>
        <div><small>Quedará</small><strong>${esc(`${e.apellidos} ${e.nombres}`.trim())}</strong></div>
      </label>`).join('') : '<p class="muted">Este curso no tiene estudiantes.</p>';
    $('#co-todos', m).checked = true;
  };
  $('#co-curso', m).onchange = pintar;
  $('#co-todos', m).onchange = e => $$('#co-lista input', m).forEach(c => c.checked = e.target.checked);
  pintar();
  $('#co-aplicar', m).onclick = async ev => {
    const ids = $$('#co-lista input:checked', m).map(c => c.value);
    if (!ids.length) { toast('No hay estudiantes seleccionados', 'warn'); return; }
    await conCarga(ev.currentTarget, async () => {
      for (const id of ids) {
        const e = byId('estudiantes', id);
        await guardar('estudiantes', { ...e, nombres: e.apellidos, apellidos: e.nombres });
      }
      UI.cursoFiltro = $('#co-curso', m).value;
      cerrarModal();
      toast(`${ids.length} estudiante(s) corregidos`);
      render();
    });
  };
}

/* ---------- Ficha del estudiante con calendario ---------- */
function abrirFicha(estId, claseId = '') {
  const est = byId('estudiantes', estId);
  const curso = byId('cursos', est.cursoId);
  const clases = clasesDe(est.cursoId);
  const hoyD = new Date();
  const st = { claseId, anio: hoyD.getFullYear(), mes: hoyD.getMonth(), dia: '' };

  const m = abrirModal({
    titulo: `<i class="fa-solid fa-id-card"></i> Ficha del estudiante`,
    tam: 'xl',
    cuerpo: `
      <div class="ficha-head">
        ${avatar(est, 'xl')}
        <div class="ficha-info">
          <h2>${esc(nombreEst(est))}</h2>
          <p class="ficha-chips"><span class="chip chip-gold">${esc(cursoLabel(curso))}</span>${chipGenero(est)}</p>
          <div class="ficha-datos">
            ${est.identidad ? `<span><i class="fa-solid fa-id-badge"></i>${esc(est.identidad)}</span>` : ''}
            ${est.encargado ? `<span><i class="fa-solid fa-user-shield"></i>${esc(est.encargado)}</span>` : ''}
            ${est.telefono ? `<span><i class="fa-solid fa-phone"></i>${esc(est.telefono)}</span>` : ''}
            ${est.correo ? `<span><i class="fa-solid fa-envelope"></i>${esc(est.correo)}</span>` : ''}
          </div>
        </div>
        <label class="field ficha-filtro"><span>Clase</span>
          <select id="fi-clase"><option value="">Todas las clases</option>${clases.map(k => `<option value="${k.id}" ${k.id === claseId ? 'selected' : ''}>${esc(k.nombre)}</option>`).join('')}</select></label>
      </div>

      <div class="stats-grid mini" id="fi-stats"></div>

      <div class="ficha-grid">
        <div class="card inner">
          <h4 class="card-title"><i class="fa-solid fa-calendar-days"></i> Calendario de asistencia</h4>
          <div id="fi-cal"></div>
          <div class="legend">
            <span><i class="lg-dot p"></i>Asistió</span><span><i class="lg-dot a"></i>Inasistencia</span><span><i class="lg-dot e"></i>Excusa</span><span><i class="lg-dot obs"></i>Con observación</span>
          </div>
          <div id="fi-dia"></div>
        </div>
        <div class="card inner">
          <h4 class="card-title"><i class="fa-solid fa-chart-pie"></i> Resumen</h4>
          <div class="chart-box donut sm"><canvas id="fi-chart"></canvas></div>
        </div>
      </div>

      <div class="card inner">
        <h4 class="card-title"><i class="fa-solid fa-comment-dots"></i> Comentarios y observaciones</h4>
        <div id="fi-obs"></div>
      </div>

      <div class="card inner">
        <h4 class="card-title"><i class="fa-solid fa-star"></i> Notas por clase</h4>
        <div class="table-wrap">
          <table class="table grades-summary">
            <thead><tr><th>Clase</th>${PARCIALES.map(p => `<th class="c">${p}° P</th>`).join('')}<th class="c">Promedio</th></tr></thead>
            <tbody>${clases.map(k => {
              const r = promedioClase(est.id, k.id);
              return `<tr><td><strong>${esc(k.nombre)}</strong></td>${r.ps.map(n => `<td class="c ${claseNota(n)}">${fmt(n)}</td>`).join('')}<td class="c"><span class="nota-badge ${claseNota(r.prom)}">${fmt(r.prom)}</span></td></tr>`;
            }).join('') || `<tr><td colspan="6" class="muted">Sin clases</td></tr>`}</tbody>
          </table>
        </div>
      </div>`,
    pie: `<button class="btn btn-light" data-close>Cerrar</button><button class="btn btn-primary" id="fi-editar"><i class="fa-solid fa-pen"></i> Editar datos</button>`
  });
  $$('[data-close]', m).forEach(b => b.onclick = cerrarModal);
  $('#fi-editar', m).onclick = () => formEstudiante(est);

  // Registros del estudiante agrupados por fecha
  const registrosPorFecha = () => {
    const mapa = {};
    S.asistencia.forEach(r => {
      if (st.claseId && r.claseId !== st.claseId) return;
      const reg = r.registros?.[est.id];
      if (!reg) return;
      (mapa[r.fecha] = mapa[r.fecha] || []).push({ clase: byId('clases', r.claseId), ...reg });
    });
    return mapa;
  };

  const chart = nuevoGrafico($('#fi-chart', m), {
    type: 'doughnut',
    data: { labels: ['Asistencias', 'Inasistencias', 'Excusas'], datasets: [{ data: [0, 0, 0], backgroundColor: ['#15a06a', '#e14b4b', '#f2c230'], borderWidth: 3, borderColor: '#fff' }] },
    options: { maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true } } } }
  }, true);

  const pintar = () => {
    const s = statsEstudiante(est.id, st.claseId || null);
    $('#fi-stats', m).innerHTML =
      tarjetaStat('fa-circle-check', 'Asistencias', s.p, 'green') +
      tarjetaStat('fa-circle-xmark', 'Inasistencias', s.a, 'red') +
      tarjetaStat('fa-file-medical', 'Excusas', s.e, 'yellow') +
      tarjetaStat('fa-percent', '% Asistencia', s.pct === null ? '—' : s.pct + '%', 'blue');
    if (chart) { chart.data.datasets[0].data = [s.p, s.a, s.e]; chart.update(); }

    const mapa = registrosPorFecha();
    $('#fi-cal', m).innerHTML = htmlCalendario(st.anio, st.mes, mapa, st.dia);
    pintarDia(mapa);

    const obs = Object.entries(mapa).flatMap(([f, arr]) => arr.filter(x => x.obs || x.estado !== 'P').map(x => ({ f, ...x })))
      .sort((a, b) => b.f.localeCompare(a.f));
    $('#fi-obs', m).innerHTML = obs.length ? `<ul class="obs-list">${obs.map(o => `
      <li class="obs-item ${ESTADOS[o.estado].cls}">
        <span class="obs-badge"><i class="fa-solid ${ESTADOS[o.estado].icon}"></i></span>
        <div><strong>${fechaCorta(o.f)} · ${esc(o.clase?.nombre || 'Clase')}</strong> <span class="estado-txt">${ESTADOS[o.estado].txt}</span>
        <p>${o.obs ? esc(o.obs) : '<em class="muted">Sin comentario</em>'}</p></div>
      </li>`).join('')}</ul>` : `<p class="muted">No hay inasistencias, excusas ni observaciones registradas. ¡Excelente!</p>`;
  };

  const pintarDia = mapa => {
    const box = $('#fi-dia', m);
    if (!st.dia) { box.innerHTML = `<p class="hint"><i class="fa-solid fa-hand-pointer"></i> Toque un día marcado para ver el detalle.</p>`; return; }
    const arr = mapa[st.dia] || [];
    box.innerHTML = `<div class="dia-detalle"><strong>${fechaLarga(st.dia)}</strong>${arr.length ? arr.map(x => `
      <div class="dia-row"><span class="pill pill-${{ P: 'green', A: 'red', E: 'yellow' }[x.estado]}">${ESTADOS[x.estado].txt}</span>
      <span>${esc(x.clase?.nombre || '')}</span>${x.obs ? `<em>“${esc(x.obs)}”</em>` : ''}</div>`).join('') : '<p class="muted">Sin registro este día.</p>'}</div>`;
  };

  $('#fi-clase', m).onchange = e => { st.claseId = e.target.value; pintar(); };
  $('#fi-cal', m).addEventListener('click', e => {
    const nav = e.target.closest('[data-mes]');
    if (nav) {
      st.mes += Number(nav.dataset.mes);
      if (st.mes < 0) { st.mes = 11; st.anio--; }
      if (st.mes > 11) { st.mes = 0; st.anio++; }
      st.dia = '';
      pintar();
      return;
    }
    const d = e.target.closest('[data-fecha]');
    if (d) { st.dia = d.dataset.fecha; pintar(); }
  });
  pintar();
}

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function htmlCalendario(anio, mes, mapa, diaSel) {
  const primero = new Date(anio, mes, 1).getDay(); // 0 = domingo
  const dias = new Date(anio, mes + 1, 0).getDate();
  const hoyISO = hoy();
  let celdas = '';
  for (let i = 0; i < primero; i++) celdas += `<div class="cal-cell empty"></div>`;
  for (let d = 1; d <= dias; d++) {
    const f = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const arr = mapa[f] || [];
    let est = '';
    if (arr.length) est = arr.some(x => x.estado === 'A') ? 'a' : arr.some(x => x.estado === 'E') ? 'e' : 'p';
    const conObs = arr.some(x => x.obs);
    const titulo = arr.map(x => `${x.clase?.nombre || ''}: ${ESTADOS[x.estado].txt}${x.obs ? ' – ' + x.obs : ''}`).join('\n');
    celdas += `<button type="button" class="cal-cell ${est ? 'st-' + est : ''} ${f === hoyISO ? 'today' : ''} ${f === diaSel ? 'sel' : ''}" data-fecha="${f}" title="${esc(titulo)}">
      ${d}${conObs ? '<i class="obs-dot"></i>' : ''}</button>`;
  }
  return `
    <div class="calendar">
      <div class="cal-head">
        <button class="icon-btn" data-mes="-1" title="Mes anterior"><i class="fa-solid fa-chevron-left"></i></button>
        <strong>${MESES[mes]} ${anio}</strong>
        <button class="icon-btn" data-mes="1" title="Mes siguiente"><i class="fa-solid fa-chevron-right"></i></button>
      </div>
      <div class="cal-grid">
        ${['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'].map(x => `<div class="cal-dow">${x}</div>`).join('')}
        ${celdas}
      </div>
    </div>`;
}

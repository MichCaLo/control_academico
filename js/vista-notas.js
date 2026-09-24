/* =========================================================
   CONTROL DE NOTAS
   4 parciales por año. Cada parcial tiene actividades con un
   valor en puntos; la nota del parcial es la suma de puntos.
   El promedio de la clase es el promedio de los parciales.
   ========================================================= */
const TIPOS_ACT = ['Tarea', 'Examen', 'Proyecto', 'Laboratorio', 'Exposición', 'Participación', 'Cuaderno', 'Acumulativo', 'Otro'];
const ROMANO = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };

function vistaNotas(el) {
  const clases = clasesOrdenadas();
  if (!clases.length) {
    el.innerHTML = estadoVacio({ icon: 'fa-star', titulo: 'No hay clases registradas', texto: 'Cree un curso y sus clases para registrar notas.', boton: 'Ir a cursos', accion: 'cursos' });
    return;
  }
  if (!UI.claseNotas || !byId('clases', UI.claseNotas)) UI.claseNotas = clases[0].id;
  const clase = byId('clases', UI.claseNotas);
  const curso = byId('cursos', clase.cursoId);

  el.innerHTML = `
    <div class="card asis-top" style="--c:${esc(clase.color || '#1e5aa8')}">
      <div class="toolbar flat">
        <label class="field grow"><span>Clase</span><select id="nt-clase">${opcionesClases(UI.claseNotas)}</select></label>
      </div>
      <div class="asis-info">
        <div class="asis-title">
          <span class="class-icon"><i class="fa-solid fa-star"></i></span>
          <div><h3>${esc(clase.nombre)}</h3><p>${esc(cursoLabel(curso))} · Nota mínima de aprobación: <strong>${NOTA_MINIMA}%</strong></p></div>
        </div>
      </div>
      <div class="tabs" role="tablist">
        ${PARCIALES.map(p => `<button class="tab ${UI.parcial === p ? 'on' : ''}" data-parcial="${p}">${ROMANO[p]} Parcial</button>`).join('')}
        <button class="tab gold ${UI.parcial === 'R' ? 'on' : ''}" data-parcial="R"><i class="fa-solid fa-trophy"></i> Resumen anual</button>
      </div>
    </div>
    <div id="nt-cuerpo"></div>`;

  $('#nt-clase', el).onchange = e => { UI.claseNotas = e.target.value; render(); };
  $$('[data-parcial]', el).forEach(b => b.onclick = () => {
    UI.parcial = b.dataset.parcial === 'R' ? 'R' : Number(b.dataset.parcial);
    render();
  });

  const cuerpo = $('#nt-cuerpo', el);
  if (UI.parcial === 'R') resumenAnual(cuerpo, clase);
  else notasParcial(cuerpo, clase, UI.parcial);
}

function notasParcial(el, clase, parcial) {
  const acts = actividadesDe(clase.id, parcial);
  const ests = estudiantesDe(clase.cursoId);
  const valorTotal = redondear(acts.reduce((s, a) => s + Number(a.valor || 0), 0));
  const pctValor = Math.min(100, valorTotal);

  el.innerHTML = `
    <div class="card">
      <div class="section-head tight">
        <h3><i class="fa-solid fa-list-check"></i> Actividades del ${ROMANO[parcial]} Parcial</h3>
        <button class="btn btn-primary btn-sm" id="nt-nueva"><i class="fa-solid fa-plus"></i> Nueva actividad</button>
      </div>
      <div class="valor-bar ${valorTotal > 100 ? 'over' : valorTotal === 100 ? 'full' : ''}">
        <div class="valor-top"><span>Valor acumulado del parcial</span><strong>${fmt(valorTotal)} / 100 pts</strong></div>
        <div class="progress lg"><div style="width:${pctValor}%"></div></div>
        ${valorTotal > 100 ? `<small><i class="fa-solid fa-triangle-exclamation"></i> Las actividades suman más de 100 puntos.</small>` :
          valorTotal < 100 ? `<small>Faltan ${fmt(redondear(100 - valorTotal))} pts por asignar.</small>` : `<small><i class="fa-solid fa-circle-check"></i> Parcial completo.</small>`}
      </div>
      ${acts.length ? `<div class="acts-grid">${acts.map(a => `
        <div class="act-card">
          <div class="act-val">${fmt(Number(a.valor))}<small>pts</small></div>
          <div class="act-info"><strong>${esc(a.nombre)}</strong><small>${esc(a.tipo || '')}${a.fecha ? ' · ' + fechaCorta(a.fecha) : ''}</small></div>
          <div class="row-actions">
            <button class="icon-btn" data-accion="editar" data-id="${a.id}" title="Editar"><i class="fa-solid fa-pen"></i></button>
            <button class="icon-btn danger" data-accion="eliminar" data-id="${a.id}" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>`).join('')}</div>` :
        `<p class="muted">Aún no hay actividades en este parcial. Agregue tareas, exámenes, proyectos, etc.</p>`}
    </div>

    ${acts.length && ests.length ? `
    <div class="card no-pad">
      <div class="section-head tight pad"><h3><i class="fa-solid fa-table"></i> Registro de notas</h3><span class="muted small">Ingrese los puntos obtenidos</span></div>
      <div class="table-wrap">
        <table class="table grades" id="nt-tabla">
          <thead><tr>
            <th class="sticky-col">Estudiante</th>
            ${acts.map(a => `<th class="c act-th"><span>${esc(a.nombre)}</span><small>${fmt(Number(a.valor))} pts</small></th>`).join('')}
            <th class="c total-th">Total<small>/ ${fmt(valorTotal)}</small></th>
          </tr></thead>
          <tbody>
            ${ests.map((e, i) => { const sep = separadorGenero(ests, i); return `${sep ? `<tr class="grupo-row"><td colspan="${acts.length + 2}"><div class="grupo-sep ${sep.cls}"><i class="fa-solid ${sep.icono}"></i> ${sep.titulo} <span>${sep.n}</span></div></td></tr>` : ''}<tr data-est="${e.id}">
              <td class="sticky-col"><div class="person sm">${avatar(e, 'sm')}<strong>${esc(nombreEst(e))}</strong></div></td>
              ${acts.map(a => { const v = a.notas?.[e.id]; return `<td class="c"><input class="grade-input" type="number" inputmode="decimal" min="0" max="${a.valor}" step="0.5" data-act="${a.id}" data-max="${a.valor}" value="${v ?? ''}" placeholder="–"></td>`; }).join('')}
              <td class="c"><span class="nota-badge" data-total></span></td>
            </tr>`; }).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <div class="sticky-save">
      <span class="muted small hide-sm"><i class="fa-solid fa-circle-info"></i> Total en verde: aprobado (≥ ${NOTA_MINIMA})</span>
      <button class="btn btn-green btn-lg" id="nt-guardar"><i class="fa-solid fa-floppy-disk"></i> Guardar notas</button>
    </div>` : ''}
    ${acts.length && !ests.length ? estadoVacio({ icon: 'fa-user-plus', titulo: 'Este curso no tiene estudiantes', boton: 'Agregar estudiantes', accion: 'estudiantes' }) : ''}
  `;

  const recalcular = fila => {
    let t = 0;
    $$('.grade-input', fila).forEach(i => {
      const v = parseFloat(i.value);
      const mal = i.value !== '' && (isNaN(v) || v < 0 || v > Number(i.dataset.max));
      i.classList.toggle('invalid', mal);
      if (!isNaN(v)) t += v;
    });
    t = redondear(t);
    const b = $('[data-total]', fila);
    b.textContent = fmt(t);
    b.className = 'nota-badge ' + claseNota(t);
  };
  const tabla = $('#nt-tabla', el);
  if (tabla) {
    $$('tbody tr[data-est]', tabla).forEach(recalcular);
    tabla.addEventListener('input', e => { if (e.target.matches('.grade-input')) recalcular(e.target.closest('tr')); });
    // Enter baja a la siguiente fila
    tabla.addEventListener('keydown', e => {
      if (e.key !== 'Enter' || !e.target.matches('.grade-input')) return;
      e.preventDefault();
      const td = e.target.closest('td');
      const col = [...td.parentNode.children].indexOf(td);
      let sig = td.parentNode.nextElementSibling;
      if (sig && sig.classList.contains('grupo-row')) sig = sig.nextElementSibling;
      const inp = sig?.children[col]?.querySelector('input');
      if (inp) { inp.focus(); inp.select(); }
    });
    $('#nt-guardar', el).onclick = async ev => {
      if ($('.grade-input.invalid', tabla)) { toast('Hay notas fuera de rango (revise las celdas en rojo)', 'error'); $('.grade-input.invalid', tabla).focus(); return; }
      await conCarga(ev.currentTarget, async () => {
        for (const a of acts) {
          const notas = { ...(a.notas || {}) };
          $$(`.grade-input[data-act="${a.id}"]`, tabla).forEach(i => {
            const eid = i.closest('tr').dataset.est;
            if (i.value === '') delete notas[eid]; else notas[eid] = Number(i.value);
          });
          if (JSON.stringify(notas) !== JSON.stringify(a.notas || {})) await guardar('actividades', { ...a, notas });
        }
        toast(`Notas del ${ROMANO[parcial]} Parcial guardadas`);
        render();
      });
    };
  }

  $('#nt-nueva', el).onclick = () => formActividad(null, clase, parcial);
  el.addEventListener('click', async e => {
    const b = e.target.closest('.act-card button[data-accion]');
    if (!b) return;
    const a = byId('actividades', b.dataset.id);
    if (b.dataset.accion === 'editar') formActividad(a, clase, parcial);
    if (b.dataset.accion === 'eliminar') {
      const ok = await confirmar(`¿Eliminar la actividad <strong>${esc(a.nombre)}</strong>? Se borrarán las notas registradas en ella.`);
      if (ok) await conCarga(null, async () => { await borrar('actividades', a.id); toast('Actividad eliminada'); render(); });
    }
  });
}

function formActividad(act, clase, parcial) {
  const usado = actividadesDe(clase.id, parcial).filter(a => a.id !== act?.id).reduce((s, a) => s + Number(a.valor || 0), 0);
  const sugerido = act?.valor ?? Math.max(0, redondear(100 - usado));
  const m = abrirModal({
    titulo: act ? 'Editar actividad' : 'Nueva actividad',
    cuerpo: `
      <form id="f-act" class="form-grid">
        <label class="field span-2"><span>Nombre de la actividad *</span><input name="nombre" required value="${esc(act?.nombre)}" placeholder="Ej. Examen del primer parcial"></label>
        <label class="field"><span>Tipo</span><select name="tipo">${TIPOS_ACT.map(t => `<option ${act?.tipo === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        <label class="field"><span>Valor (puntos) *</span><input name="valor" type="number" min="0.5" max="100" step="0.5" required value="${sugerido || ''}"></label>
        <label class="field"><span>Parcial</span><select name="parcial">${PARCIALES.map(p => `<option value="${p}" ${Number(act?.parcial ?? parcial) === p ? 'selected' : ''}>${ROMANO[p]} Parcial</option>`).join('')}</select></label>
        <label class="field"><span>Fecha</span><input name="fecha" type="date" value="${act?.fecha || hoy()}"></label>
        <p class="hint span-2"><i class="fa-solid fa-circle-info"></i> Puntos ya asignados en este parcial: <strong>${fmt(redondear(usado))}</strong> de 100.</p>
      </form>`,
    pie: `<button class="btn btn-light" data-close>Cancelar</button><button class="btn btn-primary" id="g-act"><i class="fa-solid fa-floppy-disk"></i> Guardar</button>`
  });
  $$('[data-close]', m).forEach(b => b.onclick = cerrarModal);
  const form = $('#f-act', m);
  const enviar = async () => {
    if (!form.reportValidity()) return;
    const d = leerForm(form);
    const valor = Number(d.valor);
    // Si se reduce el valor, recortar notas mayores
    const notas = { ...(act?.notas || {}) };
    Object.keys(notas).forEach(k => { if (notas[k] > valor) notas[k] = valor; });
    await conCarga($('#g-act', m), async () => {
      await guardar('actividades', { ...(act ? { id: act.id } : {}), claseId: clase.id, parcial: Number(d.parcial), nombre: d.nombre, tipo: d.tipo, valor, fecha: d.fecha, notas });
      cerrarModal();
      toast(act ? 'Actividad actualizada' : 'Actividad agregada');
      render();
    });
  };
  $('#g-act', m).onclick = enviar;
  form.onsubmit = e => { e.preventDefault(); enviar(); };
}

function resumenAnual(el, clase) {
  const ests = estudiantesDe(clase.cursoId);
  if (!ests.length) {
    el.innerHTML = estadoVacio({ icon: 'fa-user-plus', titulo: 'Este curso no tiene estudiantes', boton: 'Agregar estudiantes', accion: 'estudiantes' });
    return;
  }
  const filas = ests.map(e => ({ e, ...promedioClase(e.id, clase.id) }));
  const promGrupo = PARCIALES.map((p, i) => {
    const v = filas.map(f => f.ps[i]).filter(x => x !== null);
    return v.length ? redondear(v.reduce((a, b) => a + b, 0) / v.length) : null;
  });
  const proms = filas.map(f => f.prom).filter(x => x !== null);
  const promGeneral = proms.length ? redondear(proms.reduce((a, b) => a + b, 0) / proms.length) : null;
  const aprobados = filas.filter(f => f.prom !== null && f.prom >= NOTA_MINIMA).length;
  const enRiesgo = filas.filter(f => f.prom !== null && f.prom < NOTA_MINIMA).length;

  el.innerHTML = `
    <div class="stats-grid">
      ${tarjetaStat('fa-chart-line', 'Promedio del grupo', promGeneral === null ? '—' : fmt(promGeneral) + '%', 'blue')}
      ${tarjetaStat('fa-circle-check', 'Aprobando', aprobados, 'green', `Nota ≥ ${NOTA_MINIMA}`)}
      ${tarjetaStat('fa-triangle-exclamation', 'En riesgo', enRiesgo, 'red', `Nota < ${NOTA_MINIMA}`)}
      ${tarjetaStat('fa-trophy', 'Mejor promedio', proms.length ? fmt(Math.max(...proms)) + '%' : '—', 'gold')}
    </div>

    <div class="card">
      <div class="section-head tight"><h3><i class="fa-solid fa-chart-column"></i> Promedio del grupo por parcial</h3></div>
      <div class="chart-box" style="height:240px"><canvas id="nt-chart"></canvas></div>
    </div>

    <div class="card no-pad">
      <div class="section-head tight pad">
        <h3><i class="fa-solid fa-trophy"></i> Notas finales del año</h3>
        <button class="btn btn-light btn-sm" id="nt-csv"><i class="fa-solid fa-file-csv"></i> Exportar CSV</button>
      </div>
      <div class="table-wrap">
        <table class="table grades-summary" id="nt-resumen">
          <thead><tr><th>#</th><th class="sticky-col">Estudiante</th>${PARCIALES.map(p => `<th class="c">${ROMANO[p]} P</th>`).join('')}<th class="c">Promedio</th><th class="c">Estado</th></tr></thead>
          <tbody>
            ${filas.map((f, i) => {
              const estado = f.prom === null ? ['chip-light', 'Sin notas'] :
                f.evaluados < 4 ? (f.prom >= NOTA_MINIMA ? ['chip-blue', 'En curso'] : ['chip-gold', 'En riesgo']) :
                f.prom >= NOTA_MINIMA ? ['chip-green', 'Aprobado'] : ['chip-red', 'Reprobado'];
              const sep = separadorGenero(ests, i);
              return `${sep ? `<tr class="grupo-row"><td colspan="9"><div class="grupo-sep ${sep.cls}"><i class="fa-solid ${sep.icono}"></i> ${sep.titulo} <span>${sep.n}</span></div></td></tr>` : ''}<tr>
                <td class="muted">${i + 1}</td>
                <td class="sticky-col"><div class="person sm">${avatar(f.e, 'sm')}<strong>${esc(nombreEst(f.e))}</strong></div></td>
                ${f.ps.map(n => `<td class="c ${claseNota(n)}">${fmt(n)}</td>`).join('')}
                <td class="c"><span class="nota-badge ${claseNota(f.prom)}">${fmt(f.prom)}</span></td>
                <td class="c"><span class="chip ${estado[0]}">${estado[1]}</span></td>
              </tr>`;
            }).join('')}
          </tbody>
          <tfoot><tr><td></td><td class="sticky-col"><strong>Promedio del grupo</strong></td>${promGrupo.map(n => `<td class="c"><strong>${fmt(n)}</strong></td>`).join('')}<td class="c"><strong>${fmt(promGeneral)}</strong></td><td></td></tr></tfoot>
        </table>
      </div>
      <p class="hint pad"><i class="fa-solid fa-circle-info"></i> El promedio se calcula con los parciales que ya tienen actividades registradas. Al completar los 4 parciales se muestra el estado final (Aprobado/Reprobado).</p>
    </div>`;

  nuevoGrafico($('#nt-chart', el), {
    type: 'bar',
    data: {
      labels: PARCIALES.map(p => `${ROMANO[p]} Parcial`),
      datasets: [{
        label: 'Promedio', data: promGrupo.map(x => x ?? 0),
        backgroundColor: promGrupo.map(x => x === null ? '#dfe7f2' : x >= NOTA_MINIMA ? '#1e5aa8' : '#e14b4b'),
        borderRadius: 8, maxBarThickness: 70
      }]
    },
    options: {
      maintainAspectRatio: false,
      scales: { y: { min: 0, max: 100, grid: { color: '#eef2f8' } }, x: { grid: { display: false } } },
      plugins: { legend: { display: false } }
    }
  });

  $('#nt-csv', el).onclick = () => {
    const curso = byId('cursos', clase.cursoId);
    const cab = ['N°', 'Apellidos', 'Nombres', 'I Parcial', 'II Parcial', 'III Parcial', 'IV Parcial', 'Promedio'];
    const lineas = [cab, ...filas.map((f, i) => [i + 1, f.e.apellidos, f.e.nombres, ...f.ps.map(n => n ?? ''), f.prom ?? ''])];
    const csv = '﻿' + lineas.map(l => l.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `Notas_${clase.nombre}_${curso?.nombre || ''}_${curso?.seccion || ''}.csv`.replace(/\s+/g, '_');
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
}

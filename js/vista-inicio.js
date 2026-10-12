/* =========================================================
   PANTALLA DE INICIO
   ========================================================= */
function vistaInicio(el) {
  const f = hoy();
  const regsHoy = S.asistencia.filter(r => r.fecha === f);
  let p = 0, t = 0;
  regsHoy.forEach(r => Object.values(r.registros || {}).forEach(x => { t++; if (x.estado === 'P') p++; }));
  const pctHoy = t ? Math.round(p * 100 / t) + '%' : '—';

  const clases = clasesOrdenadas();
  const tarjetas = clases.map(k => {
    const c = byId('cursos', k.cursoId);
    const n = estudiantesDe(k.cursoId).length;
    const tomada = regsHoy.some(r => r.claseId === k.id);
    return `
      <article class="class-card" style="--c:${esc(k.color || '#1e5aa8')}">
        <div class="class-card-top">
          <span class="class-icon"><i class="fa-solid fa-book-open"></i></span>
          <span class="chip ${tomada ? 'chip-green' : 'chip-gold'}">
            <i class="fa-solid ${tomada ? 'fa-circle-check' : 'fa-clock'}"></i> ${tomada ? 'Asistencia tomada' : 'Pendiente hoy'}
          </span>
        </div>
        <h4>${esc(k.nombre)}</h4>
        <p class="class-course">${esc(c?.nombre || 'Sin curso')} <span class="seccion-tag">Sección ${esc(c?.seccion || '-')}</span></p>
        <div class="class-meta">
          ${k.horario ? `<span><i class="fa-regular fa-clock"></i>${esc(k.horario)}</span>` : ''}
          ${k.docente ? `<span><i class="fa-solid fa-chalkboard-user"></i>${esc(k.docente)}</span>` : ''}
          <span><i class="fa-solid fa-users"></i>${n} estudiante${n === 1 ? '' : 's'}</span>
        </div>
        <div class="class-actions">
          <button class="btn btn-primary btn-sm" data-asis="${k.id}"><i class="fa-solid fa-clipboard-check"></i> Asistencia</button>
          <button class="btn btn-gold btn-sm" data-notas="${k.id}"><i class="fa-solid fa-star"></i> Notas</button>
        </div>
      </article>`;
  }).join('');

  el.innerHTML = `
    <div class="hero">
      <div class="hero-text">
        <p class="hero-kicker"><i class="fa-regular fa-calendar"></i> ${fechaLarga(f)}</p>
        <h2>¡Bienvenido(a), docente!</h2>
        <p>Registre la asistencia, administre sus estudiantes y lleve el control de notas de cada parcial en un solo lugar.</p>
      </div>
      <div class="hero-art"><i class="fa-solid fa-graduation-cap"></i></div>
    </div>

    <div class="stats-grid">
      ${tarjetaStat('fa-layer-group', 'Cursos', S.cursos.length, 'blue')}
      ${tarjetaStat('fa-book-open', 'Clases', S.clases.length, 'navy')}
      ${tarjetaStat('fa-user-graduate', 'Estudiantes', S.estudiantes.length, 'gold')}
      ${tarjetaStat('fa-clipboard-check', 'Asistencia de hoy', pctHoy, 'green', t ? `${p} de ${t} registros` : 'Sin registros aún')}
    </div>

    <div class="section-head">
      <h3><i class="fa-solid fa-chalkboard"></i> Mis clases</h3>
      <button class="btn btn-light btn-sm" data-go="cursos"><i class="fa-solid fa-gear"></i> Administrar</button>
    </div>
    ${clases.length ? `<div class="class-grid">${tarjetas}</div>` :
      estadoVacio({ icon: 'fa-chalkboard', titulo: 'Aún no hay clases', texto: 'Cree un curso con su sección y agregue las clases que imparte.', boton: 'Crear curso', accion: 'cursos' })}
  `;

  el.addEventListener('click', e => {
    const a = e.target.closest('[data-asis]');
    if (a) { UI.claseAsis = a.dataset.asis; UI.fechaAsis = hoy(); ir('asistencia'); return; }
    const n = e.target.closest('[data-notas]');
    if (n) { UI.claseNotas = n.dataset.notas; ir('notas'); }
  });
}

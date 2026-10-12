/* =========================================================
   EXPORTAR A EXCEL (.xlsx)
   - Notas de una clase (resumen anual + un parcial por hoja)
   - Asistencia de una clase por rango de fechas
   - Cuadro estadístico de asistencia (con gráficos)
   Usa la librería ExcelJS, que se descarga solo al exportar.
   ========================================================= */
const XL = {
  URLS: [
    'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js',
    'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js'
  ],
  C: {
    navy: 'FF0A2463', blue: 'FF1E5AA8', sky: 'FFEAF2FD', gold: 'FFD4A72C', goldSoft: 'FFFCF4DC',
    green: 'FF0F8A5A', greenSoft: 'FFE2F6EC', red: 'FFC23030', redSoft: 'FFFDE9E9',
    yellow: 'FF8A6A00', yellowSoft: 'FFFFF3C4', pink: 'FFB8336E', pinkSoft: 'FFFBE7F1',
    grey: 'FF6A7A93', greySoft: 'FFF0F3F8', border: 'FFD5DEEC', white: 'FFFFFFFF'
  },

  async cargar() {
    if (window.ExcelJS) return window.ExcelJS;
    for (const url of this.URLS) {
      try {
        await new Promise((ok, mal) => {
          const s = document.createElement('script');
          s.src = url; s.onload = ok; s.onerror = mal;
          document.head.appendChild(s);
        });
        if (window.ExcelJS) return window.ExcelJS;
      } catch (e) { /* probar siguiente */ }
    }
    throw new Error('No se pudo descargar la librería de Excel. Revise su conexión a internet.');
  },

  fill(argb) { return { type: 'pattern', pattern: 'solid', fgColor: { argb } }; },
  borde() {
    const b = { style: 'thin', color: { argb: this.C.border } };
    return { top: b, left: b, bottom: b, right: b };
  },

  // Título y datos generales en la parte superior de la hoja
  encabezado(ws, titulo, lineas, ncols) {
    ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } };
    ws.mergeCells(1, 1, 1, Math.max(ncols, 4));
    const t = ws.getCell(1, 1);
    t.value = titulo;
    t.font = { bold: true, size: 16, color: { argb: this.C.white } };
    t.fill = this.fill(this.C.navy);
    t.alignment = { vertical: 'middle', indent: 1 };
    ws.getRow(1).height = 30;
    lineas.forEach((l, i) => {
      const r = 2 + i;
      ws.mergeCells(r, 1, r, Math.max(ncols, 4));
      const c = ws.getCell(r, 1);
      c.value = l;
      c.font = { size: 11, color: { argb: i === 0 ? this.C.navy : this.C.grey }, bold: i === 0 };
      c.fill = this.fill(i === 0 ? this.C.goldSoft : this.C.white);
      c.alignment = { indent: 1 };
    });
    return 2 + lineas.length + 1; // fila libre siguiente (deja una en blanco)
  },

  cabecera(row, altura = 30) {
    row.height = altura;
    row.eachCell(c => {
      c.font = { bold: true, color: { argb: this.C.white } };
      c.fill = this.fill(this.C.blue);
      c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      c.border = this.borde();
    });
  },

  celdas(row, desde = 1, hasta = row.cellCount) {
    for (let i = desde; i <= hasta; i++) {
      const c = row.getCell(i);
      c.border = this.borde();
      if (!c.alignment) c.alignment = { vertical: 'middle' };
    }
  },

  // Fila separadora por género (igual que en el sistema)
  separador(ws, fila, texto, g, ncols) {
    ws.mergeCells(fila, 1, fila, ncols);
    const c = ws.getCell(fila, 1);
    c.value = texto;
    const col = g === 0 ? [this.C.pinkSoft, this.C.pink] : g === 1 ? [this.C.sky, this.C.blue] : [this.C.greySoft, this.C.grey];
    c.fill = this.fill(col[0]);
    c.font = { bold: true, color: { argb: col[1] } };
    c.alignment = { indent: 1, vertical: 'middle' };
    ws.getRow(fila).height = 20;
  },

  colNota(c, n) {
    if (n === null || n === undefined || n === '') return;
    c.fill = this.fill(n >= NOTA_MINIMA ? this.C.greenSoft : this.C.redSoft);
    c.font = { bold: true, color: { argb: n >= NOTA_MINIMA ? this.C.green : this.C.red } };
  },

  letra(n) { // número de columna → letra (1 → A)
    let s = '';
    while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
    return s;
  },

  generoTxt(e) { return e?.genero === 'F' ? 'Femenino' : e?.genero === 'M' ? 'Masculino' : 'Sin especificar'; },

  nombreArchivo(...partes) {
    return partes.filter(Boolean).join('_')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^\w\-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') + '.xlsx';
  },

  async descargar(wb, nombre) {
    const buf = await wb.xlsx.writeBuffer();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  },

  libro(ExcelJS) {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'EduAsistencia';
    wb.created = new Date();
    return wb;
  },

  generado() { return `Generado el ${fechaCorta(hoy())} · EduAsistencia`; }
};

// Escribe la lista de estudiantes con separadores por género.
// porFila(e, i, filaExcel) debe devolver el arreglo de valores de esa fila.
function xlFilasEstudiantes(ws, fila, ests, ncols, porFila, conSeparadores = true) {
  const filasDatos = [];
  ests.forEach((e, i) => {
    if (conSeparadores) {
      const sep = separadorGenero(ests, i);
      if (sep) { XL.separador(ws, fila, `${sep.titulo} (${sep.n})`, sep.g, ncols); fila++; }
    }
    const r = ws.getRow(fila);
    r.values = porFila(e, i, fila);
    XL.celdas(r, 1, ncols);
    filasDatos.push({ e, fila, row: r });
    fila++;
  });
  return { fila, filasDatos };
}

/* =========================================================
   1) NOTAS DE UNA CLASE
   ========================================================= */
async function exportarNotasExcel(clase) {
  const ExcelJS = await XL.cargar();
  const curso = byId('cursos', clase.cursoId);
  const ests = estudiantesDe(clase.cursoId);
  const wb = XL.libro(ExcelJS);
  const info = [`Clase: ${clase.nombre}  ·  ${cursoLabel(curso)}${clase.docente ? '  ·  Docente: ' + clase.docente : ''}`,
    `Nota mínima de aprobación: ${NOTA_MINIMA}  ·  ${XL.generado()}`];

  // --- Hoja Resumen anual ---
  {
    const ws = wb.addWorksheet('Resumen anual', { views: [{ state: 'frozen', xSplit: 2, ySplit: 5 }] });
    const ncols = 9;
    let fila = XL.encabezado(ws, 'Notas finales del año', info, ncols);
    const cab = ws.getRow(fila);
    cab.values = ['N°', 'Estudiante', 'Género', 'I Parcial', 'II Parcial', 'III Parcial', 'IV Parcial', 'Promedio', 'Estado'];
    XL.cabecera(cab);
    ws.views = [{ state: 'frozen', xSplit: 2, ySplit: fila }];
    fila++;
    const res = xlFilasEstudiantes(ws, fila, ests, ncols, (e, i) => {
      const r = promedioClase(e.id, clase.id);
      const estado = r.prom === null ? 'Sin notas' : r.evaluados < 4 ? (r.prom >= NOTA_MINIMA ? 'En curso' : 'En riesgo')
        : r.prom >= NOTA_MINIMA ? 'Aprobado' : 'Reprobado';
      return [i + 1, nombreEst(e), XL.generoTxt(e), ...r.ps.map(n => n ?? ''), r.prom ?? '', estado];
    });
    res.filasDatos.forEach(({ e, row }) => {
      const r = promedioClase(e.id, clase.id);
      r.ps.forEach((n, k) => { const c = row.getCell(4 + k); c.numFmt = '0.0'; c.alignment = { horizontal: 'center' }; if (n !== null) c.font = { color: { argb: n >= NOTA_MINIMA ? XL.C.green : XL.C.red } }; });
      const cp = row.getCell(8); cp.numFmt = '0.0'; cp.alignment = { horizontal: 'center' }; XL.colNota(cp, r.prom);
      row.getCell(9).alignment = { horizontal: 'center' };
      row.getCell(1).alignment = { horizontal: 'center' };
    });
    // Promedio del grupo con fórmulas
    const f = res.fila;
    const filas = res.filasDatos.map(x => x.fila);
    const tot = ws.getRow(f);
    tot.getCell(2).value = 'Promedio del grupo';
    for (let col = 4; col <= 8; col++) {
      const L = XL.letra(col);
      const vals = res.filasDatos.map(x => x.row.getCell(col).value).filter(v => typeof v === 'number');
      tot.getCell(col).value = filas.length ? { formula: `IFERROR(AVERAGE(${filas.map(n => L + n).join(',')}),"")`, result: vals.length ? redondear(vals.reduce((a, b) => a + b, 0) / vals.length) : '' } : '';
      tot.getCell(col).numFmt = '0.0';
      tot.getCell(col).alignment = { horizontal: 'center' };
    }
    XL.celdas(tot, 1, ncols);
    tot.eachCell(c => { c.font = { bold: true, color: { argb: XL.C.navy } }; c.fill = XL.fill(XL.C.goldSoft); });
    ws.columns = [{ width: 6 }, { width: 36 }, { width: 13 }, { width: 11 }, { width: 11 }, { width: 11 }, { width: 11 }, { width: 12 }, { width: 13 }];
  }

  // --- Una hoja por parcial ---
  for (const p of PARCIALES) {
    const acts = actividadesDe(clase.id, p);
    const ws = wb.addWorksheet(`${ROMANO[p]} Parcial`);
    const ncols = 3 + acts.length + 1;
    const valorTotal = redondear(acts.reduce((s, a) => s + Number(a.valor || 0), 0));
    let fila = XL.encabezado(ws, `Registro de notas · ${ROMANO[p]} Parcial`, [info[0], `Valor del parcial: ${fmt(valorTotal)} pts  ·  ${XL.generado()}`], ncols);
    if (!acts.length) {
      ws.getCell(fila, 1).value = 'No hay actividades registradas en este parcial.';
      ws.getCell(fila, 1).font = { italic: true, color: { argb: XL.C.grey } };
      ws.columns = [{ width: 6 }, { width: 36 }];
      continue;
    }
    const cab = ws.getRow(fila);
    cab.values = ['N°', 'Estudiante', 'Género', ...acts.map(a => `${tituloAct(a)}\n(${fmt(Number(a.valor))} pts)`), `TOTAL\n(${fmt(valorTotal)} pts)`];
    XL.cabecera(cab, 46);
    acts.forEach((a, k) => { if (descAct(a)) cab.getCell(4 + k).note = descAct(a); });
    cab.getCell(ncols).fill = XL.fill(XL.C.gold);
    cab.getCell(ncols).font = { bold: true, color: { argb: XL.C.navy } };
    ws.views = [{ state: 'frozen', xSplit: 2, ySplit: fila }];
    fila++;
    const res = xlFilasEstudiantes(ws, fila, ests, ncols, (e, i) => [i + 1, nombreEst(e), XL.generoTxt(e), ...acts.map(a => {
      const v = a.notas?.[e.id];
      return v === undefined || v === null || v === '' ? '' : Number(v);
    })]);
    res.filasDatos.forEach(({ e, fila: fr, row }) => {
      for (let k = 0; k < acts.length; k++) { const c = row.getCell(4 + k); c.numFmt = '0.0'; c.alignment = { horizontal: 'center' }; }
      const total = totalParcial(e.id, clase.id, p);
      const c = row.getCell(ncols);
      c.value = { formula: `SUM(D${fr}:${XL.letra(ncols - 1)}${fr})`, result: total ?? 0 };
      c.numFmt = '0.0'; c.alignment = { horizontal: 'center' };
      XL.colNota(c, total);
      row.getCell(1).alignment = { horizontal: 'center' };
    });
    ws.columns = [{ width: 6 }, { width: 36 }, { width: 13 }, ...acts.map(() => ({ width: 15 })), { width: 13 }];
  }

  // --- Hoja con el detalle de actividades ---
  {
    const ws = wb.addWorksheet('Actividades');
    let fila = XL.encabezado(ws, 'Actividades de la clase', [info[0]], 6);
    const cab = ws.getRow(fila);
    cab.values = ['Parcial', 'Título', 'Descripción', 'Tipo', 'Valor (pts)', 'Fecha'];
    XL.cabecera(cab, 22);
    fila++;
    PARCIALES.forEach(p => actividadesDe(clase.id, p).forEach(a => {
      const r = ws.getRow(fila++);
      r.values = [`${ROMANO[p]} Parcial`, tituloAct(a), descAct(a), a.tipo || '', Number(a.valor) || 0, a.fecha ? fechaCorta(a.fecha) : ''];
      XL.celdas(r, 1, 6);
      r.getCell(3).alignment = { wrapText: true, vertical: 'middle' };
      r.getCell(5).alignment = { horizontal: 'center' };
    }));
    ws.columns = [{ width: 12 }, { width: 24 }, { width: 50 }, { width: 14 }, { width: 11 }, { width: 12 }];
  }

  await XL.descargar(wb, XL.nombreArchivo('Notas', clase.nombre, curso?.nombre, curso?.seccion));
}

/* =========================================================
   2) ASISTENCIA DE UNA CLASE (rango de fechas)
   ========================================================= */
function formExportarAsistencia(clase) {
  const regs = S.asistencia.filter(r => r.claseId === clase.id).map(r => r.fecha).sort();
  const primero = regs[0] || hoy();
  const h = hoy();
  const inicioMes = h.slice(0, 8) + '01';
  const m = abrirModal({
    titulo: '<i class="fa-solid fa-file-excel"></i> Exportar asistencia a Excel',
    cuerpo: `
      <p class="hint"><i class="fa-solid fa-circle-info"></i> Clase <strong>${esc(clase.nombre)}</strong> — ${esc(cursoLabel(byId('cursos', clase.cursoId)))}.
        Hay <strong>${regs.length}</strong> día(s) con asistencia registrada.</p>
      <div class="rango-rapido">
        <button class="btn btn-light btn-sm" data-r="mes">Este mes</button>
        <button class="btn btn-light btn-sm" data-r="todo">Todo lo registrado</button>
      </div>
      <div class="form-grid">
        <label class="field"><span>Desde</span><input type="date" id="ex-desde" value="${primero}"></label>
        <label class="field"><span>Hasta</span><input type="date" id="ex-hasta" value="${h}"></label>
      </div>
      <p class="small muted" style="margin-top:12px">El archivo incluye: la planilla por fecha (P / A / E con colores), el resumen por estudiante, las observaciones y el resumen por día.</p>`,
    pie: `<button class="btn btn-light" data-close>Cancelar</button><button class="btn btn-green" id="ex-ok"><i class="fa-solid fa-file-excel"></i> Descargar Excel</button>`
  });
  $$('[data-close]', m).forEach(b => b.onclick = cerrarModal);
  $$('[data-r]', m).forEach(b => b.onclick = () => {
    $('#ex-desde', m).value = b.dataset.r === 'mes' ? inicioMes : primero;
    $('#ex-hasta', m).value = h;
  });
  $('#ex-ok', m).onclick = async ev => {
    const d = $('#ex-desde', m).value, hh = $('#ex-hasta', m).value;
    if (!d || !hh || d > hh) { toast('Revise el rango de fechas', 'error'); return; }
    await conCarga(ev.currentTarget, async () => {
      const n = await exportarAsistenciaExcel(clase, d, hh);
      cerrarModal();
      toast(n ? `Excel generado con ${n} día(s) de asistencia` : 'No hay asistencia en ese rango; se generó el archivo vacío', n ? 'ok' : 'warn');
    });
  };
}

async function exportarAsistenciaExcel(clase, desde, hasta) {
  const ExcelJS = await XL.cargar();
  const curso = byId('cursos', clase.cursoId);
  const ests = estudiantesDe(clase.cursoId);
  const regs = S.asistencia.filter(r => r.claseId === clase.id && r.fecha >= desde && r.fecha <= hasta)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  const wb = XL.libro(ExcelJS);
  const info = [`Clase: ${clase.nombre}  ·  ${cursoLabel(curso)}${clase.docente ? '  ·  Docente: ' + clase.docente : ''}`,
    `Período: ${fechaCorta(desde)} al ${fechaCorta(hasta)}  ·  ${regs.length} día(s) registrados  ·  ${XL.generado()}`,
    'P = Presente   ·   A = Ausente (inasistencia)   ·   E = Excusa'];
  const EST = {
    P: [XL.C.greenSoft, XL.C.green], A: [XL.C.redSoft, XL.C.red], E: [XL.C.yellowSoft, XL.C.yellow]
  };
  const DIAS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];
  const conteo = e => {
    let p = 0, a = 0, x = 0;
    regs.forEach(r => { const s = r.registros?.[e.id]?.estado; if (s === 'P') p++; else if (s === 'A') a++; else if (s === 'E') x++; });
    return { p, a, x, t: p + a + x };
  };

  // --- Planilla por fecha ---
  {
    const ws = wb.addWorksheet('Asistencia');
    const nf = regs.length;
    const ncols = 3 + nf + 5;
    let fila = XL.encabezado(ws, 'Control de asistencia', info, Math.min(ncols, 20));
    const cab = ws.getRow(fila);
    cab.values = ['N°', 'Estudiante', 'Género',
      ...regs.map(r => { const dt = new Date(r.fecha + 'T00:00:00'); return `${DIAS[dt.getDay()]}\n${fechaCorta(r.fecha).slice(0, 5)}`; }),
      'Asist.', 'Inasist.', 'Excusas', 'Total', '% Asist.'];
    XL.cabecera(cab, 34);
    for (let k = 0; k < 5; k++) { const c = cab.getCell(4 + nf + k); c.fill = XL.fill(XL.C.navy); }
    ws.views = [{ state: 'frozen', xSplit: 3, ySplit: fila }];
    fila++;
    const res = xlFilasEstudiantes(ws, fila, ests, ncols, (e, i) => {
      const k = conteo(e);
      return [i + 1, nombreEst(e), XL.generoTxt(e), ...regs.map(r => r.registros?.[e.id]?.estado || ''), k.p, k.a, k.x, k.t, k.t ? k.p / k.t : ''];
    });
    res.filasDatos.forEach(({ e, fila: fr, row }) => {
      regs.forEach((r, k) => {
        const reg = r.registros?.[e.id];
        const c = row.getCell(4 + k);
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        if (reg && EST[reg.estado]) {
          c.fill = XL.fill(EST[reg.estado][0]);
          c.font = { bold: true, color: { argb: EST[reg.estado][1] } };
          if (reg.obs) c.note = reg.obs;
        }
      });
      const base = 4 + nf;
      const rango = nf ? `${XL.letra(4)}${fr}:${XL.letra(3 + nf)}${fr}` : null;
      const k = conteo(e);
      if (rango) {
        row.getCell(base).value = { formula: `COUNTIF(${rango},"P")`, result: k.p };
        row.getCell(base + 1).value = { formula: `COUNTIF(${rango},"A")`, result: k.a };
        row.getCell(base + 2).value = { formula: `COUNTIF(${rango},"E")`, result: k.x };
        row.getCell(base + 3).value = { formula: `SUM(${XL.letra(base)}${fr}:${XL.letra(base + 2)}${fr})`, result: k.t };
        row.getCell(base + 4).value = { formula: `IF(${XL.letra(base + 3)}${fr}=0,"",${XL.letra(base)}${fr}/${XL.letra(base + 3)}${fr})`, result: k.t ? k.p / k.t : '' };
      }
      [[base, EST.P], [base + 1, EST.A], [base + 2, EST.E]].forEach(([col, cc]) => {
        const c = row.getCell(col); c.alignment = { horizontal: 'center' }; c.font = { bold: true, color: { argb: cc[1] } };
      });
      row.getCell(base + 3).alignment = { horizontal: 'center' };
      const cp = row.getCell(base + 4);
      cp.numFmt = '0%'; cp.alignment = { horizontal: 'center' };
      if (k.t) {
        const pct = k.p / k.t;
        cp.fill = XL.fill(pct >= 0.9 ? XL.C.greenSoft : pct >= 0.75 ? XL.C.yellowSoft : XL.C.redSoft);
        cp.font = { bold: true, color: { argb: pct >= 0.9 ? XL.C.green : pct >= 0.75 ? XL.C.yellow : XL.C.red } };
      }
      row.getCell(1).alignment = { horizontal: 'center' };
    });
    ws.columns = [{ width: 6 }, { width: 34 }, { width: 12 }, ...regs.map(() => ({ width: 6.5 })), { width: 8 }, { width: 9 }, { width: 9 }, { width: 7 }, { width: 9 }];
    if (!nf) {
      ws.getCell(fila + ests.length + 3, 2).value = 'No hay asistencia registrada en el período seleccionado.';
    }
  }

  // --- Observaciones ---
  {
    const ws = wb.addWorksheet('Observaciones');
    let fila = XL.encabezado(ws, 'Inasistencias, excusas y observaciones', info.slice(0, 2), 5);
    const cab = ws.getRow(fila);
    cab.values = ['Fecha', 'Día', 'Estudiante', 'Estado', 'Comentario u observación'];
    XL.cabecera(cab, 22);
    ws.views = [{ state: 'frozen', ySplit: fila }];
    fila++;
    let n = 0;
    regs.forEach(r => ests.forEach(e => {
      const reg = r.registros?.[e.id];
      if (!reg || (reg.estado === 'P' && !reg.obs)) return;
      const row = ws.getRow(fila++);
      row.values = [fechaCorta(r.fecha), fechaLarga(r.fecha).split(',')[0], nombreEst(e), ESTADOS[reg.estado].txt, reg.obs || ''];
      XL.celdas(row, 1, 5);
      const c = row.getCell(4);
      c.fill = XL.fill(EST[reg.estado][0]); c.font = { bold: true, color: { argb: EST[reg.estado][1] } };
      row.getCell(5).alignment = { wrapText: true, vertical: 'middle' };
      n++;
    }));
    if (!n) ws.getCell(fila, 1).value = 'Sin inasistencias, excusas ni observaciones en el período.';
    ws.columns = [{ width: 12 }, { width: 12 }, { width: 34 }, { width: 12 }, { width: 55 }];
  }

  // --- Resumen por día ---
  {
    const ws = wb.addWorksheet('Resumen por día');
    let fila = XL.encabezado(ws, 'Resumen de asistencia por día', info.slice(0, 2), 6);
    const cab = ws.getRow(fila);
    cab.values = ['Fecha', 'Día', 'Presentes', 'Ausentes', 'Excusas', '% Asistencia'];
    XL.cabecera(cab, 22);
    fila++;
    regs.forEach(r => {
      let p = 0, a = 0, x = 0;
      ests.forEach(e => { const s = r.registros?.[e.id]?.estado; if (s === 'P') p++; else if (s === 'A') a++; else if (s === 'E') x++; });
      const t = p + a + x;
      const row = ws.getRow(fila++);
      row.values = [fechaCorta(r.fecha), fechaLarga(r.fecha).split(',')[0], p, a, x, t ? p / t : ''];
      XL.celdas(row, 1, 6);
      row.getCell(6).numFmt = '0%';
      [3, 4, 5, 6].forEach(k => row.getCell(k).alignment = { horizontal: 'center' });
    });
    ws.columns = [{ width: 12 }, { width: 13 }, { width: 11 }, { width: 11 }, { width: 11 }, { width: 13 }];
  }

  await XL.descargar(wb, XL.nombreArchivo('Asistencia', clase.nombre, curso?.nombre, curso?.seccion, desde, 'al', hasta));
  return regs.length;
}

/* =========================================================
   3) CUADRO ESTADÍSTICO DE ASISTENCIA
   ========================================================= */
async function exportarEstadisticoExcel(cursoId, canvases = []) {
  const ExcelJS = await XL.cargar();
  const curso = cursoId ? byId('cursos', cursoId) : null;
  const lista = (cursoId ? estudiantesDe(cursoId)
    : cursosOrdenados().flatMap(c => estudiantesDe(c.id)));
  const wb = XL.libro(ExcelJS);
  const alcance = curso ? cursoLabel(curso) : 'Todos los cursos';
  const filas = lista.map(e => ({ e, s: statsEstudiante(e.id) }));
  const P = filas.reduce((a, f) => a + f.s.p, 0), A = filas.reduce((a, f) => a + f.s.a, 0), E = filas.reduce((a, f) => a + f.s.e, 0);
  const T = P + A + E;

  // --- Cuadro estadístico ---
  {
    const ws = wb.addWorksheet('Cuadro estadístico');
    const ncols = 9;
    let fila = XL.encabezado(ws, 'Cuadro estadístico de asistencia', [alcance, XL.generado()], ncols);
    // Resumen general
    const resumen = [['Estudiantes', lista.length, XL.C.sky, XL.C.blue], ['Asistencias', P, XL.C.greenSoft, XL.C.green],
      ['Inasistencias', A, XL.C.redSoft, XL.C.red], ['Días con excusa', E, XL.C.yellowSoft, XL.C.yellow],
      ['Asistencia promedio', T ? P / T : '', XL.C.goldSoft, XL.C.navy]];
    const rEt = ws.getRow(fila), rVal = ws.getRow(fila + 1);
    resumen.forEach(([et, val, bg, fg], k) => {
      const col = 2 + k;
      const a = rEt.getCell(col), b = rVal.getCell(col);
      a.value = et; b.value = val;
      a.fill = XL.fill(bg); b.fill = XL.fill(bg);
      a.font = { size: 10, color: { argb: XL.C.grey } }; b.font = { size: 16, bold: true, color: { argb: fg } };
      a.alignment = { horizontal: 'center', wrapText: true }; b.alignment = { horizontal: 'center' };
      a.border = XL.borde(); b.border = XL.borde();
      if (k === 4) b.numFmt = '0%';
    });
    rVal.height = 26;
    fila += 3;
    const cab = ws.getRow(fila);
    cab.values = ['N°', 'Estudiante', 'Género', 'Curso', 'Asistencias', 'Inasistencias', 'Excusas', 'Total registros', '% Asistencia'];
    XL.cabecera(cab);
    ws.views = [{ state: 'frozen', xSplit: 2, ySplit: fila }];
    fila++;
    const inicio = fila;
    let actualCurso = null, num = 0;
    lista.forEach((e, i) => {
      if (!cursoId && e.cursoId !== actualCurso) {
        actualCurso = e.cursoId;
        ws.mergeCells(fila, 1, fila, ncols);
        const c = ws.getCell(fila, 1);
        c.value = cursoLabel(byId('cursos', e.cursoId));
        c.fill = XL.fill(XL.C.navy); c.font = { bold: true, color: { argb: XL.C.white } }; c.alignment = { indent: 1 };
        fila++;
      }
      const grupo = lista.filter(x => x.cursoId === e.cursoId);
      const sep = separadorGenero(grupo, grupo.indexOf(e));
      if (sep) { XL.separador(ws, fila, `${sep.titulo} (${sep.n})`, sep.g, ncols); fila++; }
      const s = statsEstudiante(e.id);
      const c = byId('cursos', e.cursoId);
      const row = ws.getRow(fila);
      row.values = [++num, nombreEst(e), XL.generoTxt(e), c ? `${c.nombre} ${c.seccion}` : '', s.p, s.a, s.e,
        { formula: `SUM(E${fila}:G${fila})`, result: s.t }, { formula: `IF(H${fila}=0,"",E${fila}/H${fila})`, result: s.t ? s.p / s.t : '' }];
      XL.celdas(row, 1, ncols);
      [[5, XL.C.greenSoft, XL.C.green], [6, XL.C.redSoft, XL.C.red], [7, XL.C.yellowSoft, XL.C.yellow]].forEach(([k, bg, fg]) => {
        const cc = row.getCell(k); cc.fill = XL.fill(bg); cc.font = { bold: true, color: { argb: fg } }; cc.alignment = { horizontal: 'center' };
      });
      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(8).alignment = { horizontal: 'center' };
      const cp = row.getCell(9); cp.numFmt = '0%'; cp.alignment = { horizontal: 'center' };
      if (s.t) { const pct = s.p / s.t; cp.font = { bold: true, color: { argb: pct >= 0.9 ? XL.C.green : pct >= 0.75 ? XL.C.yellow : XL.C.red } }; }
      fila++;
    });
    // Totales
    const tot = ws.getRow(fila);
    tot.getCell(2).value = 'TOTALES';
    if (fila > inicio) {
      ['E', 'F', 'G', 'H'].forEach((L, k) => { tot.getCell(5 + k).value = { formula: `SUM(${L}${inicio}:${L}${fila - 1})`, result: [P, A, E, T][k] }; });
      tot.getCell(9).value = { formula: `IF(H${fila}=0,"",E${fila}/H${fila})`, result: T ? P / T : '' };
    }
    tot.getCell(9).numFmt = '0%';
    XL.celdas(tot, 1, ncols);
    tot.eachCell(c => { c.font = { bold: true, color: { argb: XL.C.navy } }; c.fill = XL.fill(XL.C.goldSoft); c.alignment = { horizontal: 'center' }; });
    tot.getCell(2).alignment = { horizontal: 'left', indent: 1 };
    ws.columns = [{ width: 6 }, { width: 34 }, { width: 13 }, { width: 22 }, { width: 13 }, { width: 13 }, { width: 11 }, { width: 11 }, { width: 13 }];
  }

  // --- Por clase ---
  {
    const ws = wb.addWorksheet('Por clase');
    const ncols = 8;
    let fila = XL.encabezado(ws, 'Asistencia por clase', [alcance, XL.generado()], ncols);
    const cab = ws.getRow(fila);
    cab.values = ['Estudiante', 'Género', 'Clase', 'Asistencias', 'Inasistencias', 'Excusas', 'Total', '% Asistencia'];
    XL.cabecera(cab);
    ws.views = [{ state: 'frozen', xSplit: 1, ySplit: fila }];
    fila++;
    lista.forEach(e => {
      clasesDe(e.cursoId).forEach((k, idx) => {
        const s = statsEstudiante(e.id, k.id);
        const row = ws.getRow(fila++);
        row.values = [idx === 0 ? nombreEst(e) : '', idx === 0 ? XL.generoTxt(e) : '', k.nombre, s.p, s.a, s.e, s.t, s.t ? s.p / s.t : ''];
        XL.celdas(row, 1, ncols);
        [4, 5, 6, 7].forEach(c => row.getCell(c).alignment = { horizontal: 'center' });
        row.getCell(8).numFmt = '0%'; row.getCell(8).alignment = { horizontal: 'center' };
        if (idx === 0) row.getCell(1).font = { bold: true, color: { argb: XL.C.navy } };
      });
    });
    ws.columns = [{ width: 34 }, { width: 13 }, { width: 26 }, { width: 12 }, { width: 13 }, { width: 10 }, { width: 9 }, { width: 13 }];
  }

  // --- Gráficos (imágenes de los gráficos de la pantalla) ---
  const imgs = canvases.filter(cv => cv && cv.width && cv.height);
  if (imgs.length) {
    const ws = wb.addWorksheet('Gráficos');
    let fila = XL.encabezado(ws, 'Gráficos de asistencia', [alcance, XL.generado()], 10);
    imgs.forEach(cv => {
      // Fondo blanco para que el gráfico se vea bien en Excel
      const tmp = document.createElement('canvas');
      tmp.width = cv.width; tmp.height = cv.height;
      const ctx = tmp.getContext('2d');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, tmp.width, tmp.height);
      ctx.drawImage(cv, 0, 0);
      const id = wb.addImage({ base64: tmp.toDataURL('image/png'), extension: 'png' });
      const ancho = Math.round(Math.min(640, 360 * cv.width / cv.height)), alto = Math.round(ancho * cv.height / cv.width);
      ws.addImage(id, { tl: { col: 0.2, row: fila - 1 }, ext: { width: ancho, height: alto } });
      fila += Math.ceil(alto / 20) + 2;
    });
  }

  await XL.descargar(wb, XL.nombreArchivo('Cuadro_estadistico_asistencia', curso ? `${curso.nombre}_${curso.seccion}` : 'todos_los_cursos'));
}

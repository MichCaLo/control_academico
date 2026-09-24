/* =========================================================
   DATOS DE EJEMPLO (solo se usan en modo demo, sin Firebase)
   ========================================================= */
function datosDemo() {
  const id = () => Math.random().toString(36).slice(2, 10);
  const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const db = { cursos: {}, clases: {}, estudiantes: {}, asistencia: {}, actividades: {} };
  const anio = String(new Date().getFullYear());

  const c1 = id(), c2 = id();
  db.cursos[c1] = { nombre: 'Décimo Grado', seccion: 'A', jornada: 'Matutina', anio };
  db.cursos[c2] = { nombre: 'Undécimo Grado', seccion: 'B', jornada: 'Vespertina', anio };

  const clases = [
    { cursoId: c1, nombre: 'Matemáticas', docente: 'Lic. Ana Martínez', horario: 'Lun a Vie · 7:00 – 7:45', aula: 'Aula 12', color: '#1e5aa8' },
    { cursoId: c1, nombre: 'Español', docente: 'Lic. Carlos Reyes', horario: 'Lun a Vie · 7:45 – 8:30', aula: 'Aula 12', color: '#15a06a' },
    { cursoId: c2, nombre: 'Ciencias Naturales', docente: 'Lic. Sofía Mejía', horario: 'Lun, Mié, Vie · 1:00 – 2:30', aula: 'Laboratorio', color: '#d4a72c' },
    { cursoId: c2, nombre: 'Inglés', docente: 'Lic. Daniel Castro', horario: 'Mar y Jue · 2:30 – 4:00', aula: 'Aula 8', color: '#7b5cd6' }
  ];
  const claseIds = clases.map(c => { const k = id(); db.clases[k] = c; return k; });

  const alumnos = {
    [c1]: [['Andrea Sofía', 'Aguilar López', 'F'], ['Brayan José', 'Banegas Cruz', 'M'], ['Camila Isabel', 'Castillo Pineda', 'F'],
           ['Diego Alejandro', 'Díaz Moncada', 'M'], ['Fernanda', 'Flores Zelaya', 'F'], ['Gabriel', 'Hernández Ramos', 'M'],
           ['Karla Michelle', 'Lagos Ortiz', 'F'], ['Luis Fernando', 'Mendoza Paz', 'M']],
    [c2]: [['Valeria', 'Núñez Rivera', 'F'], ['José David', 'Ortega Suazo', 'M'], ['María José', 'Pérez Galeas', 'F'],
           ['Ricardo', 'Rodríguez Amaya', 'M'], ['Sara Nicole', 'Sierra Midence', 'F'], ['Tomás Eduardo', 'Turcios Bonilla', 'M'],
           ['Ximena', 'Velásquez Maradiaga', 'F']]
  };
  const estPorCurso = {};
  Object.entries(alumnos).forEach(([cursoId, lista]) => {
    estPorCurso[cursoId] = lista.map(([nombres, apellidos, genero], i) => {
      const k = id();
      db.estudiantes[k] = {
        cursoId, nombres, apellidos, genero,
        identidad: `0801-20${10 + (i % 3)}-${String(10000 + Math.floor(Math.random() * 89999))}`,
        encargado: 'Encargado de ' + nombres.split(' ')[0],
        telefono: `9${Math.floor(1000 + Math.random() * 8999)}-${Math.floor(1000 + Math.random() * 8999)}`,
        correo: ''
      };
      return k;
    });
  });

  // Asistencia de los últimos 25 días hábiles
  const fechas = [];
  const d = new Date(); d.setDate(d.getDate() - 1);
  while (fechas.length < 25) {
    if (d.getDay() !== 0 && d.getDay() !== 6) fechas.push(iso(d));
    d.setDate(d.getDate() - 1);
  }
  claseIds.forEach((claseId, ci) => {
    const cursoId = clases[ci].cursoId;
    fechas.forEach(fecha => {
      const registros = {};
      estPorCurso[cursoId].forEach(eid => {
        const r = Math.random();
        if (r < 0.82) registros[eid] = { estado: 'P', obs: '' };
        else if (r < 0.93) registros[eid] = { estado: 'A', obs: Math.random() < 0.4 ? 'No justificó la inasistencia' : '' };
        else registros[eid] = { estado: 'E', obs: ['Presentó constancia médica', 'Cita familiar justificada', 'Actividad deportiva del colegio'][Math.floor(Math.random() * 3)] };
      });
      db.asistencia[`${claseId}_${fecha}`] = { claseId, cursoId, fecha, registros, actualizado: new Date().toISOString() };
    });
  });

  // Actividades y notas
  const plan = {
    1: [['Tarea 1', 'Tarea', 10], ['Tarea 2', 'Tarea', 10], ['Proyecto grupal', 'Proyecto', 20], ['Participación', 'Participación', 10], ['Acumulativo', 'Otro', 20], ['Examen parcial', 'Examen', 30]],
    2: [['Investigación', 'Tarea', 15], ['Laboratorio 1', 'Laboratorio', 15], ['Exposición', 'Exposición', 20]]
  };
  claseIds.forEach((claseId, ci) => {
    const cursoId = clases[ci].cursoId;
    Object.entries(plan).forEach(([parcial, acts]) => {
      acts.forEach(([nombre, tipo, valor], ai) => {
        const notas = {};
        estPorCurso[cursoId].forEach(eid => {
          notas[eid] = Math.round(valor * (0.55 + Math.random() * 0.45) * 2) / 2;
        });
        const f = new Date(); f.setDate(f.getDate() - (parcial == 1 ? 60 : 14) + ai * 5);
        db.actividades[id()] = { claseId, parcial: Number(parcial), nombre, tipo, valor, fecha: iso(f), notas };
      });
    });
  });

  return db;
}

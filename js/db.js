/* =========================================================
   CAPA DE DATOS
   Usa Cloud Firestore si firebase-config.js está configurado;
   si no, usa el almacenamiento local del navegador (modo demo).
   Colecciones: cursos, clases, estudiantes, asistencia, actividades
   ========================================================= */
const COLECCIONES = ['cursos', 'clases', 'estudiantes', 'asistencia', 'actividades'];
const LOCAL_KEY = 'eduasistencia_db_v1';
const CFG_KEY = 'eduasistencia_firebase_config';

const DB = {
  modo: 'local',
  fs: null,
  _local: null,
  motivoLocal: '',      // por qué se está usando el modo local
  errorConexion: null,

  // Extrae los datos de configuración de cualquier texto pegado desde Firebase
  // (acepta el bloque completo, incluso con líneas import / initializeApp)
  extraerConfig(texto) {
    const cfg = {};
    const re = /["']?(apiKey|authDomain|databaseURL|projectId|storageBucket|messagingSenderId|appId|measurementId)["']?\s*:\s*["'`]([^"'`]+)["'`]/g;
    let m;
    while ((m = re.exec(texto || ''))) cfg[m[1]] = m[2].trim();
    return cfg;
  },
  configGuardada() {
    try { return JSON.parse(localStorage.getItem(CFG_KEY)) || null; } catch (e) { return null; }
  },
  guardarConfig(cfg) { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); return true; } catch (e) { return false; } },
  borrarConfig() { try { localStorage.removeItem(CFG_KEY); } catch (e) {} },

  // Revisa si js/firebase-config.js se cargó bien y tiene datos reales
  revisarConfig() {
    const errores = window.__erroresScript || [];
    const errCfg = window.__errCfg || errores.find(e => /firebase-config/i.test(e.archivo || ''));
    const errSdk = errores.find(e => /gstatic\.com\/firebasejs/i.test(e.archivo || ''));
    const valida = c => !!(c && c.apiKey && c.projectId && !String(c.apiKey).startsWith('TU_') && !String(c.projectId).startsWith('TU_'));
    let cfgArchivo = null;
    try { cfgArchivo = (typeof firebaseConfig !== 'undefined') ? firebaseConfig : (window.firebaseConfig || null); } catch (e) { cfgArchivo = null; }
    const cfgGuardada = this.configGuardada();
    // Prioridad: archivo válido → configuración pegada en el panel → archivo (aunque sea de ejemplo)
    const fuente = valida(cfgArchivo) ? 'archivo' : valida(cfgGuardada) ? 'navegador' : (cfgArchivo ? 'archivo' : '');
    const cfg = fuente === 'navegador' ? cfgGuardada : cfgArchivo;
    return {
      errCfg, errSdk, cfg, cfgArchivo, cfgGuardada, fuente,
      archivoOk: !!cfgArchivo && !errCfg,
      apiOk: !!(cfg && cfg.apiKey && !String(cfg.apiKey).startsWith('TU_')),
      proyectoOk: !!(cfg && cfg.projectId && !String(cfg.projectId).startsWith('TU_')),
      sdkOk: typeof firebase !== 'undefined' && !!firebase.firestore,
      esArchivo: location.protocol === 'file:'
    };
  },

  configurado() {
    const r = this.revisarConfig();
    return r.apiOk && r.proyectoOk;
  },

  async init() {
    const r = this.revisarConfig();
    if (r.fuente !== 'navegador' && r.errCfg) this.motivoLocal = 'config-error';
    else if (!r.cfg) this.motivoLocal = 'config-faltante';
    else if (!r.apiOk || !r.proyectoOk) this.motivoLocal = 'config-sin-datos';
    else if (!r.sdkOk) this.motivoLocal = 'sdk';

    if (!this.motivoLocal) {
      try {
        if (!firebase.apps.length) firebase.initializeApp(r.cfg);
        this.fs = firebase.firestore();
        // Prueba real de conexión (máximo 15 segundos)
        await Promise.race([
          this.fs.collection('cursos').limit(1).get({ source: 'server' }),
          new Promise((_, rej) => setTimeout(() => rej({ code: 'timeout', message: 'Firebase no respondió en 15 segundos' }), 15000))
        ]);
        this.modo = 'firebase';
        return;
      } catch (err) {
        console.error('Error de Firebase:', err);
        this.errorConexion = err;
        this.motivoLocal = 'conexion';
        this.fs = null;
      }
    }
    this.modo = 'local';
    this._cargarLocal();
  },

  hayDatosLocales() {
    try { return !!localStorage.getItem(LOCAL_KEY); } catch (e) { return false; }
  },

  // Copia los datos del modo local a Firestore (conserva los mismos ID, no duplica)
  async subirLocalAFirebase(progreso = () => {}) {
    let local = null;
    try { local = JSON.parse(localStorage.getItem(LOCAL_KEY)); } catch (e) {}
    if (!local || this.modo !== 'firebase') return 0;
    const docs = [];
    COLECCIONES.forEach(c => Object.entries(local[c] || {}).forEach(([id, d]) => docs.push([c, id, d])));
    for (let i = 0; i < docs.length; i += 400) {
      const batch = this.fs.batch();
      docs.slice(i, i + 400).forEach(([c, id, d]) => batch.set(this.fs.collection(c).doc(id), d));
      await batch.commit();
      progreso(Math.min(i + 400, docs.length), docs.length);
    }
    return docs.length;
  },

  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },

  _cargarLocal() {
    try { this._local = JSON.parse(localStorage.getItem(LOCAL_KEY)); } catch (e) { this._local = null; }
    if (!this._local) {
      this._local = typeof datosDemo === 'function' ? datosDemo() : {};
      this._guardarLocal();
    }
    COLECCIONES.forEach(c => { this._local[c] = this._local[c] || {}; });
  },

  _guardarLocal() {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(this._local)); } catch (e) { console.warn(e); }
  },

  reiniciarDemo() {
    try { localStorage.removeItem(LOCAL_KEY); } catch (e) {}
  },

  async obtenerTodos(col) {
    if (this.modo === 'firebase') {
      const snap = await this.fs.collection(col).get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
    return Object.entries(this._local[col] || {}).map(([id, v]) => ({ id, ...v }));
  },

  async agregar(col, datos) {
    if (this.modo === 'firebase') {
      const ref = await this.fs.collection(col).add(datos);
      return ref.id;
    }
    const id = this.uid();
    this._local[col][id] = datos;
    this._guardarLocal();
    return id;
  },

  async establecer(col, id, datos) {
    if (this.modo === 'firebase') {
      await this.fs.collection(col).doc(id).set(datos);
      return id;
    }
    this._local[col][id] = datos;
    this._guardarLocal();
    return id;
  },

  async eliminar(col, id) {
    if (this.modo === 'firebase') {
      await this.fs.collection(col).doc(id).delete();
      return;
    }
    delete this._local[col][id];
    this._guardarLocal();
  }
};

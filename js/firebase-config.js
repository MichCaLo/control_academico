/* =========================================================
   CONFIGURACIÓN DE FIREBASE
   ---------------------------------------------------------
   En la consola de Firebase: ⚙ Configuración del proyecto →
   Tus apps → app Web (</>) → "Configuración del SDK" → opción "CDN"
   o "Config". Copie SOLO los valores que están entre { y }.

   ✘ NO copie estas líneas (rompen el archivo):
       import { initializeApp } from "firebase/app";
       const app = initializeApp(firebaseConfig);

   ✘ NO deje "const firebaseConfig" escrito dos veces.

   Mientras apiKey diga "TU_API_KEY", el sistema funciona en
   MODO DEMO (los datos solo quedan en este navegador).
   Después de guardar, recargue la página con Ctrl + F5.
   ========================================================= */
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCcF9yU9A_iWxhlhEyDB_mFwRdkBX86q8U",
  authDomain: "control-academico-628ff.firebaseapp.com",
  projectId: "control-academico-628ff",
  storageBucket: "control-academico-628ff.firebasestorage.app",
  messagingSenderId: "698889293741",
  appId: "1:698889293741:web:4402f87406191b5d159b24",
  measurementId: "G-SZVSS2XLSN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
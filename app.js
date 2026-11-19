// ============================================================================
// ESTEBAN COMPANY - APP DE GESTIÓN RURAL (OFFLINE-FIRST + FIREBASE RTDB)
// ============================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  push,
  update,
  remove,
  onValue
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyC-7MMAHQ2Ib7TFjQynWP2mMBTeBE8U7xU",
  authDomain: "tatocowspruebas.firebaseapp.com",
  databaseURL: "https://tatocowspruebas-default-rtdb.firebaseio.com",
  projectId: "tatocowspruebas",
  storageBucket: "tatocowspruebas.firebasestorage.app",
  messagingSenderId: "702960739873",
  appId: "1:702960739873:web:63c72f142e755914f36560"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Estado global en memoria
window.corralesData = window.corralesData || {};
window.animalesData = window.animalesData || {};
window.agricolaData = window.agricolaData || {};
window.insumosData = window.insumosData || {};
window.lluviasData = window.lluviasData || {};
window.fletesData = window.fletesData || {};
window.kanbanData = window.kanbanData || {};
window.notasData = window.notasData || {};
window.historialData = window.historialData || {};

const CACHE_PREFIX = "tc_cache_v1_";

function guardarCacheLocal(clave, valor) {
  try {
    localStorage.setItem(CACHE_PREFIX + clave, JSON.stringify(valor));
  } catch (e) {
    console.warn("No se pudo guardar caché local:", e);
  }
}

function leerCacheLocal(clave, fallback = {}) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + clave);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function cargarCachesIniciales() {
  window.corralesData = leerCacheLocal("corrales", {});
  window.animalesData = leerCacheLocal("animales", {});
  window.agricolaData = leerCacheLocal("agricola", {});
  window.insumosData = leerCacheLocal("insumos", {});
  window.lluviasData = leerCacheLocal("lluvias", {});
  window.fletesData = leerCacheLocal("fletes", {});
  window.kanbanData = leerCacheLocal("kanban", {});
  window.notasData = leerCacheLocal("notas", {});
  window.historialData = leerCacheLocal("historial", {});
}

// ============================================================================
// AUDITORÍA DE CONSISTENCIA DE HACIENDA
// ============================================================================
window.auditarConsistenciaHacienda = function () {
  const corrales = window.corralesData || {};
  const animales = window.animalesData || {};
  const alertas = [];

  Object.keys(corrales).forEach((id) => {
    const c = corrales[id] || {};
    const nombre = c.nombre || id;
    const carActivas = Object.values(animales).filter(
      (a) => a && a.corralId === id && (!a.estado || a.estado === "activo")
    ).length;

    const genRaw = c.cantidadGenerica !== undefined ? c.cantidadGenerica : c.cantidad;
    const gen = parseInt(genRaw, 10);

    if (
      c.cantidad !== undefined &&
      c.cantidadGenerica !== undefined &&
      Number(c.cantidad) !== Number(c.cantidadGenerica)
    ) {
      alertas.push(
        `Lote "${nombre}": "cantidad" (${c.cantidad}) difiere de "cantidadGenerica" (${c.cantidadGenerica}) [Caravanas activas: ${carActivas}].`
      );
    }

    if (Number.isNaN(gen) || gen < 0) {
      alertas.push(`Lote "${nombre}": cabezas genéricas inválidas (${genRaw ?? "sin dato"}).`);
    }
  });

  Object.entries(animales).forEach(([animId, a]) => {
    if (!a) return;
    const estadoOk = !a.estado || a.estado === "activo";
    if (estadoOk && a.corralId && !corrales[a.corralId]) {
      alertas.push(
        `Caravana "${a.caravana || animId}": apunta a un lote inexistente (${a.corralId}).`
      );
    }
  });

  const secCorrales = document.getElementById("seccionCorrales");
  if (secCorrales) {
    let banner = document.getElementById("bannerAuditoriaHacienda");
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "bannerAuditoriaHacienda";
      banner.className =
        "tarjeta p-4 bg-amber-50 border-l-4 border-amber-600 text-amber-950 text-xs space-y-1.5 hidden mb-4";
      secCorrales.prepend(banner);
    }

    if (alertas.length > 0) {
      banner.classList.remove("hidden");
      banner.innerHTML = `
        <div class="font-display font-extrabold text-sm text-amber-900 flex items-center gap-2">
          <i class="fa-solid fa-shield-halved text-amber-700"></i>
          Auditoría de Hacienda: ${alertas.length} inconsistencia(s) detectada(s)
        </div>
        <ul class="list-disc pl-5 space-y-1 font-medium">
          ${alertas.map((msg) => `<li>${msg}</li>`).join("")}
        </ul>
      `;
    } else {
      banner.classList.add("hidden");
      banner.innerHTML = "";
    }
  }

  return alertas;
};

// ============================================================================
// REGISTRO DE HISTORIAL Y ESCRITURA OFFLINE-FIRST
// ============================================================================
window.registrarMovimiento = async function (tipo, detalle, extra = {}) {
  const item = {
    tipo,
    detalle,
    timestamp: Date.now(),
    fechaTexto: new Date().toLocaleString("es-AR"),
    ...extra
  };
  const tempKey = "hist_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
  window.historialData[tempKey] = item;
  guardarCacheLocal("historial", window.historialData);

  try {
    await push(ref(db, "historial"), item);
  } catch (e) {
    console.warn("Movimiento guardado en caché local; se sincronizará al reconectar:", e);
  }
};

window.guardarDatoSeguro = async function (ruta, payload, cacheKey = null) {
  const key = cacheKey || ruta.split("/")[0];
  if (window[key + "Data"] && ruta.includes("/")) {
    const partes = ruta.split("/");
    if (partes.length === 2) {
      window[key + "Data"][partes[1]] = payload;
      guardarCacheLocal(key, window[key + "Data"]);
    }
  }
  try {
    await set(ref(db, ruta), payload);
  } catch (e) {
    console.warn(`Guardado local en ${ruta} (sin conexión o reintentando):`, e);
  }
};

// ============================================================================
// CÁLCULOS DE HACIENDA
// ============================================================================
window.obtenerCabezasLote = function (corralId) {
  const c = (window.corralesData && window.corralesData[corralId]) || {};
  const genericas = parseInt(c.cantidadGenerica ?? c.cantidad ?? 0, 10) || 0;
  const individuales = Object.values(window.animalesData || {}).filter(
    (a) => a && a.corralId === corralId && (!a.estado || a.estado === "activo")
  ).length;
  return {
    genericas,
    individuales,
    total: genericas + individuales
  };
};

// ============================================================================
// SUSCRIPCIONES EN TIEMPO REAL A FIREBASE
// ============================================================================
function iniciarListenersFirebase() {
  const rutas = [
    ["corrales", "corralesData"],
    ["animales", "animalesData"],
    ["agricola", "agricolaData"],
    ["insumos", "insumosData"],
    ["lluvias", "lluviasData"],
    ["fletes", "fletesData"],
    ["kanban", "kanbanData"],
    ["notas", "notasData"],
    ["historial", "historialData"]
  ];

  rutas.forEach(([ruta, varGlobal]) => {
    onValue(ref(db, ruta), (snap) => {
      const val = snap.val();
      if (val !== null && val !== undefined) {
        window[varGlobal] = val;
        guardarCacheLocal(ruta, val);
      } else if (!navigator.onLine) {
        window[varGlobal] = leerCacheLocal(ruta, {});
      } else {
        window[varGlobal] = {};
        guardarCacheLocal(ruta, {});
      }
      if (typeof window.renderAll === "function") {
        window.renderAll();
      }
    });
  });
}

// ============================================================================
// RENDERIZADO PRINCIPAL
// ============================================================================
window.renderAll = function () {
  if (typeof window.renderCorrales === "function") window.renderCorrales();
  if (typeof window.renderAnimales === "function") window.renderAnimales();
  if (typeof window.renderAgricola === "function") window.renderAgricola();
  if (typeof window.renderInsumos === "function") window.renderInsumos();
  if (typeof window.renderLluvias === "function") window.renderLluvias();
  if (typeof window.renderFletes === "function") window.renderFletes();
  if (typeof window.renderKanban === "function") window.renderKanban();
  if (typeof window.renderNotas === "function") window.renderNotas();
  if (typeof window.renderHistorial === "function") window.renderHistorial();
  if (typeof window.renderStats === "function") window.renderStats();
  if (typeof window.populateSelects === "function") window.populateSelects();
  window.auditarConsistenciaHacienda();
};

// ============================================================================
// INICIALIZACIÓN
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
  cargarCachesIniciales();
  window.renderAll();
  iniciarListenersFirebase();
});

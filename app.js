import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, set, push, remove, update }
  from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

const firebaseConfig = {
  apiKey: "AIzaSyC-7MMAHQ2Ib7TFjQynWP2mMBTeBE8U7xU",
  authDomain: "tatocowspruebas.firebaseapp.com",
  databaseURL: "https://tatocowspruebas-default-rtdb.firebaseio.com",
  projectId: "tatocowspruebas",
  storageBucket: "tatocowspruebas.firebasestorage.app",
  messagingSenderId: "702960739873",
  appId: "1:702960739873:web:63c72f142e755914f36560",
  measurementId: "G-YQPTQR35VQ"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const corralesRef  = ref(db, 'corrales');
const historialRef = ref(db, 'historial');
const fletesRef    = ref(db, 'fletes');
const tareasRef    = ref(db, 'tareas');
const notasRef     = ref(db, 'notas_rapidas');
const animalesRef  = ref(db, 'animales');
const insumosRef   = ref(db, 'insumos');
const laboresRef   = ref(db, 'labores');
const lluviasRef   = ref(db, 'lluvias');

const loadCache = (k, def) => {
  try { const raw = localStorage.getItem('tc_cache_' + k); return raw ? JSON.parse(raw) : def; }
  catch { return def; }
};
const saveCache = (k, val) => {
  try { localStorage.setItem('tc_cache_' + k, JSON.stringify(val)); } catch {}
};

window.corralesData  = loadCache('corrales', {});
window.historialData = loadCache('historial', []);
window.fletesData    = loadCache('fletes', []);
window.tareasData    = loadCache('tareas', {});
window.notasData     = loadCache('notas', {});
window.animalesData  = loadCache('animales', {});
window.insumosData   = loadCache('insumos', {});
window.laboresData   = loadCache('labores', []);
window.lluviasData   = loadCache('lluvias', []);

/* ---------- UI: Tabs y Modales ---------- */
window.cambiarTab = function(tab) {
  const secciones = ['corrales','caravanas','agricola','insumos','lluvias','fletes','tareas','historial'];
  secciones.forEach(s => {
    const cap = s.charAt(0).toUpperCase() + s.slice(1);
    const el = document.getElementById('seccion' + cap);
    if (el) el.classList.add('hidden');
    const btn = document.getElementById('btnTab' + cap);
    if (btn) btn.classList.remove('activo');
  });
  const capAct = tab.charAt(0).toUpperCase() + tab.slice(1);
  const sec = document.getElementById('seccion' + capAct);
  const btn = document.getElementById('btnTab' + capAct);
  if (sec) { sec.classList.remove('hidden'); sec.classList.add('section-anim'); }
  if (btn) btn.classList.add('activo');
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.abrirModal = function(id) {
  populateSelects();
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.remove('hidden');
  m.classList.add('flex');
};

window.cerrarModal = function(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.add('hidden');
  m.classList.remove('flex');
};

document.querySelectorAll('.modal-bg').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) cerrarModal(m.id); });
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('.modal-bg:not(.hidden)').forEach(m => cerrarModal(m.id));
});

/* ---------- Fecha y Semáforo Offline ---------- */
const hoy = new Date();
const heroFecha = document.getElementById('heroFecha');
if (heroFecha) heroFecha.textContent = hoy.toLocaleDateString('es-AR', { weekday:'short', day:'2-digit', month:'short' });
const contMes = document.getElementById('contadorMesInput');
if (contMes) contMes.value = hoy.toISOString().slice(0, 7);

function actualizarSemaforoRed() {
  const badge = document.getElementById('semaforoRedBadge');
  if (!badge) return;
  badge.innerHTML = navigator.onLine
    ? `<span class="pulse-dot-online"></span><span class="text-[11px] text-emerald-100 font-bold">EN VIVO</span>`
    : `<span class="dot-offline"></span><span class="text-[11px] text-orange-300 font-bold">SIN SEÑAL</span>`;
}
window.addEventListener('online', actualizarSemaforoRed);
window.addEventListener('offline', actualizarSemaforoRed);
actualizarSemaforoRed();

/* ---------- WhatsApp CallMeBot (Precargado con tus credenciales) ---------- */
window.getWaConfig = () => {
  const defaultCfg = { phone: '5492317470742', apiKey: '3921709', traslados: true, egresos: true, fletes: true, stock: true };
  try {
    const saved = JSON.parse(localStorage.getItem('tc_whatsapp_cfg') || 'null');
    if (!saved || (!saved.phone && !saved.apiKey)) return defaultCfg;
    return { ...defaultCfg, ...saved };
  } catch { return defaultCfg; }
};

function refrescarBadgeWa() {
  const cfg = window.getWaConfig();
  const dot = document.getElementById('waBadgeActivo');
  if (dot) dot.classList.toggle('hidden', !(cfg.phone && cfg.apiKey));
}
refrescarBadgeWa();

window.abrirConfigWhatsApp = function() {
  const cfg = window.getWaConfig();
  const p = document.getElementById('waPhoneInput'); if(p) p.value = cfg.phone || '';
  const a = document.getElementById('waApiKeyInput'); if(a) a.value = cfg.apiKey || '';
  const t = document.getElementById('waChkTraslados'); if(t) t.checked = cfg.traslados !== false;
  const e = document.getElementById('waChkEgresos'); if(e) e.checked = cfg.egresos !== false;
  const f = document.getElementById('waChkFletes'); if(f) f.checked = cfg.fletes !== false;
  const s = document.getElementById('waChkStock'); if(s) s.checked = cfg.stock !== false;
  abrirModal('modalWhatsApp');
};

window.guardarConfigWhatsApp = function() {
  const cfg = {
    phone: document.getElementById('waPhoneInput')?.value.trim().replace(/\D/g, '') || '',
    apiKey: document.getElementById('waApiKeyInput')?.value.trim() || '',
    traslados: document.getElementById('waChkTraslados')?.checked ?? true,
    egresos: document.getElementById('waChkEgresos')?.checked ?? true,
    fletes: document.getElementById('waChkFletes')?.checked ?? true,
    stock: document.getElementById('waChkStock')?.checked ?? true
  };
  localStorage.setItem('tc_whatsapp_cfg', JSON.stringify(cfg));
  refrescarBadgeWa();
  cerrarModal('modalWhatsApp');
};

window.enviarAlertaWhatsApp = function(tipo, mensaje) {
  if (!navigator.onLine) return;
  const cfg = window.getWaConfig();
  if (!cfg.phone || !cfg.apiKey) return;
  if (tipo !== 'test' && cfg[tipo] === false) return;
  const texto = encodeURIComponent(`🐄 Campo Esteban Company:\n${mensaje}`);
  fetch(`https://api.callmebot.com/whatsapp.php?phone=${cfg.phone}&text=${texto}&apikey=${cfg.apiKey}`, { mode: 'no-cors' }).catch(() => {});
};

window.probarAlertaWhatsApp = function() {
  guardarConfigWhatsApp();
  const cfg = window.getWaConfig();
  if (!cfg.phone || !cfg.apiKey) return alert("Cargá teléfono y API Key primero.");
  window.enviarAlertaWhatsApp('test', 'Prueba exitosa desde Administración Campo.');
  alert("Mensaje de prueba enviado.");
};

/* ---------- Listeners Firebase ---------- */
onValue(corralesRef, s => { window.corralesData = s.val() || {}; saveCache('corrales', window.corralesData); renderAll(); });
onValue(animalesRef, s => { window.animalesData = s.val() || {}; saveCache('animales', window.animalesData); renderAll(); });
onValue(insumosRef,  s => { window.insumosData  = s.val() || {}; saveCache('insumos',  window.insumosData);  renderAll(); });
onValue(laboresRef,  s => {
  const d = s.val() || {};
  window.laboresData = Object.keys(d).map(k => ({ id:k, ...d[k] })).sort((a,b) => (b.timestamp||0)-(a.timestamp||0));
  saveCache('labores', window.laboresData); renderAgricola();
});
onValue(lluviasRef, s => {
  const d = s.val() || {};
  window.lluviasData = Object.keys(d).map(k => ({ id:k, ...d[k] })).sort((a,b) => (b.fecha||'').localeCompare(a.fecha||'') || (b.timestamp||0)-(a.timestamp||0));
  saveCache('lluvias', window.lluviasData); renderLluvias(); renderStats();
});
onValue(historialRef, s => {
  const d = s.val() || {};
  window.historialData = Object.keys(d).map(k => ({ id:k, ...d[k] })).sort((a,b) => (b.timestamp||0)-(a.timestamp||0));
  saveCache('historial', window.historialData); renderHistorial();
});
onValue(fletesRef, s => {
  const d = s.val() || {};
  window.fletesData = Object.keys(d).map(k => ({ id:k, ...d[k] })).sort((a,b) => (b.timestamp||0)-(a.timestamp||0));
  saveCache('fletes', window.fletesData); renderFletes();
});
onValue(tareasRef, s => { window.tareasData = s.val() || {}; saveCache('tareas', window.tareasData); renderKanban(); });
onValue(notasRef,  s => { window.notasData  = s.val() || {}; saveCache('notas',  window.notasData);  renderNotas(); });

function renderAll() {
  renderCorrales(); renderAnimales(); renderAgricola(); renderInsumos();
  renderLluvias(); renderFletes(); renderKanban(); renderNotas(); renderHistorial();
  renderStats(); populateSelects();
}

/* ---------- Selects y Stats ---------- */
function populateSelects() {
  const corrales = window.corralesData || {};
  const animales = window.animalesData || {};
  
  const opciones = Object.keys(corrales).length > 0
    ? Object.keys(corrales).map(id => {
        const c = corrales[id];
        const carLote = Object.values(animales).filter(x => x.corralId === id && x.estado === 'activo').length;
        const genLote = c.cantidadGenerica ?? c.cantidad ?? 0;
        const totalCab = carLote + genLote;
        return `<option value="${id}">${c.nombre} (${totalCab} cab)${c.hectareas ? ' · '+c.hectareas+' ha' : ''}</option>`;
      }).join('')
    : '<option value="">Sin lotes</option>';

  ['ingCorralSelect','egCorralSelect','trOrigenSelect','trDestinoSelect','animalCorralSelect',
   'moverCorralSelect','masivoOrigenSelect','masivoDestinoSelect','laborLoteSelect','cosechaLoteSelect'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const prev = el.value;
      el.innerHTML = opciones;
      if (prev && corrales[prev]) el.value = prev;
    }
  });

  const filtroAgri = document.getElementById('filtroLoteAgricola');
  if (filtroAgri) {
    const prevF = filtroAgri.value;
    filtroAgri.innerHTML = `<option value="">Todos los lotes</option>` + Object.keys(corrales).map(id => {
      const c = corrales[id];
      const carLote = Object.values(animales).filter(x => x.corralId === id && x.estado === 'activo').length;
      const genLote = c.cantidadGenerica ?? c.cantidad ?? 0;
      return `<option value="${id}">${c.nombre} (${carLote + genLote} cab)</option>`;
    }).join('');
    if (prevF && corrales[prevF]) filtroAgri.value = prevF;
  }

  const insumos = window.insumosData || {};
  const labIns = document.getElementById('laborInsumoSelect');
  if (labIns) {
    const prevI = labIns.value;
    labIns.innerHTML = `<option value="">-- Ningún insumo aplicado --</option>` +
      Object.keys(insumos).map(id => `<option value="${id}">${insumos[id].nombre} (Disp: ${insumos[id].stock||0} ${insumos[id].unidad})</option>`).join('');
    if (prevI && insumos[prevI]) labIns.value = prevI;
  }

  actualizarListaCaravanasMasivo();
  actualizarListaCaravanasEgreso();
}

function renderStats() {
  const corrales = window.corralesData || {};
  const animales = window.animalesData || {};
  const insumos = window.insumosData || {};
  const keys = Object.keys(corrales);

  const totalCar = Object.values(animales).filter(a => a.estado === 'activo').length;
  const totalGen = keys.reduce((acc,k) => acc + (corrales[k].cantidadGenerica ?? corrales[k].cantidad ?? 0), 0);
  const totalHa  = keys.reduce((acc,k) => acc + (parseFloat(corrales[k].hectareas)||0), 0);
  const bajos = Object.values(insumos).filter(i => (parseFloat(i.minimo)||0) > 0 && (parseFloat(i.stock)||0) <= (parseFloat(i.minimo)||0)).length;

  const dotStock = document.getElementById('dotAlertaStock');
  if (dotStock) dotStock.classList.toggle('hidden', bajos === 0);

  const mesActual = new Date().toISOString().slice(0, 7);
  const mmMes = (window.lluviasData || []).filter(l => (l.fecha||'').startsWith(mesActual)).reduce((a,b) => a + (parseFloat(b.mm)||0), 0);

  const el1 = document.getElementById('statTotalVacas'); if(el1) el1.innerText = totalCar + totalGen;
  const el2 = document.getElementById('statTotalHectareas'); if(el2) el2.innerText = Number.isInteger(totalHa) ? totalHa : totalHa.toFixed(1);
  const el3 = document.getElementById('statInsumosBajos'); if(el3) el3.innerText = bajos;
  const el4 = document.getElementById('statLluviaMes'); if(el4) el4.innerText = `${mmMes} mm`;
}

/* ---------- GEOLOCALIZACIÓN GPS DE LOTES (ESTILO FIELDDATA) ---------- */
window.capturarUbicacionLote = function(modo) {
  if (!navigator.geolocation) {
    return alert("Tu navegador o dispositivo no soporta geolocalización GPS.");
  }
  const statusEl = document.getElementById(modo === 'nuevo' ? 'nuevoGpsStatus' : 'editGpsStatus');
  if (statusEl) statusEl.innerText = "🛰️ Buscando satélites GPS...";

  navigator.geolocation.getCurrentPosition(
    pos => {
      const lat = +(pos.coords.latitude.toFixed(6));
      const lng = +(pos.coords.longitude.toFixed(6));
      const acc = Math.round(pos.coords.accuracy);
      const latEl = document.getElementById(modo === 'nuevo' ? 'nuevoLatInput' : 'editLatInput');
      const lngEl = document.getElementById(modo === 'nuevo' ? 'nuevoLngInput' : 'editLngInput');
      if (latEl) latEl.value = lat;
      if (lngEl) lngEl.value = lng;
      if (statusEl) statusEl.innerHTML = `<span class="text-emerald-800 font-bold">✓ Marcado: ${lat}, ${lng}</span> (±${acc}m)`;
    },
    err => {
      if (statusEl) statusEl.innerHTML = `<span class="text-rose-700 font-bold">⚠️ Error GPS: Revisá permisos de ubicación.</span>`;
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
  );
};

window.limpiarUbicacionLote = function(modo) {
  const latEl = document.getElementById(modo === 'nuevo' ? 'nuevoLatInput' : 'editLatInput');
  const lngEl = document.getElementById(modo === 'nuevo' ? 'nuevoLngInput' : 'editLngInput');
  const statusEl = document.getElementById(modo === 'nuevo' ? 'nuevoGpsStatus' : 'editGpsStatus');
  if (latEl) latEl.value = '';
  if (lngEl) lngEl.value = '';
  if (statusEl) statusEl.innerText = "Sin coordenadas marcadas.";
};

window.abrirModalNuevoCorral = function() {
  window.limpiarUbicacionLote('nuevo');
  abrirModal('modalNuevoCorral');
};

/* ---------- 1. LOTES MIXTOS (CON OBSERVACIÓN, CHIPS AMPLIADOS Y MAPA GPS) ---------- */
window.renderCorrales = function() {
  const container = document.getElementById('listaCorrales');
  if (!container) return;
  const corrales = window.corralesData || {};
  const animales = window.animalesData || {};
  let keys = Object.keys(corrales);

  if (keys.length === 0) {
    container.innerHTML = `<div class="tarjeta p-6 text-center text-slate-400 text-sm">No hay lotes. Creá el primero arriba.</div>`;
    return;
  }
  const filtro = (document.getElementById('buscarCorralInput')?.value || '').toLowerCase().trim();
  if (filtro) {
    keys = keys.filter(id => {
      const c = corrales[id];
      return (c.nombre||'').toLowerCase().includes(filtro) || (c.observacion||'').toLowerCase().includes(filtro) ||
             (c.cultivo||'').toLowerCase().includes(filtro) || (c.estadoCampana||'').toLowerCase().includes(filtro);
    });
  }
  const criterio = document.getElementById('ordenCorralSelect')?.value || 'nombre';
  keys.sort((a,b) => {
    const cA = corrales[a], cB = corrales[b];
    const tA = Object.values(animales).filter(x => x.corralId===a && x.estado==='activo').length + (cA.cantidadGenerica ?? cA.cantidad ?? 0);
    const tB = Object.values(animales).filter(x => x.corralId===b && x.estado==='activo').length + (cB.cantidadGenerica ?? cB.cantidad ?? 0);
    if (criterio === 'nombre') return (cA.nombre||'').localeCompare(cB.nombre||'');
    if (criterio === 'mayor_cantidad') return tB - tA;
    if (criterio === 'mayor_ha') return (parseFloat(cB.hectareas)||0) - (parseFloat(cA.hectareas)||0);
    return 0;
  });

  const colorMap = { emerald:'#1B3A2B', blue:'#1E40AF', amber:'#B45309', rose:'#B91C1C', purple:'#6D28D9', cyan:'#0891B2', orange:'#E86A1A', slate:'#475569' };
  const estadoBadge = { 'Ganadero / Pastura':'badge-verde', 'En preparación':'badge-ambar', 'Sembrado':'badge-azul', 'Cosechado':'badge-naranja' };

  container.innerHTML = keys.map(id => {
    const c = corrales[id];
    const carLote = Object.values(animales).filter(x => x.corralId===id && x.estado==='activo').length;
    const genLote = c.cantidadGenerica ?? c.cantidad ?? 0;
    const totalCab = carLote + genLote;
    const est = c.estadoCampana || 'Ganadero / Pastura';
    const ha = parseFloat(c.hectareas) || 0;
    const rinde = parseFloat(c.rinde) || 0;
    const costoCamp = parseFloat(c.costoCampana) || 0;
    const tieneGps = c.lat && c.lng;
    const mapsUrl = tieneGps ? `https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}` : '';

    return `
      <div class="tarjeta tarjeta-hover lote-item p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style="border-left-color:${colorMap[c.color]||colorMap.emerald}">
        <div class="min-w-0 flex-1 space-y-2.5">
          <div class="flex items-center gap-2.5 flex-wrap">
            <h3 class="font-display font-extrabold text-base sm:text-lg text-emerald-950 leading-tight">${c.nombre}</h3>
            ${ha > 0 ? `<span class="chip badge-gris text-xs px-2.5 py-1">${ha} ha</span>` : ''}
            <span class="chip ${estadoBadge[est] || 'badge-verde'} text-xs px-2.5 py-1">${est}</span>
            ${tieneGps ? `<a href="${mapsUrl}" target="_blank" rel="noopener" class="chip bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 text-xs px-2.5 py-1 font-bold transition"><i class="fa-solid fa-location-dot text-emerald-700 mr-1"></i>Ver en Mapa</a>` : ''}
          </div>
          
          ${c.observacion ? `<p class="text-sm sm:text-base text-slate-800 font-medium bg-emerald-50/60 px-3.5 py-2.5 rounded-xl border border-emerald-900/10">${c.observacion}</p>` : ''}

          <div class="flex items-center gap-3 flex-wrap text-xs sm:text-sm text-slate-700">
            ${c.cultivo ? `<span>🌱 <strong>${c.cultivo}</strong></span>` : ''}
            ${rinde > 0 ? `<span class="text-orange-700 font-bold">· Rinde: ${rinde} qq/ha</span>` : ''}
            ${costoCamp > 0 ? `<span class="text-emerald-800 font-semibold">· Costo dir: $${costoCamp.toLocaleString('es-AR')}</span>` : ''}
            <div class="flex items-center gap-2">
              <span class="chip badge-verde text-xs px-2.5 py-1 font-bold"><i class="fa-solid fa-fingerprint text-[11px] mr-1"></i>${carLote} caravanas</span>
              <span class="chip badge-naranja text-xs px-2.5 py-1 font-bold"><i class="fa-solid fa-hashtag text-[11px] mr-1"></i>${genLote} genérico${genLote !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        <div class="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 flex-shrink-0 gap-1">
          <div class="text-left sm:text-right">
            <p class="font-display text-3xl sm:text-4xl font-extrabold text-emerald-950 leading-none">${totalCab}</p>
            <p class="text-[10px] uppercase font-bold text-slate-400 mt-1">Total Cabezas</p>
          </div>
          <div class="flex gap-1.5 mt-1">
            <button onclick="abrirEditarCorral('${id}')" class="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 flex items-center justify-center"><i class="fa-solid fa-pen text-sm"></i></button>
            <button onclick="eliminarCorral('${id}','${(c.nombre||'').replace(/'/g,"\\'")}')" class="w-9 h-9 rounded-xl bg-slate-100 text-slate-400 hover:bg-rose-100 hover:text-rose-700 flex items-center justify-center"><i class="fa-solid fa-trash text-sm"></i></button>
          </div>
        </div>
      </div>`;
  }).join('');
};

window.crearCorral = function() {
  const nombre = document.getElementById('nombreCorralInput')?.value.trim();
  const hectareas = parseFloat(document.getElementById('haCorralInput')?.value) || 0;
  const color = document.getElementById('colorCorralInput')?.value || 'emerald';
  const estadoCampana = document.getElementById('estadoCampanaCorralInput')?.value || 'Ganadero / Pastura';
  const cultivo = document.getElementById('cultivoCorralInput')?.value.trim() || '';
  const obs = document.getElementById('obsCorralInput')?.value.trim() || '';
  const lat = parseFloat(document.getElementById('nuevoLatInput')?.value) || null;
  const lng = parseFloat(document.getElementById('nuevoLngInput')?.value) || null;
  if (!nombre) return alert("Ingresá un nombre para el lote.");

  cerrarModal('modalNuevoCorral');
  set(push(corralesRef), { nombre, hectareas, color, estadoCampana, cultivo, observacion: obs, lat, lng, cantidadGenerica: 0, rinde: 0, costoCampana: 0 })
    .then(() => {
      ['nombreCorralInput','haCorralInput','cultivoCorralInput','obsCorralInput'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
      window.limpiarUbicacionLote('nuevo');
    });
};

window.abrirEditarCorral = function(id) {
  const c = window.corralesData[id]; if (!c) return;
  const e1 = document.getElementById('editCorralIdInput'); if(e1) e1.value = id;
  const e2 = document.getElementById('editNombreCorralInput'); if(e2) e2.value = c.nombre || '';
  const e3 = document.getElementById('editHaCorralInput'); if(e3) e3.value = c.hectareas || '';
  const e4 = document.getElementById('editColorCorralInput'); if(e4) e4.value = c.color || 'emerald';
  const e5 = document.getElementById('editEstadoCampanaCorralInput'); if(e5) e5.value = c.estadoCampana || 'Ganadero / Pastura';
  const e6 = document.getElementById('editCultivoCorralInput'); if(e6) e6.value = c.cultivo || '';
  const e7 = document.getElementById('editRindeCorralInput'); if(e7) e7.value = c.rinde || '';
  const e8 = document.getElementById('editCostoCampanaInput'); if(e8) e8.value = c.costoCampana || 0;
  const e9 = document.getElementById('editObsCorralInput'); if(e9) e9.value = c.observacion || '';

  const latEl = document.getElementById('editLatInput');
  const lngEl = document.getElementById('editLngInput');
  const statusEl = document.getElementById('editGpsStatus');
  if (c.lat && c.lng) {
    if (latEl) latEl.value = c.lat;
    if (lngEl) lngEl.value = c.lng;
    if (statusEl) statusEl.innerHTML = `<span class="text-emerald-800 font-bold">✓ Guardado: ${c.lat}, ${c.lng}</span>`;
  } else {
    window.limpiarUbicacionLote('edit');
  }
  abrirModal('modalEditarCorral');
};

window.guardarEdicionCorral = function() {
  const id = document.getElementById('editCorralIdInput')?.value;
  const nombre = document.getElementById('editNombreCorralInput')?.value.trim();
  const hectareas = parseFloat(document.getElementById('editHaCorralInput')?.value) || 0;
  const color = document.getElementById('editColorCorralInput')?.value || 'emerald';
  const estadoCampana = document.getElementById('editEstadoCampanaCorralInput')?.value || 'Ganadero';
  const cultivo = document.getElementById('editCultivoCorralInput')?.value.trim() || '';
  const rinde = parseFloat(document.getElementById('editRindeCorralInput')?.value) || 0;
  const costoCampana = parseFloat(document.getElementById('editCostoCampanaInput')?.value) || 0;
  const obs = document.getElementById('editObsCorralInput')?.value.trim() || '';
  const lat = parseFloat(document.getElementById('editLatInput')?.value) || null;
  const lng = parseFloat(document.getElementById('editLngInput')?.value) || null;
  if (!id || !nombre) return alert("Nombre obligatorio.");

  const c = window.corralesData[id];
  const carLote = Object.values(window.animalesData || {}).filter(x => x.corralId === id && x.estado === 'activo').length;
  const genLote = c.cantidadGenerica ?? c.cantidad ?? 0;
  if (estadoCampana === 'Sembrado' && (carLote + genLote) > 0) {
    if (!confirm(`⚠️ ATENCIÓN: El lote "${nombre}" todavía tiene ${carLote + genLote} cabezas cargadas.\n\n¿Confirmás pasarlo a estado SEMBRADO igual?`)) return;
  }

  cerrarModal('modalEditarCorral');
  update(ref(db, `corrales/${id}`), { nombre, hectareas, color, estadoCampana, cultivo, rinde, costoCampana, observacion: obs, lat, lng });
};

window.eliminarCorral = function(id, nombre) {
  if (confirm(`¿Eliminar lote "${nombre}"?`)) remove(ref(db,`corrales/${id}`));
};

/* ---------- 2. CARAVANAS Y HACIENDA ---------- */
window.renderAnimales = function() {
  const container = document.getElementById('listaAnimales');
  if (!container) return;
  const animales = window.animalesData || {};
  const corrales = window.corralesData || {};
  let keys = Object.keys(animales);
  if (keys.length === 0) {
    container.innerHTML = `<div class="tarjeta p-6 text-center text-slate-400 text-sm">No hay animales con caravana.</div>`;
    return;
  }
  const filtro = (document.getElementById('buscarAnimalInput')?.value || '').toLowerCase().trim();
  if (filtro) {
    keys = keys.filter(id => {
      const a = animales[id];
      return (a.caravana||'').toLowerCase().includes(filtro) || (a.raza||'').toLowerCase().includes(filtro) ||
             (a.observaciones||'').toLowerCase().includes(filtro) || (corrales[a.corralId]?.nombre||'').toLowerCase().includes(filtro);
    });
  }
  const criterio = document.getElementById('ordenAnimalSelect')?.value || 'caravana';
  keys.sort((a,b) => {
    const A = animales[a], B = animales[b];
    if (criterio === 'caravana') return (A.caravana||'').localeCompare(B.caravana||'');
    if (criterio === 'mayor_peso') return (B.peso||0) - (A.peso||0);
    if (criterio === 'menor_peso') return (A.peso||0) - (B.peso||0);
    return 0;
  });
  container.innerHTML = keys.map(id => {
    const a = animales[id];
    const lote = corrales[a.corralId]?.nombre || 'Sin asignar';
    return `
      <div class="tarjeta tarjeta-hover caravana-item p-4 space-y-2">
        <div class="flex justify-between items-start gap-2">
          <div><h3 class="font-display font-extrabold text-base text-emerald-950">Caravana ${a.caravana}</h3><p class="text-xs text-slate-600">Lote: <strong class="text-emerald-800">${lote}</strong></p></div>
          <div class="flex gap-1.5">
            <button onclick="abrirMoverCaravana('${id}')" class="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center"><i class="fa-solid fa-arrow-right-arrow-left text-xs"></i></button>
            <button onclick="abrirEditarAnimal('${id}')" class="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center"><i class="fa-solid fa-pen text-xs"></i></button>
            <button onclick="eliminarAnimal('${id}','${a.caravana}')" class="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center"><i class="fa-solid fa-trash text-xs"></i></button>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-2 bg-emerald-50/40 p-2.5 rounded-xl text-center">
          <div><p class="text-[9px] font-bold text-slate-400 uppercase">Raza</p><p class="text-xs font-bold text-slate-800">${a.raza || '—'}</p></div>
          <div class="border-x border-emerald-100"><p class="text-[9px] font-bold text-slate-400 uppercase">Edad</p><p class="text-xs font-bold text-slate-800">${a.edad || '—'}</p></div>
          <div><p class="text-[9px] font-bold text-slate-400 uppercase">Peso</p><p class="text-xs font-bold text-emerald-800">${a.peso ? a.peso+'kg' : '—'}</p></div>
        </div>
        ${a.observaciones ? `<p class="text-xs text-slate-600 italic px-1">📝 ${a.observaciones}</p>` : ''}
      </div>`;
  }).join('');
};

window.guardarAnimal = function() {
  const caravana = document.getElementById('animalCaravanaInput')?.value.trim();
  const raza = document.getElementById('animalRazaInput')?.value.trim() || '';
  const edad = document.getElementById('animalEdadInput')?.value.trim() || '';
  const peso = parseFloat(document.getElementById('animalPesoInput')?.value) || 0;
  const corralId = document.getElementById('animalCorralSelect')?.value;
  const obs = document.getElementById('animalObsInput')?.value.trim() || '';
  const motivo = document.getElementById('animalMotivoSelect')?.value || 'Compra';
  const tipoFiscal = document.getElementById('animalTipoFiscalSelect')?.value || 'Interno';
  const comprobante = document.getElementById('animalComprobanteInput')?.value.trim() || '';
  const usuario = document.getElementById('animalUsuarioInput')?.value.trim() || 'Operador';
  const notasIng = document.getElementById('animalNotasIngresoInput')?.value.trim() || '';
  if (!caravana || !corralId) return alert("Completá caravana y corral.");

  cerrarModal('modalNuevoAnimal');
  set(push(animalesRef), { caravana, raza, edad, peso, corralId, observaciones:obs, estado:'activo', timestamp:Date.now() }).then(() => {
    const nombre = window.corralesData[corralId]?.nombre || 'Lote';
    set(push(historialRef), {
      corralId, nombreCorral:nombre, tipo:'SUMAR', cantidad:1,
      motivo:`${motivo} (Caravana ${caravana})`, tipoFiscal, comprobante,
      notas:[`Caravana ${caravana}`, notasIng, obs].filter(Boolean).join(' • '), usuario, timestamp:Date.now()
    });
    const input = document.getElementById('animalCaravanaInput');
    if (input) { if (!isNaN(caravana)) input.value = parseInt(caravana,10)+1; else input.value=''; }
    ['animalRazaInput','animalPesoInput','animalObsInput','animalNotasIngresoInput','animalComprobanteInput'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
  });
};

window.abrirEditarAnimal = function(id) {
  const a = window.animalesData[id]; if (!a) return;
  const e1 = document.getElementById('editAnimalId'); if(e1) e1.value = id;
  const e2 = document.getElementById('editAnimalCaravanaInput'); if(e2) e2.value = a.caravana||'';
  const e3 = document.getElementById('editAnimalRazaInput'); if(e3) e3.value = a.raza||'';
  const e4 = document.getElementById('editAnimalEdadInput'); if(e4) e4.value = a.edad||'';
  const e5 = document.getElementById('editAnimalPesoInput'); if(e5) e5.value = a.peso||'';
  const e6 = document.getElementById('editAnimalCorralBloqueado'); if(e6) e6.value = window.corralesData[a.corralId]?.nombre || 'Sin asignar';
  const e7 = document.getElementById('editAnimalObsInput'); if(e7) e7.value = a.observaciones||'';
  abrirModal('modalEditarAnimal');
};

window.guardarEdicionAnimal = function() {
  const id = document.getElementById('editAnimalId')?.value;
  const caravana = document.getElementById('editAnimalCaravanaInput')?.value.trim();
  if (!id || !caravana) return alert("Caravana obligatoria.");
  cerrarModal('modalEditarAnimal');
  update(ref(db,`animales/${id}`), {
    caravana,
    raza: document.getElementById('editAnimalRazaInput')?.value.trim() || '',
    edad: document.getElementById('editAnimalEdadInput')?.value.trim() || '',
    peso: parseFloat(document.getElementById('editAnimalPesoInput')?.value)||0,
    observaciones: document.getElementById('editAnimalObsInput')?.value.trim() || ''
  });
};

window.abrirMoverCaravana = function(id) {
  const a = window.animalesData[id]; if (!a) return;
  const m1 = document.getElementById('moverAnimalId'); if(m1) m1.value = id;
  const m2 = document.getElementById('moverCaravanaTxt'); if(m2) m2.innerText = a.caravana;
  populateSelects();
  const m3 = document.getElementById('moverCorralSelect'); if(m3) m3.value = a.corralId||'';
  abrirModal('modalMoverCaravana');
};

window.ejecutarMoverCaravana = function() {
  const id = document.getElementById('moverAnimalId')?.value;
  const nuevo = document.getElementById('moverCorralSelect')?.value;
  const a = window.animalesData[id];
  if (!id || !nuevo || !a) return;
  if (a.corralId === nuevo) return alert("Ya está en ese lote.");
  cerrarModal('modalMoverCaravana');
  const nomO = window.corralesData[a.corralId]?.nombre || '—';
  const nomD = window.corralesData[nuevo]?.nombre || '—';
  update(ref(db,`animales/${id}`), { corralId:nuevo }).then(() => {
    set(push(historialRef), { tipo:'TRASLADO', cantidad:1, motivo:`Traslado Caravana ${a.caravana}`, nombreCorral:`Desde ${nomO} hacia ${nomD}`, notas:'Cambio individual', usuario:'Operador', timestamp:Date.now() });
    window.enviarAlertaWhatsApp('traslados', `Traslado Caravana ${a.caravana}: ${nomO} ➔ ${nomD}`);
  });
};

window.eliminarAnimal = function(id, caravana) { if (confirm(`¿Eliminar caravana "${caravana}"?`)) remove(ref(db,`animales/${id}`)); };

window.abrirTrasladoMasivo = function() {
  if (Object.keys(window.corralesData||{}).length < 2) return alert("Necesitás al menos 2 lotes.");
  const mg = document.getElementById('masivoCantidadGenerica'); if(mg) mg.value = '0';
  abrirModal('modalTrasladoMasivo');
  actualizarListaCaravanasMasivo();
};

window.actualizarListaCaravanasMasivo = function() {
  const origenId = document.getElementById('masivoOrigenSelect')?.value;
  const cont = document.getElementById('masivoListaCaravanasContainer');
  if (!cont) return;
  const animales = window.animalesData||{};
  const lista = Object.keys(animales).filter(id => animales[id].corralId===origenId && animales[id].estado==='activo');
  cont.innerHTML = lista.length === 0
    ? `<p class="text-xs text-slate-400 italic p-2">Sin caravanas en este lote.</p>`
    : lista.map(id => `<label class="flex items-center gap-2 p-2 hover:bg-white rounded-lg cursor-pointer text-xs border-b border-slate-100"><input type="checkbox" value="${id}" class="chk-caravana-masivo w-4 h-4 accent-emerald-800"><span class="font-bold text-slate-800">${animales[id].caravana}</span><span class="text-slate-500 text-xs">${animales[id].raza||'—'} · ${animales[id].peso?animales[id].peso+'kg':'s/p'}</span></label>`).join('');
};

window.ejecutarTrasladoMasivo = function() {
  const origen = document.getElementById('masivoOrigenSelect')?.value;
  const destino = document.getElementById('masivoDestinoSelect')?.value;
  const gen = parseInt(document.getElementById('masivoCantidadGenerica')?.value,10)||0;
  const usuario = document.getElementById('masivoUsuarioInput')?.value.trim()||'Operador';
  const notas = document.getElementById('masivoNotasInput')?.value.trim()||'';
  if (!origen || !destino || origen === destino) return alert("Verificá origen y destino.");
  const cO = window.corralesData[origen], cD = window.corralesData[destino];
  const genO = cO.cantidadGenerica ?? cO.cantidad ?? 0;
  if (gen > genO) return alert(`Solo ${genO} genéricas en origen.`);
  const ids = Array.from(document.querySelectorAll('.chk-caravana-masivo:checked')).map(c => c.value);
  if (gen === 0 && ids.length === 0) return alert("Nada seleccionado.");

  cerrarModal('modalTrasladoMasivo');
  if (gen > 0) {
    update(ref(db,`corrales/${origen}`), { cantidadGenerica:genO-gen });
    update(ref(db,`corrales/${destino}`), { cantidadGenerica:(cD.cantidadGenerica ?? cD.cantidad ?? 0)+gen });
  }
  let detalle = '';
  if (ids.length > 0) {
    const nombres = [];
    ids.forEach(id => { update(ref(db,`animales/${id}`), { corralId:destino }); if (window.animalesData[id]) nombres.push(window.animalesData[id].caravana); });
    detalle = ` + Caravanas: [${nombres.join(', ')}]`;
  }
  const totalMov = gen + ids.length;
  set(push(historialRef), { tipo:'TRASLADO', cantidad:totalMov, motivo:'Traslado masivo mixto', nombreCorral:`Desde ${cO.nombre} hacia ${cD.nombre}`, notas:`Genéricas: ${gen}${detalle}${notas?' • '+notas:''}`, usuario, timestamp:Date.now() });
  window.enviarAlertaWhatsApp('traslados', `Traslado masivo (${totalMov} cab.): ${cO.nombre} ➔ ${cD.nombre}`);
};

window.ejecutarIngreso = function() {
  const id = document.getElementById('ingCorralSelect')?.value;
  const cant = parseInt(document.getElementById('ingCantidadInput')?.value,10);
  if (!id || isNaN(cant) || cant<=0) return alert("Cantidad inválida.");
  const c = window.corralesData[id];
  cerrarModal('modalIngresar');
  update(ref(db,`corrales/${id}`), { cantidadGenerica:(c.cantidadGenerica ?? c.cantidad ?? 0)+cant });
  set(push(historialRef), {
    corralId:id, nombreCorral:c.nombre, tipo:'SUMAR', cantidad:cant,
    motivo: document.getElementById('ingMotivoSelect')?.value || 'Compra',
    tipoFiscal: document.getElementById('ingTipoFiscalSelect')?.value || 'Interno',
    comprobante: document.getElementById('ingComprobanteInput')?.value.trim() || '',
    notas: document.getElementById('ingNotasInput')?.value.trim() || '',
    usuario: document.getElementById('ingUsuarioInput')?.value.trim()||'Operador', timestamp:Date.now()
  });
  ['ingCantidadInput','ingComprobanteInput','ingNotasInput'].forEach(k => { const el = document.getElementById(k); if(el) el.value = ''; });
};

window.abrirEgreso = function() {
  if (Object.keys(window.corralesData||{}).length === 0) return alert("Primero creá un lote.");
  const eg = document.getElementById('egCantidadInput'); if(eg) eg.value = '0';
  abrirModal('modalEgresar');
  actualizarListaCaravanasEgreso();
};

window.actualizarListaCaravanasEgreso = function() {
  const corralId = document.getElementById('egCorralSelect')?.value;
  const cont = document.getElementById('egListaCaravanasContainer');
  if (!cont) return;
  const animales = window.animalesData || {};
  const lista = Object.keys(animales).filter(id => animales[id].corralId === corralId && animales[id].estado === 'activo');
  cont.innerHTML = lista.length === 0
    ? `<p class="text-xs text-slate-400 italic p-2">Sin caravanas activas en este lote.</p>`
    : lista.map(id => `<label class="flex items-center gap-2 p-2 hover:bg-white rounded-lg cursor-pointer text-xs border-b border-rose-100"><input type="checkbox" value="${id}" class="chk-caravana-egreso w-4 h-4 accent-rose-700"><span class="font-bold text-slate-800">${animales[id].caravana}</span><span class="text-slate-500 text-xs">${animales[id].raza||'—'} · ${animales[id].peso?animales[id].peso+'kg':'s/p'}</span></label>`).join('');
};

window.ejecutarEgreso = function() {
  const id = document.getElementById('egCorralSelect')?.value;
  const cantGen = parseInt(document.getElementById('egCantidadInput')?.value, 10) || 0;
  const motivo = document.getElementById('egMotivoSelect')?.value || 'Venta';
  const tipoFiscal = document.getElementById('egTipoFiscalSelect')?.value || 'Fiscal / DTE';
  const comprobante = document.getElementById('egComprobanteInput')?.value.trim() || '';
  const usuario = document.getElementById('egUsuarioInput')?.value.trim() || 'Operador';
  const notas = document.getElementById('egNotasInput')?.value.trim() || '';

  const c = window.corralesData[id]; if (!c) return;
  const actGen = c.cantidadGenerica ?? c.cantidad ?? 0;
  if (cantGen > actGen) return alert(`Solo hay ${actGen} cabezas genéricas disponibles.`);
  const caravanasIds = Array.from(document.querySelectorAll('.chk-caravana-egreso:checked')).map(cb => cb.value);
  if (cantGen === 0 && caravanasIds.length === 0) return alert("Indicá cantidad o tildá una caravana.");

  cerrarModal('modalEgresar');
  if (cantGen > 0) update(ref(db, `corrales/${id}`), { cantidadGenerica: actGen - cantGen });
  let detalleCaravanas = '';
  if (caravanasIds.length > 0) {
    const nombres = [];
    caravanasIds.forEach(animId => { if (window.animalesData[animId]) nombres.push(window.animalesData[animId].caravana); remove(ref(db, `animales/${animId}`)); });
    detalleCaravanas = `Caravanas: [${nombres.join(', ')}]`;
  }
  const totalEgresado = cantGen + caravanasIds.length;
  set(push(historialRef), {
    corralId: id, nombreCorral: c.nombre, tipo: 'RESTAR', cantidad: totalEgresado, motivo, tipoFiscal, comprobante,
    notas: [cantGen > 0 ? `Genéricas: ${cantGen}` : '', detalleCaravanas, notas].filter(Boolean).join(' • '), usuario, timestamp: Date.now()
  });
  window.enviarAlertaWhatsApp('egresos', `Egreso (${motivo}): -${totalEgresado} cab. de ${c.nombre} [${tipoFiscal}]`);
};

window.ejecutarTraslado = function() {
  const origen = document.getElementById('trOrigenSelect')?.value;
  const destino = document.getElementById('trDestinoSelect')?.value;
  const cant = parseInt(document.getElementById('trCantidadInput')?.value,10);
  if (!origen || !destino || origen===destino || isNaN(cant) || cant<=0) return alert("Verificá los datos.");
  const cO = window.corralesData[origen], cD = window.corralesData[destino];
  const genO = cO.cantidadGenerica ?? cO.cantidad ?? 0;
  if (cant > genO) return alert(`Solo ${genO} disponibles en origen.`);

  cerrarModal('modalTraslado');
  update(ref(db,`corrales/${origen}`), { cantidadGenerica:genO-cant });
  update(ref(db,`corrales/${destino}`), { cantidadGenerica:(cD.cantidadGenerica ?? cD.cantidad ?? 0)+cant });
  set(push(historialRef), { tipo:'TRASLADO', cantidad:cant, motivo:'Traslado tropa', nombreCorral:`Desde ${cO.nombre} hacia ${cD.nombre}`, notas:document.getElementById('trNotasInput')?.value.trim()||'', usuario:document.getElementById('trUsuarioInput')?.value.trim()||'Operador', timestamp:Date.now() });
  window.enviarAlertaWhatsApp('traslados', `Traslado tropa (${cant} cab.): ${cO.nombre} ➔ ${cD.nombre}`);
};

/* ---------- 3. AGRÍCOLA ---------- */
window.renderAgricola = function() {
  const container = document.getElementById('listaLabores');
  if (!container) return;
  const corrales = window.corralesData || {};
  const filtroLote = document.getElementById('filtroLoteAgricola')?.value || '';
  let list = window.laboresData || [];
  if (filtroLote) list = list.filter(l => l.loteId === filtroLote);

  const costoTotal = list.reduce((acc, l) => acc + (parseFloat(l.costoTotal)||0), 0);
  const el1 = document.getElementById('agriCostoTotal'); if(el1) el1.innerText = '$' + costoTotal.toLocaleString('es-AR');
  const el2 = document.getElementById('agriTotalLabores'); if(el2) el2.innerText = list.length;

  if (list.length === 0) {
    container.innerHTML = `<div class="tarjeta p-6 text-center text-slate-400 text-sm">No hay labores agrícolas registradas.</div>`;
    return;
  }
  container.innerHTML = list.map(l => `
    <div class="tarjeta tarjeta-hover p-4 space-y-2 border-l-4 border-emerald-700">
      <div class="flex justify-between items-start gap-2">
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <span class="chip badge-verde">${l.tipo}</span>
            <span class="font-display font-extrabold text-base text-emerald-950">${corrales[l.loteId]?.nombre || l.loteNombre || 'Lote'}</span>
          </div>
          <p class="text-xs text-slate-500 mt-1">${l.fecha || ''} ${l.contratista ? '· ' + l.contratista : ''}</p>
        </div>
        <div class="text-right flex items-center gap-2">
          <span class="font-display font-extrabold text-base text-emerald-900">$${(parseFloat(l.costoTotal)||0).toLocaleString('es-AR')}</span>
          <button onclick="eliminarLabor('${l.id}')" class="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center"><i class="fa-solid fa-trash text-xs"></i></button>
        </div>
      </div>
      ${l.insumoDetalle ? `<p class="text-xs bg-amber-50 text-amber-900 px-3 py-1.5 rounded-xl font-medium">🧪 Insumo: ${l.insumoDetalle}</p>` : ''}
      ${l.notas ? `<p class="text-xs text-slate-600 italic">${l.notas}</p>` : ''}
    </div>`).join('');
};

window.abrirModalLabor = function() {
  if (Object.keys(window.corralesData||{}).length === 0) return alert("Primero creá un lote.");
  const lf = document.getElementById('laborFechaInput'); if(lf) lf.value = new Date().toISOString().slice(0, 10);
  const lc = document.getElementById('laborCostoInput'); if(lc) lc.value = '';
  const lic = document.getElementById('laborInsumoCantInput'); if(lic) lic.value = '';
  abrirModal('modalNuevaLabor');
};

window.guardarLabor = function() {
  const loteId = document.getElementById('laborLoteSelect')?.value;
  const fecha = document.getElementById('laborFechaInput')?.value || new Date().toISOString().slice(0, 10);
  const tipo = document.getElementById('laborTipoSelect')?.value || 'Pulverización';
  const costoLabor = parseFloat(document.getElementById('laborCostoInput')?.value) || 0;
  const contratista = document.getElementById('laborContratistaInput')?.value.trim() || '';
  const insumoId = document.getElementById('laborInsumoSelect')?.value;
  const insumoCant = parseFloat(document.getElementById('laborInsumoCantInput')?.value) || 0;
  const notas = document.getElementById('laborNotasInput')?.value.trim() || '';
  if (!loteId) return alert("Seleccioná un lote.");
  const lote = window.corralesData[loteId];

  let costoInsumo = 0, insumoDetalle = '';
  if (insumoId && insumoCant > 0) {
    const ins = window.insumosData[insumoId];
    if (!ins) return alert("Insumo no encontrado.");
    const stockAct = parseFloat(ins.stock) || 0;
    if (insumoCant > stockAct) return alert(`Stock insuficiente de "${ins.nombre}". Disponible: ${stockAct} ${ins.unidad}.`);
    const nuevoStock = +(stockAct - insumoCant).toFixed(2);
    costoInsumo = insumoCant * (parseFloat(ins.costoUnitario) || 0);
    insumoDetalle = `${ins.nombre} (${insumoCant} ${ins.unidad} · $${Math.round(costoInsumo).toLocaleString('es-AR')})`;
    update(ref(db, `insumos/${insumoId}`), { stock: nuevoStock });
    const min = parseFloat(ins.minimo) || 0;
    if (min > 0 && nuevoStock <= min) window.enviarAlertaWhatsApp('stock', `⚠️ Stock bajo en Galpón: ${ins.nombre} quedó en ${nuevoStock} ${ins.unidad} (Mín: ${min}).`);
  }

  const costoTotal = costoLabor + costoInsumo;
  cerrarModal('modalNuevaLabor');
  update(ref(db, `corrales/${loteId}`), { costoCampana: Math.round((parseFloat(lote.costoCampana)||0) + costoTotal) });
  set(push(laboresRef), { loteId, loteNombre: lote.nombre, fecha, tipo, contratista, costoLabor, costoInsumo, costoTotal, insumoDetalle, notas, timestamp: Date.now() });
  set(push(historialRef), { corralId: loteId, nombreCorral: lote.nombre, tipo: 'SUMAR', cantidad: 1, motivo: `Labor Agrícola: ${tipo}`, notas: [insumoDetalle, contratista, notas].filter(Boolean).join(' • '), usuario: 'Agrícola', timestamp: Date.now() });
};

window.eliminarLabor = function(id) { if (confirm("¿Eliminar labor?")) remove(ref(db, `labores/${id}`)); };

window.abrirModalCosecha = function() {
  if (Object.keys(window.corralesData||{}).length === 0) return alert("Primero creá un lote.");
  const ct = document.getElementById('cosechaTotalInput'); if(ct) ct.value = '';
  abrirModal('modalCosecha');
  recalcularRindePreview();
};

window.recalcularRindePreview = function() {
  const loteId = document.getElementById('cosechaLoteSelect')?.value;
  const unidad = document.getElementById('cosechaUnidadSelect')?.value || 'qq';
  const total = parseFloat(document.getElementById('cosechaTotalInput')?.value) || 0;
  const ha = parseFloat(window.corralesData[loteId]?.hectareas) || 0;
  const prev = document.getElementById('cosechaRindePreview');
  if (!prev) return;
  if (ha <= 0) { prev.innerText = 'Cargá ha en el lote'; return; }
  const quintales = unidad === 'kg' ? (total / 100) : total;
  prev.innerText = `${(quintales / ha).toFixed(1)} qq/ha`;
};

window.ejecutarCierreCosecha = function() {
  const loteId = document.getElementById('cosechaLoteSelect')?.value;
  const unidad = document.getElementById('cosechaUnidadSelect')?.value || 'qq';
  const total = parseFloat(document.getElementById('cosechaTotalInput')?.value) || 0;
  const lote = window.corralesData[loteId];
  if (!lote || total <= 0) return alert("Verificá lote y cantidad.");
  const ha = parseFloat(lote.hectareas) || 0;
  if (ha <= 0) return alert(`El lote "${lote.nombre}" no tiene hectáreas cargadas.`);
  const quintales = unidad === 'kg' ? (total / 100) : total;
  const rinde = +(quintales / ha).toFixed(1);

  cerrarModal('modalCosecha');
  update(ref(db, `corrales/${loteId}`), { estadoCampana: 'Cosechado', rinde });
  set(push(historialRef), { corralId: loteId, nombreCorral: lote.nombre, tipo: 'SUMAR', cantidad: Math.round(quintales), motivo: `Cierre de Cosecha (${rinde} qq/ha)`, notas: `Total: ${quintales.toFixed(1)} qq en ${ha} ha`, usuario: 'Agrícola', timestamp: Date.now() });
};

/* ---------- 4. INSUMOS (GALPÓN) ---------- */
window.renderInsumos = function() {
  const container = document.getElementById('listaInsumos');
  if (!container) return;
  const insumos = window.insumosData || {};
  let keys = Object.keys(insumos);

  const valorTotal = keys.reduce((acc, id) => acc + ((parseFloat(insumos[id].stock)||0) * (parseFloat(insumos[id].costoUnitario)||0)), 0);
  const bajos = keys.filter(id => (parseFloat(insumos[id].minimo)||0) > 0 && (parseFloat(insumos[id].stock)||0) <= (parseFloat(insumos[id].minimo)||0)).length;
  const ivt = document.getElementById('insumosValorTotal'); if(ivt) ivt.innerText = '$' + Math.round(valorTotal).toLocaleString('es-AR');
  const iac = document.getElementById('insumosAlertaCount'); if(iac) iac.innerText = bajos;

  if (keys.length === 0) {
    container.innerHTML = `<div class="tarjeta p-6 text-center text-slate-400 text-sm">Galpón vacío. Agregá el primer insumo arriba.</div>`;
    return;
  }
  const filtro = (document.getElementById('buscarInsumoInput')?.value || '').toLowerCase().trim();
  if (filtro) keys = keys.filter(id => (insumos[id].nombre||'').toLowerCase().includes(filtro));
  keys.sort((a,b) => (insumos[a].nombre||'').localeCompare(insumos[b].nombre||''));

  container.innerHTML = keys.map(id => {
    const i = insumos[id];
    const stock = parseFloat(i.stock) || 0, min = parseFloat(i.minimo) || 0, costo = parseFloat(i.costoUnitario) || 0;
    const esBajo = min > 0 && stock <= min;
    return `
      <div class="tarjeta tarjeta-hover p-4 space-y-2.5 border-l-4 ${esBajo ? 'border-orange-500 bg-orange-50/20' : 'border-emerald-700'}">
        <div class="flex justify-between items-start gap-2">
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="font-display font-extrabold text-base text-emerald-950">${i.nombre}</h3>
              ${esBajo ? `<span class="chip badge-naranja">⚠️ Bajo Stock (Mín: ${min})</span>` : ''}
            </div>
            <p class="text-xs text-slate-500 mt-1">Costo ref: <strong>$${costo.toLocaleString('es-AR')}</strong> / ${i.unidad}</p>
          </div>
          <div class="text-right">
            <p class="font-display text-2xl font-extrabold ${esBajo ? 'text-orange-600' : 'text-emerald-950'} leading-none">${stock}</p>
            <p class="text-[10px] font-bold text-slate-400 uppercase mt-1">${i.unidad}</p>
          </div>
        </div>
        <div class="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
          <div class="flex gap-2">
            <button onclick="abrirMovInsumo('${id}','COMPRA')" class="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-900 font-bold text-xs">+ Stock</button>
            <button onclick="abrirMovInsumo('${id}','CONSUMO')" class="px-3 py-1.5 rounded-xl bg-amber-100 text-amber-900 font-bold text-xs">- Consumo</button>
          </div>
          <button onclick="eliminarInsumo('${id}','${(i.nombre||'').replace(/'/g,"\\'")}')" class="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center"><i class="fa-solid fa-trash text-xs"></i></button>
        </div>
      </div>`;
  }).join('');
};

window.guardarNuevoInsumo = function() {
  const nombre = document.getElementById('insumoNombreInput')?.value.trim();
  if (!nombre) return alert("Ingresá el nombre del insumo.");
  cerrarModal('modalNuevoInsumo');
  set(push(insumosRef), {
    nombre,
    unidad: document.getElementById('insumoUnidadSelect')?.value || 'Litros',
    stock: parseFloat(document.getElementById('insumoStockInput')?.value) || 0,
    minimo: parseFloat(document.getElementById('insumoMinimoInput')?.value) || 0,
    costoUnitario: parseFloat(document.getElementById('insumoCostoUnitInput')?.value) || 0,
    timestamp: Date.now()
  }).then(() => {
    ['insumoNombreInput','insumoMinimoInput','insumoCostoUnitInput'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
    const s = document.getElementById('insumoStockInput'); if(s) s.value = '0';
  });
};

window.abrirMovInsumo = function(id, tipo) {
  const ins = window.insumosData[id]; if (!ins) return;
  const m1 = document.getElementById('movInsumoId'); if(m1) m1.value = id;
  const m2 = document.getElementById('movInsumoTipo'); if(m2) m2.value = tipo;
  const m3 = document.getElementById('movInsumoTitulo'); if(m3) m3.innerText = tipo === 'COMPRA' ? 'Ingreso / Compra Stock' : 'Consumo Directo';
  const m4 = document.getElementById('movInsumoSubtitulo'); if(m4) m4.innerText = `${ins.nombre} · Actual: ${ins.stock} ${ins.unidad}`;
  const m5 = document.getElementById('movInsumoCantInput'); if(m5) m5.value = '';
  const m6 = document.getElementById('movInsumoCostoInput'); if(m6) m6.value = ins.costoUnitario || '';
  const m7 = document.getElementById('movInsumoCompInput'); if(m7) m7.value = '';
  const m8 = document.getElementById('movInsumoNotasInput'); if(m8) m8.value = '';
  const cw = document.getElementById('movInsumoCostoWrap'); if(cw) cw.style.display = tipo === 'COMPRA' ? 'block' : 'none';
  const fw = document.getElementById('movInsumoFiscalWrap'); if(fw) fw.style.display = tipo === 'COMPRA' ? 'grid' : 'none';
  abrirModal('modalMovInsumo');
};

window.ejecutarMovInsumo = function() {
  const id = document.getElementById('movInsumoId')?.value;
  const tipo = document.getElementById('movInsumoTipo')?.value;
  const cant = parseFloat(document.getElementById('movInsumoCantInput')?.value) || 0;
  const nuevoCosto = parseFloat(document.getElementById('movInsumoCostoInput')?.value);
  const tipoFiscal = document.getElementById('movInsumoFiscalSelect')?.value || 'Fiscal / DTE';
  const comprobante = document.getElementById('movInsumoCompInput')?.value.trim() || '';
  const notas = document.getElementById('movInsumoNotasInput')?.value.trim() || '';
  const ins = window.insumosData[id];
  if (!ins || cant <= 0) return alert("Cantidad inválida.");
  const stockAct = parseFloat(ins.stock) || 0;
  if (tipo === 'CONSUMO' && cant > stockAct) return alert(`Solo hay ${stockAct} ${ins.unidad} disponibles.`);

  const nuevoStock = tipo === 'COMPRA' ? +(stockAct + cant).toFixed(2) : +(stockAct - cant).toFixed(2);
  const upd = { stock: nuevoStock };
  if (tipo === 'COMPRA' && !isNaN(nuevoCosto) && nuevoCosto >= 0) upd.costoUnitario = nuevoCosto;

  cerrarModal('modalMovInsumo');
  update(ref(db, `insumos/${id}`), upd);
  set(push(historialRef), {
    nombreCorral: `Galpón: ${ins.nombre}`, tipo: tipo === 'COMPRA' ? 'SUMAR' : 'RESTAR', cantidad: cant,
    motivo: tipo === 'COMPRA' ? `Compra Insumo (${ins.unidad})` : `Consumo Directo (${ins.unidad})`,
    tipoFiscal: tipo === 'COMPRA' ? tipoFiscal : 'Interno', comprobante: tipo === 'COMPRA' ? comprobante : '', notas, usuario: 'Galpón', timestamp: Date.now()
  });
  const min = parseFloat(ins.minimo) || 0;
  if (tipo === 'CONSUMO' && min > 0 && nuevoStock <= min) window.enviarAlertaWhatsApp('stock', `⚠️ Stock bajo en Galpón: ${ins.nombre} quedó en ${nuevoStock} ${ins.unidad} (Mín: ${min}).`);
};

window.eliminarInsumo = function(id, nombre) { if (confirm(`¿Eliminar "${nombre}"?`)) remove(ref(db, `insumos/${id}`)); };

/* ---------- 5. PLUVIÓMETRO ---------- */
window.renderLluvias = function() {
  const container = document.getElementById('listaLluvias');
  if (!container) return;
  const list = window.lluviasData || [];
  const hoyStr = new Date().toISOString();
  const mmMes = list.filter(l => (l.fecha||'').startsWith(hoyStr.slice(0, 7))).reduce((a,b) => a + (parseFloat(b.mm)||0), 0);
  const mmAnio = list.filter(l => (l.fecha||'').startsWith(hoyStr.slice(0, 4))).reduce((a,b) => a + (parseFloat(b.mm)||0), 0);
  const lam = document.getElementById('lluviaAcumMesCard'); if(lam) lam.innerText = `${mmMes} mm`;
  const laa = document.getElementById('lluviaAcumAnioCard'); if(laa) laa.innerText = `${mmAnio} mm`;

  if (list.length === 0) {
    container.innerHTML = `<div class="tarjeta p-6 text-center text-slate-400 text-sm">No hay registros de lluvia todavía.</div>`;
    return;
  }
  container.innerHTML = list.map(l => `
    <div class="tarjeta p-3.5 flex items-center justify-between gap-2">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-12 h-12 rounded-2xl bg-sky-100 text-sky-800 flex flex-col items-center justify-center flex-shrink-0 font-display font-extrabold">
          <span class="text-base leading-none">${l.mm}</span><span class="text-[9px] uppercase">mm</span>
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <p class="text-sm font-extrabold text-slate-800">${l.ubicacion || 'Casco'}</p>
            <span class="text-xs text-slate-400">· ${l.fecha}</span>
            ${l.granizo ? `<span class="chip badge-rojo">⛈️ Granizo</span>` : ''}
            ${l.helada ? `<span class="chip badge-azul">❄️ Helada</span>` : ''}
          </div>
          ${l.notas ? `<p class="text-xs text-slate-500 truncate mt-1">${l.notas}</p>` : ''}
        </div>
      </div>
      <button onclick="eliminarLluvia('${l.id}')" class="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center flex-shrink-0"><i class="fa-solid fa-trash text-xs"></i></button>
    </div>`).join('');
};

window.abrirModalLluvia = function() {
  const lf = document.getElementById('lluviaFechaInput'); if(lf) lf.value = new Date().toISOString().slice(0, 10);
  const lm = document.getElementById('lluviaMmInput'); if(lm) lm.value = '';
  const lg = document.getElementById('lluviaGranizoChk'); if(lg) lg.checked = false;
  const lh = document.getElementById('lluviaHeladaChk'); if(lh) lh.checked = false;
  const ln = document.getElementById('lluviaNotasInput'); if(ln) ln.value = '';
  abrirModal('modalNuevaLluvia');
};

window.guardarLluvia = function() {
  const fecha = document.getElementById('lluviaFechaInput')?.value || new Date().toISOString().slice(0, 10);
  const mm = parseFloat(document.getElementById('lluviaMmInput')?.value) || 0;
  const ubicacion = document.getElementById('lluviaUbicacionSelect')?.value || 'Casco';
  const granizo = document.getElementById('lluviaGranizoChk')?.checked || false;
  const helada = document.getElementById('lluviaHeladaChk')?.checked || false;
  const notas = document.getElementById('lluviaNotasInput')?.value.trim() || '';
  if (!fecha || (mm <= 0 && !granizo && !helada)) return alert("Ingresá milímetros o marcá un evento.");
  cerrarModal('modalNuevaLluvia');
  set(push(lluviasRef), { fecha, mm, ubicacion, granizo, helada, notas, timestamp: Date.now() });
};

window.eliminarLluvia = function(id) { if (confirm("¿Eliminar registro?")) remove(ref(db, `lluvias/${id}`)); };

/* ---------- 6, 7, 8. FLETES, TAREAS, HISTORIAL Y CONTADOR ---------- */
window.renderFletes = function() {
  const container = document.getElementById('listaFletes');
  if (!container) return;
  const list = window.fletesData || [];
  const ftg = document.getElementById('fletesTotalGastado'); if(ftg) ftg.innerText = '$' + list.reduce((a,b) => a+(b.costo||0), 0).toLocaleString('es-AR');
  const ftp = document.getElementById('fletesTotalPendiente'); if(ftp) ftp.innerText = '$' + list.filter(f => f.estadoPago === 'Pendiente').reduce((a,b) => a+(b.costo||0), 0).toLocaleString('es-AR');
  if (list.length === 0) { container.innerHTML = `<div class="tarjeta p-6 text-center text-slate-400 text-sm">No hay fletes registrados.</div>`; return; }
  container.innerHTML = list.map(f => `
    <div class="tarjeta tarjeta-hover p-4 space-y-2.5">
      <div class="flex justify-between items-start">
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <h3 class="font-display font-extrabold text-base text-emerald-950"><i class="fa-solid fa-truck text-orange-500 text-xs"></i> ${f.transportista}</h3>
            <span class="chip ${f.tipoFiscal==='Fiscal / DTE'?'badge-azul':'badge-gris'}">${f.tipoFiscal||'Interno'}</span>
          </div>
          <p class="text-xs text-slate-500 mt-0.5">${f.chofer ? 'Chofer: '+f.chofer : 'Sin chofer'}</p>
        </div>
        <button onclick="eliminarFlete('${f.id}')" class="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center"><i class="fa-solid fa-trash text-xs"></i></button>
      </div>
      <div class="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl text-xs">
        <div><span class="text-slate-400">Guía:</span> <strong>${f.guia||'—'}</strong></div>
        <div><span class="text-slate-400">Cab:</span> <strong class="text-emerald-800">${f.cantidad}</strong></div>
        <div><span class="text-slate-400">Destino:</span> <strong>${f.destino||'—'}</strong></div>
        <div><span class="text-slate-400">Costo:</span> <strong>$${(f.costo||0).toLocaleString('es-AR')}</strong></div>
      </div>
      <div class="flex justify-between items-center pt-1">
        <button onclick="toggleEstadoPagoFlete('${f.id}','${f.estadoPago}')" class="text-xs text-blue-700 font-bold hover:underline">Cambiar a ${f.estadoPago==='Pagado'?'Pendiente':'Pagado'}</button>
        <span class="chip ${f.estadoPago==='Pagado'?'badge-verde':'badge-naranja'}">${f.estadoPago}</span>
      </div>
    </div>`).join('');
};

window.guardarFlete = function() {
  const transportista = document.getElementById('fleteTransportista')?.value.trim();
  const cant = parseInt(document.getElementById('fleteCantidad')?.value,10);
  if (!transportista || isNaN(cant) || cant<=0) return alert("Completá transportista y cantidad.");
  const costo = parseFloat(document.getElementById('fleteCosto')?.value)||0;
  const destino = document.getElementById('fleteDestino')?.value.trim() || '';
  cerrarModal('modalFlete');
  set(push(fletesRef), {
    transportista, chofer:document.getElementById('fleteChofer')?.value.trim()||'', guia:document.getElementById('fleteGuia')?.value.trim()||'',
    destino, cantidad:cant, costo, tipoFiscal:document.getElementById('fleteTipoFiscal')?.value||'Fiscal / DTE', estadoPago:document.getElementById('fleteEstadoPago')?.value||'Pendiente', timestamp:Date.now()
  });
  window.enviarAlertaWhatsApp('fletes', `Nuevo flete: ${transportista} (${cant} cab.) ➔ ${destino || 'Sin destino'} · $${costo.toLocaleString('es-AR')}`);
};
window.toggleEstadoPagoFlete = (id, actual) => update(ref(db,`fletes/${id}`), { estadoPago: actual==='Pagado'?'Pendiente':'Pagado' });
window.eliminarFlete = id => { if (confirm("¿Eliminar flete?")) remove(ref(db,`fletes/${id}`)); };

window.renderKanban = function() {
  const tareas = window.tareasData || {};
  const cols = { tomado:'', en_ejecucion:'', completado:'' }, counts = { tomado:0, en_ejecucion:0, completado:0 };
  let archHTML = '', cArch = 0;
  Object.keys(tareas).forEach(id => {
    const t = tareas[id];
    if (t.archivada) {
      cArch++;
      archHTML += `<div class="bg-slate-50 p-3 rounded-xl border flex justify-between items-start gap-2 text-xs"><div class="min-w-0"><p class="font-bold text-slate-800 truncate">${t.titulo}</p><p class="text-slate-500 truncate">${t.observaciones||''}</p></div><button onclick="restaurarTarea('${id}')" class="px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-lg font-bold">Restaurar</button></div>`;
      return;
    }
    counts[t.estado]++;
    cols[t.estado] += `<div class="bg-white p-3 rounded-xl shadow-sm border border-slate-200 space-y-2"><div class="flex justify-between items-start gap-1"><span class="font-bold text-slate-800 text-sm flex-1">${t.titulo}</span><button onclick="eliminarTarea('${id}')" class="text-slate-300 hover:text-rose-600"><i class="fa-solid fa-xmark text-xs"></i></button></div><div onclick="editarObsTarea('${id}')" class="text-slate-600 bg-slate-50 p-2 rounded-lg text-xs cursor-pointer border border-dashed border-slate-200">${t.observaciones || 'Tocá para editar'}</div><div class="flex justify-between items-center pt-1 border-t border-slate-100">${t.estado!=='tomado' ? `<button onclick="cambiarEstadoTarea('${id}','${t.estado==='completado'?'en_ejecucion':'tomado'}')" class="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center"><i class="fa-solid fa-chevron-left text-xs"></i></button>` : '<span></span>'}${t.estado!=='completado' ? `<button onclick="cambiarEstadoTarea('${id}','${t.estado==='tomado'?'en_ejecucion':'completado'}')" class="px-2.5 py-1.5 bg-indigo-50 text-indigo-800 font-bold rounded-lg text-xs">Avanzar ›</button>` : '<span class="text-emerald-700 font-bold text-xs">✓ Listo</span>'}</div></div>`;
  });
  const cTomado = document.getElementById('colTomado'); if(cTomado) cTomado.innerHTML = cols.tomado || '<p class="text-xs text-slate-400 text-center py-4">Sin tareas</p>';
  const cEjec = document.getElementById('colEjecucion'); if(cEjec) cEjec.innerHTML = cols.en_ejecucion || '<p class="text-xs text-slate-400 text-center py-4">Sin tareas</p>';
  const cComp = document.getElementById('colCompletado'); if(cComp) cComp.innerHTML = cols.completado || '<p class="text-xs text-slate-400 text-center py-4">Sin tareas</p>';
  const cntTomado = document.getElementById('countTomado'); if(cntTomado) cntTomado.innerText = counts.tomado;
  const cntEjec = document.getElementById('countEjecucion'); if(cntEjec) cntEjec.innerText = counts.en_ejecucion;
  const cntComp = document.getElementById('countCompletado'); if(cntComp) cntComp.innerText = counts.completado;
  const cntArch = document.getElementById('countArchivadasBtn'); if(cntArch) cntArch.innerText = cArch;
  const lstArch = document.getElementById('listaTareasArchivadas'); if(lstArch) lstArch.innerHTML = archHTML || '<p class="text-xs text-slate-400 text-center py-6">No hay archivadas.</p>';
};

window.guardarTarea = function() {
  const titulo = document.getElementById('tareaTituloInput')?.value.trim();
  if (!titulo) return alert("Ingresá la tarea.");
  cerrarModal('modalNuevaTarea');
  set(push(tareasRef), { titulo, observaciones:document.getElementById('tareaObsInput')?.value.trim()||'', estado:'tomado', archivada:false, timestamp:Date.now() });
};
window.cambiarEstadoTarea = (id, estado) => update(ref(db,`tareas/${id}`), { estado });
window.editarObsTarea = id => { const n = prompt("Observaciones:", window.tareasData[id]?.observaciones||""); if (n !== null) update(ref(db,`tareas/${id}`), { observaciones:n.trim() }); };
window.eliminarTarea = id => { if (confirm("¿Eliminar tarea?")) remove(ref(db,`tareas/${id}`)); };
window.archivarCompletadas = () => { Object.keys(window.tareasData).forEach(id => { if (window.tareasData[id].estado==='completado' && !window.tareasData[id].archivada) update(ref(db,`tareas/${id}`), { archivada:true }); }); };
window.restaurarTarea = id => update(ref(db,`tareas/${id}`), { archivada:false });

window.renderNotas = function() {
  const c = document.getElementById('listaNotasRapidas'); if (!c) return;
  const notas = window.notasData || {}, keys = Object.keys(notas);
  c.innerHTML = keys.length === 0 ? `<p class="text-xs text-slate-400 text-center py-2 col-span-2">No hay notas.</p>` :
    keys.map(id => `<div class="bg-amber-50 border border-amber-200 p-2.5 rounded-xl flex justify-between items-start gap-2 text-xs"><p class="text-slate-800 break-words flex-1 font-medium">${notas[id].texto}</p><button onclick="eliminarNotaRapida('${id}')" class="text-slate-400 hover:text-rose-600"><i class="fa-solid fa-xmark text-xs"></i></button></div>`).join('');
};
window.guardarNotaRapida = () => { const t = document.getElementById('notaRapidaInput')?.value.trim(); if (t) set(push(notasRef), { texto:t, timestamp:Date.now() }).then(() => { const el = document.getElementById('notaRapidaInput'); if(el) el.value=''; }); };
window.eliminarNotaRapida = id => remove(ref(db,`notas_rapidas/${id}`));

window.renderHistorial = function() {
  const container = document.getElementById('listaHistorial'); if (!container) return;
  let list = [...(window.historialData || [])];
  if (list.length === 0) { container.innerHTML = `<div class="p-6 text-center text-slate-400 text-sm">Sin movimientos aún.</div>`; return; }
  const filtro = (document.getElementById('buscarHistorialInput')?.value || '').toLowerCase().trim();
  if (filtro) list = list.filter(h => (h.nombreCorral||'').toLowerCase().includes(filtro) || (h.motivo||'').toLowerCase().includes(filtro) || (h.notas||'').toLowerCase().includes(filtro) || (h.comprobante||'').toLowerCase().includes(filtro));
  const criterio = document.getElementById('ordenHistorialSelect')?.value || 'recientes';
  list.sort((a,b) => criterio==='recientes' ? (b.timestamp||0)-(a.timestamp||0) : criterio==='antiguos' ? (a.timestamp||0)-(b.timestamp||0) : (a.nombreCorral||'').localeCompare(b.nombreCorral||''));

  container.innerHTML = list.map(h => {
    const fecha = h.timestamp ? new Date(h.timestamp).toLocaleString('es-AR',{dateStyle:'short',timeStyle:'short'}) : '';
    const esSuma = h.tipo === 'SUMAR', esTraslado = h.tipo === 'TRASLADO';
    const fiscalTag = h.tipoFiscal === 'Fiscal / DTE' ? `<span class="chip badge-azul text-[10px]">Fiscal${h.comprobante ? ': '+h.comprobante : ''}</span>` : '';
    return `<div class="p-3.5 flex items-start gap-3"><div class="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${esTraslado?'badge-azul':(esSuma?'badge-verde':'badge-rojo')}"><i class="fa-solid ${esTraslado?'fa-arrow-right-arrow-left':(esSuma?'fa-plus':'fa-minus')} text-xs"></i></div><div class="min-w-0 flex-1"><div class="flex items-center gap-2 flex-wrap"><p class="text-sm font-bold text-slate-800">${h.nombreCorral||'—'}</p>${fiscalTag}</div><p class="text-xs text-slate-600 mt-0.5">${h.motivo||''}</p><p class="text-[11px] text-slate-400 mt-1">${fecha}${h.usuario?' · '+h.usuario:''}${h.notas?' · '+h.notas:''}</p></div><span class="text-base font-extrabold ${esTraslado?'text-blue-700':(esSuma?'text-emerald-700':'text-rose-700')}">${esTraslado?h.cantidad:(esSuma?'+'+h.cantidad:'-'+h.cantidad)}</span></div>`;
  }).join('');
};

window.exportarStockCSV = function() {
  const corrales = window.corralesData || {}, animales = window.animalesData || {}, keys = Object.keys(corrales);
  if (keys.length === 0) return alert("No hay datos.");
  let csv = "\uFEFFLote,Hectareas,Estado Campana,Cultivo,Rinde qq/ha,Latitud,Longitud,Con Caravana,Genericas,Total Cabezas\n";
  keys.forEach(id => {
    const c = corrales[id], car = Object.values(animales).filter(a => a.corralId===id && a.estado==='activo').length, gen = c.cantidadGenerica ?? c.cantidad ?? 0;
    csv += `"${(c.nombre||'').replace(/"/g,'""')}",${c.hectareas||0},"${c.estadoCampana||'Ganadero'}","${c.cultivo||''}",${c.rinde||0},${c.lat||''},${c.lng||''},${car},${gen},${car+gen}\n`;
  });
  descargarCSV(csv, `stock_campo_${new Date().toISOString().slice(0,10)}.csv`);
};

window.exportarReporteContador = function() {
  const mes = document.getElementById('contadorMesInput')?.value;
  if (!mes) return alert("Seleccioná un mes.");
  let csv = `\uFEFFREPORTE CONTABLE CAMPO - PERIODO ${mes}\n\n1. EXISTENCIA ACTUAL DE HACIENDA\nLote,Con Caravana,Genericas,Total\n`;
  const corrales = window.corralesData || {}, animales = window.animalesData || {};
  Object.keys(corrales).forEach(id => {
    const c = corrales[id], car = Object.values(animales).filter(a => a.corralId===id && a.estado==='activo').length, gen = c.cantidadGenerica ?? c.cantidad ?? 0;
    csv += `"${(c.nombre||'').replace(/"/g,'""')}",${car},${gen},${car+gen}\n`;
  });
  csv += "\n2. MOVIMIENTOS FISCALES / DTE DEL MES\nFecha,Tipo,Concepto,Cantidad,Motivo,Comprobante,Detalle\n";
  (window.historialData || []).forEach(h => {
    if (!h.timestamp) return;
    const fISO = new Date(h.timestamp).toISOString();
    if (fISO.startsWith(mes) && h.tipoFiscal === 'Fiscal / DTE') {
      csv += `"${fISO.slice(0,10)}","${h.tipo}","${(h.nombreCorral||'').replace(/"/g,'""')}",${h.cantidad},"${(h.motivo||'').replace(/"/g,'""')}","${(h.comprobante||'').replace(/"/g,'""')}","${(h.notas||'').replace(/"/g,'""')}"\n`;
    }
  });
  csv += "\n3. FLETES DEL MES\nFecha,Transportista,Guia DTE,Cabezas,Destino,Costo,Estado Pago,Condicion\n";
  (window.fletesData || []).forEach(f => {
    if (!f.timestamp) return;
    const fISO = new Date(f.timestamp).toISOString();
    if (fISO.startsWith(mes)) csv += `"${fISO.slice(0,10)}","${(f.transportista||'').replace(/"/g,'""')}","${(f.guia||'').replace(/"/g,'""')}",${f.cantidad},"${(f.destino||'').replace(/"/g,'""')}",${f.costo||0},"${f.estadoPago}","${f.tipoFiscal||'Interno'}"\n`;
  });
  cerrarModal('modalContador');
  descargarCSV(csv, `reporte_contador_${mes}.csv`);
};

function descargarCSV(contenido, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([contenido], { type:'text/csv;charset=utf-8;' }));
  a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

window.ejecutarReinicioSeguro = function() {
  const inputBorrar = document.getElementById('inputPalabraBorrar');
  if (inputBorrar && inputBorrar.value.trim() !== "BORRAR") return alert("Escribí BORRAR.");
  if (document.getElementById('chkCorrales')?.checked) set(corralesRef, null);
  else if (document.getElementById('chkCabezas')?.checked) Object.keys(window.corralesData).forEach(id => update(ref(db,`corrales/${id}`), { cantidadGenerica:0 }));
  if (document.getElementById('chkCaravanas')?.checked) set(animalesRef, null);
  if (document.getElementById('chkLabores')?.checked) set(laboresRef, null);
  if (document.getElementById('chkInsumos')?.checked) set(insumosRef, null);
  if (document.getElementById('chkLluvias')?.checked) set(lluviasRef, null);
  if (document.getElementById('chkFletes')?.checked) set(fletesRef, null);
  if (document.getElementById('chkHistorial')?.checked) set(historialRef, null);
  if (document.getElementById('chkTareas')?.checked) set(tareasRef, null);
  if (document.getElementById('chkNotas')?.checked) set(notasRef, null);
  alert("Limpieza ejecutada."); cerrarModal('modalReset'); if(inputBorrar) inputBorrar.value = '';
};

renderAll();

import { initializeApp } from "https://gstatic.com";
import { getDatabase, ref, onValue, set, push, remove, update }
  from "https://gstatic.com";

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

const firebaseConfig = {
  apiKey: "AIzaSyC-7MMAHQ2Ib7TFjQynWP2mMBTeBE8U7xU",
  authDomain: "://firebaseapp.com",
  databaseURL: "https://firebaseio.com",
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

/* ---------- WhatsApp CallMeBot ---------- */
window.getWaConfig = () => { try { return JSON.parse(localStorage.getItem('tc_whatsapp_cfg') || '{}'); } catch { return {}; } };
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
  fetch(`https://callmebot.com{cfg.phone}&text=${texto}&apikey=${cfg.apiKey}`, { mode: 'no-cors' }).catch(() => {});
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

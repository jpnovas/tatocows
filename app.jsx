import React, { useState, useEffect } from 'react';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, set, push, remove, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ==========================================
// CONFIGURACIÓN DE FIREBASE
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyAcnfJFlnJKEtX_T1RDarphX2Be2rX8tEg",
  authDomain: "tatocows.firebaseapp.com",
  databaseURL: "https://tatocows-default-rtdb.firebaseio.com",
  projectId: "tatocows",
  storageBucket: "tatocows.firebasestorage.app",
  messagingSenderId: "145845925802",
  appId: "1:145845925802:web:40baed1fdbeb90b4991dd3",
  measurementId: "G-3M1F1362RN"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export default function App() {
  const [tab, setTab] = useState('corrales');
  const [corrales, setCorrales] = useState({});
  const [historial, setHistorial] = useState([]);
  const [fletes, setFletes] = useState([]);
  const [tareas, setTareas] = useState({});
  const [notas, setNotas] = useState({});

  // Modales
  const [modalIngreso, setModalIngreso] = useState(false);
  const [modalEgreso, setModalEgreso] = useState(false);
  const [modalTraslado, setModalTraslado] = useState(false);
  const [modalNuevoCorral, setModalNuevoCorral] = useState(false);
  const [modalFlete, setModalFlete] = useState(false);
  const [modalTarea, setModalTarea] = useState(false);
  const [modalReset, setModalReset] = useState(false);
  const [modalArchivadas, setModalArchivadas] = useState(false);
  const [modalEditarCorral, setModalEditarCorral] = useState(false);

  // Estados de formularios
  const [corralEditando, setCorralEditando] = useState(null);
  const [nombreCorral, setNombreCorral] = useState('');
  const [obsCorral, setObsCorral] = useState('');
  const [colorCorral, setColorCorral] = useState('emerald');

  // Inputs de Movimientos
  const [formMov, setFormMov] = useState({ corralId: '', cantidad: '', motivo: 'Compra', usuario: '', notas: '', destinoId: '' });
  
  // Inputs de Fletes
  const [formFlete, setFormFlete] = useState({ transportista: '', chofer: '', guia: '', destino: '', cantidad: '', costo: '', estadoPago: 'Pendiente' });

  // Inputs de Tareas y Notas
  const [formTarea, setFormTarea] = useState({ titulo: '', observaciones: '' });
  const [notaTexto, setNotaTexto] = useState('');
  const [palabraBorrar, setPalabraBorrar] = useState('');
  const [checksReset, setChecksReset] = useState({ cabezas: false, corrales: false, fletes: false, historial: false, tareas: false, notas: false });

  // Sincronización en tiempo real con Firebase
  useEffect(() => {
    onValue(ref(db, 'corrales'), (snap) => setCorrales(snap.val() || {}));
    onValue(ref(db, 'historial'), (snap) => {
      const data = snap.val() || {};
      const lista = Object.keys(data).map(k => ({ id: k, ...data[k] }));
      lista.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setHistorial(lista);
    });
    onValue(ref(db, 'fletes'), (snap) => {
      const data = snap.val() || {};
      const lista = Object.keys(data).map(k => ({ id: k, ...data[k] }));
      lista.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setFletes(lista);
    });
    onValue(ref(db, 'tareas'), (snap) => setTareas(snap.val() || {}));
    onValue(ref(db, 'notas_rapidas'), (snap) => setNotas(snap.val() || {}));
  }, []);

  // Estadísticas calculadas
  const totalVacas = Object.values(corrales).reduce((acc, c) => acc + (c.cantidad || 0), 0);
  const totalCorrales = Object.keys(corrales).length;
  const totalFletes = fletes.length;
  const tareasActivas = Object.values(tareas).filter(t => !t.archivada).length;

  // Acciones de Corrales
  const guardarCorral = () => {
    if (!nombreCorral.trim()) return;
    push(ref(db, 'corrales'), { nombre: nombreCorral.trim(), observacion: obsCorral.trim(), color: colorCorral, cantidad: 0 })
      .then(() => { setNombreCorral(''); setObsCorral(''); setModalNuevoCorral(false); });
  };

  const actualizarCorral = () => {
    if (!corralEditando || !nombreCorral.trim()) return;
    update(ref(db, `corrales/${corralEditando}`), { nombre: nombreCorral.trim(), observacion: obsCorral.trim(), color: colorCorral })
      .then(() => { setModalEditarCorral(false); setCorralEditando(null); });
  };

  const ejecutarIngreso = () => {
    const cant = parseInt(formMov.cantidad, 10);
    if (!formMov.corralId || isNaN(cant) || cant <= 0) return alert("Cantidad inválida");
    const corral = corrales[formMov.corralId];
    setModalIngreso(false);

    set(ref(db, `corrales/${formMov.corralId}/cantidad`), (corral.cantidad || 0) + cant);
    push(ref(db, 'historial'), {
      corralId: formMov.corralId, nombreCorral: corral.nombre, tipo: 'SUMAR', cantidad: cant,
      motivo: formMov.motivo, notas: formMov.notas, usuario: formMov.usuario || 'Operador', timestamp: Date.now()
    });
    setFormMov({ corralId: '', cantidad: '', motivo: 'Compra', usuario: '', notas: '' });
  };

  const ejecutarEgreso = () => {
    const cant = parseInt(formMov.cantidad, 10);
    if (!formMov.corralId || isNaN(cant) || cant <= 0) return alert("Cantidad inválida");
    const corral = corrales[formMov.corralId];
    if (cant > (corral.cantidad || 0) && !confirm("La cantidad supera las existencias. ¿Continuar?")) return;
    setModalEgreso(false);

    const nuevaCant = Math.max(0, (corral.cantidad || 0) - cant);
    set(ref(db, `corrales/${formMov.corralId}/cantidad`), nuevaCant);
    push(ref(db, 'historial'), {
      corralId: formMov.corralId, nombreCorral: corral.nombre, tipo: 'RESTAR', cantidad: cant,
      motivo: formMov.motivo, notas: formMov.notas, usuario: formMov.usuario || 'Operador', timestamp: Date.now()
    });
    setFormMov({ corralId: '', cantidad: '', motivo: 'Venta', usuario: '', notas: '' });
  };

  const ejecutarTraslado = () => {
    const cant = parseInt(formMov.cantidad, 10);
    if (!formMov.corralId || !formMov.destinoId || isNaN(cant) || cant <= 0 || formMov.corralId === formMov.destinoId) return alert("Datos de traslado incorrectos");
    const origen = corrales[formMov.corralId];
    const destino = corrales[formMov.destinoId];
    setModalTraslado(false);

    set(ref(db, `corrales/${formMov.corralId}/cantidad`), Math.max(0, (origen.cantidad || 0) - cant));
    set(ref(db, `corrales/${formMov.destinoId}/cantidad`), (destino.cantidad || 0) + cant);
    push(ref(db, 'historial'), {
      tipo: 'TRASLADO', cantidad: cant, motivo: 'Traslado entre lotes',
      nombreCorral: `Desde ${origen.nombre} hacia ${destino.nombre}`,
      notas: formMov.notas, usuario: formMov.usuario || 'Operador', timestamp: Date.now()
    });
    setFormMov({ corralId: '', destinoId: '', cantidad: '', usuario: '', notas: '' });
  };

  // Colores de lotes
  const colorMap = {
    emerald: 'border-l-8 border-emerald-600 bg-emerald-50/20',
    blue: 'border-l-8 border-blue-600 bg-blue-50/20',
    amber: 'border-l-8 border-amber-500 bg-amber-50/20',
    purple: 'border-l-8 border-purple-600 bg-purple-50/20',
    rose: 'border-l-8 border-rose-600 bg-rose-50/20',
    slate: 'border-l-8 border-slate-400 bg-white'
  };

  return (
    <div className="bg-slate-100 text-slate-800 font-sans min-h-screen pb-20">
      {/* Encabezado */}
      <header className="bg-emerald-700 text-white p-4 shadow-md sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <i className="fa-solid fa-cow"></i> Tatosistem - Mantenimiento y Hacienda
            </h1>
            <p className="text-xs text-emerald-200">Versión React Profesional para Esteban Company</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-6">
        {/* Navegación por pestañas */}
        <div className="grid grid-cols-4 bg-white rounded-xl shadow p-1 gap-1 text-center">
          <button onClick={() => setTab('corrales')} className={`py-2 font-bold text-xs rounded-lg transition ${tab === 'corrales' ? 'bg-emerald-600 text-white' : 'text-slate-600'}`}>Lotes / Stock</button>
          <button onClick={() => setTab('fletes')} className={`py-2 font-bold text-xs rounded-lg transition ${tab === 'fletes' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>Fletes</button>
          <button onClick={() => setTab('tareas')} className={`py-2 font-bold text-xs rounded-lg transition ${tab === 'tareas' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>Tablero</button>
          <button onClick={() => setTab('historial')} className={`py-2 font-bold text-xs rounded-lg transition ${tab === 'historial' ? 'bg-slate-700 text-white' : 'text-slate-600'}`}>Historial</button>
        </div>

        {/* Tarjetas de Estadísticas */}
        <section className="grid grid-cols-4 gap-2">
          <div className="bg-white p-2.5 rounded-xl shadow border-l-4 border-emerald-600">
            <p className="text-[9px] font-bold text-slate-400 uppercase">Cabezas</p>
            <p className="text-xl font-black text-slate-800">{totalVacas}</p>
          </div>
          <div className="bg-white p-2.5 rounded-xl shadow border-l-4 border-blue-600">
            <p className="text-[9px] font-bold text-slate-400 uppercase">Lotes</p>
            <p className="text-xl font-black text-slate-800">{totalCorrales}</p>
          </div>
          <div className="bg-white p-2.5 rounded-xl shadow border-l-4 border-amber-500">
            <p className="text-[9px] font-bold text-slate-400 uppercase">Fletes</p>
            <p className="text-xl font-black text-slate-800">{totalFletes}</p>
          </div>
          <div className="bg-white p-2.5 rounded-xl shadow border-l-4 border-indigo-500">
            <p className="text-[9px] font-bold text-slate-400 uppercase">Tareas</p>
            <p className="text-xl font-black text-slate-800">{tareasActivas}</p>
          </div>
        </section>

        {/* CONTENIDO SECCIÓN CORRALES */}
        {tab === 'corrales' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-md font-bold text-slate-700 flex items-center gap-2">
                <i className="fa-solid fa-layer-group"></i> Operaciones de Hacienda
              </h2>
              <button onClick={() => { setNombreCorral(''); setObsCorral(''); setModalNuevoCorral(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-2 rounded-lg font-bold shadow flex items-center gap-1">
                <i className="fa-solid fa-plus"></i> Nuevo Lote
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => { if(totalCorrales===0) alert("Creá un lote primero"); else setModalIngreso(true); }} className="bg-emerald-600 text-white font-bold p-3 rounded-xl shadow flex flex-col items-center justify-center gap-1">
                <i className="fa-solid fa-circle-plus text-xl"></i><span className="text-xs">INGRESAR</span>
              </button>
              <button onClick={() => { if(totalCorrales===0) alert("Creá un lote primero"); else setModalEgreso(true); }} className="bg-rose-600 text-white font-bold p-3 rounded-xl shadow flex flex-col items-center justify-center gap-1">
                <i className="fa-solid fa-circle-minus text-xl"></i><span className="text-xs">EGRESAR</span>
              </button>
              <button onClick={() => { if(totalCorrales<2) alert("Necesitás al menos 2 lotes para trasladar"); else setModalTraslado(true); }} className="bg-blue-600 text-white font-bold p-3 rounded-xl shadow flex flex-col items-center justify-center gap-1">
                <i className="fa-solid fa-arrow-right-arrow-left text-xl"></i><span className="text-xs">TRASLADAR</span>
              </button>
            </div>

            <div className="space-y-3">
              {Object.keys(corrales).length === 0 ? (
                <div className="bg-white p-6 rounded-xl text-center text-slate-400 text-sm">No hay lotes registrados. Creá el primero arriba.</div>
              ) : (
                Object.keys(corrales).map(id => {
                  const c = corrales[id];
                  return (
                    <div key={id} className={`bg-white p-4 rounded-xl shadow flex items-center justify-between gap-3 ${colorMap[c.color] || colorMap.emerald}`}>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-black text-base text-slate-800">{c.nombre}</h3>
                        <p className="text-xs text-slate-600 mt-1">{c.observacion || <span className="italic text-slate-400">Sin observaciones</span>}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right mr-1">
                          <span className="text-xl font-black text-emerald-700">{c.cantidad || 0}</span>
                          <span className="block text-[10px] text-slate-500">cabezas</span>
                        </div>
                        <button onClick={() => { setCorralEditando(id); setNombreCorral(c.nombre); setObsCorral(c.observacion || ''); setColorCorral(c.color || 'emerald'); setModalEditarCorral(true); }} className="text-slate-400 hover:text-blue-600 p-2 bg-white rounded-lg shadow-sm">
                          <i className="fa-solid fa-pen text-xs"></i>
                        </button>
                        <button onClick={() => { if(confirm(`¿Eliminar lote ${c.nombre}?`)) remove(ref(db, `corrales/${id}`)); }} className="text-slate-300 hover:text-rose-500 p-2">
                          <i className="fa-solid fa-trash text-xs"></i>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* HISTORIAL Y OTRAS PESTAÑAS (Resumen rápido) */}
        {tab === 'historial' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-md font-bold text-slate-700 flex items-center gap-2">
                <i className="fa-solid fa-clock-rotate-left"></i> Historial de Movimientos
              </h2>
              <button onClick={() => setModalReset(true)} className="bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 shadow-sm">
                <i className="fa-solid fa-triangle-exclamation"></i> Reiniciar Base
              </button>
            </div>
            <div className="bg-white rounded-xl shadow divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {historial.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-sm">Sin movimientos registrados aún.</div>
              ) : (
                historial.map(h => (
                  <div key={h.id} className="p-3 flex items-center justify-between text-sm">
                    <div>
                      <p className="font-semibold text-slate-800">{h.nombreCorral} &bull; <span className="text-slate-500">{h.motivo}</span></p>
                      <p className="text-xs text-slate-400">{new Date(h.timestamp).toLocaleString('es-AR')} {h.usuario ? `• ${h.usuario}` : ''}</p>
                    </div>
                    <span className={`font-bold text-base ${h.tipo === 'SUMAR' ? 'text-emerald-600' : h.tipo === 'RESTAR' ? 'text-rose-600' : 'text-blue-600'}`}>
                      {h.tipo === 'SUMAR' ? `+${h.cantidad}` : h.tipo === 'RESTAR' ? `-${h.cantidad}` : h.cantidad}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* MODAL NUEVO LOTE */}
      {modalNuevoCorral && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Agregar Nuevo Lote / Corral</h3>
            <input type="text" value={nombreCorral} onChange={e => setNombreCorral(e.target.value)} placeholder="Ej: Lote 2" className="w-full border rounded-lg p-3 outline-none" />
            <input type="text" value={obsCorral} onChange={e => setObsCorral(e.target.value)} placeholder="Observación o cultivo" className="w-full border rounded-lg p-3 outline-none" />
            <select value={colorCorral} onChange={e => setColorCorral(e.target.value)} className="w-full border rounded-lg p-3 bg-white outline-none">
              <option value="emerald">Verde (Principal)</option>
              <option value="blue">Azul (Norte)</option>
              <option value="amber">Ámbar (Cerca)</option>
              <option value="rose">Rojo (Feria)</option>
            </select>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setModalNuevoCorral(false)} className="px-4 py-2 text-slate-600 font-semibold">Cancelar</button>
              <button onClick={guardarCorral} className="bg-emerald-600 text-white px-5 py-2 rounded-lg font-bold">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- MAPA SATELITAL Y GALERÍA DE FOTOS POR LOTE ---------- */
let mapaLeaflet = null;
let capaDibujo = null;
let poligonoActualCoords = null;
let fotosLoteTemp = [];

window.abrirMapaDesdeEdicion = function() {
  const id = document.getElementById('editCorralIdInput')?.value;
  if (!id) return;
  cerrarModal('modalEditarCorral');
  abrirMapaLote(id);
};

window.abrirMapaLote = function(id) {
  const c = window.corralesData[id];
  if (!c) return;

  const idInput = document.getElementById('mapaLoteIdInput');
  if (!idInput) return alert("Falta el modal del mapa en index.html.");

  idInput.value = id;
  document.getElementById('mapaLoteTitulo').innerText = `Mapa: ${c.nombre}`;
  document.getElementById('mapaLoteSubtitulo').innerText = c.hectareas ? `Superficie declarada: ${c.hectareas} ha` : 'Marcá los límites del lote en el mapa';

  poligonoActualCoords = Array.isArray(c.mapaPoligono) ? JSON.parse(JSON.stringify(c.mapaPoligono)) : null;
  fotosLoteTemp = Array.isArray(c.imagenes) ? [...c.imagenes] : [];

  renderGaleriaFotosTemp();
  abrirModal('modalMapaLote');

  setTimeout(() => {
    inicializarMapaLeaflet();
  }, 200);
};

window.cerrarModalMapa = function() {
  cerrarModal('modalMapaLote');
};

function inicializarMapaLeaflet() {
  const contenedor = document.getElementById('contenedorMapaLote');
  if (!contenedor || typeof L === 'undefined') return;

  const centroDefault = [-35.4444, -60.8858];

  if (!mapaLeaflet) {
    mapaLeaflet = L.map('contenedorMapaLote').setView(centroDefault, 13);

    L.tileLayer('https://arcgisonline.com{z}/{y}/{x}', {
      attribution: 'Satélite Esri'
    }).addTo(mapaLeaflet);

    L.tileLayer('https://arcgisonline.com{z}/{y}/{x}').addTo(mapaLeaflet);

    capaDibujo = new L.FeatureGroup();
    mapaLeaflet.addLayer(capaDibujo);

    const drawControl = new L.Control.Draw({
      draw: {
        polyline: false,
        rectangle: true,
        circle: false,
        circlemarker: false,
        marker: false,
        polygon: {
          allowIntersection: false,
          shapeOptions: { color: '#ff6200', fillColor: '#44b86b', fillOpacity: 0.35, weight: 3 }
        }
      },
      edit: {
        featureGroup: capaDibujo,
        remove: true
      }
    });
    mapaLeaflet.addControl(drawControl);

    mapaLeaflet.on(L.Draw.Event.CREATED, function(e) {
      capaDibujo.clearLayers();
      capaDibujo.addLayer(e.layer);
      extraerCoordsYSuperficie(e.layer);
    });

    mapaLeaflet.on(L.Draw.Event.EDITED, function(e) {
      e.layers.eachLayer(layer => extraerCoordsYSuperficie(layer));
    });

    mapaLeaflet.on(L.Draw.Event.DELETED, function() {
      poligonoActualCoords = null;
      actualizarTextoSuperficie(0);
    });
  }

  mapaLeaflet.invalidateSize();
  capaDibujo.clearLayers();

  if (poligonoActualCoords && poligonoActualCoords.length >= 3) {
    const poly = L.polygon(poligonoActualCoords, {
      color: '#ff6200', fillColor: '#44b86b', fillOpacity: 0.35, weight: 3
    }).addTo(capaDibujo);
    mapaLeaflet.fitBounds(poly.getBounds(), { padding: [20, 20] });
    extraerCoordsYSuperficie(poly);
  } else {
    actualizarTextoSuperficie(0);
    mapaLeaflet.setView(centroDefault, 13);
  }
}

function extraerCoordsYSuperficie(layer) {
  const rawLatLngs = layer.getLatLngs();
  const latlngs = Array.isArray(rawLatLngs[0]) ? rawLatLngs[0] : rawLatLngs;
  poligonoActualCoords = latlngs.map(ll => [Number(ll.lat.toFixed(6)), Number(ll.lng.toFixed(6))]);
  const areaM2 = (L.GeometryUtil && L.GeometryUtil.geodesicArea) ? L.GeometryUtil.geodesicArea(latlngs) : calcularAreaAproxM2(latlngs);
  const ha = areaM2 / 10000;
  actualizarTextoSuperficie(ha);
}

function calcularAreaAproxM2(latlngs) {
  let area = 0;
  const R = 6378137;
  if (latlngs.length > 2) {
    for (let i = 0; i < latlngs.length; i++) {
      const p1 = latlngs[i];
      const p2 = latlngs[(i + 1) % latlngs.length];
      area += ((p2.lng - p1.lng) * Math.PI / 180) * (2 + Math.sin(p1.lat * Math.PI / 180) + Math.sin(p2.lat * Math.PI / 180));
    }
    area = Math.abs(area * R * R / 2);
  }
  return area;
}

function actualizarTextoSuperficie(ha) {
  const el = document.getElementById('mapaSuperficieCalc');
  if (el) el.innerText = `Superficie marcada: ${ha > 0 ? ha.toFixed(1) : '0'} ha`;
}

window.limpiarPoligonoMapa = function() {
  if (capaDibujo) capaDibujo.clearLayers();
  poligonoActualCoords = null;
  actualizarTextoSuperficie(0);
};

window.centrarEnMiUbicacion = function() {
  if (!navigator.geolocation) return alert("Tu navegador no soporta geolocalización.");
  navigator.geolocation.getCurrentPosition(
    pos => {
      if (mapaLeaflet) mapaLeaflet.setView([pos.coords.latitude, pos.coords.longitude], 15);
    },
    () => alert("No se pudo obtener tu ubicación actual. Verificá los permisos de GPS.")
  );
};

window.procesarFotosLote = function(event) {
  const files = Array.from(event.target.files || []);
  if (files.length === 0) return;

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        const MAX_W = 800;
        let w = img.width, h = img.height;
        if (w > MAX_W) { h = Math.round(h * (MAX_W / w)); w = MAX_W; }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const comprimida = canvas.toDataURL('image/jpeg', 0.65);
        fotosLoteTemp.push({
          data: comprimida,
          fecha: new Date().toLocaleDateString('es-AR')
        });
        renderGaleriaFotosTemp();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
  event.target.value = '';
};

function renderGaleriaFotosTemp() {
  const cont = document.getElementById('galeriaFotosLote');
  if (!cont) return;
  if (fotosLoteTemp.length === 0) {
    cont.innerHTML = `<p class="text-xs text-slate-400 italic col-span-full py-2">No hay fotos guardadas en este lote.</p>`;
    return;
  }
  cont.innerHTML = fotosLoteTemp.map((f, idx) => `
    <div class="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video">
      <img src="${f.data}" class="w-full h-full object-cover cursor-pointer" onclick="verFotoGrande('${idx}')" />
      <span class="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded">${f.fecha || ''}</span>
      <button type="button" onclick="eliminarFotoTemp(${idx})" class="absolute top-1 right-1 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs shadow">
        <i class="fa-solid fa-trash text-[10px]"></i>
      </button>
    </div>
  `).join('');
}

window.eliminarFotoTemp = function(idx) {
  fotosLoteTemp.splice(idx, 1);
  renderGaleriaFotosTemp();
};

window.verFotoGrande = function(idx) {
  const f = fotosLoteTemp[idx];
  if (!f) return;
  const w = window.open('');
  w.document.write(`<body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;height:100vh;"><img src="${f.data}" style="max-width:100%;max-height:100%;"/></body>`);
};

window.guardarMapaYFotosLote = function() {
  const id = document.getElementById('mapaLoteIdInput')?.value;
  if (!id || !window.corralesData[id]) return;

  cerrarModal('modalMapaLote');
  update(ref(db, `corrales/${id}`), {
    mapaPoligono: poligonoActualCoords || null,
    imagenes: fotosLoteTemp || []
  }).then(() => {
    alert("Mapa y fotos del lote guardados permanentemente.");
  }).catch(err => {
    alert("Error al guardar en Firebase: " + err.message);
  });
};

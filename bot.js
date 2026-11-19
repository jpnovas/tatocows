import { Telegraf } from 'telegraf';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, get } from "firebase/database";

// --- CONFIGURACIÓN DE ACCESOS ---
const TELEGRAM_BOT_TOKEN = "9101761630:AAHxscKV_76OWh0w-gViblWlX23rok2p-M8";
const TU_TELEGRAM_USER_ID = 9101341107;
const GROQ_API_KEY = "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";

// Configuración Firebase (Esteban Company)
const firebaseConfig = {
  apiKey: "AIzaSyC-7MMAHQ2Ib7TFjQynWP2mMBTeBE8U7xU",
  authDomain: "tatocowspruebas.firebaseapp.com",
  databaseURL: "https://tatocowspruebas-default-rtdb.firebaseio.com",
  projectId: "tatocowspruebas",
  storageBucket: "tatocowspruebas.firebasestorage.app",
  messagingSenderId: "702960739873",
  appId: "1:702960739873:web:63c72f142e755914f36560"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

let modeloChatCacheado = null;
let ultimaFirmaAlertaBot = "";

function esModeloAudioOTerminos(id) {
  const bajo = (id || "").toLowerCase();
  return (
    bajo.includes("whisper") ||
    bajo.includes("orpheus") ||
    bajo.includes("playai") ||
    bajo.includes("tts") ||
    bajo.includes("audio") ||
    bajo.includes("guard") ||
    bajo.includes("embed")
  );
}

// --- OBTENER CANDIDATOS DE CHAT DISPONIBLES EN GROQ ---
async function obtenerCandidatosChatGroq() {
  const preferidos = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "gemma2-9b-it",
    "qwen/qwen3-32b",
    "deepseek-r1-distill-llama-70b",
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "meta-llama/llama-4-maverick-17b-128e-instruct"
  ];

  let disponibles = [];
  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { "Authorization": `Bearer ${GROQ_API_KEY}` }
    });
    if (res.ok) {
      const data = await res.json();
      disponibles = (data.data || [])
        .map(m => m.id)
        .filter(id => id && !esModeloAudioOTerminos(id));
    }
  } catch (err) {
    console.warn("No se pudo listar modelos de Groq:", err.message);
  }

  const ordenados = [];
  if (modeloChatCacheado && !esModeloAudioOTerminos(modeloChatCacheado)) {
    ordenados.push(modeloChatCacheado);
  }
  for (const p of preferidos) {
    if (disponibles.includes(p) && !ordenados.includes(p)) {
      ordenados.push(p);
    }
  }
  for (const d of disponibles) {
    if (!ordenados.includes(d)) {
      ordenados.push(d);
    }
  }
  for (const p of preferidos) {
    if (!ordenados.includes(p)) {
      ordenados.push(p);
    }
  }
  return ordenados;
}

// --- EXTRAER TODA LA BASE DE DATOS EN VIVO (INCLUYE FUTURAS CARPETAS) ---
async function obtenerEstadoCampo() {
  try {
    const raizSnap = await get(ref(db, '/'));
    const todo = raizSnap.val() || {};

    if (todo.historial && typeof todo.historial === 'object') {
      const listaHist = Object.entries(todo.historial)
        .map(([id, val]) => ({ id, ...val }))
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, 40);
      todo.historial_reciente = listaHist;
      delete todo.historial;
    }

    return todo;
  } catch (error) {
    console.error("Error leyendo Firebase:", error);
    return null;
  }
}

// --- TRANSCRIBIR AUDIO DE TELEGRAM CON GROQ WHISPER ---
async function transcribirAudioTelegram(fileId) {
  const fileLink = await bot.telegram.getFileLink(fileId);
  const audioRes = await fetch(fileLink.href);
  if (!audioRes.ok) throw new Error("No se pudo descargar el audio de Telegram.");

  const arrayBuffer = await audioRes.arrayBuffer();
  const audioBlob = new Blob([arrayBuffer], { type: 'audio/ogg' });

  const formData = new FormData();
  formData.append('file', audioBlob, 'nota_voz.ogg');
  formData.append('model', 'whisper-large-v3-turbo');
  formData.append('language', 'es');

  const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
    body: formData
  });

  if (!groqRes.ok) {
    const errTxt = await groqRes.text();
    throw new Error(`Error Whisper Groq: ${errTxt}`);
  }

  const data = await groqRes.json();
  return data.text?.trim() || "";
}

// --- CONSULTAR A GROQ CON TODOS LOS DATOS DEL CAMPO ---
async function consultarGroqIA(pregunta, datosCampo) {
  const candidatos = await obtenerCandidatosChatGroq();

  const systemPrompt = `Eres el capataz virtual y asistente de administración rural del establecimiento "Esteban Company".
Responde de forma directa, breve, clara y con tono campero argentino al dueño del establecimiento.
Usa exclusivamente los datos reales extraídos de toda la base de datos del campo (Firebase).
Reglas para interpretar los datos:
- En "corrales" (lotes/potreros), "cantidadGenerica" (o "cantidad") son las cabezas genéricas.
- En "animales", cada registro con estado "activo" es una cabeza individual con caravana asociada a un lote mediante "corralId".
- El total de cabezas de un lote es la suma de sus cabezas genéricas + sus animales individuales activos.
- Revisa también "tareas", "notas_rapidas", "insumos", "lluvias", "fletes", "labores", "historial_reciente" y cualquier otra carpeta presente en el JSON.
- Cuando te pidan listar o consultar algo, detallá todos los registros correspondientes sin omitir ninguno. Si un dato no figura, aclaralo sin inventar.

BASE DE DATOS COMPLETA DEL CAMPO EN VIVO:
${JSON.stringify(datosCampo)}`;

  let ultimoError = null;

  for (const modelo of candidatos) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelo,
        temperature: 0.2,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: pregunta }
        ]
      })
    });

    if (res.ok) {
      if (modeloChatCacheado !== modelo) {
        modeloChatCacheado = modelo;
        console.log(`✅ Modelo de chat Groq activo: ${modelo}`);
      }
      const data = await res.json();
      return data.choices?.[0]?.message?.content?.trim() || "No pude generar una respuesta.";
    }

    const errTxt = await res.text();
    ultimoError = new Error(`Modelo ${modelo} -> ${errTxt}`);
    if (modeloChatCacheado === modelo) {
      modeloChatCacheado = null;
    }
  }

  throw ultimoError || new Error("Ningún modelo de chat Groq respondió correctamente.");
}

// --- AUDITORÍA PERIÓDICA DE HACIENDA Y ALERTA POR TELEGRAM ---
async function verificarYAlertarInconsistencias() {
  try {
    const datos = await obtenerEstadoCampo();
    if (!datos) return;

    const corrales = datos.corrales || {};
    const animales = datos.animales || {};
    const problemas = [];

    for (const [id, c] of Object.entries(corrales)) {
      const nombre = c.nombre || id;
      const gen = parseInt(c.cantidadGenerica ?? c.cantidad ?? 0, 10) || 0;
      const carActivas = Object.values(animales).filter(
        a => a.corralId === id && (!a.estado || a.estado === 'activo')
      ).length;

      if (
        c.cantidad !== undefined &&
        c.cantidadGenerica !== undefined &&
        Number(c.cantidad) !== Number(c.cantidadGenerica)
      ) {
        problemas.push(
          `• *${nombre}*: "cantidad" (${c.cantidad}) ≠ "cantidadGenerica" (${c.cantidadGenerica}) [Caravanas: ${carActivas}]`
        );
      }
      if (gen < 0) {
        problemas.push(`• *${nombre}*: cabezas genéricas negativas (${gen})`);
      }
    }

    for (const [animId, a] of Object.entries(animales)) {
      const estadoOk = !a.estado || a.estado === 'activo';
      if (estadoOk && a.corralId && !corrales[a.corralId]) {
        problemas.push(
          `• Caravana *${a.caravana || animId}* asignada a lote inexistente (${a.corralId})`
        );
      }
    }

    const firma = problemas.join("|");
    if (problemas.length > 0 && firma !== ultimaFirmaAlertaBot && TU_TELEGRAM_USER_ID) {
      ultimaFirmaAlertaBot = firma;
      await bot.telegram.sendMessage(
        TU_TELEGRAM_USER_ID,
        `⚠️ *Control automático de hacienda (Esteban Company)*\nSe detectaron posibles inconsistencias en Firebase:\n\n${problemas.join("\n")}`,
        { parse_mode: 'Markdown' }
      );
    } else if (problemas.length === 0) {
      ultimaFirmaAlertaBot = "";
    }
  } catch (err) {
    console.error("Error en auditoría automática del bot:", err);
  }
}

// --- COMANDO /START ---
bot.start((ctx) => {
  ctx.reply("🐄 ¡Hola! Soy tu asistente de campo de Esteban Company.\n\nYa leo toda la base de datos en vivo (lotes, caravanas, insumos, lluvias, fletes, tareas, notas rápidas e historial). Escribime o mandame un audio.");
});

// --- MANEJADOR DE TEXTO Y NOTAS DE VOZ ---
bot.on(['text', 'voice'], async (ctx) => {
  if (TU_TELEGRAM_USER_ID && ctx.from.id !== TU_TELEGRAM_USER_ID) {
    return ctx.reply("⚠️ No estás autorizado para consultar este establecimiento.");
  }

  ctx.sendChatAction('typing');

  try {
    let textoPregunta = "";

    if (ctx.message.voice) {
      textoPregunta = await transcribirAudioTelegram(ctx.message.voice.file_id);
      if (!textoPregunta) {
        return ctx.reply("⚠️ No pude entender el audio, probá grabarlo de nuevo.");
      }
      await ctx.reply(`🎙️ _Entendí:_ "${textoPregunta}"`, { parse_mode: 'Markdown' });
      ctx.sendChatAction('typing');
    } else {
      textoPregunta = ctx.message.text;
    }

    const datosCampo = await obtenerEstadoCampo();
    if (!datosCampo) {
      return ctx.reply("❌ Error al leer la base de datos del campo.");
    }

    const respuestaIA = await consultarGroqIA(textoPregunta, datosCampo);
    await ctx.reply(respuestaIA);

  } catch (error) {
    console.error("Error procesando consulta:", error);
    ctx.reply("⚠️ Hubo un problema al procesar la consulta. Revisá la consola del servidor.");
  }
});

// --- ARRANCAR EL BOT ---
bot.launch().then(() => {
  console.log("🚀 Bot de Telegram de Esteban Company (Lectura total en vivo) activo y escuchando...");
  verificarYAlertarInconsistencias();
  setInterval(verificarYAlertarInconsistencias, 15 * 60 * 1000);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

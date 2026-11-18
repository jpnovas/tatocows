import { Telegraf } from 'telegraf';
import { GoogleGenAI } from '@google/genai';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, get } from "firebase/database";

// --- CONFIGURACIÓN DE ACCESOS ---
const TELEGRAM_BOT_TOKEN = "9101761630:AAHxscKV_76OWh0w-gViblWlX23rok2p-M8";
const TU_TELEGRAM_USER_ID = +542317470742; // Opcional pero recomendado por seguridad

// Configuración Firebase (La misma de tu app)
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

// Inicializar Telegram y Gemini (Usando tu acceso de Google AI Studio / AI Plus)
const bot = new Telegraf(TELEGRAM_BOT_TOKEN);
const ai = new GoogleGenAI("AQ.Ab8RN6IrMQT9T3kV2woAQfGqoxfZM7zsO3P9AoGfox0UxHOjYg"); // Toma automáticamente tu API Key del entorno o SDK

// --- FUNCIÓN PARA EXTRAER DATOS CRUDOS DE FIREBASE ---
async function obtenerEstadoCampo() {
  try {
    const [corralesSnap, animalesSnap, insumosSnap, lluviasSnap, fletesSnap] = await Promise.all([
      get(ref(db, 'corrales')),
      get(ref(db, 'animales')),
      get(ref(db, 'insumos')),
      get(ref(db, 'lluvias')),
      get(ref(db, 'fletes'))
    ]);

    return {
      lotes: corralesSnap.val() || {},
      animales: animalesSnap.val() || {},
      insumos: insumosSnap.val() || {},
      lluvias: lluviasSnap.val() || {},
      fletes: fletesSnap.val() || {}
    };
  } catch (error) {
    console.error("Error leyendo Firebase:", error);
    return null;
  }
}

// --- COMANDO /START ---
bot.start((ctx) => {
  ctx.reply("🐄 ¡Hola! Soy tu asistente de campo de Esteban Company. Preguntame lo que necesites sobre lotes, hacienda, insumos o lluvias (por texto o audio).");
});

// --- MANEJADOR DE MENSAJES (TEXTO Y AUDIOS) ---
bot.on(['text', 'voice'], async (ctx) => {
  // Seguridad opcional: validar que seas vos el que escribe
  if (TU_TELEGRAM_USER_ID && ctx.from.id !== TU_TELEGRAM_USER_ID) {
    return ctx.reply("⚠️ No estás autorizado para consultar este establecimiento.");
  }

  const textoPregunta = ctx.message.text || "Consulta por audio de voz";
  
  // Mostrar indicador de "escribiendo..." en Telegram
  ctx.sendChatAction('typing');

  // 1. Obtener datos frescos de Firebase
  const datosCampo = await obtenerEstadoCampo();
  if (!datosCampo) {
    return ctx.reply("❌ Ocurrió un error al consultar la base de datos del campo.");
  }

  // 2. Consultar a la Inteligencia Artificial (Gemini) pasándole el contexto del campo
  try {
    const promptSistema = `
      Eres el capataz virtual y asistente de administración rural del establecimiento "Esteban Company".
      Responde de forma directa, breve, profesional y con tono campero argentino a la consulta del dueño.
      Utiliza exclusivamente los siguientes datos reales extraídos de la base de datos del campo:
      
      DATOS ACTUALES DEL CAMPO:
      - Lotes / Potreros: ${JSON.stringify(datosCampo.lotes)}
      - Animales individuales (Caravanas): ${JSON.stringify(datosCampo.animales)}
      - Insumos en Galpón: ${JSON.stringify(datosCampo.insumos)}
      - Lluvias registradas: ${JSON.stringify(datosCampo.lluvias)}
      - Fletes: ${JSON.stringify(datosCampo.fletes)}

      Pregunta del usuario: "${textoPregunta}"
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Modelo ultrarrápido y eficiente
      contents: promptSistema,
    });

    const respuestaIA = response.text || "No pude procesar una respuesta clara.";
    ctx.reply(respuestaIA);

  } catch (error) {
    console.error("Error procesando IA:", error);
    ctx.reply("⚠️ Hubo un problema al consultar con la inteligencia artificial.");
  }
});

// --- INICIAR EL BOT ---
bot.launch().then(() => {
  console.log("🚀 Bot de Telegram de Esteban Company activo y escuchando...");
});

// Habilitar cierre seguro
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

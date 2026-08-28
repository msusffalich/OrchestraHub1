import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { Lang } from "../lib/core";
import { GENRES, CATEGORY_ORDER, CATEGORY_LABELS } from "../lib/genres";
import { INSTRUMENTS } from "../lib/instruments";
import { useSonic } from "../lib/store";
import { SectionHeader, Chip } from "./visuals";
import { Icon } from "./icons";

/* ============================================================
   MANUAL DE USUARIO (ES / EN)
   Contenido guiado por datos: la tabla de parámetros técnicos
   de estilos se genera en vivo desde el catálogo, de modo que
   el manual se mantiene actualizado en cada iteración del app.
   ============================================================ */

export const MANUAL_VERSION = "3.2.0";

interface Section { id: string; icon: string; }
const SECTIONS: Section[] = [
  { id: "intro", icon: "wave" },
  { id: "quick", icon: "spark" },
  { id: "orch", icon: "orchestra" },
  { id: "studio", icon: "studio" },
  { id: "library", icon: "works" },
  { id: "concert", icon: "concert" },
  { id: "prompts", icon: "mic" },
  { id: "table", icon: "metronome" },
  { id: "faq", icon: "book" },
];

const CONTENT: Record<Lang, Record<string, { title: string; body: string[]; steps?: string[] }>> = {
  es: {
    intro: {
      title: "Bienvenido al Ecosistema Sónico",
      body: [
        "Ecosistema Sónico es un estudio de producción musical que corre íntegramente en tu navegador: no hay servidores ni esperas. Todo el sonido se sintetiza en tiempo real con la Web Audio API y cada obra es 100 % reproducible porque se guarda como una semilla determinista, no como un archivo de audio.",
        "El ecosistema tiene cuatro salas: el Formulador de Orquestas, el Estudio de Mezcla, la Biblioteca de Obras y la Sala de Conciertos. Todo lo que crees se guarda automáticamente en este dispositivo.",
        "El catálogo cubre el Mapa Global de Estilos Musicales: 40+ estilos de América, Europa, África, Asia y Europa del Este, cada uno con su tabla técnica de groove, rango de BPM, arreglo, espacio y producción.",
      ],
    },
    quick: {
      title: "Inicio rápido (2 minutos)",
      body: ["Sigue estos pasos para escuchar tu primera obra:"],
      steps: [
        "Abre «Estudio» en la navegación: la orquesta Filarmónica Aurora ya está montada en la consola.",
        "Escribe un prompt, por ejemplo: «Una marcha heroica triunfal a tempo de vals».",
        "Despliega «Parámetros del estilo» si quieres ajustar BPM, energía, swing, espacio o brillo. El BPM siempre queda dentro del rango técnico del estilo.",
        "Pulsa «Generar obra». El motor leerá el prompt, elegirá progresión y arreglo, orquestará cada canal y masterizará la pieza en segundos.",
        "Mientras suena, mueve los faders, el paneo y el botón de BPM de la consola: todo se aplica al instante y sin cortes.",
        "Pulsa «Guardar obra» para enviarla a la Biblioteca con su portada única y su mezcla.",
        "Abre «Concierto» y toca la obra en la sala: verás el espectro de frecuencias, las luces y el público reaccionar al audio real.",
      ],
    },
    orch: {
      title: "Formulador de Orquestas",
      body: [
        "Aquí creas y administras tus orquestas y bandas (crear, editar, duplicar y eliminar). Cada orquesta tiene: un estilo base del Mapa Global, hasta dos estilos de fusión, su instrumentación, una distribución en el escenario y una mezcla por defecto.",
        "Fusión de estilos: al marcar hasta dos estilos adicionales, la orquesta adopta la unión de ambas formaciones y el motor cruzará sus patrones — la batería alterna entre los estilos cada dos compases y el bajo/acompañamiento pasa al estilo fusionado en la sección B de la obra.",
        "El escenario es interactivo: arrastra a cada músico para reubicarlo (el paneo se deriva de su posición) y haz clic sobre él para silenciarlo. Los instrumentos se dibujan con glifos reales según su familia.",
        "La paleta de instrumentación agrupa 70+ instrumentos por familia con buscador; al activar uno se añade su canal a la consola con volumen y paneo por defecto.",
      ],
    },
    studio: {
      title: "Estudio de Mezcla",
      body: [
        "El estudio es donde la orquesta se instala y suena. Tiene tres zonas: el motor prompt-a-música, el transporte con el escenario en vivo, y la consola multicanal.",
        "El campo «Título de la obra» está arriba del todo, separado del prompt. Si lo dejas vacío, el motor propone un título al generar; puedes escribir el tuyo y será el que se guarde y aparezca en «Sonando ahora».",
        "Motor prompt-a-música: escribe la obra en lenguaje natural («Jazz nocturno melancólico y lluvioso con saxofón líder»). El motor extrae carácter, modo, compás, tempo, líder y efectos de ambiente, y compone una pieza completa respetando los parámetros técnicos del estilo elegido.",
        "Parámetros del estilo: antes de generar puedes ajustar Tempo (limitado al rango técnico del estilo o de la fusión), Energía, Swing/Groove, Espacio y acústica, y Brillo de producción. El espacio y el brillo modifican la reverberación percibida y el filtrado del máster.",
        "Consola: cada instrumento tiene fader de ganancia con vúmetro LED, knob de paneo L/R, botones Mute/Solo y lectura en dB. El knob de BPM cambia el tempo en vivo sin saltos (ancla de tempo) y el knob Master controla la salida general.",
        "Todo cambio de mezcla se aplica al instante y se guarda como mezcla por defecto de la orquesta.",
        "Letra opcional: despliega «Añadir letra» y escribe tu texto (una línea por frase). Al generar, la canción sale completa —música + letra—: la línea vocal de la orquesta canta la letra siguiendo sus sílabas. Mientras suena, el panel «Letra sincronizada» resalta cada frase al compás, como un karaoke.",
        "Ajustes de la obra: una vez generada la pieza, el panel «Ajustes de la obra» deja modificarla a tu gusto y la reinterpreta al instante: Tonalidad (transposición de −6 a +6 semitonos, sin afectar a la percusión), Instrumento líder (reasigna la melodía a cualquier instrumento melódico de la orquesta), Variación (nueva semilla) y Restablecer. La letra y los ajustes se guardan con la obra.",
      ],
    },
    library: {
      title: "Biblioteca de Obras",
      body: [
        "Cada obra guardada persiste con: título, prompt original, letra (si la añadiste), ajustes de tonalidad y líder, portada generativa única (determinista por semilla), mezcla completa y los metadatos de la orquesta que la interpretó (incluidas sus fusiones).",
        "Como la obra es una semilla + mezcla, ocupa bytes y suena idéntica en cualquier dispositivo. Puedes reabrir su mezcla en el estudio, tocarla en la sala de conciertos o exportarla a WAV de 44.1 kHz (render offline, sin pérdida).",
      ],
    },
    concert: {
      title: "Sala de Conciertos",
      body: [
        "Programa la velada eligiendo obras de tu biblioteca. La sala interpreta la obra con el mismo motor de audio y dibuja en tiempo real: un analizador de espectro de 72 bandas alimentado por el AnalyserNode real, haces de luz que siguen los medios, un anillo que pulsa con los graves, público que salta con el bombo y polvo de agudos.",
        "Si la obra tiene letra, la sala la muestra sincronizada sobre el escenario, resaltando la frase que se canta en cada momento.",
        "Al terminar la obra, la sala agradece con un «¡Bravo!». El transporte permite pausar, reanudar y detener la interpretación.",
      ],
    },
    prompts: {
      title: "Cómo escribir buenos prompts",
      body: [
        "El motor entiende español neutro e inglés, con o sin acentos. Combina estas piezas:",
        "• Carácter: heroico/triunfal, melancólico/triste, nocturno, oscuro, romántico, alegre/fiesta, sereno.",
        "• Tempo musical: adagio (muy lento), andante (moderado), allegro (rápido), presto (muy rápido).",
        "• Compás: «a tempo de vals» fuerza 3/4; «marcha» o «fanfarria» fuerza 2/4.",
        "• Líder: «con saxofón líder», «solo de trompeta», «zampoña solista»… Si nombras un instrumento de la orquesta sin decir «líder», el motor decide si darle el solo.",
        "• Ambiente: «lluvioso», «tormenta» añaden atmósfera y bajan la energía.",
        "El estilo base y sus fusiones fijan el punto de partida: un prompt de «fiesta alegre» sobre una orquesta de Tango sonará distinto que sobre una de Afrobeats.",
      ],
    },
    table: {
      title: "Tabla técnica de estilos (referencia)",
      body: [
        "Esta tabla se genera en vivo desde el catálogo de estilos: siempre refleja la versión actual del motor. Úsala para afinar tus prompts y los parámetros antes de generar.",
        "BPM indica el rango técnico permitido; el deslizador de Tempo del estudio nunca podrá salirse de él.",
      ],
    },
    faq: {
      title: "Preguntas frecuentes",
      body: [
        "¿Necesito internet para generar música? No. Todo el audio se sintetiza localmente con Web Audio API; la conexión solo se usa para cargar las fuentes tipográficas.",
        "¿Por qué no se guardan archivos MP3? Las obras se guardan como semilla determinista + mezcla (bytes). Si quieres audio, usa «Descargar WAV» en la Biblioteca.",
        "¿Puedo cambiar el BPM mientras suena? Sí: el knob de BPM del estudio y el panel de parámetros usan ancla de tempo, así que el cambio es musical y sin clics.",
        "¿Qué hace exactamente la fusión? Une formaciones, alterna baterías entre estilos cada 2 compases y pasa bajo y acompañamiento al estilo fusionado en la sección B.",
        "¿Dónde están mis datos? En el almacenamiento local de tu navegador (claves «sonico-ecosystem-v2»). Borrar los datos del sitio borra tu biblioteca.",
        "¿Cómo cambio el idioma? Con el botón ES/EN de la barra superior; toda la interfaz y el manual cambian al instante.",
      ],
    },
  },
  en: {
    intro: {
      title: "Welcome to the Sonic Ecosystem",
      body: [
        "Sonic Ecosystem is a music production studio that runs entirely in your browser: no servers, no waiting. All sound is synthesized in real time with the Web Audio API, and every work is 100% reproducible because it is stored as a deterministic seed rather than an audio file.",
        "The ecosystem has four rooms: the Ensemble Builder, the Mixing Studio, the Works Library and the Concert Hall. Everything you create is saved automatically on this device.",
        "The catalog covers the Global Style Map: 40+ styles from the Americas, Europe, Africa, Asia and Eastern Europe, each with its technical table of groove, BPM range, arrangement, space and production.",
      ],
    },
    quick: {
      title: "Quick start (2 minutes)",
      body: ["Follow these steps to hear your first piece:"],
      steps: [
        "Open “Studio” in the navigation: the Dawn Philharmonic is already loaded on the console.",
        "Type a prompt, e.g. “A triumphant heroic march in waltz time”.",
        "Expand “Style parameters” to adjust BPM, energy, swing, space or brightness. BPM is always clamped to the style's technical range.",
        "Press “Generate piece”. The engine reads the prompt, picks progression and arrangement, orchestrates every channel and masters the piece in seconds.",
        "While it plays, move the faders, pan knobs and the BPM knob: everything applies instantly and click-free.",
        "Press “Save work” to send it to the Library with its unique cover and mix.",
        "Open “Concert” and perform the work: you'll see the frequency spectrum, lights and audience react to the real audio.",
      ],
    },
    orch: {
      title: "Ensemble Builder",
      body: [
        "Create and manage your orchestras and bands here (create, edit, duplicate and delete). Each ensemble has: a base style from the Global Map, up to two fusion styles, its instrumentation, a stage layout and a default mix.",
        "Style fusion: when you tick up to two extra styles, the ensemble adopts the union of both lineups and the engine crosses their patterns — drums alternate between styles every two bars, and bass/accompaniment switch to the fused style in section B.",
        "The stage is interactive: drag each musician to reposition them (panning derives from position) and click to mute. Instruments are drawn as real glyphs by family.",
        "The instrumentation palette groups 70+ instruments by family with search; enabling one adds its channel to the console with default volume and pan.",
      ],
    },
    studio: {
      title: "Mixing Studio",
      body: [
        "The studio is where the ensemble is installed and played. Three zones: the prompt-to-music engine, the transport with the live stage, and the multichannel console.",
        "Prompt-to-music engine: write the piece in natural language (“Melancholy rainy night jazz with lead saxophone”). The engine extracts mood, mode, meter, tempo, leader and ambience, and composes a complete piece honoring the technical parameters of the chosen style.",
        "Style parameters: before generating you can tune Tempo (clamped to the technical range of the style or fusion), Energy, Swing/Groove, Space & acoustics, and Production brightness. Space and brightness shape perceived reverb and master filtering.",
        "Console: every instrument has a gain fader with LED meter, L/R pan knob, Mute/Solo buttons and a dB readout. The BPM knob retimes live without glitches (tempo anchor) and the Master knob drives the overall output.",
        "Every mix change applies instantly and is saved as the ensemble's default mix.",
        "Optional lyrics: expand “Add lyrics” and type your text (one line per phrase). On generation the song comes out complete —music + lyrics—: the ensemble's vocal line sings your lyrics following their syllables. While it plays, the “Synced lyrics” panel highlights each phrase in time, karaoke-style.",
        "Piece adjustments: once a piece is generated, the “Piece adjustments” panel lets you reshape it to taste, re-performed instantly: Key (transpose −6 to +6 semitones, drums untouched), Lead instrument (reassign the melody to any melodic instrument in the ensemble), Variation (new seed) and Reset. Lyrics and adjustments are saved with the work.",
      ],
    },
    library: {
      title: "Works Library",
      body: [
        "Each saved work persists with: title, original prompt, lyrics (if you added them), key and lead adjustments, unique generative cover (deterministic by seed), full mix and the performing ensemble's metadata (including fusions).",
        "Because a work is a seed + mix, it takes bytes and sounds identical on any device. You can reopen its mix in the studio, perform it in the concert hall, or export it to 44.1 kHz WAV (offline render, lossless).",
      ],
    },
    concert: {
      title: "Concert Hall",
      body: [
        "Program the evening by picking works from your library. The hall performs the work with the same audio engine and draws in real time: a 72-band spectrum analyzer fed by the real AnalyserNode, light beams that follow the mids, a ring that pulses with the bass, an audience that bounces with the kick and treble dust.",
        "When the work ends, the hall says “Bravo!”. Transport controls let you pause, resume and stop the performance.",
      ],
    },
    prompts: {
      title: "How to write great prompts",
      body: [
        "The engine understands neutral Spanish and English, with or without accents. Combine these pieces:",
        "• Mood: heroic/triumphant, melancholy/sad, nocturnal, dark, romantic, joyful/party, serene.",
        "• Musical tempo: adagio (very slow), andante (moderate), allegro (fast), presto (very fast).",
        "• Meter: “in waltz time” forces 3/4; “march” or “fanfare” forces 2/4.",
        "• Leader: “with lead saxophone”, “trumpet solo”… Naming an ensemble instrument without saying “lead” lets the engine decide whether to give it the solo.",
        "• Ambience: “rainy”, “storm” add atmosphere and lower the energy.",
        "The base style and its fusions set the starting point: a “joyful party” prompt over a Tango ensemble sounds different than over Afrobeats.",
      ],
    },
    table: {
      title: "Style technical table (reference)",
      body: [
        "This table is generated live from the style catalog: it always reflects the current engine version. Use it to refine your prompts and parameters before generating.",
        "BPM shows the allowed technical range; the studio's Tempo slider can never leave it.",
      ],
    },
    faq: {
      title: "Frequently asked questions",
      body: [
        "Do I need internet to generate music? No. All audio is synthesized locally with the Web Audio API; the connection is only used to load the typefaces.",
        "Why aren't MP3 files stored? Works are stored as deterministic seed + mix (bytes). If you want audio, use “Download WAV” in the Library.",
        "Can I change BPM while playing? Yes: the studio's BPM knob and the parameter panel use a tempo anchor, so the change is musical and click-free.",
        "What exactly does fusion do? It merges lineups, alternates drums between styles every 2 bars, and moves bass and accompaniment to the fused style in section B.",
        "Where is my data? In your browser's local storage (key “sonico-ecosystem-v2”). Clearing site data clears your library.",
        "How do I switch language? With the ES/EN button on the top bar; the whole interface and manual switch instantly.",
      ],
    },
  },
};

export function ManualSection() {
  const lang = useSonic((s) => s.lang);
  const setLang = useSonic((s) => s.setLang);
  const [active, setActive] = useState("intro");
  const [query, setQuery] = useState("");
  const content = CONTENT[lang];
  const today = new Date().toLocaleDateString(lang === "es" ? "es-ES" : "en-US", { year: "numeric", month: "long", day: "numeric" });

  /* búsqueda sobre el contenido del manual */
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const out: { id: string; title: string; snippet: string }[] = [];
    for (const [id, sec] of Object.entries(content)) {
      const hay = [sec.title, ...sec.body, ...(sec.steps ?? [])].join(" ").toLowerCase();
      if (hay.includes(q)) {
        const all = [sec.title, ...sec.body, ...(sec.steps ?? [])];
        const hit = all.find((p) => p.toLowerCase().includes(q)) ?? sec.body[0];
        out.push({ id, title: sec.title, snippet: hit.length > 160 ? hit.slice(0, 160) + "…" : hit });
      }
    }
    return out;
  }, [query, content]);

  const visible = results
    ? SECTIONS.filter((s) => results.some((r) => r.id === s.id))
    : SECTIONS;

  return (
    <div>
      <SectionHeader
        kicker="05 · User Manual"
        title={lang === "es" ? "Manual de Usuario" : "User Manual"}
        subtitle={lang === "es"
          ? "Guía completa del ecosistema. La tabla técnica se genera en vivo desde el catálogo, así que siempre está al día."
          : "Complete guide to the ecosystem. The technical table is generated live from the catalog, so it is always current."}
        right={
          <div className="flex items-center gap-2">
            <Chip color="#45e0cd">{lang === "es" ? "Versión" : "Version"} {MANUAL_VERSION}</Chip>
            <Chip color="#ffb03a">{lang === "es" ? "Actualizado" : "Updated"} · {today}</Chip>
            <button onClick={() => setLang(lang === "es" ? "en" : "es")} className="btn-ghost rounded-lg px-3 py-2 text-sm flex items-center gap-2">
              <Icon name="globe" size={15} /> {lang === "es" ? "Read in English" : "Leer en Español"}
            </button>
          </div>
        }
      />

      <div className="grid lg:grid-cols-[240px_1fr] gap-5 items-start">
        {/* índice */}
        <aside className="panel p-3 lg:sticky lg:top-20">
          <input
            type="text" value={query} placeholder={lang === "es" ? "Buscar en el manual…" : "Search the manual…"}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-ink-900 border border-ink-600 rounded-lg px-3 py-2 text-[13px] text-ink-100 placeholder-ink-500 mb-3 focus:border-tube-500/50 transition-colors focus-ring"
          />
          <nav className="flex lg:flex-col gap-1 overflow-x-auto">
            {visible.map((s) => (
              <button key={s.id} onClick={() => { setActive(s.id); setQuery(""); }}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold text-left transition-all shrink-0 ${
                  active === s.id && !query ? "bg-tube-500/10 text-tube-400 border border-tube-500/40" : "text-ink-300 hover:bg-ink-800 border border-transparent"
                }`}>
                <Icon name={s.icon} size={15} />
                {content[s.id]?.title ?? s.id}
              </button>
            ))}
            {results && results.length === 0 && (
              <p className="text-ink-500 text-xs px-3 py-2">{lang === "es" ? "Sin resultados." : "No results."}</p>
            )}
          </nav>
        </aside>

        {/* contenido */}
        <div className="flex flex-col gap-5 min-w-0">
          {visible.map((s, i) => {
            const sec = content[s.id];
            if (!sec) return null;
            const isActive = active === s.id || !!results;
            return (
              <motion.section
                key={s.id}
                id={`man-${s.id}`}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: isActive ? 1 : 0.4, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3) }}
                className={`panel p-6 ${!isActive && !results ? "opacity-50" : ""}`}
                onMouseEnter={() => !results && setActive(s.id)}
              >
                <h2 className="font-display font-bold text-[20px] flex items-center gap-2.5 mb-4">
                  <span className="w-8 h-8 rounded-lg bg-ink-800 border border-ink-600 flex items-center justify-center text-tube-500 shrink-0">
                    <Icon name={SECTIONS.find((x) => x.id === s.id)?.icon ?? "book"} size={16} />
                  </span>
                  {sec.title}
                </h2>

                {sec.body.map((p, pi) => (
                  <p key={pi} className="text-ink-300 text-[14px] leading-relaxed mb-3">{p}</p>
                ))}

                {sec.steps && (
                  <ol className="mt-2 space-y-2.5">
                    {sec.steps.map((st, si) => (
                      <li key={si} className="flex gap-3 items-start">
                        <span className="w-6 h-6 rounded-full bg-tube-500/15 border border-tube-500/50 text-tube-400 font-mono text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">{si + 1}</span>
                        <span className="text-ink-200 text-[14px] leading-relaxed">{st}</span>
                      </li>
                    ))}
                  </ol>
                )}

                {/* tabla técnica generada en vivo */}
                {s.id === "table" && <StyleTechTable lang={lang} />}
              </motion.section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* tabla de parámetros técnicos, generada desde el catálogo vivo */
function StyleTechTable({ lang }: { lang: Lang }) {
  const byCat = useMemo(() => {
    const map: Record<string, typeof GENRES> = {};
    for (const g of GENRES) (map[g.category] ??= []).push(g);
    return map;
  }, []);

  return (
    <div className="mt-4 overflow-x-auto panel-inset">
      <table className="w-full text-left border-collapse min-w-[720px]">
        <thead>
          <tr className="silk-label-xs">
            <th className="px-4 py-3">{lang === "es" ? "Estilo / Región" : "Style / Region"}</th>
            <th className="px-3 py-3">{lang === "es" ? "Ritmo y Groove" : "Rhythm & Groove"}</th>
            <th className="px-3 py-3">BPM</th>
            <th className="px-3 py-3">{lang === "es" ? "Arreglo" : "Arrangement"}</th>
            <th className="px-3 py-3">{lang === "es" ? "Espacio" : "Space"}</th>
            <th className="px-3 py-3">{lang === "es" ? "Producción" : "Production"}</th>
          </tr>
        </thead>
        <tbody>
          {CATEGORY_ORDER.filter((c) => byCat[c]).map((cat) => (
            <CategoryRows key={cat} cat={cat} genres={byCat[cat]} lang={lang} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CategoryRows({ cat, genres, lang }: { cat: string; genres: typeof GENRES; lang: Lang }) {
  return (
    <>
      <tr>
        <td colSpan={6} className="px-4 pt-4 pb-1">
          <span className="font-mono text-[10px] font-bold tracking-[0.12em] uppercase text-tube-500">{CATEGORY_LABELS[cat]?.[lang] ?? cat}</span>
        </td>
      </tr>
      {genres.map((g) => (
        <tr key={g.id} className="border-t border-ink-700/60 hover:bg-ink-800/50 transition-colors align-top">
          <td className="px-4 py-2.5 min-w-[170px]">
            <div className="flex items-center gap-1.5 mb-0.5">
              {g.palette.map((c) => <span key={c} className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />)}
              <span className="text-ink-100 font-semibold text-[12.5px]">{lang === "es" ? g.nameES : g.nameEN}</span>
            </div>
            <span className="text-ink-500 text-[10.5px]">{lang === "es" ? g.regionES : g.regionEN}</span>
          </td>
          <td className="px-3 py-2.5 text-ink-300 text-[11.5px] leading-snug min-w-[140px]">{lang === "es" ? g.grooveES : g.grooveEN}</td>
          <td className="px-3 py-2.5 font-mono text-tube-400 text-[11.5px] tabular whitespace-nowrap">{g.bpmMin}–{g.bpmMax}</td>
          <td className="px-3 py-2.5 text-ink-300 text-[11.5px] leading-snug min-w-[170px]">{lang === "es" ? g.arrangementES : g.arrangementEN}</td>
          <td className="px-3 py-2.5 text-ink-300 text-[11.5px] leading-snug min-w-[140px]">{lang === "es" ? g.spaceES : g.spaceEN}</td>
          <td className="px-3 py-2.5 text-ink-300 text-[11.5px] leading-snug min-w-[150px]">{lang === "es" ? g.productionES : g.productionEN}</td>
        </tr>
      ))}
    </>
  );
}

import type { InstrumentDef, Lang } from "./core";

/* ============================================================
   CATÁLOGO DE INSTRUMENTOS (Mapa Global de Estilos Musicales)
   Cada voz declara: familia, roles, receta de síntesis (arch o
   drum), rango MIDI, volumen por defecto y alias para el parser.
   ============================================================ */

export const INSTRUMENTS: InstrumentDef[] = [
  /* --- cuerdas frotadas --- */
  { id: "violin",   nameES: "Violín",        nameEN: "Violin",        family: "strings", roles: ["melody", "pads"],    color: "#ffc53d", arch: "strings", range: [55, 88], vol: 0.75, aliases: ["violin", "violín", "violines", "fiddle", "cuerdas", "strings"] },
  { id: "viola",    nameES: "Viola",         nameEN: "Viola",         family: "strings", roles: ["pads", "harmony"],   color: "#e3b341", arch: "strings", range: [48, 79], vol: 0.68, aliases: ["viola", "violas"] },
  { id: "cello",    nameES: "Violonchelo",   nameEN: "Cello",         family: "strings", roles: ["melody", "pads", "bass"], color: "#d99a3d", arch: "strings", range: [36, 72], vol: 0.75, aliases: ["cello", "chelo", "violonchelo", "violoncello"] },
  { id: "contrabass", nameES: "Contrabajo",  nameEN: "Double Bass",   family: "strings", roles: ["bass"],              color: "#c9803a", arch: "bass",    range: [28, 60], vol: 0.8,  aliases: ["contrabajo", "double bass", "upright bass", "contrabass"] },

  /* --- vientos madera --- */
  { id: "flute",    nameES: "Flauta",        nameEN: "Flute",         family: "winds", roles: ["melody"],             color: "#7fd8e8", arch: "flute",   range: [60, 93], vol: 0.7,  aliases: ["flauta", "flute", "flautin", "piccolo", "tin whistle", "whistle", "flauta travesera", "bansuri"] },
  { id: "clarinet", nameES: "Clarinete",     nameEN: "Clarinet",      family: "winds", roles: ["melody", "harmony"], color: "#6fc3df", arch: "woodwind", range: [50, 86], vol: 0.72, aliases: ["clarinete", "clarinet", "clarinetes"] },
  { id: "oboe",     nameES: "Oboe",          nameEN: "Oboe",          family: "winds", roles: ["melody"],             color: "#5ec8e8", arch: "woodwind", range: [58, 88], vol: 0.68, aliases: ["oboe", "oboes", "corno inglés"] },
  { id: "bassoon",  nameES: "Fagot",         nameEN: "Bassoon",       family: "winds", roles: ["bass", "harmony"],   color: "#4aa8c8", arch: "woodwind", range: [34, 66], vol: 0.7,  aliases: ["fagot", "bassoon", "fagotes"] },
  { id: "saxtenor", nameES: "Saxo Tenor",    nameEN: "Tenor Sax",     family: "winds", roles: ["melody"],             color: "#5eead4", arch: "woodwind", range: [49, 80], vol: 0.8,  aliases: ["saxofon", "saxofón", "saxo", "sax", "saxophone", "tenor sax", "saxos"] },
  { id: "zampona",  nameES: "Zampoña (siku)", nameEN: "Zampoña (siku)", family: "winds", roles: ["melody"],          color: "#5ec8e8", arch: "panpipes", range: [55, 88], vol: 0.74, aliases: ["zampona", "zampoña", "siku", "sicu", "panpipes", "flauta de pan", "antara"] },
  { id: "quena",    nameES: "Quena",         nameEN: "Quena",         family: "winds", roles: ["melody"],             color: "#7fd8e8", arch: "andeanflute", range: [57, 86], vol: 0.72, aliases: ["quena", "kena", "flauta andina"] },
  { id: "gaitacolo", nameES: "Gaita colombiana", nameEN: "Colombian Gaita", family: "winds", roles: ["melody"],    color: "#6fc3df", arch: "andeanflute", range: [50, 81], vol: 0.72, aliases: ["gaita colombiana", "gaita", "kuisi"] },
  { id: "harmonica", nameES: "Armónica",     nameEN: "Harmonica",     family: "winds", roles: ["melody"],             color: "#8be0e8", arch: "harmonium", range: [55, 88], vol: 0.72, aliases: ["armonica", "armónica", "harmonica", "blues harp"] },
  { id: "gaita",    nameES: "Gaita (cornamusa)", nameEN: "Bagpipes",  family: "winds", roles: ["melody", "pads"],     color: "#5fd68a", arch: "bagpipe",  range: [55, 84], vol: 0.7,  aliases: ["gaita escocesa", "bagpipes", "uilleann", "gaita gallega", "cornamusa"] },

  /* --- metales --- */
  { id: "horn",     nameES: "Corno Francés", nameEN: "French Horn",   family: "brass", roles: ["harmony", "pads"],    color: "#ffb03a", arch: "brass",   range: [41, 74], vol: 0.7,  aliases: ["corno", "horn", "french horn", "cornos"] },
  { id: "trumpet",  nameES: "Trompeta",      nameEN: "Trumpet",       family: "brass", roles: ["melody"],             color: "#ffc53d", arch: "brass",   range: [52, 84], vol: 0.78, aliases: ["trompeta", "trumpet", "trompetas", "metales", "brass", "fanfarria"] },
  { id: "trombone", nameES: "Trombón",       nameEN: "Trombone",      family: "brass", roles: ["harmony", "melody"], color: "#f2a06b", arch: "brass",   range: [40, 72], vol: 0.74, aliases: ["trombon", "trombón", "trombone", "trombones"] },
  { id: "tuba",     nameES: "Tuba",          nameEN: "Tuba",          family: "brass", roles: ["bass"],               color: "#e8875c", arch: "bass",    range: [29, 58], vol: 0.78, aliases: ["tuba", "sousafone", "bombardino"] },

  /* --- teclados --- */
  { id: "piano",    nameES: "Piano",         nameEN: "Piano",         family: "keys", roles: ["melody", "harmony", "comp"], color: "#efeaf5", arch: "piano", range: [33, 96], vol: 0.8, aliases: ["piano", "pianos", "piano de cola", "piano acustico"] },
  { id: "epiano",   nameES: "Piano eléctrico", nameEN: "E-Piano (Rhodes)", family: "keys", roles: ["harmony", "melody", "comp"], color: "#b58cff", arch: "epiano", range: [40, 90], vol: 0.72, aliases: ["piano electrico", "rhodes", "wurlitzer", "e-piano", "epiano", "fender rhodes"] },
  { id: "organ",    nameES: "Órgano Hammond", nameEN: "Hammond Organ", family: "keys", roles: ["harmony", "pads"],   color: "#ff8a5c", arch: "organ",   range: [36, 88], vol: 0.7,  aliases: ["organo", "órgano", "organ", "hammond", "organo hammond"] },
  { id: "celesta",  nameES: "Celesta",       nameEN: "Celesta",       family: "keys", roles: ["melody"],             color: "#fff1d6", arch: "celesta", range: [60, 92], vol: 0.62, aliases: ["celesta", "celeste", "music box", "caja de música"] },
  { id: "accordion", nameES: "Acordeón",     nameEN: "Accordion",     family: "keys", roles: ["melody", "harmony", "comp"], color: "#f5c37a", arch: "accordion", range: [41, 84], vol: 0.76, aliases: ["acordeon", "acordeón", "accordion", "bayan", "concertina"] },
  { id: "bandoneon", nameES: "Bandoneón",    nameEN: "Bandoneón",     family: "keys", roles: ["melody", "harmony"],  color: "#e8a35c", arch: "bandoneon", range: [40, 84], vol: 0.78, aliases: ["bandoneon", "bandoneón"] },
  { id: "harmonium", nameES: "Harmonium",    nameEN: "Harmonium",     family: "keys", roles: ["harmony", "pads"],    color: "#f0d0a0", arch: "harmonium", range: [40, 84], vol: 0.7,  aliases: ["harmonium", "harmonio", "shruti box"] },

  /* --- sintetizadores --- */
  { id: "synthlead", nameES: "Sinte solista", nameEN: "Synth Lead",   family: "synth", roles: ["melody"],             color: "#45e0cd", arch: "lead",    range: [48, 88], vol: 0.78, aliases: ["sintetizador", "synth", "sinte", "synthesizer", "sinte solista", "secuenciador", "synths"] },
  { id: "synthpad", nameES: "Pad sintético", nameEN: "Synth Pad",     family: "synth", roles: ["pads", "harmony"],   color: "#8b6ff0", arch: "pad",     range: [36, 84], vol: 0.68, aliases: ["pad", "pads", "synth pad", "colchon", "cuerdas sinteticas"] },
  { id: "synthbass", nameES: "Bajo sintético", nameEN: "Synth Bass",  family: "synth", roles: ["bass"],               color: "#2dd4bf", arch: "subbass", range: [28, 55], vol: 0.85, aliases: ["bajo sintetico", "synth bass", "808", "sub", "subbajo", "bajo electronico"] },

  /* --- cuerda pulsada --- */
  { id: "harp",     nameES: "Arpa",          nameEN: "Harp",          family: "strings", roles: ["harmony", "melody"],  color: "#ffd28a", arch: "harp",    range: [40, 84], vol: 0.7,  aliases: ["arpa", "harp", "harpa", "arpa celta"] },
  { id: "harpandes", nameES: "Arpa andina",  nameEN: "Andean Harp",   family: "strings", roles: ["harmony", "melody"],  color: "#f5d8a0", arch: "harp",    range: [43, 84], vol: 0.7,  aliases: ["arpa andina", "andean harp"] },
  { id: "harpllanera", nameES: "Arpa llanera", nameEN: "Llanera Harp", family: "strings", roles: ["melody", "harmony", "comp"], color: "#f0c880", arch: "harp", range: [40, 84], vol: 0.74, aliases: ["arpa llanera", "llanera harp"] },
  { id: "nylon",    nameES: "Guitarra clásica", nameEN: "Classical Guitar", family: "plucked", roles: ["harmony", "comp", "melody"], color: "#e8c468", arch: "nylon", range: [40, 84], vol: 0.72, aliases: ["guitarra", "guitar", "guitarra clásica", "guitarra clasica", "classical guitar", "acoustic guitar", "guitarra acústica", "guitarra de jazz", "guitarra ritmica", "requinto", "guitarra segunda"] },
  { id: "flamencog", nameES: "Guitarra flamenca", nameEN: "Flamenco Guitar", family: "plucked", roles: ["comp", "melody", "harmony"], color: "#f0b060", arch: "nylon", range: [40, 84], vol: 0.74, aliases: ["guitarra flamenca", "flamenco guitar", "toque"] },
  { id: "eguitar",  nameES: "Guitarra eléctrica", nameEN: "Electric Guitar", family: "plucked", roles: ["melody", "comp"], color: "#ff5c5c", arch: "electric", range: [40, 88], vol: 0.78, aliases: ["guitarra electrica", "electric guitar", "guitarra eléctrica", "guitarras electricas"] },
  { id: "vihuela",  nameES: "Vihuela",       nameEN: "Vihuela",       family: "plucked", roles: ["comp", "harmony"],  color: "#e0b058", arch: "nylon",   range: [43, 79], vol: 0.68, aliases: ["vihuela"] },
  { id: "guitarron", nameES: "Guitarrón",    nameEN: "Guitarrón",     family: "plucked", roles: ["bass"],             color: "#c98850", arch: "bass",    range: [28, 52], vol: 0.8,  aliases: ["guitarron", "guitarrón"] },
  { id: "ebass",    nameES: "Bajo eléctrico", nameEN: "Electric Bass", family: "plucked", roles: ["bass"],             color: "#ff6b3d", arch: "bass",    range: [28, 55], vol: 0.82, aliases: ["bajo", "bass", "bajo eléctrico", "bajo electrico", "electric bass", "bass guitar"] },
  { id: "charango", nameES: "Charango",      nameEN: "Charango",      family: "plucked", roles: ["comp", "melody", "harmony"], color: "#f0c878", arch: "charango", range: [55, 88], vol: 0.7, aliases: ["charango", "ronroco"] },
  { id: "mandolin", nameES: "Mandolina",     nameEN: "Mandolin",      family: "plucked", roles: ["melody", "harmony"],  color: "#f5dca0", arch: "charango", range: [55, 88], vol: 0.68, aliases: ["mandolina", "mandolin", "bandola"] },
  { id: "cuatro",   nameES: "Cuatro",        nameEN: "Cuatro",        family: "plucked", roles: ["comp", "harmony", "melody"], color: "#e8b870", arch: "nylon", range: [47, 83], vol: 0.72, aliases: ["cuatro", "cuatro venezolano", "cuatro puertorriqueño", "cuatro pr"] },
  { id: "kora",     nameES: "Kora",          nameEN: "Kora",          family: "plucked", roles: ["melody", "harmony"], color: "#f5d08a", arch: "harp",    range: [48, 84], vol: 0.72, aliases: ["kora", "cora"] },
  { id: "ngoni",    nameES: "Ngoni",         nameEN: "Ngoni",         family: "plucked", roles: ["bass", "melody"],   color: "#d8b878", arch: "nylon",   range: [36, 72], vol: 0.7,  aliases: ["ngoni", "n'goni", "calabash bass"] },
  { id: "balalaika", nameES: "Balalaika",    nameEN: "Balalaika",     family: "plucked", roles: ["melody", "comp"],   color: "#f5d08a", arch: "nylon",   range: [52, 84], vol: 0.66, aliases: ["balalaika", "balalayka", "domra"] },
  { id: "sitar",    nameES: "Sitar",         nameEN: "Sitar",         family: "plucked", roles: ["melody"],           color: "#e8c07a", arch: "sitar",   range: [48, 84], vol: 0.74, aliases: ["sitar", "sarod"] },
  { id: "koto",     nameES: "Koto",          nameEN: "Koto",          family: "plucked", roles: ["melody", "harmony"], color: "#f0d8b0", arch: "harp",   range: [50, 86], vol: 0.66, aliases: ["koto", "shamisen", "guqin"] },

  /* --- batería --- */
  { id: "drumkit",  nameES: "Batería",       nameEN: "Drum Kit",      family: "drums", roles: ["drums"],              color: "#ff9d70", drum: "kick",    range: [36, 51], vol: 0.85, aliases: ["bateria", "batería", "drums", "drum kit", "caja de ritmos", "drum machine", "percusion electronica"] },
  { id: "snareline", nameES: "Tambor de marcha", nameEN: "March Snare", family: "drums", roles: ["drums"],           color: "#ff7d7d", drum: "snare",   range: [38, 38], vol: 0.8,  aliases: ["tambor de marcha", "redoblante", "snare", "caja de marcha", "march snare"] },
  { id: "bassdrum", nameES: "Bombo de marcha", nameEN: "March Bass Drum", family: "drums", roles: ["drums"],        color: "#f2705c", drum: "kick",    range: [36, 36], vol: 0.82, aliases: ["bombo", "bass drum", "gran cassa", "bombo de marcha"] },

  /* --- percusión --- */
  { id: "timpani",  nameES: "Timbales sinfónicos", nameEN: "Timpani", family: "percussion", roles: ["perc"],        color: "#ffc53d", drum: "timpani", range: [38, 55], vol: 0.78, aliases: ["timbal", "timpani", "kettle", "timbales sinfonicos"] },
  { id: "congas",   nameES: "Congas",        nameEN: "Congas",        family: "percussion", roles: ["perc"],        color: "#ff8a5c", drum: "conga",   range: [55, 72], vol: 0.75, aliases: ["conga", "congas", "tumbadora", "tumbadoras", "llamador", "bongo", "bongó", "bongos"] },
  { id: "claves",   nameES: "Claves",        nameEN: "Claves",        family: "percussion", roles: ["perc"],        color: "#ffd28a", drum: "clave",   range: [75, 75], vol: 0.6,  aliases: ["claves", "clave", "palillos"] },
  { id: "shaker",   nameES: "Shaker / Maracas", nameEN: "Shaker",     family: "percussion", roles: ["perc"],        color: "#c8f0a0", drum: "shaker",  range: [70, 70], vol: 0.55, aliases: ["shaker", "maracas", "maraca", "shekere", "pandeiro", "tamborine", "pandereta"] },
  { id: "tambourine", nameES: "Pandereta",   nameEN: "Tambourine",    family: "percussion", roles: ["perc"],        color: "#f0d890", drum: "tambourine", range: [70, 70], vol: 0.6, aliases: ["pandereta", "tambourine", "pandero"] },
  { id: "cowbell",  nameES: "Cencerro",      nameEN: "Cowbell",       family: "percussion", roles: ["perc"],        color: "#ffad80", drum: "cowbell", range: [68, 68], vol: 0.55, aliases: ["cencerro", "cowbell", "campana", "bell", "campanas", "bells", "glockenspiel"] },
  { id: "cajon",    nameES: "Cajón",         nameEN: "Cajón",         family: "percussion", roles: ["perc", "drums"], color: "#f2a06b", drum: "cajon",  range: [36, 45], vol: 0.8,  aliases: ["cajon", "cajón", "cajón flamenco", "cajon flamenco", "cajon peruano"] },
  { id: "palmas",   nameES: "Palmas",        nameEN: "Palmas (claps)", family: "percussion", roles: ["perc"],       color: "#ffc9a8", drum: "clap",    range: [39, 39], vol: 0.62, aliases: ["palmas", "claps", "palmeo", "hand claps"] },
  { id: "castanets", nameES: "Castañuelas",  nameEN: "Castanets",     family: "percussion", roles: ["perc"],        color: "#e8b08a", drum: "castanets", range: [76, 79], vol: 0.55, aliases: ["castanets", "castañuelas", "castanuelas", "postizas"] },
  { id: "guiro",    nameES: "Güiro",         nameEN: "Güiro",         family: "percussion", roles: ["perc"],        color: "#d9c08a", arch: "scraper", range: [70, 70], vol: 0.55, aliases: ["guiro", "güiro", "guacharaca", "rallador"] },
  { id: "guira",    nameES: "Güira",         nameEN: "Güira",         family: "percussion", roles: ["perc"],        color: "#e5cf9a", arch: "scraper", range: [70, 70], vol: 0.6,  aliases: ["guira", "güira", "guiro metalico", "charrasca"] },
  { id: "tambora",  nameES: "Tambora dominicana", nameEN: "Tambora",  family: "percussion", roles: ["perc", "drums"], color: "#f0925c", drum: "tambora", range: [36, 40], vol: 0.8, aliases: ["tambora", "tambora dominicana"] },
  { id: "djembe",   nameES: "Djembe",        nameEN: "Djembe",        family: "percussion", roles: ["perc"],        color: "#ff9d70", drum: "djembe",  range: [36, 62], vol: 0.75, aliases: ["djembe", "djembé", "yembe", "percusion africana", "calabash"] },
  { id: "tabla",    nameES: "Tabla",         nameEN: "Tabla",         family: "percussion", roles: ["perc"],        color: "#ffc4a0", drum: "tabla",   range: [40, 70], vol: 0.75, aliases: ["tabla", "tablas", "baya", "dayan"] },
  { id: "bodhran",  nameES: "Bodhrán",       nameEN: "Bodhrán",       family: "percussion", roles: ["perc", "drums"], color: "#e8c9a0", drum: "bodhran", range: [36, 45], vol: 0.75, aliases: ["bodhran", "bodhrán"] },
  { id: "timbales", nameES: "Timbales latinos", nameEN: "Timbales",   family: "percussion", roles: ["perc", "drums"], color: "#ffb59a", drum: "timbales", range: [38, 50], vol: 0.75, aliases: ["timbales latinos", "timbales", "timbal latino", "pailas"] },
  { id: "leguero",  nameES: "Bombo legüero", nameEN: "Bombo Legüero", family: "percussion", roles: ["perc", "drums"], color: "#e0a06a", drum: "leguero", range: [36, 40], vol: 0.78, aliases: ["bombo legüero", "bombo leguero", "legüero", "bombo andino"] },
  { id: "quijada",  nameES: "Quijada de burro", nameEN: "Jawbone",    family: "percussion", roles: ["perc"],        color: "#e8d0b0", drum: "quijada", range: [70, 70], vol: 0.55, aliases: ["quijada", "quijada de burro", "jawbone"] },
  { id: "cajita",   nameES: "Cajita rítmica", nameEN: "Cajita",       family: "percussion", roles: ["perc"],        color: "#d8b888", drum: "cajita",  range: [70, 74], vol: 0.6,  aliases: ["cajita", "cajita ritmica", "cajita afroperuana"] },
  { id: "cajavallenata", nameES: "Caja vallenata", nameEN: "Vallenato Caja", family: "percussion", roles: ["perc", "drums"], color: "#f0b080", drum: "cajavallenata", range: [38, 42], vol: 0.72, aliases: ["caja vallenata", "caja", "tambor vallenato"] },
  { id: "bomba",    nameES: "Barril de bomba", nameEN: "Bomba Barrel", family: "percussion", roles: ["drums", "perc"], color: "#e08850", drum: "bomba", range: [36, 46], vol: 0.8, aliases: ["barril de bomba", "bomba", "buleador", "primo", "barriles", "pleneras", "pandereta plena"] },
  { id: "furruco",  nameES: "Furruco",       nameEN: "Furruco",       family: "percussion", roles: ["perc"],        color: "#c99060", drum: "furruco", range: [36, 40], vol: 0.68, aliases: ["furruco", "furruco zuliano", "manduco"] },

  /* --- voces --- */
  { id: "soprano",  nameES: "Soprano",       nameEN: "Soprano",       family: "voice", roles: ["melody", "voice"],    color: "#ffb0d8", arch: "voice",   range: [60, 84], vol: 0.7,  aliases: ["soprano", "voz femenina", "female voice", "cantaora", "cantante femenina"] },
  { id: "alto",     nameES: "Contralto",     nameEN: "Alto",          family: "voice", roles: ["melody", "voice"],    color: "#f0b0d8", arch: "voice",   range: [52, 76], vol: 0.68, aliases: ["alto", "contralto", "mezzo", "voz femenina grave"] },
  { id: "tenor",    nameES: "Tenor",         nameEN: "Tenor",         family: "voice", roles: ["melody", "voice"],    color: "#ff9ecb", arch: "voice",   range: [48, 72], vol: 0.7,  aliases: ["tenor", "tenores", "voz masculina", "male voice", "voz", "voice", "voces", "cantante", "singer", "coro", "choir", "cantaor", "cantante masculino"] },
  { id: "basso",    nameES: "Bajo profundo", nameEN: "Basso Profundo", family: "voice", roles: ["voice", "bass"],     color: "#e08ab8", arch: "voice",   range: [36, 60], vol: 0.68, aliases: ["bajo profundo", "basso", "bass voice", "voz grave", "octavista"] },
];

export const INSTRUMENT_MAP: Record<string, InstrumentDef> = Object.fromEntries(
  INSTRUMENTS.map((i) => [i.id, i]),
);

export const instrumentName = (id: string, lang: Lang) => {
  const d = INSTRUMENT_MAP[id];
  if (!d) return id;
  return lang === "es" ? d.nameES : d.nameEN;
};

export const FAMILY_ORDER: InstrumentDef["family"][] = [
  "strings", "brass", "winds", "keys", "plucked", "synth", "percussion", "drums", "voice",
];

export const FAMILY_LABELS: Record<string, { es: string; en: string }> = {
  strings: { es: "Cuerdas", en: "Strings" },
  brass: { es: "Metales", en: "Brass" },
  winds: { es: "Vientos", en: "Winds" },
  keys: { es: "Teclados", en: "Keys" },
  plucked: { es: "Cuerda pulsada", en: "Plucked" },
  synth: { es: "Sintetizadores", en: "Synths" },
  percussion: { es: "Percusión", en: "Percussion" },
  drums: { es: "Batería", en: "Drums" },
  voice: { es: "Voces", en: "Voices" },
};

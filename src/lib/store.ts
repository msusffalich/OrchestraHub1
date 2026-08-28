import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Composition, Lang, Orchestra, Track } from "./core";
import { uid, hashString } from "./core";
import { GENRE_MAP, layoutStage, defaultChannels, fusedLineup } from "./genres";
import { analyzePrompt, compose } from "./composer";
import { translate } from "./i18n";
import { engine } from "./engine";

/* ============================================================
   Estado global del ecosistema (persistido en localStorage).
   Las composiciones en vivo no se persisten: se regeneran al
   instante desde su semilla (determinismo total).
   ============================================================ */

export type Section = "orchestras" | "studio" | "works" | "concert" | "manual";

export interface Toast { id: number; msg: string; }

function makeOrchestra(name: string, genreId: string, lineup: string[], fusions: string[] = []): Orchestra {
  const stage = layoutStage(lineup, name);
  return {
    id: uid(),
    name,
    genreId,
    fusions,
    instrumentIds: [...lineup],
    stage,
    channels: defaultChannels(lineup, stage),
    createdAt: Date.now(),
  };
}

/* --- orquestas semilla (primera ejecución) --- */
const fusionLineupSeed = fusedLineup({ genreId: "latin", fusions: ["tango", "electro"] });
const seedOrchestras: Orchestra[] = [
  makeOrchestra("Filarmónica Aurora", "symphonic", GENRE_MAP.symphonic.lineup),
  makeOrchestra("Cuarteto Neón", "jazz", GENRE_MAP.jazz.lineup),
  makeOrchestra("Circuito Voltaico", "electro", GENRE_MAP.electro.lineup),
  makeOrchestra("Caribe Candela", "latin", GENRE_MAP.latin.lineup),
  makeOrchestra("Vientos del Altiplano", "andina", GENRE_MAP.andina.lineup),
  makeOrchestra("Fusión Neón Criollo", "latin", fusionLineupSeed, ["tango", "electro"]),
];

/* --- obra semilla: composición determinista lista para el concierto --- */
function seedTrack(): Track {
  const orch = seedOrchestras[1];
  const prompt = "Jazz nocturno melancólico y lluvioso con saxofón líder";
  const seed = hashString(prompt + orch.id) >>> 0;
  const analysis = analyzePrompt(prompt, orch);
  const comp = compose(analysis, orch, seed, "es");
  return {
    id: uid(),
    title: comp.title,
    prompt,
    orchestraId: orch.id,
    orchestraName: orch.name,
    genreId: orch.genreId,
    fusions: [],
    seed,
    bpm: comp.bpm,
    meter: comp.meter,
    bars: comp.bars,
    createdAt: Date.now(),
    coverSeed: seed % 99991,
    mix: JSON.parse(JSON.stringify(orch.channels)) as Orchestra["channels"],
    space: comp.space,
    bright: comp.bright,
  };
}

interface SonicState {
  lang: Lang;
  section: Section;
  orchestras: Orchestra[];
  tracks: Track[];
  studioOrchestraId: string | null;
  concertTrackId: string | null;
  masterVolume: number;

  /* sesión de estudio (no persistida) */
  sessionComp: Composition | null;
  sessionPrompt: string;
  generating: boolean;

  toasts: Toast[];

  setLang: (l: Lang) => void;
  setSection: (s: Section) => void;
  saveOrchestra: (o: Orchestra) => void;
  deleteOrchestra: (id: string) => void;
  setStudioOrchestra: (id: string) => void;
  setSession: (c: Composition | null, prompt: string) => void;
  setGenerating: (b: boolean) => void;
  updateSessionBpm: (bpm: number) => void;
  addTrack: (t: Track) => void;
  deleteTrack: (id: string) => void;
  setConcertTrack: (id: string) => void;
  setMasterVolume: (v: number) => void;
  toast: (msg: string) => void;
  dismissToast: (id: number) => void;
}

let toastSeq = 1;

export const useSonic = create<SonicState>()(
  persist(
    (set, get) => ({
      lang: "es",
      section: "orchestras",
      orchestras: seedOrchestras,
      tracks: [seedTrack()],
      studioOrchestraId: null,
      concertTrackId: null,
      masterVolume: 0.85,

      sessionComp: null,
      sessionPrompt: "",
      generating: false,
      toasts: [],

      setLang: (lang) => set({ lang }),
      setSection: (section) => set({ section }),

      saveOrchestra: (o) => {
        const list = get().orchestras;
        const exists = list.some((x) => x.id === o.id);
        set({
          orchestras: exists ? list.map((x) => (x.id === o.id ? o : x)) : [...list, o],
          studioOrchestraId: get().studioOrchestraId ?? o.id,
        });
      },

      deleteOrchestra: (id) => {
        const rest = get().orchestras.filter((o) => o.id !== id);
        set({
          orchestras: rest,
          studioOrchestraId: get().studioOrchestraId === id ? (rest[0]?.id ?? null) : get().studioOrchestraId,
        });
      },

      setStudioOrchestra: (id) => {
        const o = get().orchestras.find((x) => x.id === id);
        set({ studioOrchestraId: id });
        if (o) engine.syncChannels(o.channels);
      },

      setSession: (sessionComp, sessionPrompt) => set({ sessionComp, sessionPrompt }),
      setGenerating: (generating) => set({ generating }),

      updateSessionBpm: (bpm) => {
        const c = get().sessionComp;
        if (c) set({ sessionComp: { ...c, bpm } });
      },

      addTrack: (t) => set({ tracks: [t, ...get().tracks] }),
      deleteTrack: (id) => {
        set({
          tracks: get().tracks.filter((t) => t.id !== id),
          concertTrackId: get().concertTrackId === id ? null : get().concertTrackId,
        });
        if (engine.snapshot().sourceId === id) engine.stop();
      },

      setConcertTrack: (id) => set({ concertTrackId: id }),

      setMasterVolume: (v) => {
        engine.setMasterVolume(v);
        set({ masterVolume: v });
      },

      toast: (msg) => {
        const id = toastSeq++;
        set({ toasts: [...get().toasts, { id, msg }] });
        window.setTimeout(() => get().dismissToast(id), 3400);
      },
      dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
    }),
    {
      name: "sonico-ecosystem-v2",
      partialize: (s) => ({
        lang: s.lang,
        orchestras: s.orchestras,
        tracks: s.tracks,
        studioOrchestraId: s.studioOrchestraId,
        concertTrackId: s.concertTrackId,
        masterVolume: s.masterVolume,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) engine.setMasterVolume(state.masterVolume);
      },
    },
  ),
);

/* --- helpers --- */
export const useT = () => {
  const lang = useSonic((s) => s.lang);
  return (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars);
};

export function recomposeTrack(t: Track, orch: Orchestra | undefined, lang: Lang): Composition {
  const o: Orchestra = orch ?? {
    id: t.orchestraId, name: t.orchestraName, genreId: t.genreId,
    fusions: t.fusions ?? [],
    instrumentIds: Object.keys(t.mix), stage: {}, channels: t.mix, createdAt: t.createdAt,
  };
  const analysis = analyzePrompt(t.prompt, o);
  const comp = compose(analysis, o, t.seed, lang);
  /* la obra conserva el espacio y brillo con los que fue guardada */
  comp.space = t.space ?? comp.space;
  comp.bright = t.bright ?? comp.bright;
  return comp;
}

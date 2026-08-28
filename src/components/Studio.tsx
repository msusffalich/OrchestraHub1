import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ChannelState, GenParams, Orchestra, PromptAnalysis, Track, Lang } from "../lib/core";
import { GENRE_MAP, genreName, fusedGenres, fusedBpmRange } from "../lib/genres";
import { INSTRUMENT_MAP, instrumentName } from "../lib/instruments";
import { analyzePrompt, compose, defaultParams, MOOD_LABELS, transposeComposition, parseLyrics } from "../lib/composer";
import { engine, type EngineSnapshot } from "../lib/engine";
import { hashString, uid } from "../lib/core";
import { useSonic, useT } from "../lib/store";
import { StageView, SectionHeader, EmptyState, Chip } from "./visuals";
import { ScoreModal } from "./ScoreModal";
import { Icon } from "./icons";
import { Knob, Fader, MSButton, Led, TransportButton, HSlider } from "./controls";

const delay = (ms: number) => new Promise((r) => window.setTimeout(r, ms));
const toDb = (v: number) => (v <= 0.001 ? "-∞" : (20 * Math.log10(v * v * 1.25)).toFixed(1));

export function StudioSection() {
  const lang = useSonic((s) => s.lang);
  const orchestras = useSonic((s) => s.orchestras);
  const studioOrchestraId = useSonic((s) => s.studioOrchestraId);
  const saveOrchestra = useSonic((s) => s.saveOrchestra);
  const setStudioOrchestra = useSonic((s) => s.setStudioOrchestra);
  const setSection = useSonic((s) => s.setSection);
  const sessionComp = useSonic((s) => s.sessionComp);
  const setSession = useSonic((s) => s.setSession);
  const generating = useSonic((s) => s.generating);
  const setGenerating = useSonic((s) => s.setGenerating);
  const updateSessionBpm = useSonic((s) => s.updateSessionBpm);
  const addTrack = useSonic((s) => s.addTrack);
  const masterVolume = useSonic((s) => s.masterVolume);
  const setMasterVolume = useSonic((s) => s.setMasterVolume);
  const toast = useSonic((s) => s.toast);
  const t = useT();

  const orch = useMemo(() => orchestras.find((o) => o.id === studioOrchestraId) ?? null, [orchestras, studioOrchestraId]);

  /* ---------- mezcla local de la sesión ---------- */
  const [mix, setMix] = useState<Record<string, ChannelState>>({});
  const persistTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (orch) {
      const copy = JSON.parse(JSON.stringify(orch.channels)) as Record<string, ChannelState>;
      setMix(copy);
      engine.syncChannels(copy);
    }
  }, [orch?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateMix = (id: string, patch: Partial<ChannelState>) => {
    setMix((m) => {
      const next = { ...m, [id]: { ...m[id], ...patch } };
      engine.setChannel(id, next[id]);
      window.clearTimeout(persistTimer.current);
      persistTimer.current = window.setTimeout(() => {
        const current = useSonic.getState().orchestras.find((o) => o.id === orch?.id);
        if (current) saveOrchestra({ ...current, channels: next });
      }, 700);
      return next;
    });
  };

  /* ---------- parámetros del estilo (ajustables antes de generar) ---------- */
  const [params, setParams] = useState<GenParams | null>(null);
  useEffect(() => {
    if (orch) setParams(defaultParams(orch));
  }, [orch?.id, orch?.fusions.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- snapshot del motor ---------- */
  const [snap, setSnap] = useState<EngineSnapshot>(() => engine.snapshot());
  useEffect(() => engine.subscribe(setSnap), []);
  useEffect(() => {
    if (snap.status === "stopped") return;
    const iv = window.setInterval(() => setSnap(engine.snapshot()), 100);
    return () => window.clearInterval(iv);
  }, [snap.status]);
  const isSessionSource = snap.sourceKind === "session";

  /* ---------- generador prompt-a-música ---------- */
  const [prompt, setPrompt] = useState("");
  const [pieceTitle, setPieceTitle] = useState("");  // título de la obra (≠ prompt)
  const titleTouched = useRef(false);               // el usuario ya escribió su título
  const [lyrics, setLyrics] = useState("");         // letra opcional (música + letra)
  const [showLyrics, setShowLyrics] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [analysis, setAnalysis] = useState<PromptAnalysis | null>(null);
  const variation = useRef(0);

  /* ---------- ajustes post-generación ---------- */
  const [transpose, setTranspose] = useState(0);           // semitonos
  const [leadOverride, setLeadOverride] = useState("auto"); // instrumento líder

  /* compone la obra cruzando prompt + letra + parámetros + ajustes */
  const makeComp = (p: string, seed: number) => {
    if (!orch) return null;
    const a = analyzePrompt(p, orch);
    setAnalysis(a);
    if (leadOverride !== "auto") a.leaderId = leadOverride;
    let comp = compose(a, orch, seed, lang, params ?? undefined, lyrics.trim() || undefined);
    comp = transposeComposition(comp, transpose);
    comp = { ...comp, leadId: leadOverride !== "auto" ? leadOverride : undefined };
    return comp;
  };

  /* reconstrucción inmediata (ajustes en vivo, sin animación) */
  const rebuildPiece = (opts: { newSeed?: boolean; nextTranspose?: number; nextLead?: string } = {}) => {
    if (!orch) return;
    engine.init();
    const p = prompt.trim() || useSonic.getState().sessionPrompt || t("sug.1");
    if (opts.newSeed) variation.current += 1;
    if (opts.nextTranspose !== undefined) setTranspose(opts.nextTranspose);
    if (opts.nextLead !== undefined) setLeadOverride(opts.nextLead);
    const tr = opts.nextTranspose ?? transpose;
    const lead = opts.nextLead ?? leadOverride;
    const a = analyzePrompt(p, orch);
    setAnalysis(a);
    if (lead !== "auto") a.leaderId = lead;
    const seed = (hashString(p + orch.id) + variation.current * 7919) >>> 0;
    let comp = compose(a, orch, seed, lang, params ?? undefined, lyrics.trim() || undefined);
    comp = transposeComposition(comp, tr);
    comp = { ...comp, leadId: lead !== "auto" ? lead : undefined };
    /* autocompleta el título de la obra solo si el usuario no escribió uno */
    if (!titleTouched.current) setPieceTitle(comp.title);
    setSession(comp, p);
    engine.play(comp, Object.keys(mix).length ? mix : orch.channels, "studio-session", "session");
  };

  const generate = async (forcePrompt?: string) => {
    if (!orch || generating) return;
    engine.init();
    const p = (forcePrompt ?? prompt).trim() || t("sug.1");
    if (!forcePrompt) setPrompt(p);
    setGenerating(true);
    setProgress(0);
    const steps = [0.18, 0.45, 0.78, 0.97];
    for (let i = 0; i < steps.length; i++) {
      setStepIdx(i);
      const from = i === 0 ? 0 : steps[i - 1];
      const to = steps[i];
      for (let f = 0; f <= 6; f++) {
        setProgress(from + ((to - from) * f) / 6);
        await delay(55 + Math.random() * 60);
      }
      if (i === 1) {
        /* el motor cruza el prompt + la letra con los parámetros del estilo */
        const seed = (hashString(p + orch.id) + variation.current * 7919) >>> 0;
        const comp = makeComp(p, seed);
        if (comp) setSession(comp, p);
      }
    }
    setProgress(1);
    await delay(220);
    setProgress(null);
    setGenerating(false);
    const comp = useSonic.getState().sessionComp;
    const liveMix = Object.keys(mix).length ? mix : orch.channels;
    if (comp) engine.play(comp, liveMix, "studio-session", "session");
  };

  const regenerate = () => rebuildPiece({ newSeed: true });

  /* ---------- transporte ---------- */
  const play = () => {
    if (!sessionComp || !orch) return;
    engine.init();
    if (snap.status === "paused" && isSessionSource) { engine.resume(); return; }
    engine.play(sessionComp, mix, "studio-session", "session");
  };
  const pause = () => engine.pause();
  const stop = () => engine.stop();

  const onBpm = (bpm: number) => {
    engine.setBpm(bpm);
    updateSessionBpm(Math.round(bpm));
  };

  /* ---------- guardar obra ---------- */
  const [saveOpen, setSaveOpen] = useState(false);
  const [workTitle, setWorkTitle] = useState("");
  const [scoreOpen, setScoreOpen] = useState(false);
  const saveWork = () => {
    if (!sessionComp || !orch) return;
    const track: Track = {
      id: uid(),
      title: workTitle.trim() || sessionComp.title,
      prompt: useSonic.getState().sessionPrompt || prompt,
      orchestraId: orch.id,
      orchestraName: orch.name,
      genreId: orch.genreId,
      fusions: [...(orch.fusions ?? [])],
      seed: sessionComp.seed,
      bpm: sessionComp.bpm,
      meter: sessionComp.meter,
      bars: sessionComp.bars,
      createdAt: Date.now(),
      coverSeed: sessionComp.seed % 99991,
      mix: Object.fromEntries(Object.entries(mix).map(([k, v]) => [k, { ...v, solo: false }])),
      space: sessionComp.space,
      bright: sessionComp.bright,
      lyrics: sessionComp.lyrics,
      transpose: sessionComp.transpose,
      leadId: sessionComp.leadId,
    };
    addTrack(track);
    toast(t("stu.savedToast"));
    setSaveOpen(false);
  };

  if (!orch) {
    return (
      <div>
        <SectionHeader kicker="02 · Studio State" title={t("stu.title")} subtitle={t("stu.subtitle")} />
        <EmptyState
          icon="faders" title={t("stu.noOrch")} hint={t("stu.noOrchHint")}
          action={
            <button onClick={() => setSection("orchestras")} className="btn-primary rounded-xl px-5 py-2.5 text-sm flex items-center gap-2">
              <Icon name="arrow" size={15} /> {t("stu.goBuild")}
            </button>
          }
        />
      </div>
    );
  }

  const pos = snap.status === "stopped" || !isSessionSource ? 0 : Math.min(snap.positionBeats, snap.totalBeats);
  const barNow = Math.floor(pos / (sessionComp?.meter ?? 4));
  const beatNow = Math.floor(pos % (sessionComp?.meter ?? 4)) + 1;

  return (
    <div>
      <SectionHeader
        kicker="02 · Studio State"
        title={t("stu.title")}
        subtitle={t("stu.subtitle")}
        right={
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={orch.id}
              onChange={(e) => setStudioOrchestra(e.target.value)}
              className="bg-ink-800 border border-ink-600 rounded-lg px-3 py-2 text-sm text-ink-100 cursor-pointer hover:border-ink-500 transition-colors focus-ring max-w-[220px]"
            >
              {orchestras.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            <Chip color={GENRE_MAP[orch.genreId]?.palette[0] ?? "#ffb03a"}>{genreName(orch.genreId, lang)}</Chip>
            {(orch.fusions ?? []).map((f) => <Chip key={f} color={GENRE_MAP[f]?.palette[1] ?? "#45e0cd"}>+ {genreName(f, lang)}</Chip>)}
          </div>
        }
      />

      <div className="grid lg:grid-cols-[400px_1fr] gap-5 items-start">
        {/* ================= COLUMNA IZQUIERDA ================= */}
        <div className="flex flex-col gap-5">
          {/* generador + parámetros */}
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="panel p-5">
            <h2 className="font-display font-bold text-[16px] mb-3 flex items-center gap-2">
              <span className="text-led-400"><Icon name="spark" size={18} /></span>
              {t("stu.generator")}
            </h2>

            {/* Título de la obra: independiente del prompt. Se autocompleta al generar, pero puedes escribir el tuyo. */}
            <label className="block">
              <span className="silk-label-xs flex items-center gap-1.5 mb-1.5">
                <Icon name="works" size={12} /> {t("stu.workTitleLabel")}
              </span>
              <input
                type="text"
                value={pieceTitle}
                onChange={(e) => { setPieceTitle(e.target.value); titleTouched.current = true; }}
                placeholder={t("stu.workTitleAutoPh")}
                className="w-full bg-ink-900 border border-tube-500/40 rounded-lg px-3.5 py-2.5 text-[14px] font-semibold text-tube-300 placeholder-ink-500 focus:border-tube-500/80 transition-colors focus-ring"
              />
            </label>

            <span className="silk-label-xs flex items-center gap-1.5 mt-3 mb-1.5">
              <Icon name="mic" size={12} /> {t("stu.promptLabel")}
            </span>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t("stu.promptPh")}
              rows={3}
              className="w-full bg-ink-900 border border-ink-600 rounded-lg px-3.5 py-3 text-[14px] leading-relaxed text-ink-100 placeholder-ink-500 resize-none focus:border-led-400/60 transition-colors focus-ring"
            />
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {[1, 2, 3, 4].map((i) => (
                <button
                  key={i}
                  onClick={() => { setPrompt(t(`sug.${i}`)); void generate(t(`sug.${i}`)); }}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-ink-600 text-ink-300 hover:border-led-400/50 hover:text-led-300 transition-all active:scale-95"
                >
                  {t(`sug.${i}`).split(" ").slice(0, 4).join(" ")}…
                </button>
              ))}
            </div>

            {/* letra opcional → la canción se genera completa (música + letra) */}
            <button
              onClick={() => setShowLyrics((s) => !s)}
              className="mt-3 flex items-center gap-2 text-[12px] font-semibold text-ink-300 hover:text-led-300 transition-colors"
            >
              <Icon name="mic" size={14} />
              {t("stu.lyricsToggle")}
              <span className={`text-ink-500 transition-transform ${showLyrics ? "rotate-90" : ""}`}><Icon name="arrow" size={11} /></span>
              {lyrics.trim() && <Chip color="#ff9ecb">{parseLyrics(lyrics).length} {t("stu.lyricLines")}</Chip>}
            </button>
            {showLyrics && (
              <>
                <textarea
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                  placeholder={t("stu.lyricsPh")}
                  rows={5}
                  className="mt-2 w-full bg-ink-900 border border-ink-600 rounded-lg px-3.5 py-3 text-[13.5px] leading-relaxed text-ink-100 placeholder-ink-500 resize-y focus:border-clip-400/60 transition-colors focus-ring"
                />
                <p className="text-ink-400 text-[11px] leading-relaxed mt-1.5 flex gap-1.5">
                  <span className="text-clip-400 mt-0.5 shrink-0"><Icon name="mic" size={12} /></span>
                  {t("stu.lyricsHint")}
                </p>
              </>
            )}

            <StyleParamsPanel orch={orch} params={params} setParams={setParams} lang={lang} />

            <div className="flex gap-2 mt-4">
              <button onClick={() => void generate()} disabled={generating || !orch} className="btn-primary rounded-xl px-5 py-2.5 text-sm flex-1 flex items-center justify-center gap-2">
                {generating ? (<><span className="w-3.5 h-3.5 rounded-full border-2 border-[#241300] border-t-transparent" style={{ animation: "spinSlow 0.7s linear infinite" }} />{t("stu.generating")}</>) : (<><Icon name="spark" size={15} />{t("stu.generate")}</>)}
              </button>
              {sessionComp && (
                <button onClick={regenerate} disabled={generating} title={t("stu.regenerate")} className="btn-ghost rounded-xl px-3.5 py-2.5 text-sm flex items-center gap-1.5">
                  <Icon name="dice" size={16} />{t("stu.regenerate")}
                </button>
              )}
            </div>

            {/* progreso granular */}
            <AnimatePresence>
              {progress !== null && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="mt-4 space-y-1.5">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-2 text-[12px]">
                        <span className={i < stepIdx ? "text-led-400" : i === stepIdx ? "text-tube-400" : "text-ink-500"}>
                          <Icon name={i < stepIdx ? "check" : i === stepIdx ? "metronome" : "note"} size={13} />
                        </span>
                        <span className={i <= stepIdx ? "text-ink-200" : "text-ink-500"}>{t(`gen.step${i + 1}`)}</span>
                        {i === stepIdx && <span className="led led-amber led-pulse ml-auto" />}
                      </div>
                    ))}
                    <div className="h-1.5 rounded-full bg-ink-900 border border-black/50 mt-2 overflow-hidden">
                      <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, #ffb03a, #45e0cd)" }}
                        animate={{ width: `${(progress ?? 0) * 100}%` }} transition={{ duration: 0.12 }} />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* lectura del análisis */}
            {analysis && sessionComp && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="panel-inset mt-4 p-3.5 grid grid-cols-3 gap-y-2.5 gap-x-2">
                <div><div className="silk-label-xs">{t("stu.mood")}</div><div className="text-[13px] font-semibold text-ink-100">{MOOD_LABELS[analysis.moodKey]?.[lang]}</div></div>
                <div><div className="silk-label-xs">{t("stu.mode")}</div><div className="text-[13px] font-semibold text-ink-100">{analysis.minor ? t("stu.minor") : t("stu.major")}</div></div>
                <div><div className="silk-label-xs">{t("stu.meter")}</div><div className="text-[13px] font-semibold text-ink-100 font-mono">{analysis.meter}/4</div></div>
                <div><div className="silk-label-xs">{t("stu.tempo")}</div><div className="text-[13px] font-semibold text-tube-400 font-mono tabular">{sessionComp.bpm} BPM</div></div>
                <div><div className="silk-label-xs">{t("stu.energy")}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <span key={i} className="h-2 w-1.5 rounded-[1px]" style={{ background: i < Math.round(analysis.energy * 8) ? (i > 5 ? "#ff6b3d" : "#ffb03a") : "#221e2e" }} />
                    ))}
                  </div>
                </div>
                <div><div className="silk-label-xs">{t("stu.leader")}</div><div className="text-[13px] font-semibold text-led-300">{analysis.leaderId ? instrumentName(analysis.leaderId, lang) : t("stu.none")}</div></div>
                {analysis.rain && <div className="col-span-3"><Chip color="#45e0cd">{t("stu.rainFx")}</Chip></div>}
              </motion.div>
            )}
          </motion.section>

          {/* transporte */}
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="panel p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold text-[16px] flex items-center gap-2">
                <span className="text-tube-500"><Icon name="metronome" size={18} /></span>
                {t("stu.nowPlaying")}
              </h2>
              <Led on={snap.status === "playing" && isSessionSource} pulse />
            </div>

            {sessionComp ? (
              <>
                <p className="text-ink-100 font-semibold text-[15px] truncate">{pieceTitle.trim() || sessionComp.title}</p>
                <p className="text-ink-400 text-xs mb-3">{orch.name} · {sessionComp.bars} {t("stu.bars")} · {Math.round(sessionComp.durationSec)}s</p>
                <div className="h-2 rounded-full bg-ink-900 border border-black/50 overflow-hidden mb-1.5">
                  <div className="h-full rounded-full transition-[width] duration-150"
                    style={{ width: `${sessionComp.totalBeats ? (pos / sessionComp.totalBeats) * 100 : 0}%`, background: "linear-gradient(90deg,#ffb03a,#ff6b3d)" }} />
                </div>
                <div className="flex justify-between font-mono text-[10px] text-ink-400 tabular mb-4">
                  <span>{barNow + 1}.{beatNow} / {sessionComp.bars}</span>
                  <span>{Math.floor(pos * (60 / sessionComp.bpm) / 60)}:{String(Math.floor((pos * (60 / sessionComp.bpm)) % 60)).padStart(2, "0")} / {Math.floor(sessionComp.durationSec / 60)}:{String(Math.floor(sessionComp.durationSec % 60)).padStart(2, "0")}</span>
                </div>
              </>
            ) : (
              <p className="text-ink-400 text-[13px] mb-4 leading-relaxed">{t("stu.emptySessionHint")}</p>
            )}

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <TransportButton icon={<Icon name="play" size={17} />} onClick={play} disabled={!sessionComp} accent title={t("common.play")} />
                <TransportButton icon={<Icon name="pause" size={15} />} onClick={pause} active={snap.status === "paused"} disabled={!sessionComp || snap.status !== "playing" || !isSessionSource} title={t("common.pause")} />
                <TransportButton icon={<Icon name="stop" size={14} />} onClick={stop} disabled={snap.status === "stopped"} title={t("common.stop")} />
              </div>
              <div className="flex items-center gap-1 ml-auto">
                <Knob value={sessionComp?.bpm ?? 100} min={50} max={200} onChange={onBpm} label={t("stu.bpm")} format={(v) => String(Math.round(v))} />
                <Knob value={masterVolume} min={0} max={1.25} onChange={setMasterVolume} label={t("stu.master")} format={(v) => `${Math.round((v / 1.25) * 100)}%`} />
              </div>
            </div>
            {sessionComp && (
              <div className="flex gap-2 mt-4">
                <button onClick={() => { setWorkTitle(pieceTitle.trim() || sessionComp.title); setSaveOpen(true); }} className="btn-ghost rounded-lg px-3 py-2 text-[13px] font-semibold flex-1 flex items-center justify-center gap-2">
                  <Icon name="works" size={15} /> {t("stu.saveWork")}
                </button>
                <button onClick={() => setScoreOpen(true)} title={t("lib.score")} className="btn-ghost rounded-lg px-3 py-2 text-[13px] font-semibold flex items-center justify-center gap-2">
                  <Icon name="note" size={15} /> {t("stu.score")}
                </button>
              </div>
            )}
          </motion.section>

          {/* ajustes de la obra (post-generación) */}
          {sessionComp && (
            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }} className="panel p-5">
              <h2 className="font-display font-bold text-[16px] mb-1 flex items-center gap-2">
                <span className="text-clip-400"><Icon name="knob" size={18} /></span>
                {t("stu.adjustTitle")}
              </h2>
              <p className="text-ink-400 text-[11.5px] mb-4 leading-relaxed">{t("stu.adjustHint")}</p>

              {/* tonalidad */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="silk-label-xs">{t("stu.transpose")}</span>
                  <span className="font-mono text-[12px] text-tube-400 tabular">
                    {transpose > 0 ? `+${transpose}` : transpose} {t("stu.semitones")}
                  </span>
                </div>
                <HSlider value={transpose} min={-6} max={6} step={1}
                  onChange={(v) => rebuildPiece({ nextTranspose: v })} />
              </div>

              {/* instrumento líder */}
              <div className="mb-4">
                <div className="silk-label-xs mb-1.5">{t("stu.leadInstrument")}</div>
                <select
                  value={leadOverride}
                  onChange={(e) => rebuildPiece({ nextLead: e.target.value })}
                  className="w-full bg-ink-900 border border-ink-600 rounded-lg px-3 py-2 text-[13px] text-ink-100 cursor-pointer hover:border-ink-500 transition-colors focus-ring"
                >
                  <option value="auto">{t("stu.leadAuto")}</option>
                  {orch.instrumentIds.filter((id) => INSTRUMENT_MAP[id]?.roles.includes("melody")).map((id) => (
                    <option key={id} value={id}>{instrumentName(id, lang)}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => rebuildPiece({ newSeed: true })} className="btn-ghost rounded-lg px-3.5 py-2 text-[12.5px] font-semibold flex items-center gap-1.5 flex-1 justify-center">
                  <Icon name="dice" size={15} /> {t("stu.regenerate")}
                </button>
                <button onClick={() => { setTranspose(0); setLeadOverride("auto"); rebuildPiece({ nextTranspose: 0, nextLead: "auto" }); }}
                  className="btn-ghost rounded-lg px-3.5 py-2 text-[12.5px] font-semibold flex items-center gap-1.5">
                  <Icon name="x" size={13} /> {t("common.reset")}
                </button>
              </div>
            </motion.section>
          )}
        </div>

        {/* ================= COLUMNA DERECHA ================= */}
        <div className="flex flex-col gap-5 min-w-0">
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="panel p-4">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="silk-label">{t("stu.stageLive")} · {orch.name}</span>
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-ink-400">
                <Led on={snap.status === "playing"} color="red" pulse /> {snap.status === "playing" ? t("app.onAir") : t("app.standby")}
              </span>
            </div>
            <div className="panel-inset rounded-lg overflow-hidden">
              <StageView orch={orch} lang={lang} live={snap.status === "playing" && isSessionSource}
                onToggleMute={(id) => updateMix(id, { mute: !(mix[id]?.mute) })} />
            </div>
          </motion.section>

          {/* karaoke: letra sincronizada con la música */}
          {sessionComp?.lyricMap && sessionComp.lyricMap.length > 0 && (
            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="panel p-4">
              <div className="flex items-center justify-between mb-2 px-1">
                <h2 className="font-display font-bold text-[16px] flex items-center gap-2">
                  <span className="text-clip-400"><Icon name="mic" size={17} /></span>
                  {t("stu.karaoke")}
                </h2>
                <div className="flex items-center gap-2">
                  {sessionComp.singerId && (
                    <Chip color={INSTRUMENT_MAP[sessionComp.singerId]?.color ?? "#ff9ecb"}>
                      {t("stu.sings")}: {instrumentName(sessionComp.singerId, lang)}
                    </Chip>
                  )}
                  <Led on={snap.status === "playing" && isSessionSource} color="red" pulse />
                </div>
              </div>
              <div className="panel-inset rounded-lg p-3.5 max-h-[180px] overflow-y-auto">
                {sessionComp.lyricMap.map((l, i) => {
                  const active = isSessionSource && pos >= l.startBeat && pos < l.endBeat;
                  const past = isSessionSource && pos >= l.endBeat;
                  return (
                    <p key={i}
                      className={`text-[14px] leading-relaxed transition-all duration-200 ${
                        active ? "text-tube-400 font-semibold scale-[1.02]" : past ? "text-ink-500" : "text-ink-200"
                      }`}
                      style={active ? { textShadow: "0 0 14px rgba(255,176,58,0.4)" } : undefined}>
                      {l.line}
                    </p>
                  );
                })}
              </div>
            </motion.section>
          )}

          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="panel p-4">
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="font-display font-bold text-[16px] flex items-center gap-2">
                <span className="text-led-400"><Icon name="faders" size={18} /></span>
                {t("stu.mixer")}
              </h2>
              <span className="silk-label">{orch.instrumentIds.length} {t("orch.channels")}</span>
            </div>
            <MixerDesk orch={orch} mix={mix} updateMix={updateMix} active={snap.status !== "stopped"} lang={lang} />
            <p className="silk-label-xs mt-3 px-1 flex items-center gap-1.5 text-ink-400">
              <span className="text-tube-500"><Icon name="spark" size={11} /></span>
              <strong className="text-ink-300 normal-case tracking-normal font-semibold">{t("stu.tip")}:</strong>&nbsp;{t("stu.tipBody")}
            </p>
          </motion.section>
        </div>
      </div>

      {/* modal guardar obra */}
      <AnimatePresence>
        {saveOpen && (
          <motion.div className="fixed inset-0 z-[80] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-[3px]" onClick={() => setSaveOpen(false)} />
            <motion.div initial={{ scale: 0.94, y: 14 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }} className="panel relative w-full max-w-sm p-6">
              <h3 className="font-display font-bold text-lg">{t("stu.saveWork")}</h3>
              <p className="text-ink-400 text-xs mt-1">{orch.name} · {genreName(orch.genreId, lang)}</p>
              <input
                autoFocus type="text" value={workTitle} onChange={(e) => setWorkTitle(e.target.value)}
                placeholder={t("stu.workTitlePh")}
                onKeyDown={(e) => e.key === "Enter" && saveWork()}
                className="w-full bg-ink-900 border border-ink-600 rounded-lg px-3.5 py-2.5 mt-4 text-[15px] text-ink-100 focus:border-tube-500/60 transition-colors focus-ring"
              />
              <div className="flex justify-end gap-2 mt-5">
                <button className="btn-ghost rounded-lg px-4 py-2 text-sm font-semibold" onClick={() => setSaveOpen(false)}>{t("common.cancel")}</button>
                <button className="btn-primary rounded-lg px-5 py-2 text-sm" onClick={saveWork}>{t("common.save")}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* modal partitura (sesión actual) */}
      {scoreOpen && sessionComp && orch && (
        <ScoreModal
          track={{
            id: "session",
            title: pieceTitle.trim() || sessionComp.title,
            prompt: useSonic.getState().sessionPrompt || prompt,
            orchestraId: orch.id,
            orchestraName: orch.name,
            genreId: orch.genreId,
            seed: sessionComp.seed,
            bpm: sessionComp.bpm,
            meter: sessionComp.meter,
            bars: sessionComp.bars,
            createdAt: Date.now(),
            coverSeed: sessionComp.seed % 99991,
            mix,
            lyrics: sessionComp.lyrics,
            transpose: sessionComp.transpose,
            leadId: sessionComp.leadId,
          }}
          comp={sessionComp}
          onClose={() => setScoreOpen(false)}
          onDone={() => { setScoreOpen(false); toast(t("score.done")); }}
        />
      )}
    </div>
  );
}

/* ============================================================
   PANEL DE PARÁMETROS DEL ESTILO
   Muestra la técnica del estilo (groove, rango BPM, arreglo,
   espacio, producción) y permite ajustar BPM, energía, swing,
   espacio y brillo ANTES de generar.
   ============================================================ */

function StyleParamsPanel({ orch, params, setParams, lang }: {
  orch: Orchestra;
  params: GenParams | null;
  setParams: (p: GenParams | null) => void;
  lang: Lang;
}) {
  const t = useT();
  const [open, setOpen] = useState(true);
  const genres = fusedGenres(orch);
  const [bMin, bMax] = fusedBpmRange(orch);
  const g = genres[0];
  if (!params) return null;

  const upd = (patch: Partial<GenParams>) => setParams({ ...params, ...patch });

  const techRow = (label: string, value: string) => (
    <div className="flex items-baseline gap-2 py-1 border-b border-ink-700/60 last:border-0">
      <span className="silk-label-xs shrink-0 w-[74px]">{label}</span>
      <span className="text-[11.5px] text-ink-200 leading-snug">{value}</span>
    </div>
  );

  return (
    <div className="mt-4 rounded-xl border border-ink-600 bg-ink-850 overflow-hidden">
      <button onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3.5 py-2.5 text-left hover:bg-ink-800 transition-colors">
        <span className="text-tube-500"><Icon name="knob" size={15} /></span>
        <span className="font-display font-bold text-[13.5px] flex-1">{t("stu.params")}</span>
        <span className="font-mono text-[10px] text-tube-400 tabular">{params.bpm} BPM</span>
        <Icon name="arrow" size={13} className={`text-ink-400 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }} className="overflow-hidden">
            <div className="px-3.5 pb-3.5 pt-1">
              {/* ficha técnica del estilo */}
              <div className="panel-inset p-2.5 mb-3">
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  {genres.map((gg, i) => (
                    <span key={gg.id} className="flex items-center gap-1.5">
                      {i > 0 && <span className="text-led-400 text-[10px] font-mono">+</span>}
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border"
                        style={{ color: gg.palette[0], borderColor: `${gg.palette[0]}55`, background: `${gg.palette[0]}10` }}>
                        {lang === "es" ? gg.nameES : gg.nameEN}
                      </span>
                    </span>
                  ))}
                </div>
                {techRow(lang === "es" ? "Groove" : "Groove", lang === "es" ? g.grooveES : g.grooveEN)}
                {techRow("BPM", `${bMin} – ${bMax}`)}
                {techRow(lang === "es" ? "Arreglo" : "Arrangement", lang === "es" ? g.arrangementES : g.arrangementEN)}
                {techRow(lang === "es" ? "Espacio" : "Space", lang === "es" ? g.spaceES : g.spaceEN)}
                {techRow(lang === "es" ? "Producción" : "Production", lang === "es" ? g.productionES : g.productionEN)}
              </div>

              {/* controles ajustables */}
              <ParamSlider label={t("p.bpm")} value={params.bpm} min={bMin} max={bMax} format={(v) => `${v}`} onChange={(v) => upd({ bpm: v })} />
              <ParamSlider label={t("p.energy")} value={params.energy} min={0.2} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => upd({ energy: v })} />
              <ParamSlider label={t("p.swing")} value={params.swing} min={0} max={0.45} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => upd({ swing: v })} />
              <ParamSlider label={t("p.space")} value={params.space} min={0} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => upd({ space: v })} />
              <ParamSlider label={t("p.bright")} value={params.bright} min={0} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => upd({ bright: v })} accent="#45e0cd" />

              <div className="flex items-center justify-between mt-2">
                <p className="text-[10.5px] text-ink-500 leading-snug max-w-[240px]">{t("stu.paramsHint")}</p>
                <button onClick={() => setParams(defaultParams(orch))} className="btn-ghost rounded-lg px-3 py-1.5 text-[11px] font-semibold flex items-center gap-1.5">
                  <Icon name="dice" size={12} /> {t("stu.resetParams")}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ParamSlider({ label, value, min, max, step = 1, format, onChange, accent = "#ffb03a" }: {
  label: string; value: number; min: number; max: number; step?: number;
  format: (v: number) => string; onChange: (v: number) => void; accent?: string;
}) {
  return (
    <div className="mb-1.5">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[11px] font-semibold text-ink-300">{label}</span>
        <span className="font-mono text-[10.5px] tabular" style={{ color: accent }}>{format(value)}</span>
      </div>
      <HSlider value={value} min={min} max={max} step={step} onChange={onChange} accent={accent} />
    </div>
  );
}

/* ============================================================
   MESA DE MEZCLAS — un canal por instrumento
   ============================================================ */

function MixerDesk({ orch, mix, updateMix, active, lang }: {
  orch: Orchestra;
  mix: Record<string, ChannelState>;
  updateMix: (id: string, patch: Partial<ChannelState>) => void;
  active: boolean;
  lang: Lang;
}) {
  const t = useT();
  const [levels, setLevels] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!active) { setLevels({}); return; }
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const next: Record<string, number> = {};
      for (const id of orch.instrumentIds) next[id] = engine.getLevel(id);
      setLevels((prev) => {
        for (const k in next) if (Math.abs((prev[k] ?? 0) - next[k]) > 0.02) return next;
        return prev;
      });
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, orch.instrumentIds]);

  return (
    <div className="panel-inset p-3 overflow-x-auto">
      <div className="flex gap-2 min-w-max">
        {orch.instrumentIds.map((id, idx) => {
          const def = INSTRUMENT_MAP[id];
          const ch = mix[id] ?? { volume: 0.75, pan: 0, mute: false, solo: false };
          if (!def) return null;
          const lvl = levels[id] ?? 0;
          return (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
              className={`w-[86px] shrink-0 rounded-lg border px-2 pt-2 pb-3 flex flex-col items-center gap-1.5 transition-colors ${
                ch.mute ? "border-ink-700 bg-black/30" : "border-ink-600/70 bg-ink-800/70"
              }`}
            >
              <div className="flex items-center justify-between w-full px-0.5">
                <span className="strip-screw" />
                <Led on={lvl > 0.04} color={lvl > 0.8 ? "red" : "amber"} />
                <span className="strip-screw" />
              </div>
              <span
                className="w-2 h-2 rounded-full mt-0.5"
                style={{ background: def.color, boxShadow: lvl > 0.05 ? `0 0 ${4 + lvl * 10}px ${def.color}` : "none", opacity: ch.mute ? 0.35 : 1 }}
              />
              <span className={`text-[10.5px] font-semibold leading-tight text-center h-[26px] flex items-center ${ch.mute ? "text-ink-500 line-through" : "text-ink-200"}`}>
                {instrumentName(id, lang)}
              </span>

              <Knob value={ch.pan} min={-1} max={1} bipolar size={38} label={t("stu.pan")}
                format={(v) => (Math.abs(v) < 0.03 ? "C" : v < 0 ? `L${Math.round(-v * 100)}` : `R${Math.round(v * 100)}`)}
                onChange={(v) => updateMix(id, { pan: Math.abs(v) < 0.04 ? 0 : v })} />

              <Fader value={ch.volume} meter={lvl} color={def.color} height={140}
                onChange={(v) => updateMix(id, { volume: v })} />

              <span className="font-mono text-[9.5px] text-ink-400 tabular">{toDb(ch.volume)} dB</span>

              <div className="flex gap-1.5">
                <MSButton kind="mute" active={ch.mute} title="Mute" onClick={() => updateMix(id, { mute: !ch.mute })} />
                <MSButton kind="solo" active={ch.solo} title="Solo" onClick={() => updateMix(id, { solo: !ch.solo })} />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

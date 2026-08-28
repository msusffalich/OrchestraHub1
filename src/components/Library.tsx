import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { Track, Lang } from "../lib/core";
import { GENRE_MAP, genreName } from "../lib/genres";
import { analyzePrompt } from "../lib/composer";
import { engine, renderCompositionToWav, downloadBlob } from "../lib/engine";
import { useSonic, useT, recomposeTrack } from "../lib/store";
import { CoverArt, SectionHeader, EmptyState, ConfirmModal, Chip } from "./visuals";
import { Icon } from "./icons";

const fmtDur = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
const sanitize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function LibrarySection() {
  const lang = useSonic((s) => s.lang);
  const tracks = useSonic((s) => s.tracks);
  const orchestras = useSonic((s) => s.orchestras);
  const deleteTrack = useSonic((s) => s.deleteTrack);
  const setSection = useSonic((s) => s.setSection);
  const setStudioOrchestra = useSonic((s) => s.setStudioOrchestra);
  const setSession = useSonic((s) => s.setSession);
  const setConcertTrack = useSonic((s) => s.setConcertTrack);
  const toast = useSonic((s) => s.toast);
  const t = useT();

  const [toDelete, setToDelete] = useState<Track | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);

  const exportWav = async (tr: Track) => {
    setExportingId(tr.id);
    try {
      const comp = recomposeTrack(tr, orchestras.find((o) => o.id === tr.orchestraId), lang);
      const blob = await renderCompositionToWav(comp, tr.mix);
      downloadBlob(blob, `${sanitize(tr.title)}.wav`);
      toast(t("lib.exportToast"));
    } finally {
      setExportingId(null);
    }
  };

  const playInConcert = (tr: Track) => {
    const comp = recomposeTrack(tr, orchestras.find((o) => o.id === tr.orchestraId), lang);
    engine.init();
    engine.play(comp, tr.mix, tr.id, "track");
    setConcertTrack(tr.id);
    setSection("concert");
  };

  const openMix = (tr: Track) => {
    const orch = orchestras.find((o) => o.id === tr.orchestraId);
    if (!orch) return;
    const comp = recomposeTrack(tr, orch, lang);
    setStudioOrchestra(orch.id);
    setSession(comp, tr.prompt);
    setSection("studio");
  };

  return (
    <div>
      <SectionHeader kicker="03 · Works Library" title={t("lib.title")} subtitle={t("lib.subtitle")}
        right={<Chip color="#b58cff">{tracks.length} {lang === "es" ? "obras" : "works"}</Chip>} />

      {tracks.length === 0 ? (
        <EmptyState icon="works" title={t("lib.empty")} hint={t("lib.emptyHint")}
          action={
            <button onClick={() => setSection("studio")} className="btn-primary rounded-xl px-5 py-2.5 text-sm flex items-center gap-2">
              <Icon name="arrow" size={15} /> {t("lib.goCreate")}
            </button>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
          {tracks.map((tr, i) => (
            <TrackCard
              key={tr.id} tr={tr} index={i} lang={lang}
              hasOrchestra={orchestras.some((o) => o.id === tr.orchestraId)}
              exporting={exportingId === tr.id}
              onExport={() => void exportWav(tr)}
              onConcert={() => playInConcert(tr)}
              onMix={() => openMix(tr)}
              onDelete={() => setToDelete(tr)}
            />
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!toDelete}
        title={t("confirm.title")}
        body={t("confirm.bodyTrack", { name: toDelete?.title ?? "" })}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        onConfirm={() => { if (toDelete) { deleteTrack(toDelete.id); toast(t("lib.deletedToast")); } setToDelete(null); }}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

function TrackCard({ tr, index, lang, hasOrchestra, exporting, onExport, onConcert, onMix, onDelete }: {
  tr: Track; index: number; lang: Lang; hasOrchestra: boolean; exporting: boolean;
  onExport: () => void; onConcert: () => void; onMix: () => void; onDelete: () => void;
}) {
  const t = useT();
  const genre = GENRE_MAP[tr.genreId];
  const moodKey = useMemo(() => {
    try {
      return analyzePrompt(tr.prompt, {
        id: tr.orchestraId, name: tr.orchestraName, genreId: tr.genreId,
        fusions: tr.fusions ?? [],
        instrumentIds: Object.keys(tr.mix), stage: {}, channels: tr.mix, createdAt: tr.createdAt,
      }).moodKey;
    } catch { return "calm"; }
  }, [tr]);

  const durSec = (tr.bars * tr.meter / tr.bpm) * 60;
  const date = new Date(tr.createdAt).toLocaleDateString(lang === "es" ? "es-ES" : "en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <motion.article
      initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.4), duration: 0.4, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      className="panel overflow-hidden group"
    >
      <div className="relative overflow-hidden">
        <CoverArt seed={tr.coverSeed} palette={genre?.palette ?? ["#ffb03a", "#b58cff", "#2dd4bf"]} moodKey={moodKey} size={320} className="w-full h-auto block" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-transparent to-transparent" />
        <div className="absolute top-2.5 left-2.5 flex gap-1.5 flex-wrap max-w-[75%]">
          <Chip color={genre?.palette[0] ?? "#ffb03a"}>{genreName(tr.genreId, lang)}</Chip>
          {(tr.fusions ?? []).map((f) => <Chip key={f} color={GENRE_MAP[f]?.palette[1] ?? "#45e0cd"}>+ {genreName(f, lang)}</Chip>)}
        </div>
        <button
          onClick={onConcert}
          title={t("lib.playConcert")}
          className="absolute bottom-3 right-3 w-11 h-11 rounded-full btn-primary flex items-center justify-center opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all active:scale-95 shadow-xl"
        >
          <Icon name="play" size={18} />
        </button>
        <span className="absolute bottom-3 left-3 font-mono text-[11px] text-ink-200 bg-black/55 rounded-md px-2 py-0.5 tabular backdrop-blur-sm">
          {fmtDur(durSec)} · {tr.bpm} BPM · {tr.meter}/4
        </span>
      </div>

      <div className="p-4">
        <h3 className="font-display font-bold text-[17px] leading-snug">{tr.title}</h3>
        <p className="text-ink-400 text-xs mt-0.5">{t("lib.by")} <span className="text-ink-200 font-semibold">{tr.orchestraName}</span> · {date}</p>
        <p className="text-ink-400 text-[11.5px] italic mt-2 line-clamp-2 leading-relaxed border-l-2 border-ink-600 pl-2.5">“{tr.prompt}”</p>

        <div className="flex items-center gap-1.5 mt-3.5">
          <button onClick={onMix} disabled={!hasOrchestra} title={hasOrchestra ? t("lib.openMix") : "—"}
            className="btn-ghost rounded-lg p-2 disabled:opacity-30 disabled:pointer-events-none"><Icon name="faders" size={15} /></button>
          <button onClick={onExport} disabled={exporting} title={t("common.download")}
            className="btn-ghost rounded-lg p-2 flex items-center justify-center min-w-[34px]">
            {exporting
              ? <span className="w-3.5 h-3.5 rounded-full border-2 border-ink-300 border-t-transparent" style={{ animation: "spinSlow 0.7s linear infinite" }} />
              : <Icon name="download" size={15} />}
          </button>
          <span className="text-[10px] font-mono text-ink-500 ml-0.5">{exporting ? t("lib.rendering") : "WAV 44.1k"}</span>
          <button onClick={onDelete} title={t("common.delete")}
            className="btn-ghost rounded-lg p-2 ml-auto hover:!border-clip-500/60 hover:!text-clip-500"><Icon name="trash" size={15} /></button>
        </div>
      </div>
    </motion.article>
  );
}

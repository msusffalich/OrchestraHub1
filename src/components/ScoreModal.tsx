import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { Composition, Track, Lang } from "../lib/core";
import { genreName } from "../lib/genres";
import { buildScorePdf } from "../lib/score";
import { downloadBlob } from "../lib/engine";
import { useSonic, useT } from "../lib/store";
import { Icon } from "./icons";

/* ============================================================
   MODAL DE PARTITURA: elige opciones y descarga la obra en PDF
   (pentagrama + letra bajo las notas cuando la obra la tiene).
   ============================================================ */

const sanitize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function ScoreModal({ track, comp, onClose, onDone }: {
  track: Track;
  comp: Composition;
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useT();
  const lang: Lang = useSonic((s) => s.lang);
  const hasLyrics = !!track.lyrics && track.lyrics.trim().length > 0;

  const [title, setTitle] = useState(track.title);
  const [withLyrics, setWithLyrics] = useState(hasLyrics);
  const [building, setBuilding] = useState(false);

  const subtitle = useMemo(
    () => `${track.orchestraName} · ${genreName(track.genreId, lang)} · ${track.bpm} BPM · ${track.meter}/4`,
    [track, lang],
  );

  const generate = () => {
    setBuilding(true);
    // pequeño margen para pintar el estado "generando"
    window.setTimeout(() => {
      try {
        const blob = buildScorePdf(comp, {
          title: title.trim() || track.title,
          subtitle,
          showLyrics: withLyrics && hasLyrics,
          lang,
        });
        downloadBlob(blob, `${sanitize(title.trim() || track.title)}-partitura.pdf`);
        onDone();
      } finally {
        setBuilding(false);
      }
    }, 60);
  };

  return (
    <motion.div className="fixed inset-0 z-[80] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[3px]" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.94, y: 14 }} animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        className="panel relative w-full max-w-md p-6"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-display font-bold text-lg flex items-center gap-2">
              <span className="text-tube-500"><Icon name="note" size={19} /></span>
              {t("score.title")}
            </h3>
            <p className="text-ink-400 text-xs mt-1">{t("score.subtitleHint")}</p>
          </div>
          <button onClick={onClose} className="btn-ghost rounded-lg p-1.5" title={t("common.cancel")}>
            <Icon name="x" size={15} />
          </button>
        </div>

        <label className="block mt-4">
          <span className="silk-label-xs mb-1.5 block">{t("score.workTitle")}</span>
          <input
            type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-ink-900 border border-ink-600 rounded-lg px-3.5 py-2.5 text-[14px] text-ink-100 focus:border-tube-500/70 transition-colors focus-ring"
          />
        </label>

        {hasLyrics ? (
          <button
            onClick={() => setWithLyrics((v) => !v)}
            className="mt-4 w-full flex items-center justify-between rounded-lg border border-ink-600 bg-ink-800/60 px-3.5 py-2.5 hover:border-ink-500 transition-colors"
          >
            <span className="text-[13px] font-semibold text-ink-200 flex items-center gap-2">
              <Icon name="mic" size={15} /> {t("score.includeLyrics")}
            </span>
            <span className={`led ${withLyrics ? "led-on" : ""}`} />
          </button>
        ) : (
          <p className="mt-4 text-[12px] text-ink-400 leading-relaxed">{t("score.noLyrics")}</p>
        )}

        <p className="mt-3 text-[11.5px] text-ink-500 leading-relaxed">{t("score.hint")}</p>

        <div className="flex justify-end gap-2 mt-6">
          <button className="btn-ghost rounded-lg px-4 py-2 text-sm font-semibold" onClick={onClose}>{t("common.cancel")}</button>
          <button className="btn-primary rounded-lg px-5 py-2 text-sm flex items-center gap-2" onClick={generate} disabled={building}>
            {building
              ? <span className="w-3.5 h-3.5 rounded-full border-2 border-[#241300] border-t-transparent" style={{ animation: "spinSlow 0.7s linear infinite" }} />
              : <Icon name="download" size={15} />}
            {building ? t("score.building") : t("score.download")}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

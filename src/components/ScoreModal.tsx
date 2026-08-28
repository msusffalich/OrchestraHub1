import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { Composition, Track, Lang } from "../lib/core";
import { genreName } from "../lib/genres";
import { buildScorePdf } from "../lib/score";
import { downloadBlob } from "../lib/engine";
import { useSonic, useT } from "../lib/store";
import { Icon } from "./icons";

/* ============================================================
   MODAL DE PARTITURA: elige opciones, genera el PDF, lo muestra
   en una vista previa embebida y permite descargarlo.
   (La vista previa garantiza que el PDF se vea aunque el
   navegador bloquee la descarga directa en vistas embebidas.)
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
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState<string>("");
  const blobUrlRef = useRef<string | null>(null);

  const subtitle = useMemo(
    () => `${track.orchestraName} · ${genreName(track.genreId, lang)} · ${track.bpm} BPM · ${track.meter}/4`,
    [track, lang],
  );

  /* libera la URL del blob al cerrar */
  useEffect(() => () => { if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current); }, []);

  const generate = () => {
    setBuilding(true);
    window.setTimeout(() => {
      try {
        const blob = buildScorePdf(comp, {
          title: title.trim() || track.title,
          subtitle,
          showLyrics: withLyrics && hasLyrics,
          lang,
        });
        const name = `${sanitize(title.trim() || track.title) || "partitura"}.pdf`;
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = URL.createObjectURL(blob);
        setPdfUrl(blobUrlRef.current);
        setPdfName(name);
        /* intento de descarga directa (funciona en pestaña normal) */
        downloadBlob(blob, name);
        useSonic.getState().toast(t("score.done"));
        onDone();
      } catch {
        useSonic.getState().toast(t("score.error"));
      } finally {
        setBuilding(false);
      }
    }, 60);
  };

  const previewing = !!pdfUrl;

  return (
    <motion.div className="fixed inset-0 z-[80] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[3px]" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.94, y: 14 }} animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        className={`panel relative w-full p-6 transition-[max-width] duration-200 ${previewing ? "max-w-3xl" : "max-w-md"}`}
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

        {/* opciones (se ocultan cuando ya hay vista previa) */}
        {!previewing && (
          <>
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
                  : <Icon name="note" size={15} />}
                {building ? t("score.building") : t("score.download")}
              </button>
            </div>
          </>
        )}

        {/* vista previa del PDF generado */}
        {previewing && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mt-4 rounded-xl overflow-hidden border border-ink-600 bg-white shadow-[inset_0_2px_14px_rgba(0,0,0,0.35)]">
              <iframe
                src={pdfUrl}
                title="Partitura PDF"
                className="w-full block"
                style={{ height: "min(58vh, 560px)" }}
              />
            </div>
            <p className="mt-2.5 text-[11.5px] text-ink-400 leading-relaxed">{t("score.previewNote")}</p>
            <div className="flex justify-end gap-2 mt-4">
              <button className="btn-ghost rounded-lg px-4 py-2 text-sm font-semibold" onClick={onClose}>{t("common.close")}</button>
              <a
                href={pdfUrl}
                download={pdfName}
                className="btn-primary rounded-lg px-5 py-2 text-sm flex items-center gap-2 no-underline"
              >
                <Icon name="download" size={15} /> {t("common.download")} PDF
              </a>
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

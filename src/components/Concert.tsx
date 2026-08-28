import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Track, LyricLine } from "../lib/core";
import { GENRE_MAP, genreName } from "../lib/genres";
import { engine, type EngineSnapshot } from "../lib/engine";
import { useSonic, useT, recomposeTrack } from "../lib/store";
import { CoverArt, SectionHeader, EmptyState, Chip } from "./visuals";
import { Icon } from "./icons";
import { Led, TransportButton } from "./controls";

const fmtDur = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

export function ConcertSection() {
  const lang = useSonic((s) => s.lang);
  const tracks = useSonic((s) => s.tracks);
  const orchestras = useSonic((s) => s.orchestras);
  const concertTrackId = useSonic((s) => s.concertTrackId);
  const setConcertTrack = useSonic((s) => s.setConcertTrack);
  const setSection = useSonic((s) => s.setSection);
  const t = useT();

  const track = useMemo(() => tracks.find((x) => x.id === concertTrackId) ?? tracks[0] ?? null, [tracks, concertTrackId]);

  const [snap, setSnap] = useState<EngineSnapshot>(() => engine.snapshot());
  const [bravo, setBravo] = useState(false);
  const [karaoke, setKaraoke] = useState<LyricLine[] | null>(null);
  const wasTrackPlaying = useRef(false);

  useEffect(() => engine.subscribe(setSnap), []);
  useEffect(() => {
    if (snap.status === "stopped") return;
    const iv = window.setInterval(() => setSnap(engine.snapshot()), 100);
    return () => window.clearInterval(iv);
  }, [snap.status]);

  /* ¡Bravo! cuando la obra interpretada llega a su fin */
  useEffect(() => {
    if (snap.status === "playing" && snap.sourceKind === "track") wasTrackPlaying.current = true;
    if (snap.status === "stopped" && wasTrackPlaying.current) {
      wasTrackPlaying.current = false;
      setBravo(true);
      const to = window.setTimeout(() => setBravo(false), 2600);
      return () => window.clearTimeout(to);
    }
  }, [snap.status, snap.sourceKind]);

  const isThis = snap.sourceKind === "track" && !!track && snap.sourceId === track.id;
  const playing = isThis && snap.status === "playing";

  const playTrack = (tr: Track) => {
    engine.init();
    const orch = orchestras.find((o) => o.id === tr.orchestraId);
    const comp = recomposeTrack(tr, orch, lang);
    engine.play(comp, tr.mix, tr.id, "track");
    setConcertTrack(tr.id);
    setKaraoke(comp.lyricMap && comp.lyricMap.length ? comp.lyricMap : null);
  };

  const toggle = () => {
    if (!track) return;
    if (playing) engine.pause();
    else if (isThis && snap.status === "paused") engine.resume();
    else playTrack(track);
  };

  const genre = track ? GENRE_MAP[track.genreId] : null;
  const pos = isThis ? Math.min(snap.positionBeats, snap.totalBeats) : 0;
  const durSec = track ? (track.bars * track.meter / track.bpm) * 60 : 0;
  const posSec = track && durSec ? (pos / (track.bars * track.meter)) * durSec : 0;
  const audience = track ? 900 + (track.coverSeed % 700) : 0;

  return (
    <div>
      <SectionHeader kicker="04 · Concert Hall" title={t("con.title")} subtitle={t("con.subtitle")} />

      {tracks.length === 0 ? (
        <EmptyState icon="concert" title={t("con.empty")} hint={t("con.emptyHint")}
          action={
            <button onClick={() => setSection("studio")} className="btn-primary rounded-xl px-5 py-2.5 text-sm flex items-center gap-2">
              <Icon name="arrow" size={15} /> {t("lib.goCreate")}
            </button>
          }
        />
      ) : (
        <div className="grid lg:grid-cols-[320px_1fr] gap-5 items-start">
          {/* programa */}
          <aside className="panel p-4">
            <h2 className="silk-label mb-3 flex items-center gap-2"><span className="inline-block w-4 h-px bg-ink-500" />{t("con.program")}</h2>
            <div className="flex flex-col gap-2 max-h-[520px] overflow-y-auto pr-1">
              {tracks.map((tr, i) => {
                const active = track?.id === tr.id;
                const g = GENRE_MAP[tr.genreId];
                return (
                  <motion.button
                    key={tr.id}
                    initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    onClick={() => playTrack(tr)}
                    className={`text-left rounded-lg border p-2.5 flex items-center gap-3 transition-all active:scale-[0.98] ${
                      active ? "border-tube-500/60 bg-tube-500/10" : "btn-ghost"
                    }`}
                  >
                    <div className="w-11 h-11 rounded-md overflow-hidden shrink-0 border border-ink-600">
                      <CoverArt seed={tr.coverSeed} palette={g?.palette ?? ["#ffb03a", "#b58cff", "#2dd4bf"]} moodKey="calm" size={88} className="w-full h-full" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[13.5px] leading-tight truncate">{tr.title}</p>
                      <p className="text-ink-400 text-[11px] truncate">{tr.orchestraName}</p>
                    </div>
                    {active && playing
                      ? <span className="flex items-end gap-[2px] h-4 shrink-0">{[0, 1, 2].map((k) => <span key={k} className="w-[3px] bg-tube-500 rounded-full eq-bar-idle" style={{ height: "100%", animationDelay: `${k * 0.18}s` }} />)}</span>
                      : <span className="text-ink-400 shrink-0"><Icon name="play" size={14} /></span>}
                  </motion.button>
                );
              })}
            </div>
          </aside>

          {/* sala */}
          <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="panel overflow-hidden">
            <div className="relative">
              <HallVisualizer playing={playing} palette={genre?.palette ?? ["#ffb03a", "#b58cff", "#2dd4bf"]} />
              <div className="absolute top-4 left-5 right-5 flex items-start justify-between pointer-events-none gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Led on={playing} color="red" pulse />
                    <span className="font-mono text-[10px] tracking-[0.2em] text-clip-500 font-bold">{playing ? t("con.live") : t("app.standby")}</span>
                  </div>
                  {track && (
                    <>
                      <h2 className="font-display font-bold text-2xl md:text-3xl text-glow-amber leading-tight">{track.title}</h2>
                      <p className="text-ink-300 text-sm mt-1">{t("con.onStage")}: <span className="text-ink-100 font-semibold">{track.orchestraName}</span> · {genreName(track.genreId, lang)}</p>
                    </>
                  )}
                </div>
                {track && <Chip color={genre?.palette[1] ?? "#b58cff"}>{audience} {t("con.audience")}</Chip>}
              </div>

              <AnimatePresence>
                {bravo && (
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.15 }}
                    transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  >
                    <span className="font-display font-extrabold text-6xl md:text-7xl text-tube-400 text-glow-amber italic">{t("con.bis")}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* letra sincronizada sobre el escenario */}
              {karaoke && playing && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[min(92%,620px)] pointer-events-none">
                  <div className="rounded-xl bg-black/60 backdrop-blur-md border border-white/10 px-5 py-3 text-center">
                    {(() => {
                      const active = karaoke.find((l) => pos >= l.startBeat && pos < l.endBeat);
                      return (
                        <p key={active?.line ?? "idle"} className="font-display font-semibold text-lg md:text-xl text-tube-300 leading-snug"
                          style={{ textShadow: "0 0 18px rgba(255,176,58,0.5)" }}>
                          {active?.line ?? "· · ·"}
                        </p>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 md:p-5 border-t border-ink-700 flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <TransportButton icon={<Icon name={playing ? "pause" : "play"} size={17} />} onClick={toggle} accent title={playing ? t("common.pause") : t("con.play")} disabled={!track} />
                <TransportButton icon={<Icon name="stop" size={14} />} onClick={() => engine.stop()} disabled={snap.status === "stopped" || !isThis} title={t("common.stop")} />
              </div>
              <div className="flex-1 min-w-[180px]">
                <div className="h-1.5 rounded-full bg-ink-900 border border-black/50 overflow-hidden">
                  <div className="h-full rounded-full transition-[width] duration-150"
                    style={{ width: `${track && isThis && snap.totalBeats ? (pos / snap.totalBeats) * 100 : 0}%`, background: "linear-gradient(90deg,#ffb03a,#b58cff)" }} />
                </div>
                <div className="flex justify-between font-mono text-[10px] text-ink-400 tabular mt-1.5">
                  <span>{fmtDur(posSec)}</span>
                  <span className="text-ink-500">{track ? `${track.bpm} BPM · ${track.meter}/4 · ${track.bars} ${t("stu.bars")}` : ""}</span>
                  <span>{fmtDur(durSec)}</span>
                </div>
              </div>
            </div>
          </motion.section>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   VISUALIZADOR DE ESPECTRO — canvas en tiempo real
   ============================================================ */

function HallVisualizer({ playing, palette }: { playing: boolean; palette: [string, string, string] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const playingRef = useRef(playing);
  const palRef = useRef(palette);
  playingRef.current = playing;
  palRef.current = palette;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const data = new Uint8Array(1024);
    const heads = Array.from({ length: 60 }, (_, i) => ({
      x: (i % 30) / 30, row: Math.floor(i / 30), r: 0.55 + ((i * 37) % 10) / 22, ph: (i * 1.7) % 6.28,
    }));

    const hexToRgb = (h: string) => {
      const n = parseInt(h.slice(1), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const t = now / 1000;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const pal = palRef.current;
      const [c1, c2, c3] = pal.map(hexToRgb);

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0b0a0f");
      bg.addColorStop(0.65, "#131020");
      bg.addColorStop(1, "#0e0c11");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const analyser = engine.getAnalyser();
      let bass = 0, mid = 0, treb = 0;
      if (analyser && playingRef.current) {
        analyser.getByteFrequencyData(data);
        const avg = (a: number, b: number) => { let s = 0; for (let i = a; i < b; i++) s += data[i]; return s / ((b - a) * 255); };
        bass = avg(1, 10); mid = avg(10, 90); treb = avg(90, 400);
      } else {
        bass = (Math.sin(t * 1.1) + 1) * 0.03;
        mid = (Math.sin(t * 0.8 + 2) + 1) * 0.025;
      }

      const glow = ctx.createRadialGradient(w / 2, h * 0.42, 0, w / 2, h * 0.42, w * 0.55);
      glow.addColorStop(0, `rgba(${c1[0]},${c1[1]},${c1[2]},${0.10 + bass * 0.22})`);
      glow.addColorStop(0.6, `rgba(${c2[0]},${c2[1]},${c2[2]},${0.04 + mid * 0.1})`);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      const beams = 5;
      for (let i = 0; i < beams; i++) {
        const ang = Math.sin(t * (0.35 + i * 0.07) + i * 1.3) * 0.55;
        const x0 = w / 2 + (i - (beams - 1) / 2) * w * 0.07;
        const col = [c1, c2, c3][i % 3];
        const alpha = 0.05 + mid * 0.3 + (playingRef.current ? 0 : 0.015);
        ctx.save();
        ctx.translate(x0, -10);
        ctx.rotate(ang);
        const lg = ctx.createLinearGradient(0, 0, 0, h * 1.1);
        lg.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${alpha})`);
        lg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.moveTo(-6, 0); ctx.lineTo(6, 0);
        ctx.lineTo(w * 0.09, h * 1.1); ctx.lineTo(-w * 0.09, h * 1.1);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      const cy = h * 0.44;
      ctx.beginPath();
      ctx.arc(w / 2, cy, 34 + bass * 74, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${c2[0]},${c2[1]},${c2[2]},${0.25 + bass * 0.6})`;
      ctx.lineWidth = 1.6 + bass * 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(w / 2, cy, 20 + bass * 40, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${c1[0]},${c1[1]},${c1[2]},${0.12 + bass * 0.3})`;
      ctx.fill();

      const N = 72;
      const baseY = h * 0.72;
      const bw = (w * 0.86) / N;
      const x0 = w * 0.07;
      const bins = analyser ? analyser.frequencyBinCount : 1024;
      for (let i = 0; i < N; i++) {
        let v: number;
        if (analyser && playingRef.current) {
          const idx = Math.min(bins - 1, Math.floor(Math.pow(i / N, 1.55) * bins * 0.62));
          v = data[idx] / 255;
        } else {
          v = (Math.sin(t * 1.3 + i * 0.33) + 1) * 0.035 + 0.012;
        }
        const bh = Math.max(2, v * h * 0.4);
        const mixA = i / N;
        const col = mixA < 0.5
          ? c1.map((a, k) => Math.round(a + (c2[k] - a) * mixA * 2))
          : c2.map((a, k) => Math.round(a + (c3[k] - a) * (mixA - 0.5) * 2));
        const x = x0 + i * bw;
        ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${0.55 + v * 0.45})`;
        ctx.beginPath();
        ctx.roundRect(x, baseY - bh, bw * 0.62, bh, [3, 3, 0, 0]);
        ctx.fill();
        ctx.fillStyle = `rgba(255,255,255,${0.25 + v * 0.5})`;
        ctx.fillRect(x, baseY - bh, bw * 0.62, 1.6);
        ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},0.10)`;
        ctx.fillRect(x, baseY + 2, bw * 0.62, bh * 0.3);
      }

      ctx.fillStyle = "rgba(255,176,58,0.28)";
      ctx.fillRect(w * 0.05, baseY + 1, w * 0.9, 1.4);

      heads.forEach((hd, i) => {
        const rowY = h - 26 - hd.row * 24;
        const bob = Math.sin(t * (playingRef.current ? 3.2 : 1.1) + hd.ph) * (1.5 + bass * 9);
        const x = hd.x * w * 0.96 + w * 0.02;
        const r = 7 * hd.r + hd.row * 1.5;
        ctx.beginPath();
        ctx.arc(x, rowY + bob, r, Math.PI, 0);
        ctx.fillStyle = hd.row === 0 ? "#191622" : "#14121a";
        ctx.fill();
        if (playingRef.current && bass > 0.42 && (i % 4 === 0)) {
          ctx.beginPath();
          ctx.arc(x, rowY + bob - r - 4, 1.6, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${c1[0]},${c1[1]},${c1[2]},0.8)`;
          ctx.fill();
        }
      });

      if (treb > 0.1) {
        for (let i = 0; i < 10; i++) {
          const px = ((t * 30 * (i + 1)) % w);
          const py = (Math.sin(t * (0.8 + i * 0.13) + i) + 1) * 0.5 * h * 0.55 + h * 0.08;
          ctx.fillStyle = `rgba(255,255,255,${treb * 0.25})`;
          ctx.fillRect(px, py, 1.6, 1.6);
        }
      }
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={ref} className="w-full block" style={{ height: "min(52vh, 460px)" }} />;
}

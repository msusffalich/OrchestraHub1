import { AnimatePresence, motion } from "framer-motion";
import { useSonic, useT, type Section } from "./lib/store";
import { Icon } from "./components/icons";
import { Led, TransportButton } from "./components/controls";
import { ToastHost } from "./components/visuals";
import { OrchestrasSection } from "./components/Orchestras";
import { StudioSection } from "./components/Studio";
import { LibrarySection } from "./components/Library";
import { ConcertSection } from "./components/Concert";
import { ManualSection, MANUAL_VERSION } from "./components/Manual";
import { engine } from "./lib/engine";
import { useEffect, useState } from "react";

const NAV: { id: Section; icon: string; num: string }[] = [
  { id: "orchestras", icon: "orchestra", num: "01" },
  { id: "studio", icon: "studio", num: "02" },
  { id: "works", icon: "works", num: "03" },
  { id: "concert", icon: "concert", num: "04" },
  { id: "manual", icon: "book", num: "05" },
];

export default function App() {
  const section = useSonic((s) => s.section);
  const setSection = useSonic((s) => s.setSection);
  const lang = useSonic((s) => s.lang);
  const setLang = useSonic((s) => s.setLang);
  const t = useT();
  const [playing, setPlaying] = useState(false);

  useEffect(() => engine.subscribe((s) => setPlaying(s.status === "playing")), []);

  const label = (id: Section) =>
    id === "orchestras" ? t("nav.orchestras")
      : id === "studio" ? t("nav.studio")
        : id === "works" ? t("nav.works")
          : id === "concert" ? t("nav.concert")
            : t("nav.manual");

  return (
    <div className="min-h-screen text-ink-100">
      <div className="ambient-bg" />

      {/* ---------- barra lateral (escritorio) ---------- */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-[218px] flex-col border-r border-ink-700/70 bg-ink-900/85 backdrop-blur-md z-40 px-4 py-5">
        <button onClick={() => setSection("orchestras")} className="flex items-center gap-3 px-2 mb-8 text-left group">
          <span className="w-10 h-10 rounded-xl bg-ink-800 border border-tube-500/50 flex items-center justify-center text-tube-500 shadow-[0_0_20px_-4px_rgba(255,176,58,0.5)] group-hover:scale-105 transition-transform">
            <Icon name="logo" size={22} strokeWidth={2.2} />
          </span>
          <span>
            <span className="font-display font-extrabold text-[15px] leading-tight block">{t("app.name")}</span>
            <span className="silk-label-xs block mt-0.5">{t("app.tag")}</span>
          </span>
        </button>

        <nav className="flex flex-col gap-1">
          {NAV.map((n) => {
            const active = section === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setSection(n.id)}
                className={`relative flex items-center gap-3 rounded-xl px-3.5 py-3 text-left text-[14px] font-semibold transition-colors duration-150 ${
                  active ? "text-tube-400" : "text-ink-300 hover:text-ink-100 hover:bg-ink-800/70"
                }`}
              >
                {active && (
                  <motion.span layoutId="navPill" className="absolute inset-0 rounded-xl bg-ink-800 border border-ink-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }} />
                )}
                <span className="font-mono text-[10px] text-ink-500 relative">{n.num}</span>
                <span className="relative"><Icon name={n.icon} size={19} /></span>
                <span className="relative flex-1">{label(n.id)}</span>
                {n.id === "concert" && playing && <Led on color="red" pulse className="relative" />}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3">
          <div className="panel-inset px-3 py-2.5 flex items-center gap-2">
            <Led on={playing} color={playing ? "red" : "teal"} pulse={playing} />
            <span className="font-mono text-[10px] tracking-[0.14em] text-ink-300">{playing ? t("app.onAir") : t("app.standby")}</span>
            <span className="ml-auto font-mono text-[9px] text-ink-500">v{MANUAL_VERSION}</span>
          </div>
          <button
            onClick={() => setLang(lang === "es" ? "en" : "es")}
            className="btn-ghost w-full rounded-xl px-3 py-2.5 text-[13px] flex items-center justify-center gap-2"
          >
            <Icon name="globe" size={15} />
            {lang === "es" ? "English" : "Español"}
          </button>
        </div>
      </aside>

      {/* ---------- cabecera (móvil) ---------- */}
      <header className="md:hidden sticky top-0 z-40 bg-ink-900/90 backdrop-blur-md border-b border-ink-700/70 px-4 py-3 flex items-center gap-3">
        <span className="w-8 h-8 rounded-lg bg-ink-800 border border-tube-500/50 flex items-center justify-center text-tube-500">
          <Icon name="logo" size={18} strokeWidth={2.2} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-display font-extrabold text-[14px] leading-tight truncate">{t("app.name")}</p>
          <p className="font-mono text-[9px] text-ink-500 tracking-wider">{t("app.tag")}</p>
        </div>
        <Led on={playing} color={playing ? "red" : "teal"} pulse={playing} />
        <button onClick={() => setLang(lang === "es" ? "en" : "es")} className="btn-ghost rounded-lg px-2.5 py-1.5 text-[12px] flex items-center gap-1.5">
          <Icon name="globe" size={13} /> {lang === "es" ? "EN" : "ES"}
        </button>
      </header>

      {/* ---------- contenido ---------- */}
      <main className="md:pl-[218px] px-4 md:px-8 pt-6 md:pt-8 pb-28 md:pb-12 max-w-[1440px] mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={section}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
          >
            {section === "orchestras" && <OrchestrasSection />}
            {section === "studio" && <StudioSection />}
            {section === "works" && <LibrarySection />}
            {section === "concert" && <ConcertSection />}
            {section === "manual" && <ManualSection />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ---------- navegación inferior (móvil) ---------- */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-ink-900/95 backdrop-blur-md border-t border-ink-700/70 flex px-1 pb-[env(safe-area-inset-bottom)]">
        {NAV.map((n) => {
          const active = section === n.id;
          return (
            <button key={n.id} onClick={() => setSection(n.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[9px] font-mono tracking-wide transition-colors ${
                active ? "text-tube-400" : "text-ink-400"
              }`}>
              <span className={`transition-transform ${active ? "scale-110" : ""}`}><Icon name={n.icon} size={19} /></span>
              {label(n.id)}
              <span className={`h-0.5 w-6 rounded-full transition-all ${active ? "bg-tube-500 shadow-[0_0_6px_rgba(255,176,58,0.8)]" : "bg-transparent"}`} />
            </button>
          );
        })}
      </nav>

      <ToastHost />
    </div>
  );
}

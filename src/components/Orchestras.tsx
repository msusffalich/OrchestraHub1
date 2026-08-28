import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Orchestra } from "../lib/core";
import { uid } from "../lib/core";
import { GENRES, GENRE_MAP, CATEGORY_ORDER, CATEGORY_LABELS, genreName, layoutStage, defaultChannels, defaultChannel, fusedLineup, fusedGenres } from "../lib/genres";
import { INSTRUMENTS, INSTRUMENT_MAP, FAMILY_ORDER, FAMILY_LABELS, instrumentName } from "../lib/instruments";
import { useSonic, useT } from "../lib/store";
import { StageView, SectionHeader, ConfirmModal, Chip } from "./visuals";
import { InstrumentGlyph } from "./InstrumentGlyph";
import { Icon } from "./icons";

export function OrchestrasSection() {
  const lang = useSonic((s) => s.lang);
  const orchestras = useSonic((s) => s.orchestras);
  const saveOrchestra = useSonic((s) => s.saveOrchestra);
  const deleteOrchestra = useSonic((s) => s.deleteOrchestra);
  const setStudioOrchestra = useSonic((s) => s.setStudioOrchestra);
  const setSection = useSonic((s) => s.setSection);
  const toast = useSonic((s) => s.toast);
  const t = useT();

  /* ---------- estado del constructor ---------- */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [genreId, setGenreId] = useState("symphonic");
  const [fusions, setFusions] = useState<string[]>([]);
  const [ids, setIds] = useState<string[]>([...GENRE_MAP.symphonic.lineup]);
  const [stage, setStage] = useState(() => layoutStage(GENRE_MAP.symphonic.lineup, "draft-0"));
  const [channels, setChannels] = useState(() => defaultChannels(GENRE_MAP.symphonic.lineup, stage));
  const [search, setSearch] = useState("");
  const [nameError, setNameError] = useState(false);
  const [toDelete, setToDelete] = useState<Orchestra | null>(null);

  const applyGenre = (gid: string) => {
    const g = GENRE_MAP[gid];
    setGenreId(gid);
    setFusions([]);
    const lineup = [...g.lineup];
    setIds(lineup);
    const st = layoutStage(lineup, `draft-${gid}-${Date.now() % 1000}`);
    setStage(st);
    setChannels(defaultChannels(lineup, st));
  };

  const toggleFusion = (gid: string) => {
    setFusions((cur) => {
      const next = cur.includes(gid) ? cur.filter((x) => x !== gid) : cur.length >= 2 ? cur : [...cur, gid];
      const lineup = fusedLineup({ genreId, fusions: next });
      setIds(lineup);
      const st = layoutStage(lineup, `fus-${genreId}-${next.join("-")}`);
      setStage((s) => ({ ...st, ...pickExisting(s, lineup) }));
      setChannels((c) => {
        const nc = defaultChannels(lineup, st);
        for (const k of lineup) if (c[k]) nc[k] = c[k];
        return nc;
      });
      return next;
    });
  };

  const toggleInstrument = (id: string) => {
    if (ids.includes(id)) {
      const next = ids.filter((x) => x !== id);
      setIds(next);
    } else {
      const next = [...ids, id];
      setIds(next);
      setStage((s) => ({ ...layoutStage(next, `draft-${genreId}-${next.length}`), ...pickExisting(s, next) }));
      setChannels((c) => ({ ...c, [id]: c[id] ?? defaultChannel(id) }));
    }
  };

  const pickExisting = (oldStage: Record<string, { x: number; y: number }>, next: string[]) => {
    const out: Record<string, { x: number; y: number }> = {};
    for (const id of next) if (oldStage[id]) out[id] = oldStage[id];
    return out;
  };

  const startEdit = (o: Orchestra) => {
    setEditingId(o.id);
    setName(o.name);
    setGenreId(o.genreId);
    setFusions([...(o.fusions ?? [])]);
    setIds([...o.instrumentIds]);
    setStage(JSON.parse(JSON.stringify(o.stage)));
    setChannels(JSON.parse(JSON.stringify(o.channels)));
    setNameError(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startNew = () => {
    setEditingId(null);
    setName("");
    applyGenre("symphonic");
    setNameError(false);
  };

  const handleSave = () => {
    if (!name.trim()) { setNameError(true); return; }
    if (ids.length === 0) return;
    const editing = orchestras.find((o) => o.id === editingId);
    const orch: Orchestra = {
      id: editingId ?? uid(),
      name: name.trim(),
      genreId,
      fusions,
      instrumentIds: ids,
      stage,
      channels,
      createdAt: editing?.createdAt ?? Date.now(),
    };
    saveOrchestra(orch);
    toast(t("orch.savedToast"));
    setEditingId(null);
    setName("");
  };

  const handleDelete = () => {
    if (!toDelete) return;
    deleteOrchestra(toDelete.id);
    toast(t("orch.deletedToast"));
    if (editingId === toDelete.id) startNew();
    setToDelete(null);
  };

  const duplicate = (o: Orchestra) => {
    saveOrchestra({ ...o, id: uid(), name: `${o.name} II`, createdAt: Date.now() });
    toast(t("orch.savedToast"));
  };

  const draftOrch: Orchestra = useMemo(() => ({
    id: "draft", name: name || "—", genreId, fusions, instrumentIds: ids, stage, channels, createdAt: 0,
  }), [name, genreId, fusions, ids, stage, channels]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return INSTRUMENTS;
    return INSTRUMENTS.filter((i) =>
      i.nameES.toLowerCase().includes(q) || i.nameEN.toLowerCase().includes(q) ||
      i.aliases.some((a) => a.includes(q)));
  }, [search]);

  const grouped = useMemo(() => {
    const g: Record<string, typeof INSTRUMENTS> = {};
    for (const fam of FAMILY_ORDER) g[fam] = [];
    for (const ins of filtered) (g[ins.family] ??= []).push(ins);
    return g;
  }, [filtered]);

  const baseGenre = GENRE_MAP[genreId];

  return (
    <div>
      <SectionHeader kicker="01 · Formulator" title={t("orch.title")} subtitle={t("orch.subtitle")}
        right={
          <button onClick={startNew} className="btn-primary rounded-xl px-4 py-2.5 text-sm flex items-center gap-2">
            <Icon name="plus" size={15} /> {t("orch.new")}
          </button>
        }
      />

      <div className="grid lg:grid-cols-2 gap-5 items-start">
        {/* ============ CONSTRUCTOR ============ */}
        <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="panel p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-[16px]">
              {editingId ? <span className="text-tube-400">{t("orch.editing")}…</span> : t("orch.new")}
            </h2>
            {editingId && <button onClick={startNew} className="silk-label-xs text-ink-400 hover:text-ink-200 transition-colors">✕</button>}
          </div>

          <div className="mb-4">
            <label className="silk-label block mb-1.5">{t("orch.name")}</label>
            <input
              type="text" value={name}
              placeholder={t("orch.namePh")}
              onChange={(e) => { setName(e.target.value); setNameError(false); }}
              className={`w-full bg-ink-900 border rounded-lg px-3.5 py-2.5 text-[15px] text-ink-100 placeholder-ink-500 transition-colors focus-ring ${
                nameError ? "border-clip-500" : "border-ink-600 focus:border-tube-500/60"
              }`}
            />
          </div>

          {/* --- mapa global de estilos --- */}
          <label className="silk-label block mb-2">{t("orch.genre")}</label>
          <div className="panel-inset p-3 mb-2 max-h-[260px] overflow-y-auto space-y-3">
            {CATEGORY_ORDER.map((cat) => {
              const list = GENRES.filter((g) => g.category === cat);
              if (list.length === 0) return null;
              return (
                <div key={cat}>
                  <div className="silk-label-xs mb-1.5 flex items-center gap-2">
                    <span className="inline-block w-3.5 h-px bg-ink-500" />
                    {CATEGORY_LABELS[cat]?.[lang] ?? cat}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {list.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => applyGenre(g.id)}
                        title={`${lang === "es" ? g.regionES : g.regionEN} — ${lang === "es" ? g.blurbES : g.blurbEN}`}
                        className={`rounded-lg border px-2.5 py-1.5 text-[12.5px] font-semibold transition-all duration-150 active:scale-95 flex items-center gap-2 ${
                          genreId === g.id
                            ? "border-tube-500/70 bg-tube-500/10 text-tube-400 shadow-[0_0_14px_rgba(255,176,58,0.15)]"
                            : "btn-ghost text-ink-300"
                        }`}
                      >
                        <span className="flex gap-[3px] shrink-0">
                          {g.palette.slice(0, 2).map((c) => <span key={c} className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />)}
                        </span>
                        {lang === "es" ? g.nameES : g.nameEN}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {baseGenre && (
            <p className="text-[11.5px] text-ink-400 leading-relaxed mb-4 border-l-2 border-tube-500/50 pl-2.5">
              <span className="text-tube-400 font-semibold font-mono text-[10px] tracking-wide uppercase mr-1.5">
                {lang === "es" ? baseGenre.regionES : baseGenre.regionEN}
              </span>
              {lang === "es" ? baseGenre.blurbES : baseGenre.blurbEN}
            </p>
          )}

          {/* --- fusión de estilos --- */}
          <label className="silk-label block mb-2 flex items-center gap-2">
            <span className="text-led-400"><Icon name="layers" size={13} /></span>
            {t("orch.fusion")} <span className="text-ink-500 normal-case tracking-normal">({fusions.length}/2)</span>
          </label>
          <div className="panel-inset p-3 mb-2 max-h-[130px] overflow-y-auto flex flex-wrap gap-1.5">
            {GENRES.filter((g) => g.id !== genreId).map((g) => {
              const active = fusions.includes(g.id);
              return (
                <button key={g.id} onClick={() => toggleFusion(g.id)}
                  title={`${lang === "es" ? g.regionES : g.regionEN} · ${g.bpmMin}–${g.bpmMax} BPM`}
                  className={`rounded-full border px-2.5 py-1 text-[11.5px] font-semibold transition-all active:scale-95 flex items-center gap-1.5 ${
                    active ? "border-led-400/70 bg-led-400/10 text-led-300" : "border-ink-600 text-ink-400 hover:border-ink-500 hover:text-ink-200"
                  }`}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: g.palette[0] }} />
                  {lang === "es" ? g.nameES : g.nameEN}
                  {active && <Icon name="check" size={11} />}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-ink-500 leading-relaxed mb-1">{t("orch.fusionHint")}</p>
          <div className="flex flex-wrap items-center gap-1.5 mb-4 min-h-[24px]">
            <Chip color={baseGenre?.palette[0]}>{lang === "es" ? baseGenre?.nameES : baseGenre?.nameEN} · {t("orch.fusionBase")}</Chip>
            {fusions.map((f) => (
              <span key={f} className="flex items-center gap-1.5">
                <span className="text-led-400 font-mono text-xs">+</span>
                <Chip color={GENRE_MAP[f]?.palette[1] ?? "#45e0cd"}>{lang === "es" ? GENRE_MAP[f]?.nameES : GENRE_MAP[f]?.nameEN}</Chip>
              </span>
            ))}
          </div>

          {/* --- escenario --- */}
          <div className="panel-inset p-3 mb-4 relative overflow-hidden">
            <div className="flex items-center justify-between mb-1 px-1">
              <span className="silk-label">{t("orch.stage")}</span>
              <button
                onClick={() => { const st = layoutStage(ids, `rs-${Date.now() % 9999}`); setStage(st); setChannels(defaultChannels(ids, st)); }}
                className="silk-label-xs text-led-400 hover:text-led-300 transition-colors flex items-center gap-1"
              >
                <Icon name="dice" size={12} /> {t("orch.redistribute")}
              </button>
            </div>
            <StageView
              orch={draftOrch} lang={lang}
              onMove={(id, pos) => setStage((s) => ({ ...s, [id]: pos }))}
              onToggleMute={(id) => setChannels((c) => ({ ...c, [id]: { ...c[id], mute: !c[id]?.mute } }))}
            />
            <p className="silk-label-xs text-center mt-1 opacity-80">{t("orch.stageHint")}</p>
          </div>

          {/* --- instrumentación --- */}
          <label className="silk-label block mb-2">{t("orch.instruments")} · {ids.length} {t("orch.channels")}</label>
          <input
            type="text" value={search} placeholder={t("orch.searchPh")}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-ink-900 border border-ink-600 rounded-lg px-3.5 py-2 text-[13px] text-ink-100 placeholder-ink-500 mb-3 focus:border-led-400/50 transition-colors focus-ring"
          />
          <div className="max-h-[250px] overflow-y-auto pr-1 space-y-3 mb-5">
            {FAMILY_ORDER.filter((f) => (grouped[f] ?? []).length).map((fam) => (
              <div key={fam}>
                <div className="silk-label-xs mb-1.5">{FAMILY_LABELS[fam]?.[lang]}</div>
                <div className="flex flex-wrap gap-1.5">
                  {(grouped[fam] ?? []).map((ins) => {
                    const on = ids.includes(ins.id);
                    return (
                      <button
                        key={ins.id}
                        onClick={() => toggleInstrument(ins.id)}
                        title={ins.aliases.slice(0, 3).join(", ")}
                        className={`rounded-lg border px-2 py-1.5 text-[12px] font-semibold transition-all active:scale-95 flex items-center gap-1.5 ${
                          on ? "bg-ink-700/80 border-ink-500 text-ink-100" : "border-ink-700 text-ink-400 hover:border-ink-600 hover:text-ink-200"
                        }`}
                      >
                        <InstrumentGlyph id={ins.id} family={ins.family} color={on ? ins.color : "#6f6890"} size={15} />
                        {lang === "es" ? ins.nameES : ins.nameEN}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button onClick={handleSave} className="btn-primary rounded-xl px-6 py-2.5 text-sm flex-1 flex items-center justify-center gap-2">
              <Icon name="check" size={15} /> {t("common.save")}
            </button>
          </div>
        </motion.section>

        {/* ============ BIBLIOTECA ============ */}
        <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="flex flex-col gap-3">
          <h2 className="silk-label px-1">{t("orch.library")} · {orchestras.length}</h2>
          {orchestras.length === 0 ? (
            <div className="panel p-8 text-center text-ink-400 text-sm">{t("orch.emptyHint")}</div>
          ) : (
            <div className="flex flex-col gap-3">
              {orchestras.map((o, i) => (
                <motion.article
                  key={o.id}
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.05, 0.3) }}
                  className={`panel p-3.5 transition-colors ${editingId === o.id ? "border-tube-500/60" : ""}`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-[120px] shrink-0 rounded-lg overflow-hidden border border-ink-700 bg-ink-900">
                      <StageView orch={o} lang={lang} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display font-bold text-[16px] truncate">{o.name}</h3>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                        <Chip color={GENRE_MAP[o.genreId]?.palette[0] ?? "#ffb03a"}>{genreName(o.genreId, lang)}</Chip>
                        {(o.fusions ?? []).map((f) => (
                          <span key={f} className="flex items-center gap-1">
                            <span className="text-led-400 text-xs">+</span>
                            <Chip color={GENRE_MAP[f]?.palette[1] ?? "#45e0cd"}>{genreName(f, lang)}</Chip>
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                        {o.instrumentIds.slice(0, 9).map((id) => {
                          const def = INSTRUMENT_MAP[id];
                          if (!def) return null;
                          return (
                            <span key={id} title={instrumentName(id, lang)} className="w-6 h-6 rounded-md bg-ink-800 border border-ink-600 flex items-center justify-center">
                              <InstrumentGlyph id={id} family={def.family} color={def.color} size={14} />
                            </span>
                          );
                        })}
                        {o.instrumentIds.length > 9 && <span className="font-mono text-[10px] text-ink-400">+{o.instrumentIds.length - 9}</span>}
                      </div>
                      <div className="flex items-center gap-1.5 mt-3">
                        <button onClick={() => { setStudioOrchestra(o.id); setSection("studio"); }}
                          className="btn-primary rounded-lg px-3 py-1.5 text-[12px] flex items-center gap-1.5">
                          <Icon name="studio" size={13} /> {t("orch.sendStudio")}
                        </button>
                        <button onClick={() => startEdit(o)} title={t("common.edit")} className="btn-ghost rounded-lg p-2"><Icon name="edit" size={14} /></button>
                        <button onClick={() => duplicate(o)} title={t("common.duplicate")} className="btn-ghost rounded-lg p-2"><Icon name="copy" size={14} /></button>
                        <button onClick={() => setToDelete(o)} title={t("common.delete")}
                          className="btn-ghost rounded-lg p-2 ml-auto hover:!border-clip-500/60 hover:!text-clip-500"><Icon name="trash" size={14} /></button>
                      </div>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </motion.section>
      </div>

      <ConfirmModal
        open={!!toDelete}
        title={t("confirm.title")}
        body={t("confirm.bodyOrch", { name: toDelete?.name ?? "" })}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

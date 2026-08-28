import React, { useState, useEffect, useCallback } from "react";
import { Plus, Sparkles, LayoutGrid, Wallet, FolderPlus, X, Trash2, ImageIcon, TrendingUp, TrendingDown } from "lucide-react";

// ---------------------------------------------------------------------------
// BinderBuddy — prototype
// Data model mirrors binderbuddy_schema.sql: sets -> cards -> variations ->
// collection_entries. Persisted via window.storage (personal, per-user).
// ---------------------------------------------------------------------------

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Space+Grotesk:wght@400;500;600;700&display=swap');`;

const VARIATION_TYPES = ["Normal", "Holofoil", "Reverse Holo", "1st Edition", "Full Art", "Alt Art", "Promo"];
const CONDITIONS = ["Mint", "Near Mint", "Lightly Played", "Moderately Played", "Damaged"];

const STARTER_SETS = [
  { id: "s1", name: "Evolving Skies", game: "Pokemon", is_custom: false, publisher: "The Pokemon Company", release_date: "2021-08-27" },
  { id: "s2", name: "Midnight Hunt", game: "Magic: The Gathering", is_custom: false, publisher: "Wizards of the Coast", release_date: "2021-09-24" },
];

const STARTER_CARDS = [
  { id: "c1", set_id: "s1", name: "Umbreon VMAX", card_number: "215/203", rarity: "Secret Rare", base_image_url: "https://images.pokemontcg.io/swsh7/215_hires.png" },
  { id: "c2", set_id: "s1", name: "Rayquaza VMAX", card_number: "111/203", rarity: "Ultra Rare", base_image_url: "https://images.pokemontcg.io/swsh7/111_hires.png" },
  { id: "c3", set_id: "s2", name: "Wandering Mind", card_number: "68/277", rarity: "Rare", base_image_url: "https://cards.scryfall.io/normal/front/2/7/27dbaf83-1a41-4f5c-a0b8-a2b0d8d4b0c1.jpg" },
];

const STARTER_VARIATIONS = [
  { id: "v1", card_id: "c1", variation_type: "Holofoil", market_price: 289.5 },
  { id: "v2", card_id: "c2", variation_type: "Normal", market_price: 34.0 },
  { id: "v3", card_id: "c2", variation_type: "Alt Art", market_price: 61.25 },
  { id: "v4", card_id: "c3", variation_type: "Normal", market_price: 3.2 },
];

const uid = () => Math.random().toString(36).slice(2, 10);

function useStore() {
  const [state, setState] = useState({ sets: STARTER_SETS, cards: STARTER_CARDS, variations: STARTER_VARIATIONS, entries: [], loaded: false });

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get("binderbuddy-data");
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          setState({ ...parsed, loaded: true });
          return;
        }
      } catch (e) { /* no saved data yet */ }
      setState((s) => ({ ...s, loaded: true }));
    })();
  }, []);

  const persist = useCallback(async (next) => {
    setState(next);
    try {
      await window.storage.set("binderbuddy-data", JSON.stringify(next));
    } catch (e) { console.error("save failed", e); }
  }, []);

  return [state, persist];
}

function HoloBadge({ type }) {
  const isHolo = type && type.toLowerCase().includes("holo") || type === "Alt Art" || type === "Full Art";
  return (
    <span
      className="hb-badge"
      style={{
        background: isHolo ? "linear-gradient(120deg, #00C2A8, #6C5CE7 45%, #C13584)" : "#3A3D4E",
        color: isHolo ? "#0B0C14" : "#B7BACB",
      }}
    >
      {type}
    </span>
  );
}

function CardSlot({ card, variation, onClick, footer }) {
  const isHolo = variation && (variation.variation_type.toLowerCase().includes("holo") || variation.variation_type === "Alt Art" || variation.variation_type === "Full Art");
  return (
    <div className="hb-slot" onClick={onClick}>
      <div className={`hb-slot-inner ${isHolo ? "hb-holo" : ""}`}>
        {card.base_image_url ? (
          <img src={card.base_image_url} alt={card.name} className="hb-slot-img" onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }} />
        ) : null}
        <div className="hb-slot-fallback" style={{ display: card.base_image_url ? "none" : "flex" }}>
          <ImageIcon size={22} color="#5A5E73" />
        </div>
        {isHolo && <div className="hb-sheen" />}
      </div>
      <div className="hb-slot-caption">
        <div className="hb-slot-name">{card.name}</div>
        {variation && <HoloBadge type={variation.variation_type} />}
      </div>
      {footer}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="hb-modal-backdrop" onClick={onClose}>
      <div className="hb-modal" onClick={(e) => e.stopPropagation()}>
        <div className="hb-modal-head">
          <span>{title}</span>
          <button onClick={onClose} className="hb-icon-btn"><X size={18} /></button>
        </div>
        <div className="hb-modal-body">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="hb-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export default function BinderBuddy() {
  const [store, persist] = useStore();
  const [tab, setTab] = useState("dashboard");
  const [addOpen, setAddOpen] = useState(false);
  const [setOpen, setSetOpen] = useState(false);
  const [detail, setDetail] = useState(null); // entry id being viewed

  const enrichedEntries = store.entries.map((e) => {
    const variation = store.variations.find((v) => v.id === e.variation_id);
    const card = variation ? store.cards.find((c) => c.id === variation.card_id) : null;
    const set = card ? store.sets.find((s) => s.id === card.set_id) : null;
    return { ...e, variation, card, set };
  }).filter((e) => e.card);

  const totalPaid = enrichedEntries.reduce((sum, e) => sum + (Number(e.price_paid) || 0) * e.quantity, 0);
  const totalMarket = enrichedEntries.reduce((sum, e) => sum + (Number(e.variation?.market_price) || 0) * e.quantity, 0);
  const gain = totalMarket - totalPaid;

  // ---- Add to collection form ----
  const [form, setForm] = useState({ mode: "existing", setId: "", cardId: "", variationId: "", newCardName: "", newVariationType: "Normal", newImageUrl: "", newMarketPrice: "", quantity: 1, condition: "Near Mint", pricePaid: "", dateAcquired: "" });

  function resetForm() {
    setForm({ mode: "existing", setId: "", cardId: "", variationId: "", newCardName: "", newVariationType: "Normal", newImageUrl: "", newMarketPrice: "", quantity: 1, condition: "Near Mint", pricePaid: "", dateAcquired: "" });
  }

  function submitAdd() {
    let next = { ...store };
    let variationId = form.variationId;

    if (form.mode === "new") {
      if (!form.newCardName || !form.setId) return;
      const cardId = uid();
      const card = { id: cardId, set_id: form.setId, name: form.newCardName, card_number: "", rarity: "", base_image_url: form.newImageUrl, is_custom: true };
      const variation = { id: uid(), card_id: cardId, variation_type: form.newVariationType, market_price: Number(form.newMarketPrice) || 0 };
      next.cards = [...next.cards, card];
      next.variations = [...next.variations, variation];
      variationId = variation.id;
    }

    if (!variationId) return;

    const entry = {
      id: uid(),
      variation_id: variationId,
      quantity: Number(form.quantity) || 1,
      condition: form.condition,
      price_paid: form.pricePaid === "" ? null : Number(form.pricePaid),
      date_acquired: form.dateAcquired || null,
    };
    next.entries = [...next.entries, entry];
    persist(next);
    resetForm();
    setAddOpen(false);
  }

  // ---- New set form ----
  const [setForm, setSetForm] = useState({ name: "", game: "", publisher: "" });
  function submitSet() {
    if (!setForm.name) return;
    const newSet = { id: uid(), name: setForm.name, game: setForm.game || "Custom", is_custom: true, publisher: setForm.publisher, release_date: null };
    persist({ ...store, sets: [...store.sets, newSet] });
    setSetForm({ name: "", game: "", publisher: "" });
    setSetOpen(false);
  }

  function removeEntry(id) {
    persist({ ...store, entries: store.entries.filter((e) => e.id !== id) });
    setDetail(null);
  }

  const cardsInSet = (setId) => store.cards.filter((c) => c.set_id === setId);
  const variationsForCard = (cardId) => store.variations.filter((v) => v.card_id === cardId);

  const setGroups = store.sets.map((s) => ({
    set: s,
    entries: enrichedEntries.filter((e) => e.set.id === s.id),
  })).filter((g) => g.entries.length > 0 || tab === "sets");

  return (
    <div className="hb-root">
      <style>{`
        ${FONT_IMPORT}
        :root {
          --ink: #EDE6D6;
          --bg: #0F1019;
          --bg-panel: #171825;
          --bg-panel-2: #1E2032;
          --binder-slot: #23253A;
          --parchment: #EDE6D6;
          --amber: #E8A33D;
          --teal: #00C2A8;
          --magenta: #C13584;
          --muted: #8B8FA3;
          --border: #2C2E42;
        }
        .hb-root { font-family: 'Space Grotesk', sans-serif; background: var(--bg); color: var(--ink); min-height: 100%; padding: 0; border-radius: 12px; overflow: hidden; }
        .hb-header { display:flex; align-items:center; justify-content:space-between; padding: 22px 28px 18px; border-bottom: 1px solid var(--border); }
        .hb-logo { font-family: 'Fraunces', serif; font-weight: 600; font-size: 26px; letter-spacing: -0.02em; display:flex; align-items:center; gap:10px; }
        .hb-logo .dot { width:10px; height:10px; border-radius:50%; background: linear-gradient(135deg, var(--teal), var(--magenta)); }
        .hb-nav { display:flex; gap:6px; padding: 14px 28px 0; }
        .hb-navbtn { display:flex; align-items:center; gap:7px; padding: 9px 16px; border-radius: 999px; border:1px solid transparent; background: transparent; color: var(--muted); font-family:'Space Grotesk'; font-size:13.5px; font-weight:500; cursor:pointer; }
        .hb-navbtn.active { background: var(--bg-panel-2); color: var(--parchment); border-color: var(--border); }
        .hb-navbtn:hover:not(.active) { color: var(--ink); }
        .hb-body { padding: 22px 28px 30px; }
        .hb-stat-row { display:flex; gap:14px; margin-bottom: 22px; flex-wrap:wrap; }
        .hb-stat { flex:1; min-width:150px; background: var(--bg-panel); border:1px solid var(--border); border-radius: 14px; padding: 16px 18px; }
        .hb-stat-label { font-size:11.5px; text-transform:uppercase; letter-spacing:0.08em; color: var(--muted); margin-bottom:6px; }
        .hb-stat-value { font-family:'Fraunces', serif; font-size: 26px; font-weight:600; }
        .hb-section-title { font-family:'Fraunces', serif; font-size:19px; font-weight:600; margin: 26px 0 14px; display:flex; align-items:center; justify-content:space-between; }
        .hb-binder-page { background: var(--bg-panel); border:1px solid var(--border); border-radius: 16px; padding: 18px; margin-bottom: 20px; }
        .hb-binder-title { font-size:13px; color: var(--muted); margin-bottom:12px; display:flex; align-items:center; gap:8px; }
        .hb-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 14px; }
        .hb-slot { cursor:pointer; }
        .hb-slot-inner { position:relative; aspect-ratio: 5/7; background: var(--binder-slot); border-radius: 8px; overflow:hidden; border: 1px solid #33354C; }
        .hb-slot-img { width:100%; height:100%; object-fit:cover; }
        .hb-slot-fallback { width:100%; height:100%; align-items:center; justify-content:center; }
        .hb-sheen { position:absolute; inset:0; background: linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.35) 50%, transparent 60%); background-size: 250% 250%; animation: hb-sweep 3.2s ease-in-out infinite; mix-blend-mode: overlay; }
        @keyframes hb-sweep { 0% { background-position: 200% 0; } 100% { background-position: -50% 100%; } }
        .hb-holo { box-shadow: 0 0 0 1.5px var(--teal), 0 0 18px -4px rgba(193,53,132,0.6); }
        .hb-slot-caption { margin-top:7px; }
        .hb-slot-name { font-size:12.5px; font-weight:600; line-height:1.25; margin-bottom:4px; }
        .hb-badge { display:inline-block; font-size:9.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.03em; padding: 2px 7px; border-radius:5px; }
        .hb-fab { position:fixed; }
        .hb-add-btn { display:flex; align-items:center; gap:8px; background: linear-gradient(120deg, var(--teal), var(--magenta)); color:#0B0C14; font-weight:700; font-size:13.5px; padding:10px 18px; border-radius:999px; border:none; cursor:pointer; }
        .hb-ghost-btn { display:flex; align-items:center; gap:7px; background: var(--bg-panel-2); color: var(--ink); border:1px solid var(--border); font-size:13px; font-weight:600; padding:9px 15px; border-radius:999px; cursor:pointer; }
        .hb-empty { color: var(--muted); font-size: 14px; padding: 30px 0; text-align:center; }
        .hb-modal-backdrop { position:fixed; inset:0; background: rgba(6,7,12,0.7); display:flex; align-items:center; justify-content:center; z-index:50; padding: 20px; }
        .hb-modal { background: var(--bg-panel); border:1px solid var(--border); border-radius: 16px; width: 440px; max-width:100%; max-height: 85vh; overflow-y:auto; }
        .hb-modal-head { display:flex; align-items:center; justify-content:space-between; padding: 16px 20px; border-bottom:1px solid var(--border); font-family:'Fraunces', serif; font-weight:600; font-size:17px; }
        .hb-modal-body { padding: 18px 20px 22px; display:flex; flex-direction:column; gap:14px; }
        .hb-icon-btn { background:none; border:none; color: var(--muted); cursor:pointer; display:flex; }
        .hb-field { display:flex; flex-direction:column; gap:6px; font-size:12.5px; color: var(--muted); }
        .hb-field input, .hb-field select { background: var(--bg-panel-2); border:1px solid var(--border); border-radius:8px; padding:9px 10px; color: var(--ink); font-family:'Space Grotesk'; font-size:13.5px; }
        .hb-row2 { display:grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .hb-toggle-row { display:flex; gap:8px; }
        .hb-toggle { flex:1; text-align:center; padding:8px; border-radius:8px; border:1px solid var(--border); font-size:12.5px; cursor:pointer; color:var(--muted); }
        .hb-toggle.active { background: var(--bg-panel-2); color: var(--parchment); border-color: var(--teal); }
        .hb-submit { margin-top:6px; background: linear-gradient(120deg, var(--teal), var(--magenta)); color:#0B0C14; font-weight:700; border:none; padding:11px; border-radius:10px; cursor:pointer; font-size:13.5px; }
        .hb-detail-row { display:flex; justify-content:space-between; font-size:13px; padding:7px 0; border-bottom:1px dashed var(--border); }
        .hb-detail-row span:first-child { color: var(--muted); }
      `}</style>

      <div className="hb-header">
        <div className="hb-logo"><span className="dot" /> BinderBuddy</div>
        <button className="hb-add-btn" onClick={() => setAddOpen(true)}><Plus size={16} /> Add card</button>
      </div>

      <div className="hb-nav">
        <button className={`hb-navbtn ${tab === "dashboard" ? "active" : ""}`} onClick={() => setTab("dashboard")}><Wallet size={15} /> Dashboard</button>
        <button className={`hb-navbtn ${tab === "collection" ? "active" : ""}`} onClick={() => setTab("collection")}><LayoutGrid size={15} /> Collection</button>
        <button className={`hb-navbtn ${tab === "sets" ? "active" : ""}`} onClick={() => setTab("sets")}><FolderPlus size={15} /> Sets</button>
      </div>

      <div className="hb-body">
        {tab === "dashboard" && (
          <>
            <div className="hb-stat-row">
              <div className="hb-stat"><div className="hb-stat-label">Cards owned</div><div className="hb-stat-value">{enrichedEntries.reduce((s, e) => s + e.quantity, 0)}</div></div>
              <div className="hb-stat"><div className="hb-stat-label">Spent</div><div className="hb-stat-value">${totalPaid.toFixed(2)}</div></div>
              <div className="hb-stat"><div className="hb-stat-label">Market value</div><div className="hb-stat-value">${totalMarket.toFixed(2)}</div></div>
              <div className="hb-stat">
                <div className="hb-stat-label">Gain / loss</div>
                <div className="hb-stat-value" style={{ color: gain >= 0 ? "#3FD6A8" : "#E8607A", display:"flex", alignItems:"center", gap:6 }}>
                  {gain >= 0 ? <TrendingUp size={18}/> : <TrendingDown size={18}/>} {gain >= 0 ? "+" : ""}{gain.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="hb-section-title"><span>Recently added</span></div>
            {enrichedEntries.length === 0 ? (
              <div className="hb-empty">Your binder's empty. Add your first card to start tracking.</div>
            ) : (
              <div className="hb-grid">
                {enrichedEntries.slice(-6).reverse().map((e) => (
                  <CardSlot key={e.id} card={e.card} variation={e.variation} onClick={() => setDetail(e.id)} />
                ))}
              </div>
            )}
          </>
        )}

        {tab === "collection" && (
          <>
            {enrichedEntries.length === 0 ? (
              <div className="hb-empty">No cards in your collection yet.</div>
            ) : (
              setGroups.filter(g => g.entries.length > 0).map((g) => (
                <div className="hb-binder-page" key={g.set.id}>
                  <div className="hb-binder-title"><Sparkles size={13} color="var(--amber)" /> {g.set.name} {g.set.is_custom && <HoloBadge type="Custom" />}</div>
                  <div className="hb-grid">
                    {g.entries.map((e) => (
                      <CardSlot key={e.id} card={e.card} variation={e.variation} onClick={() => setDetail(e.id)} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {tab === "sets" && (
          <>
            <div className="hb-section-title">
              <span>All sets</span>
              <button className="hb-ghost-btn" onClick={() => setSetOpen(true)}><FolderPlus size={15}/> New custom set</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {store.sets.map((s) => (
                <div className="hb-binder-page" key={s.id} style={{ marginBottom: 0 }}>
                  <div className="hb-binder-title">
                    {s.name} {s.is_custom && <HoloBadge type="Custom" />}
                    <span style={{ marginLeft: "auto", color: "var(--muted)" }}>{s.game}{s.publisher ? ` · ${s.publisher}` : ""}</span>
                  </div>
                  <div className="hb-grid">
                    {cardsInSet(s.id).length === 0 && <div className="hb-empty" style={{ gridColumn: "1/-1", padding: 10 }}>No cards yet — add one via "Add card".</div>}
                    {cardsInSet(s.id).map((c) => {
                      const vs = variationsForCard(c.id);
                      return vs.length ? vs.map((v) => <CardSlot key={v.id} card={c} variation={v} onClick={() => {}} />) : <CardSlot key={c.id} card={c} onClick={() => {}} />;
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {addOpen && (
        <Modal title="Add a card" onClose={() => { setAddOpen(false); resetForm(); }}>
          <div className="hb-toggle-row">
            <div className={`hb-toggle ${form.mode === "existing" ? "active" : ""}`} onClick={() => setForm({ ...form, mode: "existing" })}>Existing card</div>
            <div className={`hb-toggle ${form.mode === "new" ? "active" : ""}`} onClick={() => setForm({ ...form, mode: "new" })}>New / custom card</div>
          </div>

          {form.mode === "existing" ? (
            <>
              <Field label="Set">
                <select value={form.setId} onChange={(e) => setForm({ ...form, setId: e.target.value, cardId: "", variationId: "" })}>
                  <option value="">Select a set…</option>
                  {store.sets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
              <Field label="Card">
                <select value={form.cardId} onChange={(e) => setForm({ ...form, cardId: e.target.value, variationId: "" })} disabled={!form.setId}>
                  <option value="">Select a card…</option>
                  {cardsInSet(form.setId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Variation">
                <select value={form.variationId} onChange={(e) => setForm({ ...form, variationId: e.target.value })} disabled={!form.cardId}>
                  <option value="">Select a variation…</option>
                  {variationsForCard(form.cardId).map((v) => <option key={v.id} value={v.id}>{v.variation_type} (${v.market_price})</option>)}
                </select>
              </Field>
            </>
          ) : (
            <>
              <Field label="Set">
                <select value={form.setId} onChange={(e) => setForm({ ...form, setId: e.target.value })}>
                  <option value="">Select a set…</option>
                  {store.sets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
              <Field label="Card name">
                <input value={form.newCardName} onChange={(e) => setForm({ ...form, newCardName: e.target.value })} placeholder="e.g. Shadow Drake" />
              </Field>
              <Field label="Image URL">
                <input value={form.newImageUrl} onChange={(e) => setForm({ ...form, newImageUrl: e.target.value })} placeholder="https://…" />
              </Field>
              <div className="hb-row2">
                <Field label="Variation type">
                  <select value={form.newVariationType} onChange={(e) => setForm({ ...form, newVariationType: e.target.value })}>
                    {VARIATION_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </Field>
                <Field label="Market price ($)">
                  <input type="number" value={form.newMarketPrice} onChange={(e) => setForm({ ...form, newMarketPrice: e.target.value })} placeholder="0.00" />
                </Field>
              </div>
            </>
          )}

          <div className="hb-row2">
            <Field label="Quantity">
              <input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </Field>
            <Field label="Condition">
              <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
                {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <div className="hb-row2">
            <Field label="Price paid ($)">
              <input type="number" value={form.pricePaid} onChange={(e) => setForm({ ...form, pricePaid: e.target.value })} placeholder="0.00" />
            </Field>
            <Field label="Date acquired">
              <input type="date" value={form.dateAcquired} onChange={(e) => setForm({ ...form, dateAcquired: e.target.value })} />
            </Field>
          </div>
          <button className="hb-submit" onClick={submitAdd}>Add to binder</button>
        </Modal>
      )}

      {setOpen && (
        <Modal title="New custom set" onClose={() => setSetOpen(false)}>
          <Field label="Set name">
            <input value={setForm.name} onChange={(e) => setSetForm({ ...setForm, name: e.target.value })} placeholder="e.g. Starlight Wanderers" />
          </Field>
          <Field label="Game / category">
            <input value={setForm.game} onChange={(e) => setSetForm({ ...setForm, game: e.target.value })} placeholder="e.g. Custom TCG, Homebrew" />
          </Field>
          <Field label="Creator / publisher">
            <input value={setForm.publisher} onChange={(e) => setSetForm({ ...setForm, publisher: e.target.value })} placeholder="Your name or studio" />
          </Field>
          <button className="hb-submit" onClick={submitSet}>Create set</button>
        </Modal>
      )}

      {detail && (() => {
        const e = enrichedEntries.find((x) => x.id === detail);
        if (!e) return null;
        const paid = Number(e.price_paid) || 0;
        const market = Number(e.variation?.market_price) || 0;
        const diff = market - paid;
        return (
          <Modal title={e.card.name} onClose={() => setDetail(null)}>
            <div style={{ display: "flex", gap: 14 }}>
              <div style={{ width: 100, flexShrink: 0 }}>
                <CardSlot card={e.card} variation={e.variation} onClick={() => {}} footer={null} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="hb-detail-row"><span>Set</span><span>{e.set.name}</span></div>
                <div className="hb-detail-row"><span>Variation</span><span>{e.variation.variation_type}</span></div>
                <div className="hb-detail-row"><span>Condition</span><span>{e.condition}</span></div>
                <div className="hb-detail-row"><span>Quantity</span><span>{e.quantity}</span></div>
                <div className="hb-detail-row"><span>Price paid</span><span>${paid.toFixed(2)}</span></div>
                <div className="hb-detail-row"><span>Market price</span><span>${market.toFixed(2)}</span></div>
                <div className="hb-detail-row"><span>Gain / loss</span><span style={{ color: diff >= 0 ? "#3FD6A8" : "#E8607A" }}>{diff >= 0 ? "+" : ""}{diff.toFixed(2)}</span></div>
                {e.date_acquired && <div className="hb-detail-row"><span>Acquired</span><span>{e.date_acquired}</span></div>}
              </div>
            </div>
            <button className="hb-ghost-btn" style={{ justifyContent: "center", color: "#E8607A", borderColor: "#E8607A55" }} onClick={() => removeEntry(e.id)}><Trash2 size={14}/> Remove from collection</button>
          </Modal>
        );
      })()}
    </div>
  );
}

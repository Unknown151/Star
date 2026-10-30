# StarCraft TMG Army Builder — project brief

Rasmus plays StarCraft: Tabletop Miniatures Game (Archon Studio / Blizzard). He currently uses NewRecruit to build lists and finds its interface **too cluttered**, especially when adding upgrades. Goal: a clean, fast, personal army builder. Start as a personal / gaming-group tool; it may go public later, so build it with that in mind (see Legal).

## What's in this folder
- `StarCraft TMG Reference/` — hand-checked reference set built from the official PDFs. **Primary data source.**
  - `Terran.md`, `Zerg.md`, `Protoss.md` — every unit (Waves 1–3): stats, Supply brackets, Army Slot, Unique, faction tags, weapons, abilities, upgrades (with SPECIALIST / "replaces X" flags) and Oct 2026 costs; plus all Faction, Tactical and Creep cards (slots, CP/BM/PE, Gas, Unique, tags).
  - `Rules-Reference.md` — rulebook page index, core rules, keywords, FAQ rulings.
  - `Missions-and-Deployments.md` — missions with starting Supply / escalation per scale.
  - `Army-Lists.md` — known-legal lists with slot and cost checks → **use as test cases**.
- `Source PDFs/` — Core Rules Book + official Print & Play card sheets (Wave 1, 2, 3 per race). Go here to verify anything odd. Rulebook page numbers in the notes = printed page (PDF page = printed + 2).
- Current points = official Cost Table "Units and Upgrade Points 09.10.2026" (already in the .md files). The rulebook's own points (pp. 94–107) are OUTDATED — never use them.

## Tech / style preferences
- **Single self-contained HTML file** (same approach as Rasmus' other projects, e.g. Seedfall): vanilla JS + CSS, no build step, opens from disk, works offline.
- Keep game data in **one clearly separated data block** (JSON object at the top of the file or a sibling `data.js`), so a new wave / cost table = edit data only.
- Save lists in localStorage (wrap in try/catch); export/import as JSON and as plain text.
- Rasmus prefers working code over long explanations; casual tone is fine.

## UI principles (the whole point)
- Uncluttered: one list on screen, add units from a compact picker, upgrades as simple toggles on the unit row — not nested menus.
- Always-visible budget bar: Minerals x/limit, Gas x/limit, slot usage per type (Core / Elite / Support / Air / Hero), problem count.
- Mobile-friendly (used at the table).

## Army-building rules to enforce (Rulebook pp. 73–76 + cards)
- Scale: Skirmish ≤1,000 Minerals (36×36), Standard ≤2,000 (36×54), Grand Offensive 2,001+ (36×72). Gas limit = 10% of the Mineral limit. Gas buys only Tactical/Creep cards.
- Exactly one Faction Card. **Every faction tag on a unit or card must appear on the Faction Card** (e.g. Praetor Guard needs Khalai; Malignant Creep needs Kerrigan's Swarm; Void Seeker needs Nerazim).
- Army Slots = Faction Card slots + Tactical Card slots. A unit uses slots of its type **equal to its starting Supply** for the chosen squad size.
- Units can only be taken at listed squad sizes ("Composition Options").
- UNIQUE units/cards: max one copy.
- Upgrades: whole unit unless **SPECIALIST** (exactly one nominated model, each Specialist upgrade once per unit, different Specialist upgrades go on different models). "FOR [weapon]" = replaces that weapon on the models that take it. Upgrade costs depend on squad size.
- Zerg: exactly one Creep Card (Accelerating 0 / Malignant 10 / Reactive 10 Gas).
- Nova: only one of Nova (Stealth Mode) / Nova (Assault Mode) per army.
- Summoned units (Point Defense Drone, Holo Decoy, Sabotage Drone, Auto-Turret, Omega Worm, Roachling, Pylon) cost nothing and use no slots — show them as info, not as purchasable.
- Edge cases: Advanced Medic Facilities (Medic Supply counts 0 for the Supply Pool — not for slots); Zagara's "Broodmother" is printed as an upgrade but has no cost in the Oct table (show as built-in, flag it); Air slots exist but no Air unit is released yet; Cocoon gives no BM.

## Features (priority order)
1. Build + validate a list with clear, plain-language problems ("2 Elite slots short — Lair, Overlord or Hydralisk Den would add Elite").
2. **Per-model loadout view**: e.g. "Marine 1: AGG-12 · Marine 2: C-14 + Rocket Launcher · Marines 3–6: C-14".
3. **Effective datasheet**: unit stats with numeric upgrades applied (Kinetic Foam +1 HP, Laser Targeting → Long Range 16", etc.); text abilities listed.
4. Resource summary: total CP / BM / PE the cards generate.
5. **Supply plan**: pick a mission → show Supply Pool per Round (start + escalation, unlimited in the final Round) and which units fit when.
6. Printable / shareable roster (text + clean print view).

## Test cases
Every list in `StarCraft TMG Reference/Army-Lists.md` must validate as legal with the exact totals shown. Also test failures: the first (wrong) Zerg 2,000 list with Lair+Overlord replaced by Spawning Pool + Six Pool is 2 Elite short; a Khalai list with Sentries but no Support-slot card must fail; the rulebook's Terran Founders list (Marines with AGG-12 + Rocket Launcher) is 1,050 at Oct 2026 costs.

## Legal guardrails (unofficial fan tool)
- No Blizzard/Archon art, logos, faction symbols or card images.
- In the app, **paraphrase** ability text briefly; don't paste card text verbatim.
- Footer: "Unofficial fan tool. Not affiliated with Blizzard Entertainment or Archon Studio. StarCraft is a trademark of Blizzard Entertainment." + link to https://starcraft-tmg.com/downloads
- Name it something that doesn't look official (avoid "StarCraft Army Builder" as the title).
- Free, no ads. **Never commit `Source PDFs/` or `StarCraft TMG Reference/` to a public repo** (see .gitignore).

## Keeping data current
Archon updates points roughly every wave (every 2–3 months). Waves so far: 1 (May 2026), 2 (Sept 2026), 3 (shipping Nov 2026); Wave 4 (Alarak, Reaver, Stukov, Infested Marines…) planned around Dec 2026. New PDFs go in `Source PDFs/`; update the reference .md and then the app data.

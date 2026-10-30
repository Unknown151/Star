# Supply Line

A clean, fast army list builder for the StarCraft tabletop miniatures game — one list on screen, upgrades as toggles on the unit row, an always-visible budget bar, and plain-language problems.

**Unofficial fan tool.** Not affiliated with Blizzard Entertainment or Archon Studio. StarCraft is a trademark of Blizzard Entertainment. Official rules, cards and points: <https://starcraft-tmg.com/downloads>.

## Use it

Open `index.html` in any browser. No install, no build step, works offline. Lists are saved in the browser (localStorage); back them up from **Lists → Back up all** or export from the **Roster** tab.

- **Build** — pick race, Faction card and scale; add units from the picker; tap sizes and upgrades on the row. ◆ marks a Specialist upgrade (one model). Tap a unit to see its effective datasheet and per-model loadout.
- **Datasheets** — every unit with upgrades applied, card abilities, summoned units, and the CP / BM / PE your cards generate.
- **Supply plan** — pick a mission, see the Supply Pool per Round and plan which units arrive when (or hit Auto-fill).
- **Roster** — copy as text, print, download `.txt` / `.json`, or copy a share link.

The validator checks Minerals and Gas, Army Slots per type, faction tags, legal squad sizes, Unique units and cards, exactly one Creep card for Zerg, one Nova per army, Specialist limits and conflicting weapon swaps.

## Data

All game data lives in one block at the top of `index.html` (`<script id="game-data">`) — units, Faction / Tactical / Creep cards and missions. A new wave or cost table means editing that block only; the format is documented in the comment above it. Current data: Waves 1–3, Cost Table 09.10.2026. Ability text is paraphrased; the printed cards win.

## Tests

```bash
node test/run-tests.mjs
```

Loads the data and engine straight out of `index.html` and checks the known-legal lists (exact Minerals, Gas, slots and resources), the known failures (missing slots, faction tags, Unique, Creep, Nova, over budget), upgrade costs, the effective datasheet, loadouts, supply pools, text/share round trips and data integrity.

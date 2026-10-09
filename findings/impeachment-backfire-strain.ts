import { loadConfig, loadPacks, BALANCE_PACKS } from '../sim/harness.ts';
import { runawayMetrics } from '../sim/roundrobin.ts';
import { AGENTS as AGENT_CLASSES } from '../sim/agents.ts';
import { Game } from '../engine/game.ts';
import { RNG } from '../engine/rules/rng.ts';
import type { Config } from '../engine/game.ts';
import type { Card } from '../engine/types/index.ts';
import { seeds as sample } from './sample.ts';
import type { Claim, Finding } from './types.ts';

/** `Impeacher` replaces `SenateFlood` from the canonical C7 pool
 *  (`runaway-no-brake.ts`, `positional-shock-brake.ts`) -- none of that
 *  pool's four agents implement `moveImpeach`/`voteImpeach`, so `backfire`
 *  would never once fire under it and this finding would measure nothing.
 *  The determination/comeback readings below are therefore a fresh float
 *  taken on THIS pool, not the other findings' 0.625 -- comparable across
 *  the rows of this finding, not across files. Also not comparable across
 *  TIME: hf7y/american-cycle#244 (option 2) doubled `maxYears` to 32 here
 *  for finer quantization (1/32-year steps instead of 1/16), resolution
 *  only -- the shipped `tuned.json` stays at 16 for actual play. */
const AGENTS = ['Greedy', 'Lookahead', 'Impeacher', 'HeterodoxSpecialist'];
const SEEDS = Array.from({ length: sample(200) }, (_, i) => 1030400 + i);
const HEALTHY_LOW = 0.75, HEALTHY_HIGH = 0.85;
const inBand = (x: number) => x >= HEALTHY_LOW && x <= HEALTHY_HIGH;

/** How often the mechanism this finding is about actually fires, and how
 *  often the alternative (an actual removal) happens instead -- the
 *  determination/comeback numbers alone cannot distinguish "the lever does
 *  nothing" from "the lever's trigger almost never occurs". */
function conviction(cards: Card[], cfg: Config): { fails: number; successes: number } {
  let fails = 0, successes = 0;
  for (const seed of SEEDS) {
    const rng = new RNG(seed);
    const agents = AGENTS.map((n) => new AGENT_CLASSES[n](cfg, rng));
    const g = new Game(agents, cards, cfg, seed);
    g.run();
    fails += g.log.filter((l) => l.includes('impeachment fails')).length;
    successes += g.stats.impeachments;
  }
  return { fails: fails / SEEDS.length, successes: successes / SEEDS.length };
}

export const finding: Finding = {
  id: 'impeachment-backfire-strain',
  dependsOn: [],
  question:
    "hf7y/american-cycle#84's other named arm, alongside the positional shock #237 already measured: "
    + "`lean.ts`'s `nudge` doc deferred scaling the impeachment backfire by strain between the convicting "
    + 'coalition and the country until bill positions had a magnitude (v0.2 items 4-5, now shipped). Built '
    + 'behind `impeachBackfireStrainScaled` (`engine/game.ts`\'s `backfireStrainScale`) -- does scaling the '
    + 'flat backfire by tag-space distance move C7-runaway-bars into the healthy 0.75-0.85 band, with comeback '
    + 'above zero, on 200+ seeds?',

  headline:
    'hf7y/american-cycle#244 OPTION 2 APPLIED (resolution only, maxYears 16->32): STILL INSENSITIVE TO THIS '
    + "LEVER, AND THE CEILING MOVED WITH THE OTHER ARMS'. Off, flat, strain-scaled at shipped magnitude and "
    + 'strain-scaled at 20x all read the identical 0.94 (30/32 years) -- not 0.875 as at the old 16-year '
    + 'resolution, the same new ceiling `positional-shock-brake.ts` moved to under this same option-2 rerun. '
    + 'Failed convictions average 8.2 per game under this pool (the longer game gives the mechanism more '
    + 'chances to fire, not fewer), so the lever is exercised harder, not less, at the coarser-seeming but now '
    + "longer game -- and it still moves nothing. Comeback drops to at-or-near zero at every point (0.01, 0, "
    + "0.01, 0.01) against the 2026-09-08 stamps' 3-6%, consistent with comeback being measured against a "
    + "halfway mark that is now twice as deep into the game, not a new finding about the lever itself. Doubling "
    + "resolution did not land this between the old two points either; like #237's arm, it moved the whole set "
    + "further from the 0.75-0.85 band. #84 stays open; this is more of the same signal #237 already flagged, "
    + 'not new information about this specific lever -- see `positional-shock-brake.ts` for the shared read on '
    + 'what re-running at 32 years actually showed.',
  stampedAt: '2026-10-09T17:41:55Z',
  stampedOn: '243aeb1',

  predicate(): Claim[] {
    const shipped84 = loadConfig('tuned.json');
    // hf7y/american-cycle#244 option 2: re-run at maxYears:32, resolution
    // only -- tuned.json itself stays at 16 for actual play.
    const base: Config = { ...shipped84, game: { ...shipped84.game, maxYears: 32 } };
    const cards = loadPacks(BALANCE_PACKS);
    const run = (cfg: Config) => runawayMetrics(SEEDS, AGENTS, cards, cfg);

    const offCfg: Config = { ...base, legislature: { ...base.legislature, impeachBackfirePips: 0 } };
    const off = run(offCfg);

    const flatCfg: Config = { ...base, legislature: { ...base.legislature, impeachBackfirePips: 2 } };
    const flat = run(flatCfg);

    const shippedCfg: Config = { ...base, legislature: { ...base.legislature, impeachBackfirePips: 2, impeachBackfireStrainScaled: true } };
    const shipped = run(shippedCfg);

    const highCfg: Config = { ...base, legislature: { ...base.legislature, impeachBackfirePips: 40, impeachBackfireStrainScaled: true } };
    const high = run(highCfg);

    const rate = conviction(cards, flatCfg);

    return [
      { name: 'off (impeachBackfirePips=0): determination', value: off.determination, stamped: 0.94, tolerance: 0.1, unit: 'fraction of game length' },
      { name: 'off: comeback', value: off.comeback, stamped: 0.01, tolerance: 0.05, unit: 'share of games' },
      { name: 'flat (shipped 2 pips): determination', value: flat.determination, stamped: 0.94, tolerance: 0.1, unit: 'fraction of game length' },
      { name: 'flat: comeback', value: flat.comeback, stamped: 0, tolerance: 0.05, unit: 'share of games' },
      { name: 'strain-scaled, shipped magnitude (2): determination', value: shipped.determination, stamped: 0.94, tolerance: 0.1, unit: 'fraction of game length' },
      { name: 'strain-scaled, shipped magnitude: comeback', value: shipped.comeback, stamped: 0.01, tolerance: 0.05, unit: 'share of games' },
      { name: 'strain-scaled, high magnitude (40): determination', value: high.determination, stamped: 0.94, tolerance: 0.1, unit: 'fraction of game length' },
      { name: 'strain-scaled, high magnitude: comeback', value: high.comeback, stamped: 0.01, tolerance: 0.05, unit: 'share of games' },
      { name: 'failed convictions per game (flat config)', value: rate.fails, stamped: 8.18, tolerance: 1.5, unit: 'backfires/game' },
      { name: 'successful convictions per game (flat config)', value: rate.successes, stamped: 0, tolerance: 0.1, unit: 'removals/game' },
    ];
  },

  verdict(c: Claim[]): string {
    const v = (n: string) => c.find((x) => x.name.startsWith(n))!.value;
    const points = [
      { label: 'off', det: v('off (') },
      { label: 'flat (shipped 2 pips)', det: v('flat (') },
      { label: 'strain-scaled, shipped magnitude', det: v('strain-scaled, shipped magnitude (') },
      { label: 'strain-scaled, high magnitude (40)', det: v('strain-scaled, high magnitude (') },
    ];
    const landed = points.filter((p) => inBand(p.det));
    const spread = Math.max(...points.map((p) => p.det)) - Math.min(...points.map((p) => p.det));
    const comebacks = [v('off: comeback'), v('flat: comeback'), v('strain-scaled, shipped magnitude: comeback'), v('strain-scaled, high magnitude: comeback')];
    const allComeback = comebacks.every((x) => x > 0);
    const freq = v('failed convictions per game (flat config)');
    return [
      `failed convictions average ${freq.toFixed(1)} per game under this pool -- the mechanism fires often, not rarely`,
      spread < 0.01
        ? `determination is identical (spread ${spread.toFixed(4)}) whether the backfire is off, flat, or strain-scaled up to 20x -- this lever does not move the metric at all`
        : `determination varies by ${spread.toFixed(4)} across the points measured`,
      landed.length
        ? `${landed.length} of ${points.length} points land inside the healthy 75-85% band (${landed.map((p) => p.label).join(', ')}) -- #84's acceptance bar is met`
        : "none of the points land inside the healthy 75-85% band -- #84's acceptance bar is not met by this build",
      allComeback
        ? 'comeback stays above zero at every point measured'
        : 'at least one point measured has zero comeback',
    ].join('; ');
  },
};

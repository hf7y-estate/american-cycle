import { loadConfig, loadPacks, BALANCE_PACKS } from '../sim/harness.ts';
import { runawayMetrics } from '../sim/roundrobin.ts';
import type { Config } from '../engine/game.ts';
import { seeds as sample } from './sample.ts';
import type { Claim, Finding } from './types.ts';

const AGENTS = ['Greedy', 'Lookahead', 'SenateFlood', 'HeterodoxSpecialist'];
/** Same seed family as `runaway-no-brake.ts`, so the seeds are directly
 *  comparable; the determination VALUES are not, since hf7y/american-cycle#244
 *  (option 2) doubled this file's `maxYears` to 32 for finer quantization
 *  (1/32-year steps instead of 1/16) while `runaway-no-brake.ts` stayed at the
 *  shipped 16 -- resolution only, no metric or band redefinition. */
const SEEDS = Array.from({ length: sample(200) }, (_, i) => 1030400 + i);
const HEALTHY_LOW = 0.75, HEALTHY_HIGH = 0.85;
const inBand = (x: number) => x >= HEALTHY_LOW && x <= HEALTHY_HIGH;

export const finding: Finding = {
  id: 'positional-shock-brake',
  dependsOn: [],
  question:
    'hf7y/american-cycle#84: the cheap shock (v0.2 item 9) was measured inert -- 0.625 determination with '
    + 'it or without it. #84 built the positional version its own comment deferred: an epicenter drawn from '
    + 'one currently-held seat, paying out incumbents by tag-space nearness rather than by seat count. Does '
    + 'it move C7-runaway-bars into the healthy 0.75-0.85 band, with comeback above zero, on 200+ seeds?',

  headline:
    'hf7y/american-cycle#244 OPTION 2 APPLIED (resolution only, maxYears 16->32): THE FINER GRID DID NOT LAND '
    + 'BETWEEN THE OLD TWO POINTS -- IT PUSHED NEARLY EVERYTHING TO A NEW, HIGHER CEILING INSTEAD. All four '
    + 'points that previously split 0.625/0.875 (cheap shock, positional at shipped/low/high magnitude) now '
    + 'read the SAME 0.94 (30/32 years), including the one point (positional high) that used to be the lone '
    + '0.875 outlier -- so doubling the year count did not reveal intermediate values inside the old pair, it '
    + 'moved the whole set further from the 0.75-0.85 band than they were before. None of the four lands inside '
    + 'it. Comeback is also no longer comparable to the 2026-09-07 stamps: at double the game length, "the '
    + "halfway mark\" comeback is measured against is twice as deep into the game, and three of four points now "
    + 'read at or near zero (0, 0.01, 0.01, 0.01) against the old 3-5.5%. #84 is not closed by this; if anything '
    + "the issue's own fallback condition (\"reverse by re-deriving the metric per option 1 if that still "
    + 'saturates at only two values\") undersells what happened here -- at the finer resolution it saturates at '
    + 'essentially ONE value, not two, which is new information for whoever rules on #244\'s still-open band '
    + 'question next, not something this restamp decides on its own.',
  stampedAt: '2026-10-09T17:41:55Z',
  stampedOn: '243aeb1',

  predicate(): Claim[] {
    const shipped84 = loadConfig('tuned.json');
    // hf7y/american-cycle#244 option 2: re-run at maxYears:32 for finer
    // quantization (1/32-year steps), resolution only -- tuned.json itself
    // stays at 16 for actual play.
    const base: Config = { ...shipped84, game: { ...shipped84.game, maxYears: 32 } };
    const cards = loadPacks(BALANCE_PACKS);
    const run = (cfg: Config) => runawayMetrics(SEEDS, AGENTS, cards, cfg);

    const cheap = run(base);
    const shipped: Config = { ...base, economy: { ...base.economy, shockPositional: true } };
    const posShipped = run(shipped);
    const low: Config = { ...base, economy: { ...base.economy, shockPositional: true, shockPips: 8, shockOnRollAtMost: 4 } };
    const posLow = run(low);
    const high: Config = { ...base, economy: { ...base.economy, shockPositional: true, shockPips: 14, shockOnRollAtMost: 4 } };
    const posHigh = run(high);

    return [
      { name: 'cheap shock (shipped magnitude): determination', value: cheap.determination, stamped: 0.94, tolerance: 0.1, unit: 'fraction of game length' },
      { name: 'cheap shock: comeback', value: cheap.comeback, stamped: 0.01, tolerance: 0.05, unit: 'share of games' },
      { name: 'positional shock, shipped magnitude (2 @ d6<=1): determination', value: posShipped.determination, stamped: 0.94, tolerance: 0.1, unit: 'fraction of game length' },
      { name: 'positional shock, shipped magnitude: comeback', value: posShipped.comeback, stamped: 0.01, tolerance: 0.05, unit: 'share of games' },
      { name: 'positional shock, low (8 @ d6<=4): determination', value: posLow.determination, stamped: 0.94, tolerance: 0.1, unit: 'fraction of game length' },
      { name: 'positional shock, low: comeback', value: posLow.comeback, stamped: 0, tolerance: 0.05, unit: 'share of games' },
      { name: 'positional shock, high (14 @ d6<=4): determination', value: posHigh.determination, stamped: 0.94, tolerance: 0.1, unit: 'fraction of game length' },
      { name: 'positional shock, high: comeback', value: posHigh.comeback, stamped: 0.01, tolerance: 0.05, unit: 'share of games' },
    ];
  },

  verdict(c: Claim[]): string {
    const v = (n: string) => c.find((x) => x.name.startsWith(n))!.value;
    const points = [
      { label: 'shipped magnitude', det: v('positional shock, shipped magnitude (') },
      { label: 'low (8 @ d6<=4)', det: v('positional shock, low (') },
      { label: 'high (14 @ d6<=4)', det: v('positional shock, high (') },
    ];
    const landed = points.filter((p) => inBand(p.det));
    const comebacks = [v('cheap shock: comeback'), v('positional shock, shipped magnitude: comeback'),
      v('positional shock, low: comeback'), v('positional shock, high: comeback')];
    const allComeback = comebacks.every((x) => x > 0);
    const moved = points.some((p) => p.det !== v('cheap shock ('));
    return [
      moved
        ? `positional scaling is not inert -- it reaches ${points.map((p) => `${(100 * p.det).toFixed(1)}% (${p.label})`).join(', ')}, `
          + `against ${(100 * v('cheap shock (')).toFixed(1)}% for the cheap shock at the same shipped magnitude`
        : 'positional scaling measured identical to the cheap shock at every point tried, same as the cheap shock alone was',
      landed.length
        ? `and ${landed.length} of ${points.length} points measured land inside the healthy 75-85% band (${landed.map((p) => p.label).join(', ')}) -- #84's acceptance bar is met`
        : 'but none of the points measured lands inside the healthy 75-85% band -- #84\'s acceptance bar is not met by this build',
      allComeback
        ? 'and comeback stays above zero at every point measured, so that half of the acceptance bar is not the blocker'
        : 'and at least one point measured has zero comeback, which is its own failure independent of the band',
    ].join('; ');
  },
};

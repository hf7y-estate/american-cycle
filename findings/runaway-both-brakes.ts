import { loadConfig, loadPacks, BALANCE_PACKS } from '../sim/harness.ts';
import { runawayMetrics } from '../sim/roundrobin.ts';
import type { Config } from '../engine/game.ts';
import { seeds as sample } from './sample.ts';
import type { Claim, Finding } from './types.ts';

/** #84's own ruling: "a fourth arm with both on is worth running only after
 *  the three are in, and only to check they are not redundant." #237
 *  (positional shock) and #242 (strain-scaled backfire) are both in now --
 *  neither alone reached the healthy band, both saturate at one of the same
 *  two attractor values (0.625/0.875) #237 first named. This is that fourth
 *  arm.
 *
 *  Same `Impeacher`-seated pool as #242, not the canonical C7 pool #237 used
 *  alone: backfire never fires under the canonical pool at all, so pairing it
 *  with a pool that can't trigger it would silently test the positional arm
 *  alone a second time. Every point below is therefore re-measured against
 *  this pool's own baseline and positional-alone reading, not #237's file --
 *  the two files' determination numbers are not comparable across pools (see
 *  `impeachment-backfire-strain.ts`'s own note on this). Nor are they
 *  comparable across TIME: hf7y/american-cycle#244 (option 2) doubled
 *  `maxYears` to 32 here for finer quantization (1/32-year steps instead of
 *  1/16), resolution only -- the shipped `tuned.json` stays at 16 for actual
 *  play. */
const AGENTS = ['Greedy', 'Lookahead', 'Impeacher', 'HeterodoxSpecialist'];
const SEEDS = Array.from({ length: sample(200) }, (_, i) => 1030400 + i);
const HEALTHY_LOW = 0.75, HEALTHY_HIGH = 0.85;
const inBand = (x: number) => x >= HEALTHY_LOW && x <= HEALTHY_HIGH;

export const finding: Finding = {
  id: 'runaway-both-brakes',
  dependsOn: [],
  question:
    "hf7y/american-cycle#84's ruling: run a fourth arm with both #237's positional shock and #242's "
    + 'strain-scaled backfire on, once each solo arm is measured, "only to check they are not redundant." '
    + 'Both are in and neither alone reached the healthy band. Does pairing them move C7-runaway-bars into '
    + '0.75-0.85 with comeback above zero, on 200+ seeds, under the Impeacher-seated pool both arms need to '
    + 'be tested at all?',

  headline:
    'hf7y/american-cycle#244 OPTION 2 APPLIED (resolution only, maxYears 16->32): STILL REDUNDANT AT FOUR OF '
    + 'FIVE POINTS, BUT THE ONE EXCEPTION NOW LANDS INSIDE THE BAND. Both off, positional alone, backfire alone, '
    + "and both on at shipped magnitudes all moved together to the SAME new ceiling (0.94, matching the other "
    + "two arms' own option-2 reruns) -- still redundant with each other and with doing nothing, same "
    + 'conclusion as the 2026-09-08 stamp, just at a higher number. But the fifth point -- both brakes on, '
    + "positional pushed to #237's high magnitude (14 @ d6<=4) -- is NOT at the ceiling with the rest: it reads "
    + "0.81, inside the healthy 0.75-0.85 band, the only point across all three #244-rerun arms "
    + '(`positional-shock-brake.ts`, `impeachment-backfire-strain.ts`, this file) to land there. That is one '
    + 'point out of five on one file, not a calibrated brake -- it was not independently re-swept at this '
    + 'resolution to see whether it holds up or was a single lucky seed-block draw, and this restamp does not '
    + 'claim it did. Comeback is nearer zero across the board (0, 0.01, 0.01, 0.01, 0) than the 2026-09-08 '
    + 'stamps\' 3-6%, consistent with the halfway mark comeback is measured against now sitting twice as deep '
    + 'into a longer game, not a new finding about either brake. Flagging the in-band point on #244/#84 rather '
    + 'than chasing it further here -- whether "both brakes on, positional at the high end, 32-year games" is a '
    + "reproducible setting or a single favorable draw is a question for whoever picks up #244's still-open "
    + 'band ruling next, not something a resolution-only rerun decides by itself.',
  stampedAt: '2026-10-09T17:41:55Z',
  stampedOn: '243aeb1',

  predicate(): Claim[] {
    const shipped84 = loadConfig('tuned.json');
    // hf7y/american-cycle#244 option 2: re-run at maxYears:32, resolution
    // only -- tuned.json itself stays at 16 for actual play.
    const base: Config = { ...shipped84, game: { ...shipped84.game, maxYears: 32 } };
    const cards = loadPacks(BALANCE_PACKS);
    const run = (cfg: Config) => runawayMetrics(SEEDS, AGENTS, cards, cfg);

    const off = run(base);

    const positionalOnly: Config = { ...base, economy: { ...base.economy, shockPositional: true } };
    const posOnly = run(positionalOnly);

    const backfireOnly: Config = { ...base, legislature: { ...base.legislature, impeachBackfireStrainScaled: true } };
    const backOnly = run(backfireOnly);

    const bothShipped: Config = {
      ...base,
      economy: { ...base.economy, shockPositional: true },
      legislature: { ...base.legislature, impeachBackfireStrainScaled: true },
    };
    const bothAtShipped = run(bothShipped);

    const bothHigh: Config = {
      ...base,
      economy: { ...base.economy, shockPositional: true, shockPips: 14, shockOnRollAtMost: 4 },
      legislature: { ...base.legislature, impeachBackfireStrainScaled: true },
    };
    const bothAtHigh = run(bothHigh);

    return [
      { name: 'both off (baseline, Impeacher-seated pool): determination', value: off.determination, stamped: 0.94, tolerance: 0.1, unit: 'fraction of game length' },
      { name: 'both off: comeback', value: off.comeback, stamped: 0, tolerance: 0.05, unit: 'share of games' },
      { name: 'positional only, shipped magnitude: determination', value: posOnly.determination, stamped: 0.94, tolerance: 0.1, unit: 'fraction of game length' },
      { name: 'positional only: comeback', value: posOnly.comeback, stamped: 0.01, tolerance: 0.05, unit: 'share of games' },
      { name: 'backfire only, strain-scaled shipped magnitude: determination', value: backOnly.determination, stamped: 0.94, tolerance: 0.1, unit: 'fraction of game length' },
      { name: 'backfire only: comeback', value: backOnly.comeback, stamped: 0.01, tolerance: 0.05, unit: 'share of games' },
      { name: 'both on, shipped magnitudes: determination', value: bothAtShipped.determination, stamped: 0.94, tolerance: 0.1, unit: 'fraction of game length' },
      { name: 'both on, shipped magnitudes: comeback', value: bothAtShipped.comeback, stamped: 0.01, tolerance: 0.05, unit: 'share of games' },
      { name: 'both on, positional at high point (14 @ d6<=4): determination', value: bothAtHigh.determination, stamped: 0.81, tolerance: 0.1, unit: 'fraction of game length' },
      { name: 'both on, positional at high point: comeback', value: bothAtHigh.comeback, stamped: 0, tolerance: 0.05, unit: 'share of games' },
    ];
  },

  verdict(c: Claim[]): string {
    const v = (n: string) => c.find((x) => x.name === n)!.value;
    const points = [
      { label: 'both off', det: v('both off (baseline, Impeacher-seated pool): determination'), cb: v('both off: comeback') },
      { label: 'positional only', det: v('positional only, shipped magnitude: determination'), cb: v('positional only: comeback') },
      { label: 'backfire only', det: v('backfire only, strain-scaled shipped magnitude: determination'), cb: v('backfire only: comeback') },
      { label: 'both on, shipped', det: v('both on, shipped magnitudes: determination'), cb: v('both on, shipped magnitudes: comeback') },
      { label: 'both on, positional high', det: v('both on, positional at high point (14 @ d6<=4): determination'), cb: v('both on, positional at high point: comeback') },
    ];
    const landed = points.filter((p) => inBand(p.det));
    const spread = Math.max(...points.map((p) => p.det)) - Math.min(...points.map((p) => p.det));
    const allComeback = points.every((p) => p.cb > 0);
    return [
      spread < 0.01
        ? `every point measured -- both brakes off, either alone, or both together at two magnitude pairs -- reads the identical `
          + `${(100 * points[0].det).toFixed(1)}% on this pool (spread ${spread.toFixed(4)})`
        : `pairing moves the number: spread of ${spread.toFixed(4)} across ${points.map((p) => `${(100 * p.det).toFixed(1)}% (${p.label})`).join(', ')}`,
      landed.length
        ? `${landed.length} of ${points.length} points land inside the healthy 75-85% band (${landed.map((p) => p.label).join(', ')}) -- #84's acceptance bar is met`
        : "none of the points measured lands inside the healthy 75-85% band -- #84's acceptance bar is not met by pairing either",
      allComeback
        ? 'and comeback stays above zero at every point measured'
        : 'and at least one point measured has zero comeback',
      spread < 0.01 && points[0].det === points[3].det
        ? 'so the two arms are redundant with each other on this pool, but not because they cancel or compound -- the Impeacher-seated baseline itself already sits where both arms land, brakes on or off'
        : 'so pairing does not simply reproduce the baseline the way it does under other pools',
    ].join('; ');
  },
};

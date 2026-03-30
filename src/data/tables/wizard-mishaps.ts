import type { WizardMishap } from '@/schemas/spells.ts';

export const WIZARD_MISHAPS_TIER_1_2: WizardMishap[] = [
  { roll: 1, name: 'Devastation!', description: 'Roll twice and combine both effects (reroll further 1s).', effect: { type: 'double_roll' } },
  { roll: 2, name: 'Explosion!', description: 'Take 1d8 damage.', effect: { type: 'damage', dice: '1d8', target: 'self' } },
  { roll: 3, name: 'Refraction!', description: 'Target yourself with the spell.', effect: { type: 'redirect', target: 'self' } },
  { roll: 4, name: 'Your hand slipped!', description: 'Target a random ally with the spell.', effect: { type: 'redirect', target: 'random_ally' } },
  { roll: 5, name: 'Mind wound!', description: "Can't cast this spell again for a week.", effect: { type: 'lose_spell_week' } },
  { roll: 6, name: 'Discorporation!', description: 'One random piece of gear disappears forever.', effect: { type: 'gear_disappears' } },
  { roll: 7, name: 'Spell worm!', description: 'Lose ability to cast a random spell each turn until passing DC 12 CON check; regain after rest.', effect: { type: 'lose_random_spell_until_con_check' } },
  { roll: 8, name: 'Harmonic failure!', description: 'Lose ability to cast a random spell until rest.', effect: { type: 'lose_random_spell_until_rest' } },
  { roll: 9, name: 'Poof!', description: 'Suppress all light within near distance (including sunlight and magical) for 10 rounds.', effect: { type: 'suppress_light', rounds: 10 } },
  { roll: 10, name: 'The horror!', description: 'Scream uncontrollably for 3 rounds in Primordial, drawing attention.', effect: { type: 'scream', rounds: 3 } },
  { roll: 11, name: 'Energy surge!', description: 'Glow bright purple for 10 rounds. Enemies have advantage on attacks against you.', effect: { type: 'glow', rounds: 10 } },
  { roll: 12, name: 'Unstable conduit!', description: 'Disadvantage on casting spells of the same tier for 10 rounds.', effect: { type: 'disadvantage_tier', rounds: 10 } },
];

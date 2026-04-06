import { rng } from './Random.js';

/**
 * Deck - shuffled card deck that cycles through values.
 * Matches original com.watabou.utils.Deck exactly.
 *
 * Cards are shuffled on creation and when exhausted.
 * pick() draws a card and immediately discards it for re-use.
 */
class Deck {
  constructor(values) {
    this.cards = rng.shuffle(values);
    this.pile = [];
    this._round = 0;
  }

  draw() {
    if (this.cards.length === 0) {
      if (this.pile.length === 0) return null;
      this.cards = rng.shuffle(this.pile);
      this.pile = [];
      this._round++;
    }
    return this.cards.pop();
  }

  discard(value) {
    this.pile.push(value);
    return value;
  }

  pick() {
    return this.discard(this.draw());
  }
}

export default Deck;

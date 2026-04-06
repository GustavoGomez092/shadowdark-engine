import { rng } from './Random.js';

/**
 * Markov chain text generator for demonic names.
 * Matches original com.watabou.nlp.Markov.
 */

// Phoneme definitions matching original Syllables class
const VOWELS = "you ye yo ya ie ee oo ea ei ey oi ou ai ay au oi oy ue ua u o a e i y".split(" ");
const CONSONANTS = "wh th ck ch sh gh ph qu b c d f g h j k l m n p q r s t v w x z".split(" ");

function getPhonemes(word) {
  const result = [];
  let i = 0;
  while (i < word.length) {
    let found = false;
    // Try 2-char phonemes first
    if (i + 1 < word.length) {
      const two = word.substring(i, i + 2);
      if (VOWELS.includes(two) || CONSONANTS.includes(two)) {
        result.push(two);
        i += 2;
        found = true;
      }
    }
    if (!found) {
      result.push(word[i]);
      i++;
    }
  }
  return result;
}

function countSyllables(phonemes) {
  let count = 0;
  for (const p of phonemes) {
    if (VOWELS.includes(p)) count++;
  }
  return Math.max(1, count);
}

class Markov {
  constructor(words) {
    this.chains = new Map();

    for (const word of words) {
      const phonemes = getPhonemes(word.toLowerCase());
      phonemes.push(''); // End marker

      for (let i = 0; i < phonemes.length; i++) {
        const ctx1 = i > 0 ? phonemes[i - 1] : '';
        const ctx2 = i > 1 ? phonemes[i - 2] : '';
        const key = ctx2 + '|' + ctx1;
        if (!this.chains.has(key)) {
          this.chains.set(key, []);
        }
        this.chains.get(key).push(phonemes[i]);
      }
    }
  }

  generate(maxSyllables) {
    for (let attempt = 0; attempt < 100; attempt++) {
      const result = this._tryGenerate();
      if (result && countSyllables(getPhonemes(result)) <= maxSyllables) {
        return result.charAt(0).toUpperCase() + result.slice(1);
      }
    }
    return 'Zul'; // Fallback
  }

  _tryGenerate() {
    const phonemes = [];
    let prev2 = '';
    let prev1 = '';

    for (let i = 0; i < 20; i++) {
      const key = prev2 + '|' + prev1;
      const options = this.chains.get(key);
      if (!options || options.length === 0) break;

      const next = rng.pick(options);
      if (next === '') break; // End marker

      phonemes.push(next);
      prev2 = prev1;
      prev1 = next;
    }

    return phonemes.join('');
  }
}

export default Markov;

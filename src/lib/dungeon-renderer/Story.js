import { rng } from './Random.js';
import Grammar from './Tracery.js';
import Markov from './Markov.js';
import Tags from './Tags.js';

const DEMONS = "Ahazu Akmenos Akra Akta Amnon Anakis Archimonde Ardranax Argaz Arjhan Arkeveron Azarax Azgalor Baelmon Balasar Barakas Bharash Biri Bryseis Criella Daar Damaia Damakos Dimensius Donaar Ekemon Esketra Farideh Ghesh Hakkar Harann Havilar Heskan Iados Jheri Kairon Kallista Kazzak Kava Kethtera Korinn Korvaeth Kylastra Kyronax Lerissa Leucis Magtheridon Makaria Mannoroth Medrash Mehen Melech Mephistrot Mishann Mordai Morthos Nadarr Nala Nemeia Orianna Oryxus Pandjed Patrin Pelaios Perra Phelaia Raiann Rhogar Rieta Sevraxis Shahraz Shamash Shedinn Skamos Sora Supremus Surina Talgath Tarhun Thava Therai Torinn Tyranna Tyraxis Uadjit Vaskari Xavius Voldranai Zalvroxos Zmodlor";

import grammarJSON from './grammar.json';

// Grammar data — loaded statically via import
let grammarData = grammarJSON;

/**
 * Story class - generates dungeon narrative and derives tags.
 * Matches original com.watabou.dungeon.model.Story (qb).
 */
class Story {
  static grammar = null;
  static demonic = null;

  /**
   * Load grammar data. With static import, this is a no-op.
   */
  static async loadData() {
    // grammar.json is imported statically, nothing to fetch
  }

  constructor(dungeon) {
    // Initialize grammar on first use
    if (!Story.grammar) {
      if (!grammarData) throw new Error('Grammar data not available');
      Story.grammar = new Grammar(grammarData);
      Story.demonic = new Markov(DEMONS.split(' '));
      Story.grammar.addExternal('demonicName', () => Story._demonicName());
    } else {
      Story.grammar.clearState();
    }

    const grammar = Story.grammar;

    // Boss flag: 2/3 chance
    if (rng.float() < 2 / 3) {
      grammar.flags.push('BOSS');
      grammar.fix('boss');
    }

    // Fix grammar symbols (each consumes RNG)
    grammar.fix('dung_noun');
    grammar.fix('dung');
    grammar.fix('raider');
    grammar.fix('native');
    grammar.fix('symbol');
    grammar.fix('location');

    // Generate name
    this.name = grammar.flatten('#name#');

    // Derive tags from name
    const derivedTags = Tags.deriveTags(this.name);
    for (const tag of derivedTags) {
      if (!dungeon.tags.includes(tag)) {
        dungeon.tags.push(tag);
      }
    }

    // Multi-level: 50% chance (if not single-level)
    if (!dungeon.tags.includes('single-level')) {
      if (rng.float() < 0.5) {
        Tags.resolve(dungeon.tags, 'multi-level');
      }
    }

    // String: 5% chance (if not winding)
    if (!dungeon.tags.includes('winding')) {
      if (rng.float() < 0.05) {
        Tags.resolve(dungeon.tags, 'string');
      }
    }

    // Deep: 5% chance (if not flat)
    if (!dungeon.tags.includes('flat')) {
      if (rng.float() < 0.05) {
        Tags.resolve(dungeon.tags, 'deep');
      }
    }

    // Add all tags as grammar flags
    for (const tag of dungeon.tags) {
      const flagParts = tag.toUpperCase().split(/[, ]+/);
      for (const f of flagParts) {
        if (f && !grammar.flags.includes(f)) {
          grammar.flags.push(f);
        }
      }
    }

    // Generate story hook
    this.hook = grammar.flatten('#story#');

    // Key storage
    this.keys = [];
  }

  static _demonicName() {
    if (rng.float() < 0.25) {
      // Hyphenated: 3+3 syllable
      return Story.demonic.generate(3) + '-' + Story.demonic.generate(3);
    }
    return Story.demonic.generate(4);
  }

  setFlag(flag) {
    const parts = flag.toUpperCase().split(/[, ]+/);
    for (const f of parts) {
      if (f && !Story.grammar.flags.includes(f)) {
        Story.grammar.flags.push(f);
      }
    }
  }

  initKeys(planner) {
    const keyName = Story.grammar.flatten('#key.a#');
    this.keys = [];
    for (let i = 0; i < planner.nKeys; i++) {
      this.keys.push(keyName);
    }
  }

  /**
   * Generate room description. Matches original getRoomDesc (line 9380).
   * NOTE: word() is always called (consumes RNG), even for rooms that
   * will have no description. Do NOT add early returns before pushRules.
   */
  getRoomDesc(planner, room) {
    const grammar = Story.grammar;
    grammar.pushRules('room', [room.word()]);

    const parts = [];

    if (planner.backdoor && room === planner.backdoor) {
      parts.push('A rear entrance into the ' + grammar.flatten('#dung_noun#') + '.');
    }

    if (room.event) {
      parts.push(grammar.flatten('#event#'));
    }

    if (room.gate) {
      parts.push(this._getGateText(planner, room));
    }

    if (room.loot) {
      parts.push(grammar.flatten('#loot#'));
    }

    if (room.key) {
      parts.push(this._getKeyText(planner, room));
    }

    grammar.popRules('room');

    return parts.length > 0 ? parts.join(' ') : null;
  }

  _getGateText(planner, room) {
    const grammar = Story.grammar;
    // Find gate exits (type === 5) matching original getGateText (line 9396)
    const gateExits = room.getExits().filter(d => d.type === 5);
    if (gateExits.length === 0) return '';

    const dirText = this._dir2text(room, gateExits[0]);
    grammar.pushRules('dir', [dirText]);
    grammar.pushRules('num', [Story.num2text(planner.nKeys)]);

    let text;
    switch (planner.nKeys) {
      case 0:
        text = grammar.flatten('#gate_nokey#');
        break;
      case 1:
        text = grammar.flatten('#gate_onekey#');
        break;
      default:
        text = grammar.flatten('#gate_manykeys#');
        break;
    }

    grammar.popRules('num');
    grammar.popRules('dir');
    return text;
  }

  _getKeyText(planner, room) {
    const grammar = Story.grammar;
    const keyName = this.keys.length > 0 ? this.keys.pop() : 'a key';
    grammar.pushRules('treasure', [keyName]);
    grammar.pushRules('special_item', [keyName]);
    const text = grammar.flatten('#loot#');
    grammar.popRules('special_item');
    grammar.popRules('treasure');
    return text;
  }

  _dir2text(room, door) {
    const d = room.out(door);
    if (!d) return 'nearby';
    if (d.y === -1) return Story.grammar.flatten('#north#');
    if (d.y === 1) return Story.grammar.flatten('#south#');
    if (d.x === 1) return Story.grammar.flatten('#east#');
    if (d.x === -1) return Story.grammar.flatten('#west#');
    return 'nearby';
  }

  static num2text(n) {
    const words = ['zero', 'one', 'two', 'three', 'four', 'five'];
    return n < words.length ? words[n] : 'many';
  }
}

export default Story;

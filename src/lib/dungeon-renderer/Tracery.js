import { rng } from './Random.js';

/**
 * Tracery grammar engine.
 * Matches original com.watabou.tracery implementation.
 */

/** Rule selector: uniform random */
class RuleSelector {
  constructor(rules) {
    this.rules = rules;
  }
  select() {
    return this.rules[rng.float() * this.rules.length | 0];
  }
}

/** Deck-based rule selector: no repeats until exhausted */
class DeckRuleSelector {
  constructor(rules) {
    this.rules = rules;
    this.deck = [...rules];
  }
  select() {
    if (this.deck.length === 0) {
      this.deck = [...this.rules];
    }
    const idx = rng.float() * this.deck.length | 0;
    return this.deck.splice(idx, 1)[0];
  }
}

/**
 * Check if a word is plural (matches original hb.isPlural).
 * A word is considered plural if it ends with "s" but not "ss".
 */
function isPlural(s) {
  const lower = s.toLowerCase();
  return lower.endsWith('s') && !lower.endsWith('ss');
}

/**
 * Check if a character is a vowel (matches original hb.isVowel).
 */
function isVowel(ch) {
  return 'ieaou'.includes(ch.toLowerCase());
}

/** English modifiers matching original hb/ModsEngBasic */
const MODIFIERS = {
  capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  },
  capitalizeAll(s) {
    // Original hb.capitalizeAll: capitalize after non-alphanumeric, non-apostrophe chars
    let result = '';
    let capitalize = true;
    for (let i = 0; i < s.length; i++) {
      const ch = s.charAt(i);
      const isAlphaNum = (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9');
      if (isAlphaNum || ch === "'") {
        result += capitalize ? ch.toUpperCase() : ch;
        capitalize = false;
      } else {
        capitalize = true;
        result += ch;
      }
    }
    return result;
  },
  caps(s) {
    return s.toUpperCase();
  },
  a(s) {
    if (!s) return s;
    // Original hb.a: special case for "u__i__" words (e.g. "unicorn" → "a unicorn")
    if (s.charAt(0).toLowerCase() === 'u' && s.length > 2 && s.charAt(2).toLowerCase() === 'i') {
      return 'a ' + s;
    }
    if (isVowel(s.charAt(0))) return 'an ' + s;
    return 'a ' + s;
  },
  s(s) {
    if (!s) return s;
    if (s.endsWith('child')) return s.slice(0, -5) + 'children';
    if (s.endsWith('fish') || s.endsWith('sheep') || s.endsWith('deer')) return s;
    if (s.endsWith('s') || s.endsWith('x') || s.endsWith('z') || s.endsWith('ch') || s.endsWith('sh'))
      return s + 'es';
    if (s.endsWith('y') && !'aeiou'.includes(s.charAt(s.length - 2)))
      return s.slice(0, -1) + 'ies';
    return s + 's';
  },
  firstS(s) {
    const parts = s.split(' ');
    parts[0] = MODIFIERS.s(parts[0]);
    return parts.join(' ');
  },
  possessive(s) {
    return s.endsWith('s') ? s + "'" : s + "'s";
  },
  ed(s) {
    // Matches original hb.ed exactly
    const last = s.charAt(s.length - 1);
    switch (last) {
      case 'e': return s + 'd';
      case 'h': return s + 'ed';
      case 's': return s + 'ed';
      case 'x': return s + 'ed';
      case 'y':
        return isVowel(s.charAt(s.length - 2))
          ? s + 'd'
          : s.slice(0, -1) + 'ied';
      default: return s + 'ed';
    }
  },
  ing(s) {
    // Matches original hb.ing: only checks for trailing "e"
    if (s.endsWith('e')) return s.slice(0, -1) + 'ing';
    return s + 'ing';
  },
  // Plural-aware modifiers matching original hb.thiss/they/them/is/was
  this(s) { return isPlural(s) ? 'these' : 'this'; },
  they(s) { return isPlural(s) ? 'they' : 'it'; },
  them(s) { return isPlural(s) ? 'them' : 'it'; },
  is(s) { return isPlural(s) ? 'are' : 'is'; },
  was(s) { return isPlural(s) ? 'were' : 'was'; },
};

class Grammar {
  constructor(rawObj) {
    this.symbols = new Map();
    this.flags = [];
    this.externals = new Map();
    this.SelectorClass = DeckRuleSelector;
    this._autoID = 0;

    if (rawObj) {
      this._loadRaw(rawObj);
    }
  }

  clearState() {
    for (const [name, sym] of this.symbols) {
      // Restore to base rules and clear selector (matching original Symbol.clearState)
      sym.rules = sym.baseRules;
      sym.stack = [];
      sym.selector = null;
    }
    this.flags = [];
  }

  _loadRaw(obj) {
    this._autoID = 0;
    for (const key in obj) {
      let rules = obj[key];
      if (typeof rules === 'string') rules = [rules];
      const processed = rules.map(r => this._processRule(r));
      this.symbols.set(key, {
        rules: processed,
        baseRules: processed,
        stack: [],
        selector: null
      });
    }
  }

  /**
   * Process {option1|option2} brace syntax in a rule string.
   * Matches original Rf.process(): handles nested braces, creates auto-symbols
   * via pushRules (with DeckRuleSelector), and recurses on the remainder.
   */
  _processRule(rule) {
    const braceStart = rule.indexOf('{');
    if (braceStart === -1) return rule;

    // Find the matching closing brace, handling nesting
    let depth = 1;
    const options = [];
    let segStart = braceStart + 1;
    let braceEnd = -1;

    for (let i = braceStart + 1; i < rule.length; i++) {
      const ch = rule.charAt(i);
      if (ch === '|' && depth === 1) {
        options.push(rule.substring(segStart, i));
        segStart = i + 1;
      } else if (ch === '{') {
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0) {
          options.push(rule.substring(segStart, i));
          braceEnd = i;
          break;
        }
      }
    }

    if (braceEnd === -1) return rule; // Unmatched brace

    const before = rule.substring(0, braceStart);
    const after = rule.substring(braceEnd + 1);

    // Single option = optional text (50/50), multiple = choice
    const autoRules = options.length === 1 ? [options[0], ''] : options;
    const autoName = this._addAutoRules(autoRules);

    // Recurse on the remainder (after the closing brace)
    return before + '#' + autoName + '#' + this._processRule(after);
  }

  /** Create an auto-named symbol via pushRules, matching original addAutoRules */
  _addAutoRules(rules) {
    const name = '_auto' + this._autoID++;
    this.pushRules(name, rules);
    return name;
  }

  addExternal(name, fn) {
    this.externals.set(name, fn);
  }

  /** Resolve a symbol to a fixed value and push it */
  fix(symbolName) {
    const result = this.flatten('#' + symbolName + '#');
    this.pushRules(symbolName, [result]);
    return result;
  }

  pushRules(name, rules) {
    // Process brace syntax in pushed rules (matching original Rf constructor)
    const processed = rules.map(r => this._processRule(r));
    if (!this.symbols.has(name)) {
      this.symbols.set(name, {
        rules: processed,
        baseRules: processed,
        stack: [],
        selector: null
      });
    } else {
      const sym = this.symbols.get(name);
      // Save current rules AND selector state onto stack (matching original
      // Symbol.pushRuleSet which pushes a new RuleSet, each with own selector)
      sym.stack.push({ rules: sym.rules, selector: sym.selector });
      sym.rules = processed;
      sym.selector = null;
    }
  }

  popRules(name) {
    const sym = this.symbols.get(name);
    if (sym && sym.stack.length > 0) {
      const prev = sym.stack.pop();
      sym.rules = prev.rules;
      sym.selector = prev.selector; // Restore selector state
    }
  }

  /**
   * Main flatten: expand a Tracery string recursively.
   * Uses Pd.parse()-style tokenization matching the original:
   * - type 0: literal text
   * - type 1: tag (#...#)
   * - type 2: action ([...])
   * Handles nested brackets, escape characters.
   */
  flatten(str) {
    if (str == null) return '';
    const segments = this._parse(str);
    let result = '';
    for (const seg of segments) {
      switch (seg.type) {
        case 0: // literal text
          result += seg.raw;
          break;
        case 1: // tag
          result += this._expandTag(seg.raw);
          break;
        case 2: // action
          this._executeAction(seg.raw);
          break;
      }
    }
    return result;
  }

  /**
   * Parse a Tracery string into segments, matching original Pd.parse().
   * Returns array of { type: 0|1|2, raw: string }
   */
  _parse(str) {
    if (str == null) return [];
    let depth = 0;      // bracket nesting depth
    let inTag = false;   // inside #...#
    const segments = [];
    let escaped = false;
    let start = 0;
    let escapedText = '';
    let escapeStart = -1;

    const emit = (s, e, type) => {
      let raw;
      if (escapeStart !== -1) {
        raw = escapedText + '\\' + str.substring(escapeStart + 1, e);
        escapeStart = -1;
        escapedText = '';
      } else {
        raw = str.substring(s, e);
      }
      segments.push({ type, raw });
    };

    for (let i = 0; i < str.length; i++) {
      if (escaped) {
        escaped = false;
        continue;
      }
      const ch = str.charAt(i);
      switch (ch) {
        case '#':
          if (depth === 0) {
            if (inTag) {
              emit(start, i, 1);
            } else if (start < i) {
              emit(start, i, 0);
            }
            start = i + 1;
            inTag = !inTag;
          }
          break;
        case '[':
          if (!inTag && depth === 0 && start < i) {
            emit(start, i, 0);
            start = i + 1;
          } else if (!inTag && depth === 0) {
            start = i + 1;
          }
          depth++;
          break;
        case ']':
          depth--;
          if (!inTag && depth === 0) {
            emit(start, i, 2);
            start = i + 1;
          }
          break;
        case '\\':
          escapedText += str.substring(start, i);
          start = i + 1;
          escapeStart = i;
          escaped = true;
          break;
      }
    }
    if (start < str.length) {
      emit(start, str.length, 0);
    }

    // Filter out empty literal segments (matching original)
    return segments.filter(s => s.type !== 0 || s.raw.length > 0);
  }

  /**
   * Expand a tag, matching original TraceryNode expand (type 1).
   * Handles pre-actions embedded in tags (e.g. "[action]symbol.mod")
   * and post-actions (undo of push actions).
   */
  _expandTag(tag) {
    // Parse the tag using Pd.parseTag approach
    const segments = this._parse(tag);
    const preactions = [];
    let symbolPart = null;

    for (const seg of segments) {
      if (seg.type === 0) {
        if (symbolPart == null) {
          symbolPart = seg.raw;
        }
      } else if (seg.type === 2) {
        preactions.push(seg.raw);
      }
    }

    // Parse symbol.modifier1.modifier2
    let symbolName = null;
    let modifiers = [];
    if (symbolPart != null) {
      const parts = symbolPart.split('.');
      symbolName = parts[0];
      modifiers = parts.slice(1);
    }

    // Activate pre-actions and collect undo (post) actions
    const postactions = [];
    for (const pa of preactions) {
      const colonIdx = pa.indexOf(':');
      if (colonIdx !== -1) {
        const rule = pa.substring(colonIdx + 1);
        if (rule !== 'POP') {
          // Push action -> needs undo (pop)
          postactions.push(pa.substring(0, colonIdx) + ':POP');
        }
      }
      this._executeAction(pa);
    }

    // Select and expand the rule
    let value;
    if (symbolName != null) {
      value = this._selectRule(symbolName);
      if (value == null) {
        value = '((' + symbolName + '))';
      } else {
        // Recursively flatten the selected rule
        value = this.flatten(value);
      }
    } else {
      value = '';
    }

    // Apply modifiers
    for (const mod of modifiers) {
      if (MODIFIERS[mod]) {
        value = MODIFIERS[mod](value);
      }
    }

    // Activate post-actions (undo pushes)
    for (const pa of postactions) {
      this._executeAction(pa);
    }

    return value;
  }

  _selectRule(symbolName) {
    // Check externals first
    if (this.externals.has(symbolName)) {
      return this.externals.get(symbolName)();
    }

    // Start with base symbol, then check flag-conditioned overrides
    // (matching original grammar.selectRule)
    let sym = this.symbols.get(symbolName) || null;
    for (const flag of this.flags) {
      const condKey = flag + '?-' + symbolName;
      if (this.symbols.has(condKey)) {
        sym = this.symbols.get(condKey);
        break;
      }
    }

    if (sym != null) {
      const result = this._pickRule(sym);
      if (result != null) return result;
    }

    return null;
  }

  _pickRule(sym) {
    if (sym.rules.length === 0) return '';

    // Use selector (DeckRuleSelector by default), matching original Rf.selectRule
    if (!sym.selector) {
      sym.selector = new this.SelectorClass(sym.rules);
    }

    // Loop until we get a valid rule (handle conditional rules)
    // Original loops forever; we cap at 100 to prevent hangs
    for (let attempt = 0; attempt < 100; attempt++) {
      const rule = sym.selector.select();
      const validated = this._validateRule(rule);
      if (validated != null) return validated;
    }
    return sym.rules[0]; // Fallback (should not normally be reached)
  }

  /** Handle conditional rules like "0.5?-text" or "FLAG?-text".
   *  Matches original grammar.validateRule() using indexOf("?-"). */
  _validateRule(rule) {
    const idx = rule.indexOf('?-');
    if (idx === -1) return rule;

    const condition = rule.substring(0, idx);
    const text = rule.substring(idx + 2);

    if (this._evalCondition(condition)) {
      return text;
    }
    return null; // Try another rule
  }

  /**
   * Evaluate a condition expression. Matches original grammar.eval() exactly:
   * 1. Numeric probability: rng.float() < num
   * 2. AND (&): split and recurse, short-circuit on false
   * 3. NOT (!): negate flag check
   * 4. Flag check: this.flags.includes(flag)
   */
  _evalCondition(condition) {
    // Numeric probability
    const num = parseFloat(condition);
    if (!isNaN(num)) {
      return rng.float() < num;
    }

    // AND condition (checked BEFORE negation, matching original)
    const parts = condition.split('&');
    if (parts.length > 1) {
      for (const part of parts) {
        if (!this._evalCondition(part)) return false;
      }
      return true;
    }

    // NOT + flag check: "!FLAG" means flag is absent
    const negated = condition.charAt(0) === '!';
    const flag = negated ? condition.substring(1) : condition;
    return (this.flags.indexOf(flag) !== -1) !== negated;
  }

  /**
   * Execute an action string, matching original NodeAction.
   * - "target:rule" or "target:rule1,rule2" -> push (type 0)
   *   Rules are expanded (flattened) before being pushed.
   * - "target:POP" -> pop (type 1)
   * - "target" (no colon) -> execute (type 2): set/clear flags
   */
  _executeAction(action) {
    const colonIdx = action.indexOf(':');
    if (colonIdx !== -1) {
      const target = action.substring(0, colonIdx);
      const rule = action.substring(colonIdx + 1);
      if (rule === 'POP') {
        // Pop action
        this.popRules(target);
      } else {
        // Push action: split by comma, expand each value, then push
        const parts = rule.split(',');
        const expanded = parts.map(p => this.flatten(p));
        this.pushRules(target, expanded);
      }
    } else {
      // Execute action (set/clear flags)
      this._execute(action);
    }
  }

  /**
   * Execute a command string, matching original grammar.execute().
   * "set FLAG" adds flag(s), "clear FLAG" removes flag(s).
   * Flags are split by ", " or "," allowing multiple in one command.
   */
  _execute(cmd) {
    if (cmd.substring(0, 4) === 'set ') {
      const flagStr = cmd.substring(4);
      const flags = flagStr.split(/,\s*/);
      for (const f of flags) {
        if (f && this.flags.indexOf(f) === -1) {
          this.flags.push(f);
        }
      }
    } else if (cmd.substring(0, 6) === 'clear ') {
      const flagStr = cmd.substring(6);
      const flags = flagStr.split(/,\s*/);
      for (const f of flags) {
        const idx = this.flags.indexOf(f);
        if (idx !== -1) {
          this.flags.splice(idx, 1);
        }
      }
    }
  }
}

export { Grammar, RuleSelector, DeckRuleSelector, MODIFIERS };
export default Grammar;

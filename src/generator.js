import { WORD_LISTS } from "./wordlists.js";

const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const NUMBERS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{}|;:,.<>?";
const AMBIGUOUS = /[l1IO0]/g;

/**
 * Generate a cryptographically secure random integer in [0, max).
 */
function randomInt(max) {
  const arr = new Uint32Array(1);
  const limit = Math.floor(0xffffffff / max) * max;
  let val;
  do {
    crypto.getRandomValues(arr);
    val = arr[0];
  } while (val >= limit);
  return val % max;
}

/**
 * Pick a random item from an array.
 */
function pick(arr) {
  return arr[randomInt(arr.length)];
}

/**
 * Build the full character pool from options.
 */
export function buildCharPool(options) {
  let pool = "";
  if (options.upper) pool += UPPER;
  if (options.lower) pool += LOWER;
  if (options.numbers) pool += NUMBERS;
  if (options.symbols) pool += SYMBOLS;
  if (options.noAmbiguous) pool = pool.replace(AMBIGUOUS, "");
  return pool;
}

/**
 * Generate a random password from a character pool.
 */
function generateFromPool(pool, length) {
  if (!pool) return "";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += pool[randomInt(pool.length)];
  }
  return result;
}

/**
 * Generate a memorable multi-language passphrase.
 * Interleaves words from selected languages with optional numbers/symbols.
 */
function generatePassphrase(options, length) {
  const langs =
    options.languages && options.languages.length > 0
      ? options.languages
      : ["english"];

  // Collect word pool from selected languages
  const allWords = [];
  for (const lang of langs) {
    if (WORD_LISTS[lang]) allWords.push(...WORD_LISTS[lang]);
  }

  // Build separator / connector characters
  let connectors = "";
  if (options.numbers) connectors += NUMBERS;
  if (options.symbols) connectors += "!@#$%&*-_";

  let result = "";

  while (result.length < length) {
    const word = pick(allWords);
    // Optionally capitalise
    const formatted = options.upper
      ? word.charAt(0).toUpperCase() + word.slice(1)
      : word;
    result += formatted;

    if (result.length < length && connectors) {
      // Sprinkle 1–2 connector chars
      const count = randomInt(2) + 1;
      for (let i = 0; i < count && result.length < length; i++) {
        result += connectors[randomInt(connectors.length)];
      }
    }
  }

  // Trim / pad to exact length
  if (result.length > length) result = result.slice(0, length);
  return result;
}

/**
 * Main entry point: generate a password given user options.
 * @param {Object} options
 * @returns {string}
 */
export function generatePassword(options) {
  const length = Math.max(4, Math.min(64, options.length || 16));

  if (options.passphrase) {
    return generatePassphrase(options, length);
  }

  const pool = buildCharPool(options);
  if (!pool) return "";

  // Generate and ensure at least one char from each required set
  let password = generateFromPool(pool, length);

  // Guarantee requirements are met
  const required = [];
  if (options.upper) required.push(UPPER.replace(AMBIGUOUS, ""));
  if (options.lower) required.push(LOWER.replace(AMBIGUOUS, ""));
  if (options.numbers)
    required.push(options.noAmbiguous ? NUMBERS.replace(/[01]/g, "") : NUMBERS);
  if (options.symbols) required.push(SYMBOLS);

  if (required.length > 0 && required.length <= length) {
    const arr = password.split("");
    for (let i = 0; i < required.length; i++) {
      const set = required[i].replace(
        AMBIGUOUS,
        options.noAmbiguous ? "" : required[i],
      );
      if (set) {
        const pos = randomInt(length);
        arr[pos] = set[randomInt(set.length)];
      }
    }
    // Shuffle to avoid predictable positions
    for (let i = arr.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    password = arr.join("");
  }

  return password;
}

/**
 * Returns the full character pool size for entropy calculation.
 */
export function getPoolSize(options) {
  if (options.passphrase) {
    const langs =
      options.languages && options.languages.length > 0
        ? options.languages
        : ["english"];
    let words = 0;
    for (const lang of langs) {
      if (WORD_LISTS[lang]) words += WORD_LISTS[lang].length;
    }
    return words;
  }
  return buildCharPool(options).length;
}

export { UPPER, LOWER, NUMBERS, SYMBOLS };

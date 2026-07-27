import { getPoolSize } from "./generator.js";

/**
 * Calculate entropy in bits: H = L * log2(N)
 * where L = password length, N = pool size
 */
export function calcEntropy(options) {
  const poolSize = getPoolSize(options);
  if (poolSize <= 0) return 0;
  const length = options.length || 16;
  return length * Math.log2(poolSize);
}

/**
 * Classify entropy into strength tiers.
 * Returns { level: 'weak'|'fair'|'strong'|'excellent', label, pct }
 */
export function getStrength(entropy) {
  if (entropy < 28) return { level: "weak", label: "Weak", pct: 20 };
  if (entropy < 60) return { level: "fair", label: "Fair", pct: 45 };
  if (entropy < 90) return { level: "strong", label: "Strong", pct: 72 };
  return { level: "excellent", label: "Excellent", pct: 100 };
}

/**
 * Estimate time to crack at a given guesses-per-second rate.
 * Uses 1 trillion (1e12) guesses/sec as a modern offline benchmark.
 */
export function crackTime(entropy) {
  if (entropy <= 0) return "";
  const guessesPerSec = 1e12; // 1 trillion/sec (GPU cluster)
  const combinations = Math.pow(2, entropy);
  const seconds = combinations / (2 * guessesPerSec); // avg = half keyspace

  if (seconds < 1) return "< 1 second";
  if (seconds < 60) return `${Math.round(seconds)} seconds`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
  if (seconds < 86400 * 365) return `${Math.round(seconds / 86400)} days`;
  if (seconds < 86400 * 365 * 1000)
    return `${Math.round(seconds / (86400 * 365))} years`;
  if (seconds < 86400 * 365 * 1e6)
    return `${(seconds / (86400 * 365 * 1000)).toFixed(1)}K years`;
  if (seconds < 86400 * 365 * 1e9)
    return `${(seconds / (86400 * 365 * 1e6)).toFixed(1)}M years`;
  return "Heat death of the universe";
}

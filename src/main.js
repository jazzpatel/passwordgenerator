import "./style.css";
import { generatePassword } from "./generator.js";
import { calcEntropy, getStrength, crackTime } from "./strength.js";
import { buildReels, animateReels } from "./animation.js";

// ─── PWA: Service Worker registration ────────────────────────────────────
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });

      // Watch for an updated SW waiting to take over
      const onNewWorker = (worker) => {
        worker.addEventListener("statechange", () => {
          if (
            worker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            showUpdateBanner(worker);
          }
        });
      };

      if (reg.installing) onNewWorker(reg.installing);
      reg.addEventListener("updatefound", () => onNewWorker(reg.installing));

      // Periodically check for updates every 60 s when the page is visible
      setInterval(() => {
        if (document.visibilityState === "visible") reg.update();
      }, 60_000);
    } catch (err) {
      console.warn("[SW] Registration failed:", err);
    }
  });

  // Reload once the new SW has claimed the page
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

function showUpdateBanner(worker) {
  // Only show one banner at a time
  if (document.getElementById("sw-update-banner")) return;

  const banner = document.createElement("div");
  banner.id = "sw-update-banner";
  banner.setAttribute("role", "status");
  banner.innerHTML = `
    <span>🔄 A new version of SpinLock is ready.</span>
    <button id="sw-update-btn">Update now</button>
    <button id="sw-dismiss-btn" aria-label="Dismiss">✕</button>
  `;
  Object.assign(banner.style, {
    position: "fixed",
    bottom: "24px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: "9999",
    background: "#1a1a3e",
    color: "#e2e8f0",
    border: "1.5px solid #7c3aed",
    borderRadius: "12px",
    padding: "12px 18px",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    fontSize: "0.9rem",
    whiteSpace: "nowrap",
    boxShadow: "0 4px 32px rgba(124,58,237,0.45)",
    animation: "fadeSlideUp 0.3s ease",
  });

  // Inject the keyframe once
  if (!document.getElementById("sw-banner-style")) {
    const style = document.createElement("style");
    style.id = "sw-banner-style";
    style.textContent = `
      @keyframes fadeSlideUp {
        from { opacity: 0; transform: translateX(-50%) translateY(12px); }
        to   { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
      #sw-update-btn {
        background: #7c3aed; color: #fff; border: none;
        border-radius: 8px; padding: 6px 16px;
        cursor: pointer; font-weight: 700; font-size: 0.88rem;
      }
      #sw-update-btn:hover { background: #a855f7; }
      #sw-dismiss-btn {
        background: transparent; color: #94a3b8; border: none;
        cursor: pointer; font-size: 1.1rem; line-height: 1;
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(banner);

  document.getElementById("sw-update-btn").onclick = () => {
    worker.postMessage("SKIP_WAITING");
    banner.remove();
  };
  document.getElementById("sw-dismiss-btn").onclick = () => banner.remove();
}

// ─── PWA: Install prompt ───────────────────────────────────────────────────
let deferredInstallPrompt = null;
const installBtn = document.getElementById("install-btn");

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  installBtn.style.display = "inline-flex";
});

installBtn.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  if (outcome === "accepted") installBtn.style.display = "none";
  deferredInstallPrompt = null;
});

// ─── DOM refs ──────────────────────────────────────────────────────────────
const reelsContainer = document.getElementById("reels-container");
const spinBtn = document.getElementById("spin-btn");
const copyBtn = document.getElementById("copy-btn");
const copyIcon = document.getElementById("copy-icon");
const toast = document.getElementById("toast");

const lengthSlider = document.getElementById("length-slider");
const lengthDisplay = document.getElementById("length-display");

const optUpper = document.getElementById("opt-upper");
const optLower = document.getElementById("opt-lower");
const optNumbers = document.getElementById("opt-numbers");
const optSymbols = document.getElementById("opt-symbols");
const optNoAmbiguous = document.getElementById("opt-no-ambiguous");
const optPassphrase = document.getElementById("opt-passphrase");
const languageOptions = document.getElementById("language-options");
const langOpts = () =>
  [...document.querySelectorAll(".lang-opt:checked")].map((el) => el.value);

const optAutoClear = document.getElementById("opt-auto-clear");
const autoClearOptions = document.getElementById("auto-clear-options");
const clearTimeout_ = document.getElementById("clear-timeout");

const strengthBar = document.getElementById("strength-bar");
const strengthText = document.getElementById("strength-text");
const crackTimeEl = document.getElementById("crack-time");
const entropyText = document.getElementById("entropy-text");

const embedCode = document.getElementById("embed-code");
const copyEmbedBtn = document.getElementById("copy-embed-btn");

// ─── State ─────────────────────────────────────────────────────────────────
let currentPassword = "";
let isSpinning = false;
let autoClearTimer = null;

// ─── Helpers ───────────────────────────────────────────────────────────────
function getOptions() {
  return {
    length: parseInt(lengthSlider.value, 10),
    upper: optUpper.checked,
    lower: optLower.checked,
    numbers: optNumbers.checked,
    symbols: optSymbols.checked,
    noAmbiguous: optNoAmbiguous.checked,
    passphrase: optPassphrase.checked,
    languages: langOpts(),
  };
}

function showToast(msg, duration = 2500) {
  toast.textContent = msg;
  toast.classList.add("visible");
  setTimeout(() => toast.classList.remove("visible"), duration);
}

// ─── Strength indicator ────────────────────────────────────────────────────
function updateStrength() {
  const options = getOptions();
  const entropy = calcEntropy(options);
  const { level, label } = getStrength(entropy);
  const crack = crackTime(entropy);

  // Clear all classes first
  strengthBar.className = "strength-bar " + level;
  strengthText.className = "strength-text " + level;
  strengthText.textContent = label;
  crackTimeEl.textContent = crack ? `~${crack} to crack` : "";
  entropyText.textContent =
    entropy > 0 ? `${entropy.toFixed(1)} bits of entropy` : "";

  const bar = document.querySelector(".strength-bar-bg");
  if (bar) {
    bar.setAttribute("aria-valuenow", Math.round(entropy));
    bar.setAttribute("aria-label", `Password strength: ${label}`);
  }
}

// ─── Spin ──────────────────────────────────────────────────────────────────
async function spin() {
  if (isSpinning) return;

  const options = getOptions();
  // Need at least one character set
  if (
    !options.upper &&
    !options.lower &&
    !options.numbers &&
    !options.symbols &&
    !options.passphrase
  ) {
    showToast("⚠️ Select at least one character type!");
    return;
  }

  const password = generatePassword(options);
  if (!password) {
    showToast("⚠️ Could not generate password with current options.");
    return;
  }

  currentPassword = password;
  isSpinning = true;
  spinBtn.disabled = true;
  copyBtn.style.display = "none";

  // Calculate dynamic duration based on length (1.5s–3s)
  const duration = Math.min(3000, Math.max(1500, 1200 + password.length * 55));

  const reels = buildReels(reelsContainer, password);

  await animateReels(reels, password, duration);

  // Show copy button, update strength
  copyBtn.style.display = "flex";
  copyBtn.classList.remove("copied");
  copyIcon.textContent = "📋";
  updateStrength();

  isSpinning = false;
  spinBtn.disabled = false;

  // Announce to screen readers
  reelsContainer.setAttribute("aria-label", `Generated password: ${password}`);
}

// ─── Copy ──────────────────────────────────────────────────────────────────
async function copyPassword() {
  if (!currentPassword) return;

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(currentPassword);
    } else {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = currentPassword;
      ta.style.cssText = "position:fixed;opacity:0;";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }

    copyBtn.classList.add("copied");
    copyIcon.textContent = "✅";
    showToast("✅ Password copied to clipboard!");

    // Haptic feedback on mobile
    if (navigator.vibrate) navigator.vibrate(50);

    // Reset copy button after 2.5s
    setTimeout(() => {
      copyBtn.classList.remove("copied");
      copyIcon.textContent = "📋";
    }, 2500);

    // Auto-clear clipboard if enabled
    if (optAutoClear.checked) {
      const secs = parseInt(clearTimeout_.value, 10);
      if (autoClearTimer) clearTimeout(autoClearTimer);
      autoClearTimer = setTimeout(async () => {
        try {
          // Only clear if our password is still in clipboard
          const clip = await navigator.clipboard.readText().catch(() => "");
          if (clip === currentPassword) {
            await navigator.clipboard.writeText("");
            showToast(`🗑️ Clipboard cleared after ${secs}s`);
          }
        } catch (_) {}
      }, secs * 1000);
    }
  } catch (err) {
    showToast("❌ Could not copy — please copy manually.");
  }
}

// ─── Presets ───────────────────────────────────────────────────────────────
const PRESETS = {
  balanced: {
    length: 16,
    upper: true,
    lower: true,
    numbers: true,
    symbols: true,
    noAmbiguous: false,
    passphrase: false,
  },
  max: {
    length: 32,
    upper: true,
    lower: true,
    numbers: true,
    symbols: true,
    noAmbiguous: true,
    passphrase: false,
  },
  memorable: {
    length: 20,
    upper: true,
    lower: true,
    numbers: true,
    symbols: false,
    noAmbiguous: false,
    passphrase: true,
  },
  pin: {
    length: 8,
    upper: false,
    lower: false,
    numbers: true,
    symbols: false,
    noAmbiguous: true,
    passphrase: false,
  },
};

function applyPreset(name) {
  const p = PRESETS[name];
  if (!p) return;
  lengthSlider.value = p.length;
  lengthDisplay.textContent = p.length;
  syncLengthRadio(p.length);
  optUpper.checked = p.upper;
  optLower.checked = p.lower;
  optNumbers.checked = p.numbers;
  optSymbols.checked = p.symbols;
  optNoAmbiguous.checked = p.noAmbiguous;
  optPassphrase.checked = p.passphrase;
  languageOptions.classList.toggle("hidden", !p.passphrase);
  updateStrength();

  document.querySelectorAll(".btn-preset").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.preset === name);
  });
}

// ─── Embed code ────────────────────────────────────────────────────────────
function updateEmbedCode() {
  const origin = window.location.origin;
  embedCode.textContent = `<!-- SpinLock Password Generator Widget -->\n<iframe\n  src="${origin}"\n  width="100%"\n  height="640"\n  frameborder="0"\n  allow="clipboard-write"\n  title="SpinLock Password Generator"\n></iframe>`;
}

// ─── Length radio pills sync ───────────────────────────────────────────────
function syncLengthRadio(value) {
  const val = parseInt(value, 10);
  document.querySelectorAll('.radio-pill input[type="radio"]').forEach((r) => {
    r.checked = parseInt(r.value, 10) === val;
  });
}

// ─── Event Listeners ───────────────────────────────────────────────────────
spinBtn.addEventListener("click", spin);
copyBtn.addEventListener("click", copyPassword);

lengthSlider.addEventListener("input", () => {
  lengthDisplay.textContent = lengthSlider.value;
  syncLengthRadio(lengthSlider.value);
  updateStrength();
});

// Radio pills → slider
document.querySelectorAll('.radio-pill input[type="radio"]').forEach((r) => {
  r.addEventListener("change", () => {
    if (r.checked) {
      lengthSlider.value = r.value;
      lengthDisplay.textContent = r.value;
      updateStrength();
    }
  });
});

[optUpper, optLower, optNumbers, optSymbols, optNoAmbiguous].forEach((el) => {
  el.addEventListener("change", updateStrength);
});

optPassphrase.addEventListener("change", () => {
  languageOptions.classList.toggle("hidden", !optPassphrase.checked);
  updateStrength();
});

document.querySelectorAll(".lang-opt").forEach((el) => {
  el.addEventListener("change", updateStrength);
});

optAutoClear.addEventListener("change", () => {
  autoClearOptions.classList.toggle("hidden", !optAutoClear.checked);
});

document.querySelectorAll(".btn-preset").forEach((btn) => {
  btn.addEventListener("click", () => applyPreset(btn.dataset.preset));
});

copyEmbedBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(embedCode.textContent);
    copyEmbedBtn.textContent = "✅ Copied!";
    setTimeout(() => (copyEmbedBtn.textContent = "📋 Copy embed code"), 2000);
  } catch (_) {}
});

// Keyboard shortcut: Enter / Space on spin btn, 'c' to copy
document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
  if (e.key === "Enter" || e.key === " ") spin();
  if (e.key === "c" || e.key === "C") copyPassword();
});

// ─── Init ──────────────────────────────────────────────────────────────────
applyPreset("balanced");
updateEmbedCode();
updateStrength();

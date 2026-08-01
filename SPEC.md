# SpinLock — Slot-Machine Password Generator

## Product Overview

SpinLock is a Progressive Web App (PWA) that generates strong, customizable passwords through a playful, tactile interface inspired by a slot machine. Instead of instantly displaying a random string, each character "reels" into place with a physics-based spin animation, giving users visual confirmation that true randomness is at work — while still delivering enterprise-grade password strength.

SpinLock is designed as both a standalone web application and an embeddable widget, so any third-party site (auth flows, account settings pages, security blogs, dev tools) can drop in a fully functional password generator with a single snippet.

---

## Core Features

### 1. Password Configuration

- **Length control**: Slider or stepper input, typically ranging from 8–64 characters, with sensible defaults (e.g., 16).
- **Character set options**:
  - Uppercase letters (A–Z)
  - Lowercase letters (a–z)
  - Numbers (0–9)
  - Symbols (e.g., `!@#$%^&*`)
  - Toggle to exclude ambiguous characters (`l`, `1`, `I`, `0`, `O`)
- **Multi-language word blending**: Users select two or more languages (e.g., English + Spanish, French + Japanese romaji) from a curated word list. The generator interleaves syllables or whole words from each language, optionally combined with numbers/symbols, producing memorable yet high-entropy passphrases (e.g., `Tigre42!Falcon`).
- **Presets**: Quick-select buttons for common use cases — "PIN-style numeric," "Max security," "Memorable passphrase," "Balanced."

### 2. Strength Indicator

- Real-time strength meter (weak → fair → strong → excellent) driven by entropy calculation (bits of entropy based on character pool size and length), not just character-type counting.
- Visual meter (color-coded bar or gauge) plus a text label and estimated "time to crack" against common brute-force benchmarks.
- Updates live as configuration options change, before a password is even generated.

### 3. Slot-Machine Spin Animation

- A **"Spin" button** triggers generation.
- Each character position is rendered as an independent reel.
- Reels animate through a randomized sequence of characters with realistic motion physics:
  - **Acceleration phase**: reel spin speed ramps up from a standstill.
  - **Constant high-speed phase**: characters blur past at top speed.
  - **Deceleration phase**: spin gradually slows.
  - **Settle**: reel locks onto the final character with a subtle bounce/snap.
- Reels can be staggered so multiple characters are spinning simultaneously but stop at slightly offset times (left-to-right or randomized order), reinforcing the slot-machine feel.
- Animation timing and easing (e.g., ease-in for acceleration, ease-out for deceleration) are tuned so the whole sequence completes in roughly 1.5–3 seconds regardless of password length.
- Reduced-motion mode available for accessibility (instant reveal with a subtle fade instead of spin).

### 4. Copy to Clipboard

- One-click "Copy" button appears once the spin completes.
- Visual/haptic confirmation (checkmark animation, toast notification) on successful copy.
- Clipboard access uses the standard async Clipboard API with a fallback for unsupported browsers.
- Optional auto-clear of clipboard after a configurable timeout for added security.

### 5. Progressive Web App Capabilities

- Installable on desktop and mobile home screens.
- Offline-first: all generation logic runs client-side, so the app functions without a network connection.
- Fast load via service worker caching.
- Responsive layout optimized for both mobile touch and desktop pointer interactions.

### 6. Embeddable Component

- Packaged as a self-contained widget (Web Component or iframe-based embed) so external sites can integrate SpinLock with a single script tag or embed code.
- Configurable via HTML attributes or a JS config object (default length, allowed character sets, theme/color customization, language options).
- Emits events (e.g., `passwordGenerated`, `passwordCopied`) so host sites can hook into the generation flow if needed.
- Scoped styles to avoid CSS conflicts with the host page.
- Lightweight bundle size to minimize impact on host site performance.

---

## Security & Privacy Principles

- All password generation happens locally in the browser using a cryptographically secure random number generator (`crypto.getRandomValues`) — no passwords are ever transmitted to a server.
- No storage or logging of generated passwords.
- Multi-language word lists are static, bundled assets — no external API calls required for generation.

---

## Example User Flow

1. User opens SpinLock (web app or embedded widget).
2. Adjusts length, character types, and optionally selects two languages for word blending.
3. Strength indicator updates live as options change.
4. User taps **Spin**.
5. Reels accelerate, spin, and decelerate into place, character by character.
6. Final password displays with an updated strength score.
7. User taps **Copy** and pastes the password wherever needed.

---

## Suggested Tech Stack (Implementation Notes)

- **Frontend**: React or vanilla Web Components for maximum embeddability.
- **Animation**: CSS transitions/keyframes or a lightweight animation library (e.g., Framer Motion, GSAP) for the reel physics.
- **PWA**: Service worker + manifest.json for installability and offline support.
- **Randomness**: Web Crypto API for entropy generation.
- **Packaging**: Distributed as an npm package and a CDN-hosted script for embed use cases.

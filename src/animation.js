/**
 * Slot-machine reel animation engine.
 *
 * Each character position gets its own reel element.
 * The animation sequence:
 *   1. Acceleration  — fast random chars scroll by
 *   2. Top speed     — blur of characters
 *   3. Deceleration  — slows down
 *   4. Settle        — snaps to final char with bounce
 *
 * Reduced motion: instant reveal with fade.
 */

const CHARSET_FOR_ANIM =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";

function randomChar() {
  return CHARSET_FOR_ANIM[Math.floor(Math.random() * CHARSET_FOR_ANIM.length)];
}

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Build reel DOM elements for each character of `password`.
 * Returns array of reel wrapper elements.
 */
export function buildReels(container, password) {
  container.innerHTML = "";
  const reels = [];

  for (let i = 0; i < password.length; i++) {
    const reel = document.createElement("div");
    reel.className = "reel";
    reel.setAttribute("aria-hidden", "true");

    const inner = document.createElement("div");
    inner.className = "reel-inner";

    // Populate with random chars for the scroll sequence + final char at bottom
    // We'll animate translateY to scroll through them
    const spinChars = [];
    const spinCount = 20 + Math.floor(Math.random() * 10);
    for (let j = 0; j < spinCount; j++) {
      spinChars.push(randomChar());
    }
    spinChars.push(password[i]); // final settled char last

    spinChars.forEach((ch) => {
      const span = document.createElement("div");
      span.className = "reel-char";
      span.textContent = ch;
      inner.appendChild(span);
    });

    reel.appendChild(inner);
    container.appendChild(reel);
    reels.push({
      el: reel,
      inner,
      finalChar: password[i],
      totalChars: spinChars.length,
    });
  }

  return reels;
}

/**
 * Animate all reels and settle them onto the final password characters.
 * Returns a Promise that resolves when all reels have settled.
 *
 * @param {Array} reels - Array returned by buildReels
 * @param {string} password
 * @param {number} totalDuration - ms for the full sequence (default 2500)
 */
export function animateReels(reels, password, totalDuration = 2500) {
  if (prefersReducedMotion()) {
    return animateInstant(reels, password);
  }

  const REEL_HEIGHT = 52; // px — must match CSS .reel height

  return new Promise((resolve) => {
    const settled = new Array(reels.length).fill(false);

    reels.forEach(({ el, inner, totalChars }, idx) => {
      // Stagger: left reels settle slightly earlier
      const staggerFactor = 0.06; // each reel is 6% of totalDuration apart
      const settleAt =
        totalDuration * 0.55 + idx * staggerFactor * totalDuration;
      const adjustedSettle = Math.min(settleAt, totalDuration * 0.92);

      // Start position: 0 (top of reel strip)
      // End position: -(totalChars - 1) * REEL_HEIGHT (final char visible)
      const endY = -(totalChars - 1) * REEL_HEIGHT;

      el.classList.add("spinning");

      // Use Web Animations API for smooth physics
      const spinAnim = inner.animate(
        [
          { transform: "translateY(0px)", easing: "cubic-bezier(0.4,0,1,1)" },
          {
            transform: `translateY(${endY * 0.85}px)`,
            easing: "cubic-bezier(0,0,0.2,1)",
            offset: adjustedSettle / totalDuration,
          },
          { transform: `translateY(${endY}px)` },
        ],
        {
          duration: totalDuration,
          fill: "forwards",
          easing: "ease-out",
        },
      );

      // When this reel finishes
      spinAnim.addEventListener("finish", () => {
        // Commit the final animated value as an inline style, then cancel
        // the animation so fill:'forwards' doesn't keep a composite effect.
        try {
          spinAnim.commitStyles();
        } catch (_) {}
        spinAnim.cancel();
        inner.style.transform = `translateY(${endY}px)`;
        el.classList.remove("spinning");
        el.classList.add("settled");
        settled[idx] = true;
        if (settled.every(Boolean)) resolve();
      });
    });
  });
}

/**
 * Reduced-motion: instant reveal with a CSS fade.
 */
function animateInstant(reels, password) {
  return new Promise((resolve) => {
    reels.forEach(({ el, inner, totalChars }) => {
      const REEL_HEIGHT = 52;
      const endY = -(totalChars - 1) * REEL_HEIGHT;
      // Start invisible, jump to final position, then fade in
      inner.style.opacity = "0";
      inner.style.transform = `translateY(${endY}px)`;
      requestAnimationFrame(() => {
        inner.style.transition = "opacity 0.3s ease";
        inner.style.opacity = "1";
        el.classList.add("settled");
      });
    });
    setTimeout(resolve, 350);
  });
}

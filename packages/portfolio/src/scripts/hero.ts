import { gsap } from 'gsap';
import { createContourField } from './contour';

const REST = { wght: 720, wdth: 78 };
const NEAR = { wght: 260, wdth: 100 };

/** Intro timeline plus the cursor-reactive name. */
export function initHero(reduced: boolean) {
  const root = document.documentElement;
  const canvas = document.querySelector<HTMLCanvasElement>('[data-contour]');
  const field = canvas ? createContourField(canvas, { animate: !reduced }) : null;
  const chars = gsap.utils.toArray<HTMLElement>('[data-char]');
  const intro = gsap.utils.toArray<HTMLElement>('[data-intro]');

  // Keep the shader in step with theme changes.
  new MutationObserver(() => field?.refreshColors()).observe(root, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => field?.refreshColors());

  if (reduced) {
    root.classList.remove('intro-pending');
    return field;
  }

  // ---- One orchestrated entrance ----
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  gsap.set(chars, { yPercent: 110, '--wght': 200, '--wdth': 100 });
  gsap.set(intro, { autoAlpha: 0, y: 18 });
  root.classList.remove('intro-pending');

  if (field) tl.to(field.state, { reveal: 1, duration: 2.6, ease: 'power2.inOut' }, 0);
  tl.to(chars, { yPercent: 0, duration: 1.3, stagger: 0.045 }, 0.15)
    .to(chars, { '--wght': REST.wght, '--wdth': REST.wdth, duration: 1.6, ease: 'power3.inOut', stagger: 0.045 }, 0.35)
    .to(intro, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.1, ease: 'power3.out' }, 0.9);

  // ---- Letters respond to the pointer: thin and widen as it approaches ----
  const hero = document.querySelector<HTMLElement>('.hero');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!hero || !finePointer) return field;

  const setters = chars.map((el) => ({
    el,
    wght: gsap.quickTo(el, '--wght', { duration: 0.7, ease: 'power3.out' }),
    wdth: gsap.quickTo(el, '--wdth', { duration: 0.9, ease: 'power3.out' }),
    cx: 0,
    cy: 0,
  }));

  // Measure resting centres once (and on resize) so changing widths
  // don't feed back into the distance calculation.
  const measure = () => {
    for (const s of setters) {
      const r = s.el.getBoundingClientRect();
      s.cx = r.left + r.width / 2;
      s.cy = r.top + r.height / 2 + window.scrollY;
    }
  };
  let ready = false;
  tl.eventCallback('onComplete', () => {
    measure();
    ready = true;
  });
  window.addEventListener('resize', () => ready && measure());

  hero.addEventListener('pointermove', (event) => {
    if (!ready) return;
    const radius = Math.max(220, window.innerWidth * 0.18);
    for (const s of setters) {
      const dist = Math.hypot(event.clientX - s.cx, event.clientY + window.scrollY - s.cy);
      const t = gsap.utils.clamp(0, 1, 1 - dist / radius);
      const eased = t * t * (3 - 2 * t);
      s.wght(gsap.utils.interpolate(REST.wght, NEAR.wght, eased));
      s.wdth(gsap.utils.interpolate(REST.wdth, NEAR.wdth, eased));
    }
  });
  hero.addEventListener('pointerleave', () => {
    if (!ready) return;
    for (const s of setters) {
      s.wght(REST.wght);
      s.wdth(REST.wdth);
    }
  });

  return field;
}

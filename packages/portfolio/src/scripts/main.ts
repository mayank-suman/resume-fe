import 'lenis/dist/lenis.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { initHero } from './hero';
import { initRoute } from './route';

gsap.registerPlugin(ScrollTrigger);

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const navHeight = () => document.querySelector<HTMLElement>('[data-nav]')?.offsetHeight ?? 0;

// ---------- Smooth scroll ----------
let lenis: Lenis | null = null;
if (!reduced) {
  lenis = new Lenis({ lerp: 0.1, anchors: { offset: -navHeight() } });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis?.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

const scrollTo = (target: HTMLElement) => {
  if (lenis) lenis.scrollTo(target, { offset: -navHeight() - 8 });
  else target.scrollIntoView({ block: 'start' });
  target.focus?.({ preventScroll: true });
};

// ---------- Theme ----------
function initTheme() {
  const root = document.documentElement;
  const toggle = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const active = () => (root.dataset.theme ?? (media.matches ? 'dark' : 'light')) as 'light' | 'dark';
  const sync = () => {
    const theme = active();
    root.dataset.activeTheme = theme;
    toggle?.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
  };
  toggle?.addEventListener('click', () => {
    const next = active() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch {
      /* storage unavailable: theme still applies for this visit */
    }
    sync();
  });
  media.addEventListener('change', sync);
  sync();
}

// ---------- Navigation ----------
function initNav() {
  const nav = document.querySelector<HTMLElement>('[data-nav]');
  const links = gsap.utils.toArray<HTMLAnchorElement>('[data-nav-link]');
  const indicator = document.querySelector<HTMLElement>('.nav__indicator');
  if (!nav) return;

  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      const y = self.scroll();
      nav.classList.toggle('is-scrolled', y > 40);
      nav.classList.toggle('is-hidden', self.direction === 1 && y > window.innerHeight * 0.8);
    },
  });

  const moveIndicator = (link: HTMLAnchorElement | null) => {
    if (!indicator) return;
    if (!link) {
      gsap.to(indicator, { opacity: 0, duration: 0.3 });
      return;
    }
    gsap.to(indicator, {
      x: link.offsetLeft,
      width: link.offsetWidth,
      opacity: 1,
      duration: reduced ? 0 : 0.55,
      ease: 'power3.out',
    });
  };

  const setCurrent = (id: string | null) => {
    let activeLink: HTMLAnchorElement | null = null;
    for (const link of links) {
      const match = link.hash === `#${id}`;
      link.setAttribute('aria-current', String(match));
      if (match) activeLink = link;
    }
    moveIndicator(activeLink);
  };

  for (const link of links) {
    const section = document.querySelector<HTMLElement>(link.hash);
    if (!section) continue;
    ScrollTrigger.create({
      trigger: section,
      start: 'top 45%',
      end: 'bottom 45%',
      onToggle: (self) => self.isActive && setCurrent(section.id),
    });
  }
  // Education sits between Skills and Contact without its own link.
  ScrollTrigger.create({ trigger: '#about', start: 'top 45%', onLeaveBack: () => setCurrent(null) });
  window.addEventListener('resize', () => moveIndicator(links.find((l) => l.getAttribute('aria-current') === 'true') ?? null));
}

// ---------- Section titles tighten as they arrive ----------
function initTitles() {
  if (reduced) return;
  for (const title of gsap.utils.toArray<HTMLElement>('[data-title]')) {
    gsap.fromTo(
      title,
      { '--wght': 240, '--wdth': 100 },
      {
        '--wght': 720,
        '--wdth': 78,
        ease: 'none',
        scrollTrigger: { trigger: title, start: 'top 95%', end: 'top 55%', scrub: 0.6 },
      },
    );
  }
}

// ---------- Experience: expandable highlights ----------
function initExpanders() {
  for (const button of gsap.utils.toArray<HTMLButtonElement>('[data-more-toggle]')) {
    const panel = document.getElementById(button.getAttribute('aria-controls') ?? '');
    const label = button.querySelector('span');
    if (!panel || !label) continue;

    const set = (open: boolean, animate: boolean) => {
      button.setAttribute('aria-expanded', String(open));
      label.textContent = (open ? button.dataset.labelOpen : button.dataset.labelClosed) ?? '';
      if (open) panel.hidden = false;
      gsap.to(panel, {
        height: open ? 'auto' : 0,
        autoAlpha: open ? 1 : 0,
        duration: animate && !reduced ? 0.6 : 0,
        ease: 'power3.inOut',
        onComplete: () => {
          if (!open) panel.hidden = true;
          // Page height changed; the initial collapse happens before triggers are measured.
          if (animate) ScrollTrigger.refresh();
        },
      });
    };

    // Content is fully visible without JS; collapse it once JS is running.
    button.hidden = false;
    set(false, false);
    button.addEventListener('click', () => set(button.getAttribute('aria-expanded') !== 'true', true));
  }
}

// ---------- Skills: where was this used? ----------
function initSkills() {
  const readout = document.querySelector<HTMLElement>('[data-skill-readout]');
  const chips = gsap.utils.toArray<HTMLButtonElement>('[data-skill]');
  if (!readout) return;
  const empty = [...readout.childNodes];

  const show = (chip: HTMLButtonElement | null) => {
    for (const c of chips) c.setAttribute('aria-pressed', String(c === chip));
    if (!chip) {
      readout.replaceChildren(...empty);
      return;
    }
    const used = JSON.parse(chip.dataset.used ?? '[]') as [string, string, string][];
    const p = document.createElement('p');
    const name = document.createElement('strong');
    name.textContent = chip.dataset.skill ?? '';
    p.append(name, ' is in my stack at ');
    used.forEach(([company, years, id], i) => {
      if (i > 0) p.append(i === used.length - 1 ? ' and ' : ', ');
      const link = document.createElement('a');
      link.href = `#role-${id}`;
      link.dataset.roleLink = '';
      link.textContent = company;
      p.append(link, ` (${years})`);
    });
    p.append('.');
    readout.replaceChildren(p);
    if (!reduced) gsap.from(p, { y: 8, autoAlpha: 0, duration: 0.45, ease: 'power3.out' });
  };

  for (const chip of chips) {
    chip.addEventListener('click', () => show(chip.getAttribute('aria-pressed') === 'true' ? null : chip));
  }
  readout.addEventListener('click', (event) => {
    const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('[data-role-link]');
    const target = link && document.querySelector<HTMLElement>(link.hash);
    if (!target) return;
    event.preventDefault();
    scrollTo(target);
  });
}

// ---------- Contact: copy email ----------
function initCopy() {
  const button = document.querySelector<HTMLButtonElement>('[data-copy]');
  const label = button?.querySelector('[data-copy-label]');
  const status = document.querySelector('[data-copy-status]');
  if (!button || !label) return;
  let timer = 0;
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy ?? '');
      label.textContent = 'Copied';
      if (status) status.textContent = 'Email address copied to clipboard';
      button.classList.add('is-copied');
    } catch {
      label.textContent = 'Copy failed, select the address instead';
    }
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      label.textContent = 'Copy email';
      if (status) status.textContent = '';
      button.classList.remove('is-copied');
    }, 2400);
  });
}

// ---------- Local time in Vancouver ----------
function initClock() {
  const el = document.querySelector<HTMLTimeElement>('[data-local-time]');
  if (!el) return;
  const format = new Intl.DateTimeFormat('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Vancouver',
    timeZoneName: 'short',
  });
  const tick = () => {
    const now = new Date();
    el.textContent = `${format.format(now)} local time`;
    el.dateTime = now.toISOString();
  };
  tick();
  setInterval(tick, 30_000);
}

initTheme();
initHero(reduced);
initNav();
initTitles();
initExpanders();
initRoute(scrollTo, reduced);
initSkills();
initCopy();
initClock();

// Fonts change line lengths; recompute trigger positions once they settle.
document.fonts?.ready.then(() => ScrollTrigger.refresh());

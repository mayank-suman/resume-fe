import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

type ScrollTo = (target: HTMLElement) => void;

/**
 * The career "trail": a meandering path where height is time (now at the
 * top, 2012 at the bottom). As each role scrolls past, the walked portion of
 * the trail extends to that role's start and the marker follows.
 */
export function initRoute(scrollTo: ScrollTo, reduced: boolean) {
  const route = document.querySelector<HTMLElement>('[data-route]');
  const svg = document.querySelector<SVGSVGElement>('[data-route-svg]');
  const trail = document.querySelector<SVGPathElement>('[data-route-trail]');
  const walked = document.querySelector<SVGPathElement>('[data-route-walked]');
  const marker = document.querySelector<HTMLElement>('[data-route-marker]');
  if (!route || !svg || !trail || !walked || !marker) return;

  const stops = gsap.utils.toArray<HTMLElement>('[data-stop]', route);
  const roles = gsap.utils.toArray<HTMLElement>('[data-role]');
  const times = stops.map((s) => Number(s.dataset.t));
  const tMax = Math.max(...times);
  const tMin = Math.min(...times);

  let samples: { len: number; y: number }[] = [];
  let total = 0;
  let stopY: number[] = [];
  let current = 0;

  const layout = () => {
    if (getComputedStyle(route).display === 'none') return;
    const w = route.clientWidth;
    const h = route.clientHeight;
    const pad = 14;
    const labelSpace = Math.min(150, w * 0.5);
    const mid = labelSpace + (w - labelSpace) / 2;
    const amp = (w - labelSpace) / 2 - 12;
    const yOf = (t: number) => pad + ((tMax - t) / (tMax - tMin)) * (h - pad * 2);
    const xOf = (y: number) => mid + amp * (0.68 * Math.sin(y * 0.0105 + 0.9) + 0.32 * Math.sin(y * 0.031 + 2.1));

    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    let d = '';
    for (let y = pad; y <= h - pad + 0.1; y += 6) d += `${d ? 'L' : 'M'}${xOf(y).toFixed(1)} ${y.toFixed(1)}`;
    trail.setAttribute('d', d);
    walked.setAttribute('d', d);

    total = walked.getTotalLength();
    samples = [];
    for (let i = 0; i <= 300; i++) {
      const len = (total * i) / 300;
      samples.push({ len, y: walked.getPointAtLength(len).y });
    }

    stopY = times.map(yOf);
    stops.forEach((stop, i) => {
      stop.style.transform = `translateY(${stopY[i]}px)`;
      stop.style.setProperty('--x', `${xOf(stopY[i])}px`);
    });
    walked.style.strokeDasharray = `${total} ${total}`;
    route.classList.add('is-ready');
    render(current);
  };

  // Path is monotonic in y, so length-at-y is a lookup in the samples.
  const lengthAtY = (y: number) => {
    const i = samples.findIndex((s) => s.y >= y);
    if (i <= 0) return i === 0 ? 0 : total;
    const a = samples[i - 1];
    const b = samples[i];
    return a.len + ((y - a.y) / (b.y - a.y || 1)) * (b.len - a.len);
  };

  const render = (y: number) => {
    if (!samples.length) return;
    const len = lengthAtY(y);
    const point = walked.getPointAtLength(len);
    walked.style.strokeDashoffset = `${total - len}`;
    marker.style.transform = `translate(${point.x}px, ${point.y}px)`;
    stops.forEach((stop, i) => stop.classList.toggle('is-passed', stopY[i] <= y + 0.5));
  };

  const proxy = { y: 0 };
  const follow = gsap.quickTo(proxy, 'y', {
    duration: reduced ? 0 : 0.6,
    ease: 'power3.out',
    onUpdate: () => {
      current = proxy.y;
      render(current);
    },
  });

  const setActive = (id: string | null) => {
    stops.forEach((s) => s.classList.toggle('is-active', s.dataset.stopFor === id));
    stops.forEach((s) => {
      const link = s.querySelector('a');
      if (!link) return;
      if (s.dataset.stopFor === id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };

  // Role i walks the trail from stop i (previous role's start, or "now")
  // to stop i + 1 (this role's start).
  roles.forEach((role, i) => {
    ScrollTrigger.create({
      trigger: role,
      start: 'top 62%',
      end: 'bottom 62%',
      onUpdate: (self) => {
        if (!stopY.length) return;
        follow(gsap.utils.interpolate(stopY[i], stopY[i + 1], self.progress));
      },
      onToggle: (self) => self.isActive && setActive(role.dataset.role ?? null),
      onLeaveBack: () => i === 0 && setActive(null),
    });
  });

  route.addEventListener('click', (event) => {
    const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#role-"]');
    if (!link) return;
    const target = document.querySelector<HTMLElement>(link.hash);
    if (!target) return;
    event.preventDefault();
    scrollTo(target);
  });

  new ResizeObserver(() => layout()).observe(route);
  layout();
}

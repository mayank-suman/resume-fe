// Builds the portfolio's content from the LaTeX CV in packages/cv, so the
// website and the PDF never drift apart. Runs at build time only.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import {
  beforeItemize,
  findMacro,
  firstMacro,
  itemize,
  splitList,
  stripComments,
  toText,
} from './latex';

export interface DatePoint {
  label: string;
  /** Decimal year, e.g. 2022.42 for June 2022. */
  value: number;
}

export interface Role {
  id: string;
  company: string;
  companyUrl?: string;
  title: string;
  location?: string;
  workMode?: string;
  start: DatePoint;
  end: DatePoint & { current: boolean };
  summary?: string;
  sites: string[];
  highlights: string[];
  stack: string[];
  link?: { label: string; url: string };
}

export interface SkillGroup {
  name: string;
  skills: string[];
}

export interface Education {
  year: string;
  degree: string;
  school: string;
}

export interface CV {
  firstName: string;
  lastName: string;
  tagline: string;
  yearsOfExperience: number;
  contact: {
    email?: string;
    phone?: string;
    address?: string;
    linkedin?: string;
    github?: string;
    website?: { url: string; label: string };
  };
  summary: string;
  strengths: string[];
  roles: Role[];
  skills: SkillGroup[];
  education: Education[];
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function cvSourceDir(): string {
  const require = createRequire(path.join(process.cwd(), 'package.json'));
  return path.join(path.dirname(require.resolve('@mayank/cv/package.json')), 'src');
}

function read(dir: string, file: string): string {
  return stripComments(readFileSync(path.join(dir, file), 'utf8'));
}

function parseDate(label: string, now: Date): DatePoint & { current: boolean } {
  const clean = label.trim();
  if (/^(current|present|now)$/i.test(clean)) {
    return {
      label: 'Now',
      value: now.getFullYear() + now.getMonth() / 12,
      current: true,
    };
  }
  const [month, year] = clean.split(/\s+/);
  const index = MONTHS.indexOf(month.slice(0, 3).toLowerCase());
  if (index === -1 || !year) throw new Error(`Unrecognised CV date "${label}"`);
  return { label: `${month.slice(0, 3)} ${year}`, value: Number(year) + index / 12, current: false };
}

/** Mirrors the year arithmetic in section_summary.tex (career start: March 2012). */
function yearsSince(startYear: number, startMonth: number, now: Date): number {
  let years = now.getFullYear() - startYear;
  if (now.getMonth() + 1 < startMonth) years -= 1;
  return years;
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

/** "https://www.ooma.ca/" -> "ooma" */
const siteName = (url?: string) => url && new URL(url).hostname.replace(/^www\./, '').split('.')[0];

const DOMAIN_LIST = /^[\w.-]+\.[a-z]{2,}(\s*,\s*[\w.-]+\.[a-z]{2,})*$/i;

export function loadCV(now = new Date()): CV {
  const dir = cvSourceDir();
  const main = read(dir, 'cv.tex');
  const social = firstMacro(main, 'socialinfo', 1)?.[0] ?? '';
  const [firstName, lastName] = firstMacro(main, 'name', 2) ?? ['', ''];
  const website = firstMacro(social, 'websiteGlobe', 2);

  const yearsOfExperience = yearsSince(2012, 3, now);
  const summarySrc = read(dir, 'section_summary.tex').replace(
    /\\the\\yearsofexperience(\{\})?/g,
    String(yearsOfExperience),
  );

  // Career timeline has month-precise dates and titles; the experience
  // section has location, description, highlights and stack. Merge by company.
  const timeline = read(dir, 'section_career_timeline.tex');
  const timelineEntries = [
    ...findMacro(timeline, 'experiencenew', 4),
    ...findMacro(timeline, 'experiencenewlast', 4),
  ].map(([end, title, at, start]) => {
    const link = firstMacro(at, 'websitenoicon', 2);
    return {
      title: toText(title),
      company: toText(at).replace(/^at\s+/i, ''),
      companyUrl: link?.[0],
      start: parseDate(start, now),
      end: parseDate(end, now),
    };
  });

  const projects = findMacro(read(dir, 'section_experience.tex'), 'project', 6).map(
    ([company, place, , site, body, stack]) => {
      const [, location = place, mode] = toText(place).match(/^(.*?)\s*-\s*\((.+)\)$/) ?? [];
      const siteLink = firstMacro(site, 'website', 2);
      const intro = beforeItemize(body);
      return {
        company: toText(company),
        location: toText(location),
        workMode: mode,
        link: siteLink ? { url: siteLink[0], label: toText(siteLink[1]) } : undefined,
        summary: intro && !DOMAIN_LIST.test(intro) ? intro : undefined,
        sites: intro && DOMAIN_LIST.test(intro) ? splitList(intro) : [],
        highlights: itemize(body),
        stack: splitList(stack),
      };
    },
  );

  const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const roles: Role[] = timelineEntries
    .map((entry) => {
      const project = projects.find(
        (p) => key(p.company).startsWith(key(entry.company)) || key(entry.company).startsWith(key(p.company)),
      );
      return {
        id: slug(entry.company),
        ...entry,
        location: project?.location,
        workMode: project?.workMode,
        summary: project?.summary,
        sites: project?.sites ?? [],
        highlights: project?.highlights ?? [],
        stack: project?.stack ?? [],
        // Skip the CV's site link when it is just the company homepage again.
        link: project?.link && siteName(project.link.url) !== siteName(entry.companyUrl) ? project.link : undefined,
      };
    })
    .sort((a, b) => b.start.value - a.start.value);

  const skills = findMacro(read(dir, 'section_skills.tex'), 'keywordsentry', 2).map(([name, list]) => ({
    name: toText(name),
    skills: splitList(list),
  }));

  const education = findMacro(read(dir, 'section_education.tex'), 'scholarshipentry', 3).map(
    ([year, degree, school]) => ({ year: toText(year), degree: toText(degree), school: toText(school) }),
  );

  return {
    firstName: toText(firstName),
    lastName: toText(lastName),
    tagline: toText(firstMacro(main, 'tagline', 1)?.[0] ?? ''),
    yearsOfExperience,
    contact: {
      email: firstMacro(social, 'email', 1)?.[0].trim(),
      phone: firstMacro(social, 'smartphone', 1)?.[0].trim(),
      address: firstMacro(social, 'address', 1)?.[0].trim(),
      linkedin: firstMacro(social, 'linkedin', 1)?.[0].trim(),
      github: firstMacro(social, 'github', 1)?.[0].trim(),
      website: website ? { url: `https://${website[0].replace(/^www\./, '')}`, label: website[1] } : undefined,
    },
    summary: toText(firstMacro(summarySrc, 'par', 1)?.[0] ?? ''),
    strengths: itemize(read(dir, 'section_strengths.tex')),
    roles,
    skills,
    education,
  };
}

// Skill names differ slightly between the skills list and per-role stacks
// ("ReactJs" vs "ReactJS", "Redux (RTK Query)" vs "Redux Toolkit (RTK Query)").
const ALIASES: Record<string, string> = {
  reduxtoolkit: 'redux',
  go: 'golang',
  html5: 'html',
  css3: 'css',
};

export function skillKey(name: string): string {
  const base = name
    .replace(/\(.*?\)/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  return ALIASES[base] ?? base;
}

/** Roles whose stack lists the given skill, newest first. */
export function rolesUsing(cv: CV, skill: string): Role[] {
  const k = skillKey(skill);
  return cv.roles.filter((role) => role.stack.some((s) => skillKey(s) === k));
}

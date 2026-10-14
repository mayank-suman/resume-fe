// Minimal, brace-aware reader for the macros used in packages/cv/src/*.tex.
// It is not a TeX engine: it only understands `\macro{arg}{arg}` calls,
// comments, itemize lists and the handful of escapes the CV actually uses.

/** Remove `%` comments while keeping escaped `\%`. */
export function stripComments(src: string): string {
  return src
    .split('\n')
    .map((line) => {
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '%' && line[i - 1] !== '\\') return line.slice(0, i);
      }
      return line;
    })
    .join('\n');
}

/** Read a balanced `{...}` group starting at (or after whitespace from) `start`. */
function readGroup(src: string, start: number): { content: string; end: number } | null {
  let i = start;
  while (i < src.length && /\s/.test(src[i])) i++;
  if (src[i] !== '{') return null;
  let depth = 0;
  for (let j = i; j < src.length; j++) {
    const ch = src[j];
    if (ch === '\\') {
      j++; // skip escaped char, e.g. \{ or \%
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return { content: src.slice(i + 1, j), end: j + 1 };
    }
  }
  throw new Error(`Unbalanced braces near: ${src.slice(i, i + 60)}`);
}

/**
 * Find every call of `\name` (exact name, not a prefix of a longer macro)
 * and return its first `arity` brace arguments.
 */
export function findMacro(src: string, name: string, arity: number): string[][] {
  const calls: string[][] = [];
  const needle = `\\${name}`;
  let from = 0;
  for (;;) {
    const at = src.indexOf(needle, from);
    if (at === -1) break;
    from = at + needle.length;
    if (/[a-zA-Z@]/.test(src[from] ?? '')) continue; // e.g. \experiencenewlast vs \experiencenew
    const args: string[] = [];
    let cursor = from;
    for (let n = 0; n < arity; n++) {
      const group = readGroup(src, cursor);
      if (!group) break;
      args.push(group.content);
      cursor = group.end;
    }
    if (args.length === arity) {
      calls.push(args);
      from = cursor;
    }
  }
  return calls;
}

export function firstMacro(src: string, name: string, arity: number): string[] | undefined {
  return findMacro(src, name, arity)[0];
}

/** Split an itemize body into its `\item` texts. */
export function itemize(src: string): string[] {
  const match = src.match(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/);
  if (!match) return [];
  return match[1]
    .split(/\\item\b/)
    .slice(1)
    .map(toText)
    .filter(Boolean);
}

/** Text that precedes the first itemize block. */
export function beforeItemize(src: string): string {
  const at = src.indexOf('\\begin{itemize}');
  return toText(at === -1 ? src : src.slice(0, at));
}

/** Convert a fragment of CV LaTeX into plain display text. */
export function toText(src: string): string {
  let out = src;
  // Link-style macros keep their visible label.
  for (const macro of ['websitenoicon', 'website', 'websiteGlobe', 'href']) {
    for (const [url, label] of findMacro(out, macro, 2)) {
      out = out.replace(`\\${macro}{${url}}{${label}}`, label);
    }
  }
  out = out
    .replace(/\\(textbf|textit|emph|textsc|underline)\s*\{([^{}]*)\}/g, '$2')
    .replace(/\\\\/g, ' ')
    .replace(/\\([%&_#$])/g, '$1')
    .replace(/---/g, '—')
    .replace(/--/g, '–')
    // `~70\%` in the CV reads as "approximately 70%"; any other `~` is a tie.
    .replace(/~(?!\d)/g, ' ')
    .replace(/\\[a-zA-Z]+\*?/g, '')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return out;
}

/** Split a comma-separated list, ignoring commas inside parentheses. */
export function splitList(src: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of toText(src)) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else current += ch;
  }
  parts.push(current);
  return parts.map((p) => p.trim()).filter(Boolean);
}

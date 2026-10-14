// Animated topographic contour lines (WebGL2 fragment shader). The pointer
// raises a "hill" in the height field, so the lines bend around the cursor.

const VERTEX = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAGMENT = `#version 300 es
precision highp float;
out vec4 outColor;

uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uHill;
uniform float uReveal;
uniform float uDpr;
uniform vec3 uLine;
uniform vec3 uAccent;

// Simplex noise, Ashima Arts / Stefan Gustavson (MIT).
vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * snoise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * aspect, uv.y) * 1.35;
  float t = uTime * 0.03;

  float h = fbm(p + vec2(t, -t * 0.7)) + 0.35 * snoise(p * 0.45 - t * 0.5);

  vec2 m = vec2(uMouse.x * aspect, uMouse.y) * 1.35;
  float d = distance(p, m);
  float hill = uHill * exp(-d * d * 9.0);
  h += hill * 0.85;

  // Isolines: distance (in pixels) to the nearest integer level of v.
  float v = h * 7.0;
  float fw = max(fwidth(v), 1e-4);
  float level = floor(v + 0.5);
  float px = abs(v - level) / fw;
  bool major = mod(level, 5.0) == 0.0;
  float width = (major ? 1.15 : 0.6) * uDpr;
  float line = 1.0 - smoothstep(width - 0.6, width + 0.6, px);

  // Reveal from the lowest ground upward, like a tide going out.
  float tide = mix(-1.6, 1.9, uReveal);
  float revealMask = smoothstep(tide + 0.12, tide - 0.12, h);

  // Quieter on the left where the name sits, and fade out toward the bottom.
  float fieldMask = mix(0.55, 1.0, smoothstep(0.0, 0.85, uv.x)) * smoothstep(0.0, 0.35, uv.y);

  float heat = smoothstep(0.08, 0.55, hill);
  vec3 color = mix(uLine, uAccent, heat);
  float alpha = line * (major ? 0.9 : 0.6) * revealMask * fieldMask;
  alpha = mix(alpha, line * revealMask, heat);
  outColor = vec4(color * alpha, alpha);
}`;

function hexToRgb(value: string): [number, number, number] {
  const hex = value.trim().replace('#', '');
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
  const n = parseInt(full, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? 'Shader compile failed');
  }
  return shader;
}

export interface ContourField {
  /** 0..1, drives the intro reveal. */
  state: { reveal: number };
  refreshColors(): void;
  destroy(): void;
}

export function createContourField(canvas: HTMLCanvasElement, { animate }: { animate: boolean }): ContourField | null {
  const context = canvas.getContext('webgl2', { premultipliedAlpha: true, antialias: false, alpha: true });
  if (!context) return null;
  const gl: WebGL2RenderingContext = context;

  let program: WebGLProgram;
  try {
    program = gl.createProgram()!;
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? '');
  } catch (error) {
    console.warn('Contour field disabled:', error);
    return null;
  }
  gl.useProgram(program);

  // One oversized triangle covers the viewport.
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const u = (name: string) => gl.getUniformLocation(program, name);
  const uniforms = {
    res: u('uRes'),
    time: u('uTime'),
    mouse: u('uMouse'),
    hill: u('uHill'),
    reveal: u('uReveal'),
    dpr: u('uDpr'),
    line: u('uLine'),
    accent: u('uAccent'),
  };

  const state = { reveal: animate ? 0 : 1 };
  const pointer = { x: 0.7, y: 0.5, tx: 0.7, ty: 0.5, hill: 0, targetHill: 0 };
  let dpr = 1;
  let raf = 0;
  let visible = true;
  let time = 7; // start mid-flow so the first frame already looks settled

  const refreshColors = () => {
    const styles = getComputedStyle(document.documentElement);
    gl.uniform3fv(uniforms.line, hexToRgb(styles.getPropertyValue('--contour') || '#b4c5ba'));
    gl.uniform3fv(uniforms.accent, hexToRgb(styles.getPropertyValue('--sun') || '#f2b33d'));
    if (!raf) draw();
  };

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uniforms.res, canvas.width, canvas.height);
    gl.uniform1f(uniforms.dpr, dpr);
    if (!raf) draw();
  };

  function draw() {
    pointer.x += (pointer.tx - pointer.x) * 0.08;
    pointer.y += (pointer.ty - pointer.y) * 0.08;
    pointer.hill += (pointer.targetHill - pointer.hill) * 0.06;
    gl.uniform1f(uniforms.time, time);
    gl.uniform2f(uniforms.mouse, pointer.x, pointer.y);
    gl.uniform1f(uniforms.hill, pointer.hill);
    gl.uniform1f(uniforms.reveal, state.reveal);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  let last = performance.now();
  const loop = (now: number) => {
    time += Math.min(now - last, 50) / 1000;
    last = now;
    draw();
    raf = requestAnimationFrame(loop);
  };
  const start = () => {
    if (!animate || raf || !visible || document.hidden) return;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };

  const host = canvas.parentElement!;
  const onPointerMove = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    pointer.tx = (event.clientX - rect.left) / rect.width;
    pointer.ty = 1 - (event.clientY - rect.top) / rect.height;
    pointer.targetHill = 1;
  };
  const onPointerLeave = () => {
    pointer.targetHill = 0;
  };
  if (animate) {
    host.addEventListener('pointermove', onPointerMove, { passive: true });
    host.addEventListener('pointerleave', onPointerLeave);
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    visible ? start() : stop();
  });
  intersection.observe(canvas);
  const onVisibility = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVisibility);

  refreshColors();
  resize();
  start();

  return {
    state,
    refreshColors,
    destroy() {
      stop();
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('pointerleave', onPointerLeave);
    },
  };
}

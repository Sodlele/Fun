// Claude-chan's pixel art and the scene each mood plays in: pure functions
// from (mood, time, size) to a buffer of 0xRRGGBB pixels, shared by the
// terminal's Raster and the remote surfaces' SVG.

import type { Mood } from '../types'

export const SPRITE_W = 28
export const SPRITE_H = 36
const NONE = -1

const PALETTE: Record<string, number> = {
  K: 0x3a2220, // outline
  H: 0xc9673f, // hair
  h: 0x96482c, // hair shadow
  L: 0xf09a66, // hair shine
  S: 0xffe6d5, // skin
  s: 0xf2c2a6, // skin shadow
  B: 0xff9aae, // blush
  W: 0xffffff,
  E: 0xe8803f, // iris
  e: 0x5a2618, // pupil
  M: 0xc2414f, // mouth
  O: 0xf8f3ea, // blouse
  o: 0xd9cfbf, // blouse shadow
  N: 0x3d4c80, // sailor collar
  n: 0x2c3866, // skirt
  m: 0x46578f, // skirt pleat
  R: 0xd97757, // ribbon, Claude's terracotta
  r: 0xa64d36, // ribbon shadow
  C: 0xffb38a, // hair clip shine
  Y: 0xffd96a, // gold
  y: 0xe0a93a, // gold shadow
  G: 0x6dffa0, // terminal green
  g: 0x1d6b3d, // terminal green dim
  D: 0x2b2f3a, // laptop body
  d: 0x14161c, // laptop screen
  P: 0xffb7d0, // sakura
  p: 0xff8fb8, // sakura deep
  A: 0x9fd8ff, // sweat, water
  V: 0xb78cff, // magic violet
  v: 0x7a52d1, // magic violet deep
  Z: 0xe8ecff, // pale (z, bubbles)
  T: 0x8a6a4a, // wood, book spine
}

type Art = { w: number; h: number; px: Int32Array }

function art(rows: readonly string[]): Art {
  const h = rows.length
  const w = Math.max(...rows.map(row => row.length))
  const px = new Int32Array(w * h).fill(NONE)
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = PALETTE[row[x] ?? '.']
      if (color !== undefined) px[y * w + x] = color
    }
  })
  return { w, h, px }
}

/** Mirrors left halves into whole rows: the base figure is symmetric. */
function sym(halves: readonly string[]): string[] {
  return halves.map(half => half + [...half].reverse().join(''))
}

// The figure without arms, eyes or mouth (those layer on per pose).
const BASE = art(
  sym([
    '..............',
    '..............',
    '........KKKKKK',
    '......KKHHHHHH',
    '.....KHHHHHHHH',
    '....KHHHHLLLHH',
    '...KHHHLLLHHHH',
    '...KHHHHHHHHHH',
    '..KHHHHHHHHHHH',
    '..KHHHHHHHHHHH',
    '.KHHHHHHHHHHHH',
    '.KHHHHhHHHHhHH',
    '.KHHHhShHHhShH',
    '.KHhhSSShhSSSh',
    '.KHLhSSSSSSSSS',
    'KHHLhSSSSSSSSS',
    'KHHLhSSSSSSSSS',
    'KHhLhSSSSSSSSS',
    'KHhHSSSSSSSSSS',
    'KHhHhSSSSSSSSS',
    'KHhHhKsSSSSSSS',
    'KHhHh.KKsSSSSS',
    'KHhHh...KKKKss',
    'KHhHh..KNNNKss',
    '.KhHh.KNNNNNKR',
    '.KhhK.KNNNNNRR',
    '..KK..KONNNKRr',
    '......KOOONKRR',
    '......KOOOOKOR',
    '......KoOOOOOO',
    '......KnnnnnnN',
    '.....KnnmnnnmN',
    '....KnnmnnnnmN',
    '....KKKKKKKKKK',
    '........KWWK..',
    '........KrrK..',
  ]),
)

// Ahoge and the sparkle clip: the asymmetric bits of the hair.
const HAIR_EXTRA = art([
  '..............KK............',
  '.............KLK............',
  '..............KHK...........',
  '............................',
  '............................',
  '.....................K......',
  '....................KRK.....',
  '...................KRWRK....',
  '....................KRK.....',
  '.....................K......',
])

const ARM_DOWN_L = art([
  '.....K',
  '....KO',
  '....KO',
  '...KOO',
  '...KOo',
  '...KSS',
  '....KK',
])
const ARM_DOWN_R = flip(ARM_DOWN_L)

// Right arm raised beside the head (V sign, wand, magnifier).
const ARM_UP_R = art([
  '.....KK.',
  '....KSSK',
  '....KSSK',
  '....KOOK',
  '...KOOK.',
  '...KOOK.',
  '..KOOK..',
  '.KOOK...',
  'KOOK....',
  'KOK.....',
])

// Right hand at the chin, elbow tucked: thinking.
const ARM_CHIN_R = art([
  '..KSK...',
  '.KSSK...',
  '.KOOK...',
  '..KOOK..',
  '...KOOK.',
  '...KOOK.',
  '..KOOK..',
])

// Both hands forward, holding something at the chest.
const HANDS_FRONT = art([
  '....KOO..............OOK....',
  '...KOOO..............OOOK...',
  '...KOOK..............KOOK...',
  '....KSSK............KSSK....',
  '.....KK..............KK.....',
])

function flip(a: Art): Art {
  const px = new Int32Array(a.w * a.h)
  for (let y = 0; y < a.h; y++) {
    for (let x = 0; x < a.w; x++) px[y * a.w + x] = a.px[y * a.w + (a.w - 1 - x)]!
  }
  return { w: a.w, h: a.h, px }
}

// Eyes: 5x5 each, placed at (5,13) and (18,13); highlights stay top-left on
// both, as anime eyes do.
const EYES = {
  open: art(['KKKKK', 'KWeeK', 'KeeEK', 'KEEEK', '.KKK.']),
  up: art(['KKKKK', 'KeeWK', 'KEeeK', 'KEEEK', '.KKK.']),
  down: art(['KKKKK', 'KWEEK', 'KEEeK', 'KEeeK', '.KKK.']),
  closed: art(['.....', '.....', '.....', 'KKKKK', '.....']),
  happy: art(['.....', '..K..', '.K.K.', 'K...K', '.....']),
  shine: art(['KKKKK', 'KWEYK', 'KEYEK', 'KYEWK', '.KKK.']),
  focus: art(['.....', 'KKKKK', 'KWeEK', 'KeEEK', '.KKK.']),
  xLeft: art(['K....', '.KK..', '...KK', '.KK..', 'K....']),
  xRight: art(['....K', '..KK.', 'KK...', '..KK.', '....K']),
}

type EyeKind = keyof typeof EYES

// Mouths: 4x2 at (12,19).
const MOUTHS = {
  smile: art(['K..K', '.KK.']),
  open: art(['KMMK', '.KK.']),
  small: art(['....', '.KK.']),
  flat: art(['.KK.', '....']),
  wavy: art(['K.K.', '.K.K']),
  oh: art(['.KK.', 'KMMK']),
  cat: art(['K.KK.K', '.K..K.']),
}

type MouthKind = keyof typeof MOUTHS

const BLUSH = art(['B.B.'])

// Props.
const BOOK = art([
  '.KKKKKKKKKKKK.',
  'KWWWWWTWWWWWWK',
  'KWKKWWTWKKKWWK',
  'KWWWWWTWWWWWWK',
  'KWKKKWTWKKWWWK',
  'KWWWWWTWWWWWWK',
  'KRRRRRTRRRRRRK',
  '.KKKKKKKKKKKK.',
])

const LAPTOP = art([
  '.KKKKKKKKKKKKKK.',
  'KDDDDDDDDDDDDDDK',
  'KDddddddddddddDK',
  'KDddddddddddddDK',
  'KDddddddddddddDK',
  'KDddddddddddddDK',
  'KDDDDDDDDDDDDDDK',
  'KDDDDDDRDDDDDDDK',
  '.KKKKKKKKKKKKKK.',
])

const CLIPBOARD = art([
  '....KKKK....',
  '.KKKYyyYKKK.',
  'KTTTTTTTTTTK',
  'KTWWWWWWWWTK',
  'KTWGWKKKKWTK',
  'KTWWWWWWWWTK',
  'KTWGWKKKWWTK',
  'KTWWWWWWWWTK',
  'KTWRWKKKKWTK',
  'KTWWWWWWWWTK',
  '.KKKKKKKKKK.',
])

const MAGNIFIER = art([
  '.KKKK..',
  'KAZAAK.',
  'KZAAAK.',
  'KAAAAK.',
  '.KKKKT.',
  '.....TT',
  '......T',
])

const WAND = art([
  '..Y..',
  '.YYY.',
  'YYWYY',
  '.YYY.',
  '.Y.Y.',
  '..R..',
  '..R..',
  '..R..',
])

const SWEAT = art(['.A.', 'AZA', 'AAA', '.A.'])

const HEART = art(['.pp.pp.', 'pPPpPPp', 'pPPPPPp', '.pPPPp.', '..pPp..', '...p...'])

const MINI = art([
  '.KKK.',
  'KHHHK',
  'KSeSK', // a tiny helper: Claude-chan's chibi clone
  '.KOK.',
  '.K.K.',
])

const Z_BIG = art(['ZZZZ', '..Z.', '.Z..', 'ZZZZ'])
const Z_SMALL = art(['ZZZ', '.Z.', 'ZZZ'])

const NOTE = art(['.KK', '.KK', '.K.', 'KK.', 'KK.'])

const QMARK = art(['.YYY.', 'Y...Y', '...Y.', '..Y..', '.....', '..Y..'])

const BANG = art(['.R.', '.R.', '.R.', '...', '.R.'])

// Thought bubble frame: 15x7 white cloud with a dark outline.
const BUBBLE = art([
  '..KKKKKKKKKKK..',
  '.KWWWWWWWWWWWK.',
  'KWWWWWWWWWWWWWK',
  'KWWWWWWWWWWWWWK',
  'KWWWWWWWWWWWWWK',
  '.KWWWWWWWWWWWK.',
  '..KKKKKKKKKKK..',
])

/** What each mood shows: which eyes, mouth, arms and prop. */
type Pose = {
  eyes: EyeKind
  mouth: MouthKind
  arms: 'down' | 'up' | 'chin' | 'front'
  blush: boolean
}

const POSES: Record<Mood, Pose> = {
  idle: { eyes: 'open', mouth: 'smile', arms: 'down', blush: true },
  sleep: { eyes: 'closed', mouth: 'small', arms: 'down', blush: true },
  think: { eyes: 'up', mouth: 'flat', arms: 'chin', blush: false },
  talk: { eyes: 'open', mouth: 'open', arms: 'down', blush: true },
  read: { eyes: 'down', mouth: 'small', arms: 'front', blush: false },
  search: { eyes: 'focus', mouth: 'oh', arms: 'up', blush: false },
  edit: { eyes: 'shine', mouth: 'cat', arms: 'up', blush: true },
  bash: { eyes: 'focus', mouth: 'flat', arms: 'front', blush: false },
  agent: { eyes: 'shine', mouth: 'open', arms: 'up', blush: true },
  plan: { eyes: 'down', mouth: 'smile', arms: 'front', blush: false },
  ask: { eyes: 'open', mouth: 'oh', arms: 'chin', blush: true },
  error: { eyes: 'xLeft', mouth: 'wavy', arms: 'down', blush: false },
  done: { eyes: 'happy', mouth: 'open', arms: 'up', blush: true },
}

/** One scene's look per mood: a vertical gradient and an accent. */
const SKIES: Record<Mood, [number, number, number]> = {
  idle: [0x2a1f4d, 0x6b3f7a, 0xd97757],
  sleep: [0x070b1f, 0x141b3d, 0x2a3466],
  think: [0x0f1640, 0x26307a, 0x5a6fd8],
  talk: [0x3a2054, 0x8a4a86, 0xf0a0b8],
  read: [0x3b2414, 0x7a4a24, 0xe0a060],
  search: [0x0b2b33, 0x17606b, 0x6ad8d0],
  edit: [0x4a1032, 0xa02a5a, 0xff7aa8],
  bash: [0x020805, 0x07170d, 0x123020],
  agent: [0x1d0b3a, 0x4a1f7a, 0xb78cff],
  plan: [0x22301a, 0x4a6a2a, 0xb8e070],
  ask: [0x2a2040, 0x5a4a90, 0xffd96a],
  error: [0x2a0508, 0x6a0f16, 0xff4a4a],
  done: [0x5a2a08, 0xc06a14, 0xffd96a],
}

export type SceneInput = {
  /** Width and height in pixels; the terminal packs two rows per cell. */
  w: number
  h: number
  mood: Mood
  /** Milliseconds; drives every animation. */
  t: number
  /** Tool calls this turn: bigger combos, bigger effects. */
  combo: number
}

export function scene({ w, h, mood, t, combo }: SceneInput): Int32Array {
  const buf = new Int32Array(w * h)
  sky(buf, w, h, mood, t)
  backdrop(buf, w, h, mood, t, combo)
  actor(buf, w, h, mood, t, combo)
  return buf
}

/** Claude-chan and her props alone, over nothing (-1): the SVG's frames. */
export function actorLayer({ w, h, mood, t, combo }: SceneInput): Int32Array {
  const buf = new Int32Array(w * h).fill(NONE)
  actor(buf, w, h, mood, t, combo)
  return buf
}

/** Where she stands: left of center when there is room for a bubble. */
export function actorX(w: number): number {
  return Math.max(0, Math.floor((w - SPRITE_W) / 2) - (w >= SPRITE_W + 18 ? 6 : 0))
}

function actor(buf: Int32Array, w: number, h: number, mood: Mood, t: number, combo: number): void {
  const shake = mood === 'error' && Math.floor(t / 60) % 2 === 0 ? 1 : 0
  const bob = mood === 'sleep' ? Math.floor(t / 1600) % 2 : Math.floor(t / 700) % 2
  const hop = mood === 'done' ? Math.round(Math.abs(Math.sin(t / 180)) * 2) : 0
  const ox = actorX(w) + shake
  const oy = Math.max(0, h - SPRITE_H - 1) + bob - hop
  character(buf, w, h, ox, oy, mood, t)
  foreground(buf, w, h, ox, oy, mood, t, combo)
}

function mix(a: number, b: number, k: number): number {
  const r = ((a >> 16) & 255) + (((b >> 16) & 255) - ((a >> 16) & 255)) * k
  const g = ((a >> 8) & 255) + (((b >> 8) & 255) - ((a >> 8) & 255)) * k
  const bl = (a & 255) + ((b & 255) - (a & 255)) * k
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl)
}

function put(buf: Int32Array, w: number, h: number, x: number, y: number, c: number): void {
  if (x < 0 || y < 0 || x >= w || y >= h) return
  buf[y * w + x] = c
}

function stamp(buf: Int32Array, w: number, h: number, a: Art, ox: number, oy: number): void {
  for (let y = 0; y < a.h; y++) {
    for (let x = 0; x < a.w; x++) {
      const c = a.px[y * a.w + x]!
      if (c !== NONE) put(buf, w, h, ox + x, oy + y, c)
    }
  }
}

/** A cheap, stable hash: the same particle lands the same way every frame. */
function rnd(n: number): number {
  let x = (n | 0) * 374761393 + 668265263
  x = (x ^ (x >>> 13)) * 1274126177
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296
}

function sky(buf: Int32Array, w: number, h: number, mood: Mood, t: number): void {
  const [top, mid, low] = SKIES[mood]
  const flash = mood === 'error' ? 0.25 * Math.max(0, Math.sin(t / 90)) : 0
  for (let y = 0; y < h; y++) {
    const k = y / Math.max(1, h - 1)
    let c = k < 0.6 ? mix(top, mid, k / 0.6) : mix(mid, low, (k - 0.6) / 0.4)
    if (flash > 0) c = mix(c, 0xff2030, flash)
    for (let x = 0; x < w; x++) buf[y * w + x] = c
  }
}

function backdrop(buf: Int32Array, w: number, h: number, mood: Mood, t: number, combo: number): void {
  const [, , accent] = SKIES[mood]

  if (mood === 'bash') {
    // Falling green glyph trails.
    for (let col = 0; col < w; col += 2) {
      const speed = 0.012 + rnd(col) * 0.02
      const len = 4 + Math.floor(rnd(col + 99) * 8)
      const head = Math.floor((t * speed + rnd(col + 7) * h * 3) % (h + len))
      for (let i = 0; i < len; i++) {
        const y = head - i
        put(buf, w, h, col, y, mix(0x6dffa0, 0x07170d, i / len))
      }
    }
    return
  }

  if (mood === 'done' || mood === 'agent') {
    // Rays turning around a point behind her head.
    const cx = actorX(w) + SPRITE_W / 2
    const cy = h * 0.35
    const turn = t / (mood === 'done' ? 1400 : 2600)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const a = Math.atan2(y - cy, (x - cx) * 0.9) + turn
        if (Math.sin(a * 8) > 0.55) buf[y * w + x] = mix(buf[y * w + x]!, accent, 0.28)
      }
    }
  }

  if (mood === 'edit') {
    // Speed lines streaking sideways: she is on a roll.
    const n = Math.min(14, 5 + combo)
    for (let i = 0; i < n; i++) {
      const y = Math.floor(rnd(i * 31 + Math.floor(t / 120)) * h)
      const len = 6 + Math.floor(rnd(i * 17) * 14)
      const x0 = Math.floor((rnd(i * 13) * w + t * 0.12) % (w + len)) - len
      for (let x = x0; x < x0 + len; x++) put(buf, w, h, x, y, mix(buf[y * w + Math.max(0, Math.min(w - 1, x))]!, 0xffffff, 0.5))
    }
  }

  if (mood === 'think' || mood === 'sleep' || mood === 'idle' || mood === 'ask') {
    // Stars, twinkling on their own clocks.
    for (let i = 0; i < Math.floor((w * h) / 70); i++) {
      const x = Math.floor(rnd(i * 3 + 1) * w)
      const y = Math.floor(rnd(i * 3 + 2) * h * 0.6)
      const phase = Math.sin(t / (400 + rnd(i) * 900) + i)
      if (phase > 0.2) put(buf, w, h, x, y, mix(0x8890c0, 0xffffff, phase))
    }
  }

  if (mood === 'sleep') {
    // The moon.
    const mx = w - 7
    const my = 5
    for (let y = -4; y <= 4; y++) {
      for (let x = -4; x <= 4; x++) {
        const inMoon = x * x + y * y <= 16
        const inBite = (x + 2) * (x + 2) + (y - 1) * (y - 1) <= 10
        if (inMoon && !inBite) put(buf, w, h, mx + x, my + y, 0xfff4c8)
      }
    }
  }

  if (mood === 'search') {
    // A sonar ring sweeping out.
    const cx = w * 0.72
    const cy = h * 0.35
    const r = (t / 40) % Math.max(w, h)
    for (let a = 0; a < 360; a += 3) {
      const x = Math.round(cx + Math.cos((a * Math.PI) / 180) * r)
      const y = Math.round(cy + Math.sin((a * Math.PI) / 180) * r * 0.6)
      put(buf, w, h, x, y, mix(0x6ad8d0, 0xffffff, 0.3))
    }
  }

  if (mood === 'read' || mood === 'plan') {
    // Warm floating dust motes.
    for (let i = 0; i < 18; i++) {
      const x = Math.floor((rnd(i * 5) * w + Math.sin(t / 900 + i) * 3 + w) % w)
      const y = Math.floor((rnd(i * 7) * h - t * 0.004 * (1 + rnd(i)) + h * 10) % h)
      put(buf, w, h, x, y, mix(accent, 0xffffff, 0.5))
    }
  }

  // Sakura petals drift through every calm scene.
  if (mood !== 'error') {
    const petals = Math.max(4, Math.floor(w / 6))
    for (let i = 0; i < petals; i++) {
      const fall = 0.006 + rnd(i * 11) * 0.008
      const y = Math.floor((rnd(i * 23) * h * 4 + t * fall) % (h + 4)) - 2
      const x = Math.floor((rnd(i * 29) * w + t * 0.004 + Math.sin(t / 500 + i) * 2 + w * 4) % w)
      const tint = rnd(i) > 0.5 ? 0xffb7d0 : 0xff8fb8
      put(buf, w, h, x, y, tint)
      if (rnd(i * 41) > 0.5) put(buf, w, h, x + 1, y, mix(tint, 0xffffff, 0.3))
    }
  }
}

function character(buf: Int32Array, w: number, h: number, ox: number, oy: number, mood: Mood, t: number): void {
  const pose = POSES[mood]
  stamp(buf, w, h, BASE, ox, oy)
  stamp(buf, w, h, HAIR_EXTRA, ox, oy)

  const isBlinking = (mood === 'idle' || mood === 'talk' || mood === 'read' || mood === 'plan' || mood === 'ask') && t % 3600 < 140
  let left: EyeKind = isBlinking ? 'closed' : pose.eyes
  let right: EyeKind = left === 'xLeft' ? 'xRight' : left
  if (mood === 'search' && !isBlinking) right = 'closed' // squinting through the glass
  if (mood === 'read' && Math.floor(t / 900) % 2 === 1 && !isBlinking) left = right = 'open'
  stamp(buf, w, h, EYES[left], ox + 5, oy + 13)
  stamp(buf, w, h, EYES[right], ox + 18, oy + 13)
  if (pose.blush) {
    stamp(buf, w, h, BLUSH, ox + 4, oy + 18)
    stamp(buf, w, h, BLUSH, ox + 20, oy + 18)
  }

  let mouth: MouthKind = pose.mouth
  if (mood === 'talk' || mood === 'agent') mouth = Math.floor(t / 160) % 2 === 0 ? 'open' : 'small'
  if (mood === 'done') mouth = Math.floor(t / 300) % 3 === 0 ? 'cat' : 'open'
  const m = MOUTHS[mouth]
  stamp(buf, w, h, m, ox + 14 - Math.floor(m.w / 2), oy + 19)

  if (pose.arms === 'down' || pose.arms === 'chin' || pose.arms === 'up') {
    stamp(buf, w, h, ARM_DOWN_L, ox + 2, oy + 24)
  }
  if (pose.arms === 'down') stamp(buf, w, h, ARM_DOWN_R, ox + 20, oy + 24)
  if (pose.arms === 'up') {
    const wave = mood === 'done' || mood === 'edit' ? Math.floor(t / 250) % 2 : 0
    stamp(buf, w, h, ARM_UP_R, ox + 20 + wave, oy + 15)
  }
  if (pose.arms === 'chin') stamp(buf, w, h, ARM_CHIN_R, ox + 16, oy + 20)
  if (pose.arms === 'front') stamp(buf, w, h, HANDS_FRONT, ox, oy + 24)
}

function foreground(buf: Int32Array, w: number, h: number, ox: number, oy: number, mood: Mood, t: number, combo: number): void {
  const rightOfHead = ox + SPRITE_W - 2
  const wave = mood === 'done' || mood === 'edit' ? Math.floor(t / 250) % 2 : 0

  switch (mood) {
    case 'read': {
      stamp(buf, w, h, BOOK, ox + 7, oy + 25)
      // A page turns now and then.
      if (Math.floor(t / 900) % 4 === 3) {
        for (let y = 1; y < 7; y++) put(buf, w, h, ox + 14 + (y % 2), oy + 25 + y, 0xffffff)
      }
      break
    }
    case 'plan': {
      stamp(buf, w, h, CLIPBOARD, ox + 8, oy + 23)
      // The check mark being written, row by row.
      const row = Math.floor(t / 500) % 3
      put(buf, w, h, ox + 11, oy + 27 + row * 2, 0x6dffa0)
      break
    }
    case 'bash': {
      stamp(buf, w, h, LAPTOP, ox + 6, oy + 24)
      // Code scrolling on the screen.
      for (let line = 0; line < 4; line++) {
        const seed = line + Math.floor(t / 220)
        const len = 3 + Math.floor(rnd(seed) * 9)
        for (let x = 0; x < len; x++) put(buf, w, h, ox + 9 + x, oy + 26 + line, rnd(seed * 7 + x) > 0.25 ? 0x6dffa0 : 0x1d6b3d)
      }
      if (Math.floor(t / 400) % 2 === 0) put(buf, w, h, ox + 9 + 11, oy + 29, 0xffffff)
      break
    }
    case 'search': {
      stamp(buf, w, h, MAGNIFIER, ox + 21, oy + 9 + (Math.floor(t / 300) % 2))
      break
    }
    case 'edit': {
      stamp(buf, w, h, WAND, ox + 23 + wave, oy + 7)
      sparkles(buf, w, h, ox + 25 + wave, oy + 10, t, Math.min(8, 3 + combo))
      break
    }
    case 'agent': {
      stamp(buf, w, h, WAND, ox + 23, oy + 7)
      // Chibi clones summoned on the magic circle, bobbing out of step.
      const ring = oy + SPRITE_H - 2
      for (let i = 0; i < Math.min(3, 1 + Math.floor(combo / 3)); i++) {
        const x = (i % 2 === 0 ? ox - 7 - i * 3 : ox + SPRITE_W + 1 + i * 2)
        const y = ring - 6 + (Math.floor(t / 250 + i) % 2)
        stamp(buf, w, h, MINI, x, y)
      }
      magicCircle(buf, w, h, ox + SPRITE_W / 2, ring, t)
      break
    }
    case 'think': {
      thought(buf, w, h, rightOfHead, oy, t, 'dots')
      break
    }
    case 'ask': {
      thought(buf, w, h, rightOfHead, oy, t, 'q')
      break
    }
    case 'talk': {
      const k = Math.floor(t / 400) % 3
      stamp(buf, w, h, NOTE, rightOfHead + 1 + k, oy + 4 - k)
      break
    }
    case 'error': {
      stamp(buf, w, h, SWEAT, ox + 22, oy + 6 + (Math.floor(t / 200) % 2))
      stamp(buf, w, h, BANG, ox + 25, oy + 1)
      break
    }
    case 'sleep': {
      const k = Math.floor(t / 700) % 3
      stamp(buf, w, h, Z_SMALL, rightOfHead, oy + 6 - k)
      stamp(buf, w, h, Z_BIG, rightOfHead + 4, oy + 1 - ((k + 1) % 3))
      break
    }
    case 'done': {
      // V sign: two fingers up on the raised hand.
      put(buf, w, h, ox + 25 + wave, oy + 14, 0x3a2220)
      put(buf, w, h, ox + 27 + wave, oy + 14, 0x3a2220)
      put(buf, w, h, ox + 25 + wave, oy + 13, 0x3a2220)
      put(buf, w, h, ox + 27 + wave, oy + 13, 0x3a2220)
      sparkles(buf, w, h, ox + SPRITE_W / 2, oy + 10, t, 10)
      stamp(buf, w, h, HEART, ox - 6, oy + 6 + (Math.floor(t / 300) % 2))
      break
    }
    case 'idle': {
      if (combo > 0 && Math.floor(t / 2000) % 2 === 0) stamp(buf, w, h, HEART, rightOfHead + 1, oy + 4)
      break
    }
  }
}

function thought(buf: Int32Array, w: number, h: number, x: number, oy: number, t: number, what: 'dots' | 'q'): void {
  const bx = Math.min(x, w - BUBBLE.w)
  const by = Math.max(0, oy - 1)
  put(buf, w, h, x - 2, by + 11, 0xffffff)
  put(buf, w, h, x - 1, by + 9, 0xffffff)
  put(buf, w, h, x, by + 9, 0xffffff)
  stamp(buf, w, h, BUBBLE, bx, by)
  if (what === 'q') {
    stamp(buf, w, h, QMARK, bx + 5, by + 1 - (Math.floor(t / 400) % 2))
    return
  }
  const shown = 1 + (Math.floor(t / 350) % 3)
  for (let i = 0; i < shown; i++) put(buf, w, h, bx + 4 + i * 3, by + 3, 0x3a2220)
}

function sparkles(buf: Int32Array, w: number, h: number, cx: number, cy: number, t: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const life = ((t / 600 + rnd(i * 13)) % 1)
    const a = rnd(i * 7) * Math.PI * 2
    const r = 2 + life * 10
    const x = Math.round(cx + Math.cos(a) * r)
    const y = Math.round(cy + Math.sin(a) * r * 0.7)
    const c = life < 0.5 ? 0xffffff : 0xffd96a
    put(buf, w, h, x, y, c)
    if (life < 0.35) {
      put(buf, w, h, x - 1, y, 0xffd96a)
      put(buf, w, h, x + 1, y, 0xffd96a)
      put(buf, w, h, x, y - 1, 0xffd96a)
      put(buf, w, h, x, y + 1, 0xffd96a)
    }
  }
}

function magicCircle(buf: Int32Array, w: number, h: number, cx: number, cy: number, t: number): void {
  const turn = t / 500
  for (let a = 0; a < 360; a += 4) {
    const rad = (a * Math.PI) / 180
    const x = Math.round(cx + Math.cos(rad + turn) * 16)
    const y = Math.round(cy + Math.sin(rad + turn) * 2)
    put(buf, w, h, x, y, a % 24 === 0 ? 0xffffff : 0xb78cff)
  }
}

// ---- Encoders -------------------------------------------------------------

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function base64(bytes: Uint8Array): string {
  let out = ''
  let i = 0
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8) | bytes[i + 2]!
    out += B64[(n >> 18) & 63]! + B64[(n >> 12) & 63]! + B64[(n >> 6) & 63]! + B64[n & 63]!
  }
  const rest = bytes.length - i
  if (rest === 1) {
    const n = bytes[i]! << 16
    out += B64[(n >> 18) & 63]! + B64[(n >> 12) & 63]! + '=='
  } else if (rest === 2) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8)
    out += B64[(n >> 18) & 63]! + B64[(n >> 12) & 63]! + B64[(n >> 6) & 63]! + '='
  }
  return out
}

/**
 * Packs a pixel buffer of `columns` x `rows * 2` into Raster cells: one upper
 * half block per cell, its foreground the top pixel and background the bottom.
 */
export function rasterCells(px: Int32Array, columns: number, rows: number): string {
  const words = new Uint32Array(columns * rows * 3)
  for (let row = 0; row < rows; row++) {
    for (let x = 0; x < columns; x++) {
      const i = (row * columns + x) * 3
      words[i] = 0x2580
      words[i + 1] = px[row * 2 * columns + x]! & 0xffffff
      words[i + 2] = px[(row * 2 + 1) * columns + x]! & 0xffffff
    }
  }
  // Little-endian words, as RasterProps asks.
  const bytes = new Uint8Array(words.length * 4)
  for (let i = 0; i < words.length; i++) {
    const v = words[i]!
    bytes[i * 4] = v & 255
    bytes[i * 4 + 1] = (v >>> 8) & 255
    bytes[i * 4 + 2] = (v >>> 16) & 255
    bytes[i * 4 + 3] = (v >>> 24) & 255
  }
  return base64(bytes)
}

function hex(c: number): string {
  return '#' + (c & 0xffffff).toString(16).padStart(6, '0')
}

/** One layer as one path per color, each horizontal run a `M x y h n v1 h-n z`. */
function paths(px: Int32Array, w: number, h: number): string {
  const byColor = new Map<number, string>()
  for (let y = 0; y < h; y++) {
    let x = 0
    while (x < w) {
      const c = px[y * w + x]!
      let run = 1
      while (x + run < w && px[y * w + x + run] === c) run++
      if (c !== NONE) byColor.set(c, (byColor.get(c) ?? '') + `M${x} ${y}h${run}v1h-${run}z`)
      x += run
    }
  }
  let out = ''
  for (const [c, d] of byColor) out += `<path fill="${hex(c)}" d="${d}"/>`
  return out
}

export type SvgInput = { w: number; h: number; mood: Mood; combo: number }

/**
 * The scene as one self-animating SVG, for the surfaces that draw Svg and not
 * Raster: the sky as a gradient, petals, stars and rays moved by CSS, and
 * Claude-chan's frames shown in turn, so she blinks and moves with no redraw.
 */
export function svgScene({ w, h, mood, combo }: SvgInput): string {
  const [top, mid, low] = SKIES[mood]
  const frames = 8
  const periodMs = 1600
  const css: string[] = [
    '.f{opacity:0;animation:show ' + periodMs + 'ms steps(1,end) infinite}',
    '@keyframes show{0%{opacity:1}' + (100 / frames).toFixed(2) + '%{opacity:0}100%{opacity:0}}',
    '@keyframes fall{from{transform:translate(0,-4px)}to{transform:translate(-9px,' + (h + 4) + 'px)}}',
    '@keyframes tw{0%,100%{opacity:.15}50%{opacity:1}}',
    '@keyframes spin{to{transform:rotate(360deg)}}',
    '@keyframes rain{from{transform:translate(0,-' + h + 'px)}to{transform:translate(0,' + h + 'px)}}',
    '.p{animation:fall linear infinite}',
    '.s{animation:tw ease-in-out infinite}',
    '.r{transform-origin:' + (actorX(w) + SPRITE_W / 2) + 'px ' + Math.round(h * 0.35) + 'px;animation:spin 14s linear infinite}',
    '.g{animation:rain linear infinite}',
    '@keyframes zip{from{transform:translate(-24px,0)}to{transform:translate(' + (w + 24) + 'px,0)}}',
    '.z{animation:zip linear infinite}',
    '@keyframes ping{from{transform:scale(.06);opacity:.95}to{transform:scale(1);opacity:0}}',
    '.o{transform-box:fill-box;transform-origin:center;animation:ping 1.8s ease-out infinite}',
    '@keyframes rise{from{transform:translate(0,4px);opacity:0}30%{opacity:1}to{transform:translate(2px,-' + h + 'px);opacity:0}}',
    '.m{animation:rise linear infinite}',
    '@keyframes red{0%,100%{opacity:0}50%{opacity:.28}}',
    '.x{animation:red .18s linear infinite}',
  ]
  let back = `<defs><linearGradient id="sky-${mood}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hex(top)}"/><stop offset=".6" stop-color="${hex(mid)}"/><stop offset="1" stop-color="${hex(low)}"/></linearGradient>` +
    `<linearGradient id="trail-${mood}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6dffa0" stop-opacity="0"/><stop offset="1" stop-color="#6dffa0"/></linearGradient></defs>` +
    `<rect width="${w}" height="${h}" fill="url(#sky-${mood})"/>`

  if (mood === 'done' || mood === 'agent') {
    const cx = actorX(w) + SPRITE_W / 2
    const cy = Math.round(h * 0.35)
    let rays = ''
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      const b = a + Math.PI / 18
      const R = w + h
      rays += `M${cx} ${cy}L${(cx + Math.cos(a) * R).toFixed(1)} ${(cy + Math.sin(a) * R).toFixed(1)}L${(cx + Math.cos(b) * R).toFixed(1)} ${(cy + Math.sin(b) * R).toFixed(1)}z`
    }
    back += `<path class="r" fill="${hex(low)}" fill-opacity=".28" d="${rays}"/>`
  }
  if (mood === 'think' || mood === 'sleep' || mood === 'idle' || mood === 'ask') {
    for (let i = 0; i < Math.floor((w * h) / 90); i++) {
      const x = Math.floor(rnd(i * 3 + 1) * w)
      const y = Math.floor(rnd(i * 3 + 2) * h * 0.6)
      css.push(`.s${i}{animation-duration:${(1.2 + rnd(i) * 2.4).toFixed(2)}s;animation-delay:-${(rnd(i + 5) * 3).toFixed(2)}s}`)
      back += `<rect class="s s${i}" x="${x}" y="${y}" width="1" height="1" fill="#ffffff"/>`
    }
  }
  if (mood === 'edit') {
    // Speed lines streaking across: she is on a roll.
    for (let i = 0; i < Math.min(14, 5 + combo); i++) {
      const y = Math.floor(rnd(i * 31) * h)
      css.push(`.z${i}{animation-duration:${(0.5 + rnd(i * 17) * 0.7).toFixed(2)}s;animation-delay:-${rnd(i * 13).toFixed(2)}s}`)
      back += `<rect class="z z${i}" x="0" y="${y}" width="${6 + Math.floor(rnd(i * 17) * 14)}" height="1" fill="#ffffff" fill-opacity=".5"/>`
    }
  }
  if (mood === 'search') {
    // A sonar ring sweeping out from where the lens points.
    back += `<ellipse class="o" cx="${Math.round(w * 0.72)}" cy="${Math.round(h * 0.35)}" rx="${w}" ry="${Math.round(w * 0.6)}" fill="none" stroke="#a6f0ea" stroke-width=".6"/>`
    back += `<ellipse class="o" style="animation-delay:-.9s" cx="${Math.round(w * 0.72)}" cy="${Math.round(h * 0.35)}" rx="${w}" ry="${Math.round(w * 0.6)}" fill="none" stroke="#a6f0ea" stroke-width=".6"/>`
  }
  if (mood === 'read' || mood === 'plan') {
    // Warm dust motes floating up.
    for (let i = 0; i < 14; i++) {
      css.push(`.m${i}{animation-duration:${(4 + rnd(i) * 4).toFixed(2)}s;animation-delay:-${(rnd(i * 7) * 8).toFixed(2)}s}`)
      back += `<rect class="m m${i}" x="${Math.floor(rnd(i * 5) * w)}" y="${h - 2}" width="1" height="1" fill="${hex(mix(low, 0xffffff, 0.5))}"/>`
    }
  }
  if (mood === 'sleep') back += `<circle cx="${w - 7}" cy="5" r="4" fill="#fff4c8"/><circle cx="${w - 9}" cy="6" r="3.2" fill="${hex(top)}"/>`
  if (mood === 'bash') {
    for (let col = 0; col < w; col += 2) {
      const len = 4 + Math.floor(rnd(col + 99) * 8)
      css.push(`.g${col}{animation-duration:${(1.5 + rnd(col) * 2.5).toFixed(2)}s;animation-delay:-${(rnd(col + 7) * 4).toFixed(2)}s}`)
      back += `<rect class="g g${col}" x="${col}" y="0" width="1" height="${len}" fill="url(#trail-${mood})"/>`
    }
  }
  if (mood !== 'bash' && mood !== 'error') {
    for (let i = 0; i < Math.max(5, Math.floor(w / 5)); i++) {
      const x = Math.floor(rnd(i * 29) * (w + 9))
      css.push(`.p${i}{animation-duration:${(4 + rnd(i * 11) * 5).toFixed(2)}s;animation-delay:-${(rnd(i * 23) * 9).toFixed(2)}s}`)
      back += `<rect class="p p${i}" x="${x}" y="0" width="${rnd(i * 41) > 0.5 ? 2 : 1}" height="1" fill="${rnd(i) > 0.5 ? '#ffb7d0' : '#ff8fb8'}"/>`
    }
  }

  // The error flash rides on top of everything, as the terminal's does.
  const flash = mood === 'error' ? `<rect class="x" width="${w}" height="${h}" fill="#ff2030"/>` : ''
  let front = ''
  for (let f = 0; f < frames; f++) {
    const t = (f * periodMs) / frames
    css.push(`.f${f}{animation-delay:${-((frames - f) % frames) * (periodMs / frames)}ms}`)
    front += `<g class="f f${f}">${paths(actorLayer({ w, h, mood, t, combo }), w, h)}</g>`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges"><style>${css.join('')}</style>${back}${front}${flash}</svg>`
}

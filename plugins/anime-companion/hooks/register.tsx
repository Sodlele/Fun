import { atom, read, update } from 'claude-code'
import type { Elements, EngineInterface, Register } from 'claude-code'

import type { LogEntry, Mood, Stage, Stats } from '../types'
import { classify, ICONS, lineFor, UI } from './lines'
import type { Lang } from './lines'
import { rasterCells, scene, svgScene } from './sprite'

const PANE = 'claude-chan'
const RASTER = 'stage'
const SCENE_ROWS = 19 // 38 pixels: two per terminal row
const SVG_W = 56
const FRAME_MS = 125
const LOG_MAX = 60
const DOZE_MS = 120_000

/** How long a passing mood lasts before she settles, in milliseconds. */
const SETTLE: Partial<Record<Mood, number>> = { done: 9000, error: 3500 }

const ZERO: Stats = {
  turns: 0,
  tools: 0,
  edits: 0,
  reads: 0,
  shells: 0,
  searches: 0,
  agents: 0,
  errors: 0,
  combo: 0,
  bestCombo: 0,
  thought: 0,
  spoken: 0,
  tokens: 0,
  turnStartedAt: 0,
}

const stageAtom = atom({ plugin: 'anime-companion', key: 'stage' } as const, {
  mood: 'idle',
  since: 0,
  line: '',
  detail: '',
})
const logAtom = atom({ plugin: 'anime-companion', key: 'log' } as const, [])
const statsAtom = atom({ plugin: 'anime-companion', key: 'stats' } as const, ZERO)
const dismissedAtom = atom({ plugin: 'anime-companion', key: 'dismissed' } as const, false)

const FACES: Record<Mood, string> = {
  idle: '(◕‿◕✿)',
  sleep: '(－ω－) zzZ',
  think: '(・・ )?',
  talk: '(ﾉ◕ヮ◕)ﾉ',
  read: '(・ω・)',
  search: '(⌐■_■)',
  edit: '٩(ˊᗜˋ*)و',
  bash: '(ง •̀_•́)ง',
  agent: '⊂(◉‿◉)つ',
  plan: '(｀・ω・´)',
  ask: '(｡•́︿•̀｡)',
  error: '(>_<)',
  done: 'V(＾▽＾)V',
}

const ACCENT: Record<Mood, string> = {
  idle: '#d97757',
  sleep: '#7f8cff',
  think: '#8fa2ff',
  talk: '#f0a0b8',
  read: '#e0a060',
  search: '#6ad8d0',
  edit: '#ff7aa8',
  bash: '#6dffa0',
  agent: '#b78cff',
  plan: '#b8e070',
  ask: '#ffd96a',
  error: '#ff5a5a',
  done: '#ffd96a',
}

// Mirrors of the state the animation reads every frame. $.state is the
// record; these start over on a reload, and session.start refills them.
const live = {
  lang: 'ru' as Lang,
  mood: 'idle' as Mood,
  detail: '',
  since: 0,
  combo: 0,
  isTurnRunning: false,
  rasterColumns: 0, // the mounted Raster's width; 0 while none is
  clock: 0,
  isTicking: false,
}

function text(key: string): string {
  return UI[live.lang]?.[key] ?? key
}

function clip(words: string, n: number): string {
  const one = words.replace(/\s+/g, ' ').trim()
  return one.length > n ? one.slice(0, n - 1) + '…' : one
}

function bar(fraction: number, cells: number): string {
  const full = Math.max(0, Math.min(cells, Math.round(fraction * cells)))
  return '▰'.repeat(full) + '▱'.repeat(cells - full)
}

function level(tools: number): { lv: number; progress: number } {
  const lv = Math.floor(Math.sqrt(tools / 3)) + 1
  const from = 3 * (lv - 1) ** 2
  const to = 3 * lv ** 2
  return { lv, progress: (tools - from) / (to - from) }
}

function compact(n: number): string {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

function statusLine(): string {
  const what = live.detail ? ` ${ICONS[live.mood]} ${clip(live.detail, 28)}` : ` ${ICONS[live.mood]}`
  const streak = live.combo >= 3 ? ` · ${live.combo} ${text('combo')}` : ''
  return `${FACES[live.mood]} Claude-chan${what}${streak}`
}

async function stageTo($: EngineInterface, next: Mood, about = ''): Promise<void> {
  const now = await $.clock.now()
  if (next === live.mood && about === live.detail && now - live.since < 2000) return
  live.mood = next
  live.detail = about
  live.since = now
  const stage: Stage = { mood: next, since: now, line: lineFor(live.lang, next, about, Math.floor(now / 997)), detail: about }
  await update($, stageAtom, () => stage)
  $.ui.status(statusLine())
}

/** Bookkeeping that must never break what it watches (the model's stream). */
async function quietly(work: Promise<unknown>): Promise<void> {
  try {
    await work
  } catch {
    // A missed mood change costs one frame of the show, nothing more.
  }
}

async function addLog($: EngineInterface, entry: LogEntry): Promise<void> {
  await update($, logAtom, list => [...list, entry].slice(-LOG_MAX))
}

async function settleLog($: EngineInterface, id: string, status: LogEntry['status']): Promise<void> {
  await update($, logAtom, list => list.map(one => (one.id === id ? { ...one, status } : one)))
}

/** Once a second: passing moods fade, and a long quiet puts her to sleep. */
async function settle($: EngineInterface): Promise<void> {
  const now = await $.clock.now()
  const held = SETTLE[live.mood]
  if (held !== undefined && now - live.since > held) {
    await stageTo($, live.isTurnRunning ? 'think' : 'idle')
    return
  }
  if (!live.isTurnRunning && live.mood === 'idle' && now - live.since > DOZE_MS) await stageTo($, 'sleep')
}

/** One animation frame: repaint the mounted Raster in place, no redraw. */
async function tick($: EngineInterface): Promise<void> {
  if (live.isTicking) return
  live.isTicking = true
  try {
    live.clock += FRAME_MS
    if (live.clock % 1000 < FRAME_MS) await settle($)
    const columns = live.rasterColumns
    if (columns === 0) return
    const px = scene({ w: columns, h: SCENE_ROWS * 2, mood: live.mood, t: live.clock, combo: live.combo })
    const blit = await $.ui.blit({ requestId: PANE, key: RASTER, cells: rasterCells(px, columns, SCENE_ROWS), columns, rows: SCENE_ROWS })
    // Not mounted (closed, a hidden tab, resized): wait for the next draw.
    if (blit.deny !== undefined) live.rasterColumns = 0
  } finally {
    live.isTicking = false
  }
}

async function openPane($: EngineInterface): Promise<boolean> {
  const opened = await $.ui.open({ id: PANE, title: text('title'), columns: 52, rows: 30 })
  return opened.isPlaced
}

async function isPaneShown($: EngineInterface): Promise<boolean> {
  return (await $.ui.panes()).some(pane => pane.id === PANE && pane.isShown)
}

async function isPaneOpen($: EngineInterface): Promise<boolean> {
  return (await $.ui.panes()).some(pane => pane.id === PANE)
}

export const register: Register = (on, options) => {
  live.lang = options['language'] === 'en' ? 'en' : 'ru'

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'claude-chan',
      description: live.lang === 'ru' ? 'Показать или спрятать аниме-панель Claude-chan' : 'Show or hide the Claude-chan anime pane',
      argumentHint: '[close]',
      immediate: true,
    })

    const stage = await read($, stageAtom)
    const stats = await read($, statsAtom)
    live.mood = stage.mood
    live.detail = stage.detail
    live.since = stage.since
    live.combo = stats.combo
    if (stage.line === '') await stageTo($, 'idle')
    else $.ui.status(statusLine())

    $.clock.every(FRAME_MS, () => void tick($))

    const isAway = await read($, dismissedAtom)
    if (options['autoOpen'] !== false && !isAway && !(await isPaneOpen($))) void openPane($)

    return next(e)
  })

  on('command.run', { command: 'claude-chan' }, async ($, e) => {
    const ask = e.args.trim()
    if (ask === 'close' || (ask === '' && (await isPaneShown($)))) {
      await $.ui.close({ id: PANE })
      return { text: text('hidden') }
    }
    await update($, dismissedAtom, () => false)
    await openPane($)
    return { text: text('opened') }
  })

  on('ui.close', async ($, e, next) => {
    if (e.id === PANE) {
      live.rasterColumns = 0
      if (e.origin.kind === 'person') await update($, dismissedAtom, () => true)
    }
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    const now = await $.clock.now()
    live.combo = 0
    live.isTurnRunning = true
    await update($, statsAtom, stats => ({ ...stats, turns: stats.turns + 1, combo: 0, turnStartedAt: now }))
    if (e.text.trim() !== '') {
      await addLog($, { id: `prompt-${e.turnId}`, mood: 'idle', text: `«${clip(e.text, 70)}»`, status: 'ok', at: now, isAgent: false })
    }
    await stageTo($, 'think')
    return next(e)
  })

  // The model's response as it streams: thinking, then answering.
  on('turn.step', async function* ($, e, next) {
    const stream = next(e)
    const isMain = e.agentId === undefined
    let phase: 'none' | 'thinking' | 'text' = 'none'
    let thought = 0
    let spoken = 0

    for await (const chunk of stream) {
      if (isMain && chunk.kind === 'thinking') {
        thought += chunk.text.length
        if (phase !== 'thinking') {
          phase = 'thinking'
          await quietly(stageTo($, 'think'))
        }
      } else if (isMain && chunk.kind === 'text') {
        spoken += chunk.text.length
        if (phase !== 'text' && chunk.text.trim() !== '') {
          phase = 'text'
          await quietly(stageTo($, 'talk'))
        }
      }
      yield chunk
    }

    if (thought + spoken > 0) {
      await quietly(update($, statsAtom, stats => ({ ...stats, thought: stats.thought + thought, spoken: stats.spoken + spoken })))
    }
    return await stream.result
  })

  on('tool.call', async ($, e, next) => {
    const tool = String(e.tool)
    const { mood: kind, detail: about } = classify(tool, e as unknown as Readonly<Record<string, unknown>>)
    const isAgent = e.agentId !== undefined
    const id = e.tool_use_id
    const now = await $.clock.now()

    live.combo += 1
    const streak = live.combo
    await addLog($, { id, mood: kind, text: about ? `${tool} · ${about}` : tool, status: 'run', at: now, isAgent })
    await update($, statsAtom, stats => ({
      ...stats,
      tools: stats.tools + 1,
      combo: streak,
      bestCombo: Math.max(stats.bestCombo, streak),
      edits: stats.edits + (kind === 'edit' ? 1 : 0),
      reads: stats.reads + (kind === 'read' ? 1 : 0),
      shells: stats.shells + (kind === 'bash' ? 1 : 0),
      searches: stats.searches + (kind === 'search' ? 1 : 0),
      agents: stats.agents + (tool === 'Agent' || tool === 'Task' ? 1 : 0),
    }))
    if (isAgent) $.ui.status(statusLine())
    else await stageTo($, kind, about)
    if (streak === 10 || streak === 25 || streak === 50 || streak === 100) {
      $.ui.toast(live.lang === 'ru' ? `⚡ ${streak} КОМБО! Сугой!! ✧` : `⚡ ${streak} COMBO! Sugoi!! ✧`)
    }

    const ran = await next(e)

    const hasFailed = ran.deny !== undefined || ran.isError === true
    await settleLog($, id, hasFailed ? 'err' : 'ok')
    if (hasFailed) {
      await update($, statsAtom, stats => ({ ...stats, errors: stats.errors + 1 }))
      if (!isAgent) await stageTo($, 'error', about || tool)
    }
    return ran
  })

  on('turn.complete', async ($, e, next) => {
    const ran = await next(e)
    if (e.agentId !== undefined) return ran

    live.isTurnRunning = false
    const now = await $.clock.now()
    const seconds = Math.max(1, Math.round(e.durationMs / 1000))
    const usage = e.usage
    const tokens = usage === undefined ? 0 : usage.input_tokens + usage.output_tokens + usage.cache_creation_input_tokens
    await update($, statsAtom, stats => ({ ...stats, tokens: stats.tokens + tokens }))

    const verdict: Mood = e.reason === 'answer' ? 'done' : e.reason === 'aborted' ? 'idle' : 'error'
    const summary = `${text('turnDone')}: ${seconds}s · ${live.combo} ${text('tools')}`
    await addLog($, { id: `done-${e.turnId}`, mood: verdict, text: summary, status: verdict === 'error' ? 'err' : 'ok', at: now, isAgent: false })
    await stageTo($, verdict, `${seconds}s`)
    return ran
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const stage = await read($, stageAtom)
    const stats = await read($, statsAtom)
    const log = await read($, logAtom)
    const columns = Math.max(20, Math.min(512, e.props.bodyColumns))
    const accent = ACCENT[stage.mood]
    const { Box, Text } = $.ui.resolve(e)

    let picture
    if (e.surface === 'terminal') {
      const { Raster } = $.ui.resolve(e) as Elements['terminal']
      live.rasterColumns = columns
      const px = scene({ w: columns, h: SCENE_ROWS * 2, mood: stage.mood, t: live.clock, combo: stats.combo })
      picture = <Raster key={RASTER} columns={columns} rows={SCENE_ROWS} cells={rasterCells(px, columns, SCENE_ROWS)} />
    } else {
      const { Svg } = $.ui.resolve(e) as Elements['desktop']
      picture = (
        <Svg
          source={svgScene({ w: SVG_W, h: SCENE_ROWS * 2, mood: stage.mood, combo: stats.combo })}
          alt={`Claude-chan: ${stage.line}`}
          width={Math.min(520, Math.max(200, columns * 8))}
          isInteractive
        />
      )
    }

    const { lv, progress } = level(stats.tools)
    const comboLine =
      stats.combo > 0
        ? `⚡ ${stats.combo} ${text('combo')}${stats.combo >= 10 ? '!!' : '!'} ${bar(Math.min(1, stats.combo / 25), 10)}`
        : `⚡ 0 ${text('combo')}`
    const counters = [
      `📖 ${stats.reads}`,
      `✨ ${stats.edits}`,
      `⌨ ${stats.shells}`,
      `🔍 ${stats.searches}`,
      `👯 ${stats.agents}`,
      `💥 ${stats.errors}`,
      `💭 ${compact(stats.thought)}`,
    ].join('  ')
    const room = Math.max(3, e.props.scroll.bodyRows - SCENE_ROWS - 10)

    return (
      <Box flexDirection="column">
        {picture}
        <Box flexDirection="column" borderStyle="round" borderColor={accent} paddingX={1}>
          <Text bold color={accent} wrap="truncate-end">
            {`${text('name')} ${FACES[stage.mood]}`}
          </Text>
          <Text>{stage.line}</Text>
        </Box>
        <Box flexDirection="column" paddingX={1}>
          <Text wrap="truncate-end">
            <Text bold color="#ffd96a">{comboLine}</Text>
            <Text dimColor>{`  ${text('best')} ${stats.bestCombo}`}</Text>
          </Text>
          <Text wrap="truncate-end">
            <Text color="#d97757">{`${text('lv')} ${lv} ${bar(progress, 8)}`}</Text>
            <Text dimColor>{`  ${stats.turns} ${text('turns')} · ${stats.tools} ${text('tools')} · ${compact(stats.tokens)} tok`}</Text>
          </Text>
          <Text dimColor wrap="truncate-end">
            {counters}
          </Text>
        </Box>
        <Box flexDirection="column" paddingX={1}>
          <Text bold color={accent}>
            {text('log')}
          </Text>
          {log.length === 0 && <Text dimColor>{text('empty')}</Text>}
          {log.slice(-room).map(entry => logRow(Text, entry))}
        </Box>
      </Box>
    )
  })
}

type TextTag = Elements['terminal']['Text']

function logRow(Text: TextTag, entry: LogEntry) {
  const mark = entry.status === 'run' ? '…' : entry.status === 'err' ? '✗' : '✓'
  const words = `${entry.isAgent ? '  ↳ ' : ''}${ICONS[entry.mood]} ${mark} ${entry.text}`
  if (entry.status === 'err') return <Text color="#ff6b6b" wrap="truncate-end">{words}</Text>
  if (entry.status === 'run') return <Text color="#ffd96a" wrap="truncate-end">{words}</Text>
  if (entry.mood === 'done') return <Text bold color="#ffd96a" wrap="truncate-end">{words}</Text>
  return <Text dimColor wrap="truncate-end">{words}</Text>
}

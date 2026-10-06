import { describe, expect, mock, test } from 'claude-code/testing'

import { classify, count } from '../hooks/lines'
import { rasterCells, scene, svgScene } from '../hooks/sprite'
import type { Mood } from '../types'

const PLUGIN = 'anime-companion'
const MOODS: readonly Mood[] = ['idle', 'sleep', 'think', 'talk', 'read', 'search', 'edit', 'bash', 'agent', 'plan', 'ask', 'error', 'done']

function paneProps(bodyColumns: number) {
  return {
    title: 'Claude-chan ✿',
    isFocused: false,
    bodyColumns,
    placement: 'dock' as const,
    scroll: { offset: 0, bodyRows: 48 },
    view: {},
  }
}

describe('what she acts out', () => {
  test('tools map to moods and short details', () => {
    expect(classify('Read', { file_path: '/repo/src/app.ts' })).toEqual({ mood: 'read', detail: 'app.ts' })
    expect(classify('Edit', { file_path: '/repo/README.md' })).toEqual({ mood: 'edit', detail: 'README.md' })
    expect(classify('Bash', { command: 'npm test', description: 'Run the tests' })).toEqual({ mood: 'bash', detail: 'Run the tests' })
    expect(classify('Grep', { pattern: 'TODO' })).toEqual({ mood: 'search', detail: 'TODO' })
    expect(classify('Agent', { description: 'Explore the repo' })).toEqual({ mood: 'agent', detail: 'Explore the repo' })
    expect(classify('AskUserQuestion', {}).mood).toBe('ask')
    expect(classify('mcp__github__get_me', {})).toEqual({ mood: 'agent', detail: 'github·get_me' })
  })

  test('counts take the right Russian form', () => {
    expect(count('ru', 1, 'tools')).toBe('1 действие')
    expect(count('ru', 2, 'tools')).toBe('2 действия')
    expect(count('ru', 5, 'tools')).toBe('5 действий')
    expect(count('ru', 12, 'turns')).toBe('12 ходов')
    expect(count('ru', 22, 'turns')).toBe('22 хода')
    expect(count('en', 1, 'tools')).toBe('1 action')
  })

  test('every scene packs into a Raster and an SVG within their bounds', () => {
    for (const mood of MOODS) {
      const px = scene({ w: 50, h: 38, mood, t: 1234, combo: 7 })
      // 12 bytes a cell, base64: 4 characters per 3 bytes.
      expect(rasterCells(px, 50, 19)).toHaveLength((50 * 19 * 12 * 4) / 3)
      const svg = svgScene({ w: 56, h: 38, mood, combo: 7 })
      expect(svg.length < 131072, `${mood} SVG is ${svg.length} characters`).toBe(true)
    }
  })
})

describe('the pane', () => {
  test('a Read call lands in the quest log and she reads', async ($, on) => {
    mock.clock(on, { now: 1_000_000 })
    on('ui.status', () => ({ value: undefined }))
    on('tool.call', () => ({ result: 'hello' }))

    await $.tool.call({ tool: 'Read', file_path: '/repo/notes.md' })

    for (const surface of ['terminal', 'desktop'] as const) {
      const ui = await $.ui.mount({ plugin: PLUGIN, surface, component: 'Pane', requestId: 'claude-chan', props: paneProps(50) })
      expect(await ui.find({ type: 'Text', text: /Read · notes\.md/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /notes\.md/ })).toBeDefined()
      expect(await ui.find({ type: surface === 'terminal' ? 'Raster' : 'Svg' })).toBeDefined()
      await ui.unmount()
    }
  })

  test('a failing call is marked and she gets flustered', async ($, on) => {
    mock.clock(on, { now: 2_000_000 })
    on('ui.status', () => ({ value: undefined }))
    on('tool.call', () => ({ result: 'exit 1', isError: true }))

    await $.tool.call({ tool: 'Bash', command: 'false', description: 'Break things' })

    const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', component: 'Pane', requestId: 'claude-chan', props: paneProps(50) })
    expect(await ui.find({ type: 'Text', text: /✗ Bash · Break things/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /\(>_<\)/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /💥 1/ })).toBeDefined()
  })

  test('a finished turn is a victory with its summary', async ($, on) => {
    mock.clock(on, { now: 3_000_000 })
    on('ui.status', () => ({ value: undefined }))
    on('turn.complete', () => ({ text: '' }))

    const done = await $.turn.complete({ answer: 'ok', durationMs: 4200, isAborted: false, turnId: 't1', reason: 'answer' })
    // The card shown beneath the answer: the one channel every client draws.
    expect(done.text).toContain('V(＾▽＾)V Claude-chan: «')
    expect(done.text).toContain('· 4s')

    const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', component: 'Pane', requestId: 'claude-chan', props: paneProps(50) })
    expect(await ui.find({ type: 'Text', text: /Ход завершён: 4s/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /V\(＾▽＾\)V/ })).toBeDefined()
  })

  test('her lines follow the language option', { options: { language: 'en' } }, async ($, on) => {
    mock.clock(on, { now: 4_000_000 })
    on('ui.status', () => ({ value: undefined }))
    on('turn.complete', () => ({ text: '' }))

    await $.turn.complete({ answer: 'ok', durationMs: 2000, isAborted: false, turnId: 't2', reason: 'answer' })

    const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'desktop', component: 'Pane', requestId: 'claude-chan', props: paneProps(60) })
    expect(await ui.find({ type: 'Text', text: /Turn complete: 2s/ })).toBeDefined()
  })
})

describe('in the terminal', () => {
  test('she moves: every frame repaints the mounted Raster in place', async ($, on) => {
    const clock = mock.clock(on, { now: 7_000_000 })
    on('ui.status', () => ({ value: undefined }))
    on('command.register', () => ({ value: { command: 'claude-chan' } }))
    on('ui.panes', () => ({ value: [] }))
    on('ui.open', () => ({ value: { isPlaced: true } }))
    on('fs.read', () => ({ deny: 'no live page here' }))
    on('session.start', ($, e) => ({ cwd: e.cwd }))
    const blits: Array<{ key: string; columns?: number; rows?: number; cells: string }> = []
    on('ui.blit', ($, e) => {
      if ('cells' in e) blits.push({ key: e.key, columns: e.columns, rows: e.rows, cells: e.cells })
      return { value: {} }
    })

    await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
    const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', component: 'Pane', requestId: 'claude-chan', props: paneProps(50) })
    await clock.advance(1000)

    // About eight frames a second, each the mounted size, and not all alike.
    expect(blits.length >= 6, `${blits.length} frames in a second`).toBe(true)
    expect(blits[0]).toMatchObject({ key: 'stage', columns: 50, rows: 19 })
    expect(blits[0]?.cells).toHaveLength((50 * 19 * 12 * 4) / 3)
    expect(new Set(blits.map(one => one.cells)).size > 1).toBe(true)
    await ui.unmount()
  })
})

describe('in the chat, where the phone sees her', () => {
  test('/claude-chan draws the live scene in its row and reports the clients', async ($, on) => {
    mock.clock(on, { now: 5_000_000 })
    on('ui.status', () => ({ value: undefined }))
    on('ui.open', () => ({ value: { isPlaced: false, reason: 'no attached surface places panes' } }))
    on('session.surfaces', () => ({ value: ['mobile'] }))

    const ran = await $.command.run({
      command: 'claude-chan',
      args: '',
      origin: { kind: 'composer' },
      presentation: { isFullscreen: false, columns: 40 },
    })
    expect(ran.text).toContain('#1')
    expect(ran.text).toContain('mobile')
    // The plain-text card, for clients that draw no mod trees.
    expect(ran.text).toContain('✿ Claude-chan (◕‿◕✿)')
    expect(ran.text).toContain('📜 Журнал квестов:')

    for (const surface of ['mobile', 'desktop', 'terminal'] as const) {
      const ui = await $.ui.mount({
        plugin: PLUGIN,
        surface,
        component: 'CommandOutput',
        props: { command: 'claude-chan', args: '', text: ran.text ?? '', isErrored: false },
        viewport: { columns: 40, rows: 60 },
      })
      expect(await ui.find({ type: surface === 'terminal' ? 'Raster' : 'Svg' })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /не показана/ })).toBeDefined()
      await ui.unmount()
    }
  })

  test('/claude-chan test sends one line down every channel', async ($, on) => {
    const sent: string[] = []
    on('ui.log', ($, e) => (sent.push(`log:${e.text}`), { value: undefined }))
    on('ui.toast', ($, e) => (sent.push(`toast:${e.text}`), { value: undefined }))
    on('ui.status', ($, e) => (sent.push(`status:${e.text}`), { value: undefined }))

    const ran = await $.command.run({
      command: 'claude-chan',
      args: 'test',
      origin: { kind: 'composer' },
      presentation: { isFullscreen: false, columns: 40 },
    })
    expect(sent).toHaveLength(3)
    expect(ran.text).toContain('5:')
    // Nothing answers the notice here: she says why instead of failing.
    expect(ran.text).toContain('(4:')
  })

  test('the Live page gets the whole state after each change', async ($, on) => {
    const clock = mock.clock(on, { now: 6_000_000 })
    on('ui.status', () => ({ value: undefined }))
    on('fs.write', () => ({ value: undefined }))
    const writes: Array<Record<string, unknown>> = []
    on('tool.call', ($, e) => {
      if (String(e.tool) === 'ArtifactData') {
        writes.push(e as unknown as Record<string, unknown>)
        return { result: 'ok', text: `Database set committed: "live"/"state". The document is now at version ${writes.length}.` } as never
      }
      return { result: 'hello' } as never
    })

    const ran = await $.command.run({
      command: 'claude-chan',
      args: 'live https://claude.ai/artifact/TEST123',
      origin: { kind: 'composer' },
      presentation: { isFullscreen: false, columns: 40 },
    })
    expect(ran.text).toContain('TEST123')
    await clock.advance(800)
    expect(writes).toHaveLength(1)

    await $.tool.call({ tool: 'Read', file_path: '/repo/app.ts' } as never)
    await clock.advance(800)
    expect(writes).toHaveLength(2)
    // Pinned to the version the first write left, and her mood is the call's.
    expect(writes[1]).toMatchObject({ action: 'set', collection: 'live', doc_id: 'state', if_version: 1 })
    expect((writes[1]?.['data'] as { mood?: string }).mood).toBe('read')
  })

  test('every tool row gets her line above it', async ($, on) => {
    on('ui.render', { component: 'ToolUse' }, () => ({ type: 'Text', props: {}, children: ['Read(app.ts)'] }))

    for (const surface of ['mobile', 'desktop', 'terminal'] as const) {
      const ui = await $.ui.mount({
        plugin: PLUGIN,
        surface,
        component: 'ToolUse',
        props: {
          tool_use_id: 'toolu_1',
          tool: 'Read',
          input: { file_path: '/repo/app.ts' },
          isRunning: false,
          isErrored: false,
          isInterrupted: false,
        },
      })
      expect(await ui.find({ type: 'Text', text: /\(・ω・\)/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: 'Read(app.ts)' })).toBeDefined()
      await ui.unmount()
    }
  })
})

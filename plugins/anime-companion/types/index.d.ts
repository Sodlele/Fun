/** What Claude-chan is acting out: one per kind of work Claude does. */
export type Mood =
  | 'idle'
  | 'sleep'
  | 'think'
  | 'talk'
  | 'read'
  | 'search'
  | 'edit'
  | 'bash'
  | 'agent'
  | 'plan'
  | 'ask'
  | 'error'
  | 'done'

/** The scene now: the mood, when it began, her line and what it is about. */
export type Stage = {
  mood: Mood
  since: number
  line: string
  detail: string
}

/** One row of the quest log: a tool call, a thought, a finished turn. */
export type LogEntry = {
  id: string
  mood: Mood
  text: string
  status: 'run' | 'ok' | 'err'
  at: number
  isAgent: boolean
}

/** The HUD's counters for the session, and the running turn's combo. */
export type Stats = {
  turns: number
  tools: number
  edits: number
  reads: number
  shells: number
  searches: number
  agents: number
  errors: number
  combo: number
  bestCombo: number
  thought: number
  spoken: number
  tokens: number
  turnStartedAt: number
}

declare module 'claude-code' {
  interface PluginState {
    'anime-companion': {
      stage: Stage
      log: LogEntry[]
      stats: Stats
      /** The person closed the pane: session.start stops reopening it. */
      dismissed: boolean
    }
  }
}

// What Claude-chan says and how each tool call reads in the quest log.

import type { Mood } from '../types'

export type Lang = 'ru' | 'en'

const LINES: Record<Lang, Record<Mood, readonly string[]>> = {
  ru: {
    idle: ['Жду твоих приказов, сэмпай! (◕‿◕✿)', 'Чем займёмся? ♪', 'Я тут, если что~ (｡•̀ᴗ-)✧', 'Готова к новому квесту!'],
    sleep: ['Zzz… ещё пять минуточек… (－ω－) zzZ', 'Сплю… но одним глазом слежу~', 'Мне снится идеальный код… zzZ'],
    think: ['Хмм… дай подумать… (・・ )?', 'Так-так-так… кажется, понимаю!', 'Мозговой штурм! ( •̀ ω •́ )✧', 'Складываю пазл в голове…'],
    talk: ['Сейчас всё объясню~ ♪', 'Слушай внимательно, сэмпай!', 'Пишу ответ… (ﾉ◕ヮ◕)ﾉ*:･ﾟ✧'],
    read: ['Читаю {d}… (・ω・)', 'Так, что у нас в {d}?', 'Изучаю {d} очень внимательно!', 'Хм-хм, {d}… интересненько!'],
    search: ['Ищу {d}… (⌐■_■)', 'Детектив Claude-chan на деле!', 'Где же ты прячешься, {d}?', 'Сканирую всё подряд~'],
    edit: ['Магия кода: {d}! ✧*｡٩(ˊᗜˋ*)و✧*｡', 'Правлю {d} — смотри, как блестит!', 'Тык-тык… {d} готов почти!', 'Кастую рефакторинг на {d}!'],
    bash: ['Запускаю: {d}', 'Терминал, повинуйся! (ง •̀_•́)ง', 'Клац-клац по клавишам… {d}', 'Хакерский режим ON ⌨'],
    agent: ['Призываю помощницу: {d}! ⊂(◉‿◉)つ', 'Каге Буншин но Дзюцу! {d}', 'Команда, вперёд! {d}'],
    plan: ['Составляю план… ✎', 'Пункт за пунктом~ ☑', 'Список дел обновлён!'],
    ask: ['Сэмпай, мне нужен твой ответ! (｡•́︿•̀｡)', 'Вопросик к тебе~ ?', 'Подскажешь, как лучше?'],
    error: ['Ай! Что-то сломалось… (>_<)', 'Упс… {d} не вышло (╥﹏╥)', 'Ошибочка! Сейчас починю!'],
    done: ['Готово! Ура-а-а! ٩(◕‿◕)۶', 'Миссия выполнена! V(＾▽＾)V', 'Сугой! Всё сделано ✧', 'Ещё одна победа! ☆彡'],
  },
  en: {
    idle: ['Awaiting orders, senpai! (◕‿◕✿)', 'What shall we do next? ♪', "I'm right here~ (｡•̀ᴗ-)✧", 'Ready for a new quest!'],
    sleep: ['Zzz… five more minutes… (－ω－) zzZ', 'Sleeping… with one eye open~', 'Dreaming of perfect code… zzZ'],
    think: ['Hmm… let me think… (・・ )?', 'Wait, wait… I think I get it!', 'Brainstorm! ( •̀ ω •́ )✧', 'Putting the puzzle together…'],
    talk: ["Let me explain~ ♪", 'Listen closely, senpai!', 'Writing the answer… (ﾉ◕ヮ◕)ﾉ*:･ﾟ✧'],
    read: ['Reading {d}… (・ω・)', "What's inside {d}?", 'Studying {d} very carefully!', 'Hmm-hmm, {d}… interesting!'],
    search: ['Searching for {d}… (⌐■_■)', 'Detective Claude-chan on the case!', 'Where are you hiding, {d}?', 'Scanning everything~'],
    edit: ['Code magic: {d}! ✧*｡٩(ˊᗜˋ*)و✧*｡', 'Polishing {d}, look how it shines!', 'Tap-tap… {d} almost done!', 'Casting refactor on {d}!'],
    bash: ['Running: {d}', 'Terminal, obey me! (ง •̀_•́)ง', 'Clack-clack… {d}', 'Hacker mode ON ⌨'],
    agent: ['Summoning a helper: {d}! ⊂(◉‿◉)つ', 'Shadow clone jutsu! {d}', 'Team, go! {d}'],
    plan: ['Making a plan… ✎', 'Step by step~ ☑', 'To-do list updated!'],
    ask: ['Senpai, I need your answer! (｡•́︿•̀｡)', 'A little question for you~ ?', 'Which way is better?'],
    error: ['Ouch! Something broke… (>_<)', 'Oops… {d} failed (╥﹏╥)', "An error! I'll fix it!"],
    done: ['Done! Yay! ٩(◕‿◕)۶', 'Mission complete! V(＾▽＾)V', 'Sugoi! All finished ✧', 'Another victory! ☆彡'],
  },
}

export const UI: Record<Lang, Record<string, string>> = {
  ru: {
    name: '✿ Claude-chan',
    log: '📜 Журнал квестов',
    empty: 'Пока тихо… дай мне задание!',
    combo: 'КОМБО',
    best: 'рекорд',
    turns: 'ходов',
    tools: 'действий',
    lv: 'Ур.',
    thought: 'мыслей',
    opened: 'Claude-chan уже здесь! ✿',
    title: 'Claude-chan ✿',
    hidden: 'Панель Claude-chan закрыта. Позови снова: /claude-chan',
    turnDone: 'Ход завершён',
    thinking: 'размышляет',
    answering: 'отвечает',
  },
  en: {
    name: '✿ Claude-chan',
    log: '📜 Quest log',
    empty: 'All quiet… give me a quest!',
    combo: 'COMBO',
    best: 'best',
    turns: 'turns',
    tools: 'actions',
    lv: 'Lv.',
    thought: 'thoughts',
    opened: 'Claude-chan is here! ✿',
    title: 'Claude-chan ✿',
    hidden: 'Claude-chan pane closed. Call her back with /claude-chan',
    turnDone: 'Turn complete',
    thinking: 'thinking',
    answering: 'answering',
  },
}

export const ICONS: Record<Mood, string> = {
  idle: '✿',
  sleep: '☾',
  think: '💭',
  talk: '💬',
  read: '📖',
  search: '🔍',
  edit: '✨',
  bash: '⌨',
  agent: '👯',
  plan: '📋',
  ask: '❓',
  error: '💥',
  done: '🏆',
}

/** A short, stable pick: the same seed says the same line. */
export function lineFor(lang: Lang, mood: Mood, detail: string, seed: number): string {
  const options = LINES[lang][mood]
  const line = options[Math.abs(seed) % options.length] ?? ''
  return line.replace('{d}', detail || '…')
}

type Args = Readonly<Record<string, unknown>>

function str(args: Args, key: string): string {
  const value = args[key]
  return typeof value === 'string' ? value : ''
}

function base(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean)
  return parts[parts.length - 1] ?? path
}

function clip(text: string, n: number): string {
  const one = text.replace(/\s+/g, ' ').trim()
  return one.length > n ? one.slice(0, n - 1) + '…' : one
}

/** Which mood a tool call plays as, and the few words the log keeps of it. */
export function classify(tool: string, args: Args): { mood: Mood; detail: string } {
  switch (tool) {
    case 'Read':
    case 'NotebookRead':
      return { mood: 'read', detail: base(str(args, 'file_path') || str(args, 'notebook_path')) }
    case 'Edit':
    case 'MultiEdit':
    case 'Write':
    case 'NotebookEdit':
      return { mood: 'edit', detail: base(str(args, 'file_path') || str(args, 'notebook_path')) }
    case 'Bash':
    case 'BashOutput':
    case 'PowerShell':
      return { mood: 'bash', detail: clip(str(args, 'description') || str(args, 'command'), 40) }
    case 'Grep':
    case 'Glob':
      return { mood: 'search', detail: clip(str(args, 'pattern'), 32) }
    case 'WebSearch':
      return { mood: 'search', detail: clip(str(args, 'query'), 32) }
    case 'WebFetch':
      return { mood: 'read', detail: clip(str(args, 'url').replace(/^https?:\/\//, ''), 32) }
    case 'Agent':
    case 'Task':
      return { mood: 'agent', detail: clip(str(args, 'description') || str(args, 'subagent_type') || 'agent', 32) }
    case 'TodoWrite':
    case 'TaskCreate':
    case 'TaskUpdate':
    case 'TaskList':
    case 'TaskGet':
      return { mood: 'plan', detail: tool }
    case 'AskUserQuestion':
      return { mood: 'ask', detail: '' }
    case 'Skill':
      return { mood: 'agent', detail: clip(str(args, 'skill'), 32) }
  }
  if (tool.startsWith('mcp__')) {
    const [, server = '', name = ''] = tool.split('__')
    return { mood: 'agent', detail: clip(`${server}·${name}`, 32) }
  }
  return { mood: 'think', detail: tool }
}

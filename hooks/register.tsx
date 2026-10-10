import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Graph, Hub, Limit } from '../types'

const PANE = 'cerveau'
const TITLE = 'Dashboard'
const limits = atom({ plugin: 'cerveau-dashboard', key: 'limits' } as const, [])
const graph = atom({ plugin: 'cerveau-dashboard', key: 'graph' } as const, null)
const isCollapsed = atom({ plugin: 'cerveau-dashboard', key: 'isCollapsed' } as const, false)

const CANDIDATES = ['/home/user/second_brain', 'second_brain', 'Obsidian', 'obsidian', 'vault', 'second-brain', 'SecondBrain', 'Notes']
const MAX_NOTES = 600
const LINK = /\[\[([^\]|#^]+)/g

const bar = (percent: number, width = 16) => {
  const full = Math.round((Math.min(100, Math.max(0, percent)) / 100) * width)
  return '█'.repeat(full) + '░'.repeat(width - full)
}

const untilReset = (iso: string | undefined, now: number) => {
  if (!iso) return ''
  const mins = Math.max(0, Math.round((Date.parse(iso) - now) / 60000))
  return ` · reset dans ${Math.floor(mins / 60)}h${String(mins % 60).padStart(2, '0')}`
}

async function findVault($: EngineInterface, configured: string) {
  const tries = configured ? [configured] : CANDIDATES
  for (const path of tries) {
    if (await $.fs.exists(path).catch(() => false)) return path
  }
  return undefined
}

async function scan($: EngineInterface, configured: string): Promise<Graph> {
  const vault = await findVault($, configured)
  if (!vault) return null
  const files: string[] = []
  const walk = async (dir: string) => {
    if (files.length >= MAX_NOTES) return
    const entries = await $.fs.list(dir).catch(() => [])
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      const path = `${dir}/${entry.name}`
      if (entry.kind === 'dir') await walk(path)
      else if (entry.kind === 'file' && entry.name.endsWith('.md')) files.push(path)
      if (files.length >= MAX_NOTES) return
    }
  }
  await walk(vault)

  const edges = new Map<string, Set<string>>()
  const link = (a: string, b: string) => {
    if (a === b) return
    if (!edges.has(a)) edges.set(a, new Set())
    if (!edges.has(b)) edges.set(b, new Set())
    edges.get(a)!.add(b)
    edges.get(b)!.add(a)
  }
  let links = 0
  for (const file of files) {
    const name = file.split('/').pop()!.replace(/\.md$/, '')
    if (!edges.has(name)) edges.set(name, new Set())
    const text: string = await $.fs.read(file).catch(() => '')
    for (const match of text.matchAll(LINK)) {
      const target = (match[1] ?? "").trim().split('/').pop()!
      if (target) {
        link(name, target)
        links += 1
      }
    }
  }
  const hubs: Hub[] = [...edges.entries()]
    .map(([name, set]) => ({ name, degree: set.size, neighbours: [...set] }))
    .sort((a, b) => b.degree - a.degree)
    .slice(0, 4)
    .map(hub => ({
      ...hub,
      neighbours: hub.neighbours
        .sort((a, b) => (edges.get(b)?.size ?? 0) - (edges.get(a)?.size ?? 0))
        .slice(0, 3),
    }))
  return { vault, notes: files.length, links, hubs }
}

async function refreshUsage($: EngineInterface) {
  const usage = await $.session.usage().catch(() => undefined)
  if (usage) await update($, limits, () => usage.rateLimits as Limit[])
}

async function open($: EngineInterface) {
  return $.ui.open({ id: PANE, title: TITLE, columns: 40 })
}


export const register: Register = (on, options) => {
  const configured = typeof options.vaultPath === 'string' ? options.vaultPath.trim() : ''

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'dashboard',
      description: 'Affiche ou masque le dashboard (second cerveau + tokens 5 h)',
    })
    void open($)
    void refreshUsage($)
    void scan($, configured).then(g => update($, graph, () => g))
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    await update($, limits, () => e.rateLimits as Limit[])
    return next(e)
  })

  on('command.run', { command: 'dashboard' }, async $ => {
    const panes = await $.ui.panes()
    if (panes.some(p => p.id === PANE)) {
      await $.ui.close({ id: PANE })
      return { text: 'Dashboard masqué. Tape /dashboard pour le rouvrir.' }
    }
    await open($)
    void refreshUsage($)
    void scan($, configured).then(g => update($, graph, () => g))
    return { text: 'Dashboard affiché.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const collapsed = await read($, isCollapsed)
    const windows = await read($, limits)
    const brain = await read($, graph)
    const now = await $.clock.now()
    const five = windows.find(w => w.kind === 'five_hour')

    const toggle = (
      <Box flexDirection="row" gap={1}>
        <Button key="toggle" onPress={() => update($, isCollapsed, v => !v)}>
          {collapsed ? '▸ Déplier' : '▾ Replier'}
        </Button>
        <Button key="close" role="dismiss" onPress={() => $.ui.close({ id: PANE })}>
          ✕ Masquer
        </Button>
      </Box>
    )

    const tokens = five ? (
      <Box flexDirection="column">
        <Text bold>Tokens · fenêtre 5 h</Text>
        <Text>
          {bar(five.percentUsed)} {five.percentUsed}%
        </Text>
        <Text dimColor>{untilReset(five.resetsAt, now).replace(/^ · /, '')}</Text>
      </Box>
    ) : (
      <Box flexDirection="column">
        <Text bold>Tokens · fenêtre 5 h</Text>
        <Text dimColor>En attente de la première mesure…</Text>
      </Box>
    )

    if (collapsed) {
      return (
        <Box flexDirection="column">
          {toggle}
          <Text>5 h : {five ? `${bar(five.percentUsed, 10)} ${five.percentUsed}%` : '…'}</Text>
        </Box>
      )
    }

    const brainView = !brain ? (
      <Box flexDirection="column">
        <Text bold>Second cerveau</Text>
        <Text dimColor>
          {configured
            ? `Coffre introuvable : ${configured}`
            : 'Aucun coffre Obsidian trouvé. Règle « vaultPath » dans la config du mod.'}
        </Text>
      </Box>
    ) : (
      <Box flexDirection="column">
        <Text bold>Second cerveau</Text>
        <Text dimColor>
          {brain.notes} notes · {brain.links} liens
        </Text>
        {brain.hubs.map(hub => (
          <Box key={hub.name} flexDirection="column">
            <Text>
              ◉ {hub.name} <Text dimColor>({hub.degree})</Text>
            </Text>
            {hub.neighbours.map((n, i) => (
              <Text key={n} dimColor>
                {i === hub.neighbours.length - 1 ? '  └─○ ' : '  ├─○ '}
                {n}
              </Text>
            ))}
          </Box>
        ))}
      </Box>
    )

    return (
      <Box flexDirection="column" gap={1}>
        {toggle}
        {tokens}
        {brainView}
      </Box>
    )
  })
}

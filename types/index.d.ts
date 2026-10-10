export type Limit = { kind: string; percentUsed: number; resetsAt?: string }
export type Hub = { name: string; degree: number; neighbours: string[] }
export type Graph = { vault: string; notes: number; links: number; hubs: Hub[] } | null

declare module 'claude-code' {
  interface PluginState {
    'cerveau-dashboard': { limits: Limit[]; graph: Graph; isCollapsed: boolean }
  }
}

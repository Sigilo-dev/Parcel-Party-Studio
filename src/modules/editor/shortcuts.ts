import { onBeforeUnmount, onMounted } from 'vue'
import type { useEditor } from './store'

export function useShortcuts(editor: ReturnType<typeof useEditor>, action: (name: string) => void, blocked: () => boolean) {
  let previousTool: 'select' | 'hand' | null = null
  function down(event: KeyboardEvent) {
    if (blocked() || event.target instanceof HTMLElement && (event.target.matches('input, textarea, select') || event.target.isContentEditable)) return
    const key = event.key.toLowerCase(), mod = event.ctrlKey || event.metaKey
    const commands: Record<string, string> = { n: 'new', o: 'open', s: 'save', i: 'import', e: 'export', d: 'duplicate', z: event.shiftKey ? 'redo' : 'undo', y: 'redo' }
    if (mod && commands[key]) { event.preventDefault(); if (!event.repeat) action(commands[key]); return }
    if (mod || event.altKey) return
    if (key === ' ') { event.preventDefault(); if (!previousTool) { previousTool = editor.tool; editor.tool = 'hand' }; return }
    if (key === 'delete' || key === 'backspace') { event.preventDefault(); action('delete') }
    if (key === 'v') editor.tool = 'select'
    if (key === 'h') editor.tool = 'hand'
    if (key === 'escape') editor.selectedId = null
    if (!event.repeat && ['r', 'c', 't'].includes(key)) action(({ r: 'rectangle', c: 'ellipse', t: 'text' } as Record<string, string>)[key])
    if (key.startsWith('arrow') && editor.selected && !editor.selected.locked) {
      event.preventDefault(); const step = event.shiftKey ? 10 : 1
      editor.update(editor.selected.id, { x: Math.max(-32768, Math.min(32768, editor.selected.x + (key === 'arrowright' ? step : key === 'arrowleft' ? -step : 0))), y: Math.max(-32768, Math.min(32768, editor.selected.y + (key === 'arrowdown' ? step : key === 'arrowup' ? -step : 0))) })
    }
  }
  function restore() { if (previousTool) { editor.tool = previousTool; previousTool = null } }
  function up(event: KeyboardEvent) { if (event.key === ' ') restore() }
  onMounted(() => { window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', restore) })
  onBeforeUnmount(() => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', restore) })
}

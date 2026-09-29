import type { Template, TemplateKind } from '../editor/model'

export const templates: { kind: TemplateKind; label: string; ratio: string; width: number; height: number }[] = [
  { kind: 'rectangular', label: 'Rectangular', ratio: '3.4 : 2.2', width: 440, height: 680 },
  { kind: 'square', label: 'Square', ratio: '1 : 1', width: 600, height: 600 },
  { kind: 'circle', label: 'Circular', ratio: '1 : 1', width: 600, height: 600 },
  { kind: 'bold', label: 'Rectangle bold', ratio: '3 : 4', width: 800, height: 600 },
]

export function createTemplate(kind: TemplateKind = 'rectangular', width?: number): Template {
  const preset = templates.find(t => t.kind === kind)!
  const w = width ?? preset.width
  return { kind, width: w, height: Math.round(w * preset.height / preset.width), fill: '#c99b62', outline: '#805a38', outlineWidth: 3, safeInset: 24 }
}

export function resizeTemplate(template: Template, axis: 'width' | 'height', value: number): Template {
  const preset = templates.find(t => t.kind === template.kind)!
  const ratio = preset.height / preset.width
  const max = axis === 'width' ? Math.min(4096, 4096 / ratio) : Math.min(4096, 4096 * ratio)
  const min = axis === 'width' ? Math.max(64, 64 / ratio) : Math.max(64, 64 * ratio)
  const size = Math.round(Math.max(min, Math.min(max, value)))
  const width = axis === 'width' ? size : Math.round(size / ratio)
  const height = axis === 'height' ? size : Math.round(size * ratio)
  return { ...template, width, height, safeInset: Math.min(template.safeInset, Math.floor(Math.min(width, height) / 3)) }
}

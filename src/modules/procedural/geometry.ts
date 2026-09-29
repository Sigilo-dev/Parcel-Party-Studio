import type { Composition, GraphicElement, Region, Template } from '../editor/model'
export interface Bounds { x: number; y: number; width: number; height: number }
export function elementBounds(e: GraphicElement): Bounds {
  const w = e.width * (e.scaleX ?? 1), h = e.height * (e.scaleY ?? 1), angle = e.rotation * Math.PI / 180
  const c = Math.cos(angle), s = Math.sin(angle)
  const points = [[0, 0], [w, 0], [0, h], [w, h]].map(([x, y]) => ({ x: e.x + x * c - y * s, y: e.y + x * s + y * c }))
  const x = Math.min(...points.map(p => p.x)), y = Math.min(...points.map(p => p.y))
  return { x, y, width: Math.max(...points.map(p => p.x)) - x, height: Math.max(...points.map(p => p.y)) - y }
}
export function overlaps(a: Bounds, b: Bounds) { return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y }
export function regionBounds(r: Region, t: Template): Bounds { return { x: r.x * t.width, y: r.y * t.height, width: r.width * t.width, height: r.height * t.height } }
export function insideTemplate(x: number, y: number, t: Template) { return x >= 0 && x <= t.width && y >= 0 && y <= t.height && (t.kind !== 'circle' || ((x - t.width / 2) / (t.width / 2)) ** 2 + ((y - t.height / 2) / (t.height / 2)) ** 2 <= 1) }
export function compositionBounds(composition: Composition): Bounds {
  let x = 0, y = 0, right = composition.template.width, bottom = composition.template.height
  for (const e of composition.elements.filter(e => e.visible && e.allowOverflow)) {
    const b = elementBounds(e); x = Math.min(x, b.x); y = Math.min(y, b.y); right = Math.max(right, b.x + b.width); bottom = Math.max(bottom, b.y + b.height)
  }
  return { x: Math.floor(x), y: Math.floor(y), width: Math.ceil(right) - Math.floor(x), height: Math.ceil(bottom) - Math.floor(y) }
}

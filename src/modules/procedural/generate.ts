import type { GraphicElement, Template } from '../editor/model'
import { createElement } from '../assets/placeholders'

// Seeded geometry: identical seed and dimensions produce identical marks.
export function generateFibers(template: Template, seed: number): GraphicElement[] {
  let state = seed >>> 0
  const random = () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 4294967296 }
  return Array.from({ length: 32 }, (_, index) => ({
    ...createElement('rectangle'), name: `Paper fiber ${index + 1}`,
    x: random() * template.width, y: random() * template.height,
    width: 5 + random() * 21, height: 1 + random() * 2,
    rotation: random() * 35 - 17.5, opacity: 0.14 + random() * 0.12,
    fill: index % 2 ? '#fff0cf' : '#745032',
  }))
}

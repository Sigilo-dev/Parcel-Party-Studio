import type { GraphicElement } from './model'

interface Transform { x: number; y: number; rotation: number; scaleX: number; scaleY: number }
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(value)))

export function applyTransform(element: GraphicElement, transform: Transform): Partial<GraphicElement> {
  return {
    x: clamp(transform.x, -32768, 32768),
    y: clamp(transform.y, -32768, 32768),
    scaleX: Math.max(0.01, Math.min(100, (element.scaleX ?? 1) * transform.scaleX)),
    scaleY: Math.max(0.01, Math.min(100, (element.scaleY ?? 1) * transform.scaleY)),
    rotation: Math.round(transform.rotation % 360),
  }
}

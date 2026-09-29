import type { GraphicElement } from './model'

interface Transform { x: number; y: number; rotation: number; scaleX: number; scaleY: number }
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(value)))

export function applyTransform(element: GraphicElement, transform: Transform): Partial<GraphicElement> {
  return {
    x: clamp(transform.x, -32768, 32768),
    y: clamp(transform.y, -32768, 32768),
    width: clamp(element.width * transform.scaleX, 4, 16384),
    height: clamp(element.height * transform.scaleY, 4, 16384),
    rotation: Math.round(transform.rotation % 360),
    ...(element.kind === 'text' ? { fontSize: clamp((element.fontSize ?? 28) * transform.scaleY, 1, 1024) } : {}),
  }
}

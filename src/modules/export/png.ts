import Konva from 'konva'
import type { Composition, Project } from '../editor/model'
import { clipTemplate, makeNode, templateShape, materialConfig } from '../editor/rendering'
import { compositionBounds } from '../procedural/geometry'

export function renderPng(project: Project, images: Record<string, HTMLImageElement>, composition: Composition = project, previewSize?: number): string {
  const container = document.createElement('div')
  const t = composition.template, bounds = compositionBounds(composition)
  if (!previewSize && (bounds.width > 8192 || bounds.height > 8192 || bounds.width * bounds.height > 33554432)) throw new Error('Export exceeds 8192 px or 32 megapixels. Move overflow layers closer to the canvas.')
  const scale = previewSize ? Math.min(1, previewSize / Math.max(bounds.width, bounds.height)) : 1
  const stage = new Konva.Stage({ container, width: Math.ceil(bounds.width * scale), height: Math.ceil(bounds.height * scale) })
  try {
    const layer = new Konva.Layer()
    const root = new Konva.Group({ x: -bounds.x * scale, y: -bounds.y * scale, scaleX: scale, scaleY: scale })
    layer.add(root)
    const material = materialConfig(project, composition, images)
    const clipped = new Konva.Group({ clipFunc: ctx => clipTemplate(ctx, t) })
    clipped.add(new Konva.Rect({ width: t.width, height: t.height, fill: material.color }))
    if (material.image) clipped.add(new Konva.Rect({ width: t.width, height: t.height, fillPatternImage: material.image, opacity: material.opacity }))
    root.add(clipped)
    const outline = { ...templateShape(t, t.outlineWidth / 2), stroke: t.outline, strokeWidth: t.outlineWidth, listening: false }
    root.add(t.kind === 'circle' ? new Konva.Ellipse(outline as Konva.EllipseConfig) : new Konva.Rect(outline))
    for (const element of composition.elements) {
      const wrapper = new Konva.Group(element.allowOverflow ? {} : { clipFunc: ctx => clipTemplate(ctx, t) })
      wrapper.add(makeNode(element, element.assetId ? images[element.assetId] : undefined)); root.add(wrapper)
    }
    stage.add(layer); layer.draw()
    return stage.toDataURL({ pixelRatio: 1, mimeType: 'image/png' })
  } finally { stage.destroy() }
}

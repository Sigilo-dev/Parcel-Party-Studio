import Konva from 'konva'
import type { Project } from '../editor/model'
import { clipTemplate, makeNode, templateShape } from '../editor/rendering'

export function renderPng(project: Project, images: Record<string, HTMLImageElement>): string {
  const container = document.createElement('div')
  const t = project.template
  const stage = new Konva.Stage({ container, width: t.width, height: t.height })
  try {
    const layer = new Konva.Layer()
    const clipped = new Konva.Group({ clipFunc: ctx => clipTemplate(ctx, t) })
    clipped.add(new Konva.Rect({ width: t.width, height: t.height, fill: t.fill }))
    for (const element of project.elements) clipped.add(makeNode(element, element.assetId ? images[element.assetId] : undefined))
    layer.add(clipped)
    const outline = { ...templateShape(t, t.outlineWidth / 2), stroke: t.outline, strokeWidth: t.outlineWidth, listening: false }
    layer.add(t.kind === 'circle' ? new Konva.Ellipse(outline as Konva.EllipseConfig) : new Konva.Rect(outline))
    stage.add(layer); layer.draw()
    return stage.toDataURL({ pixelRatio: 1, mimeType: 'image/png' })
  } finally { stage.destroy() }
}

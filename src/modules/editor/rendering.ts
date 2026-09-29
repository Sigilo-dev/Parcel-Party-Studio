import Konva from 'konva'
import type { Composition, GraphicElement, Project, Template } from './model'

export function innerTransform(e: GraphicElement) {
  const sx = e.scaleX ?? 1, sy = e.scaleY ?? 1
  return { x: e.flipX ? e.width * sx : 0, y: e.flipY ? e.height * sy : 0, scaleX: sx * (e.flipX ? -1 : 1), scaleY: sy * (e.flipY ? -1 : 1) }
}
export function materialConfig(project: Pick<Project, 'materials'>, composition: Composition, images: Record<string, HTMLImageElement>) {
  const material = project.materials.find(m => m.id === composition.materialId)
  return { color: material?.color ?? composition.template.fill, image: material ? images[material.assetId] : undefined, opacity: material?.opacity ?? 1 }
}

export function clipTemplate(ctx: Konva.Context, template: Template) {
  ctx.beginPath()
  if (template.kind === 'circle') ctx.ellipse(template.width / 2, template.height / 2, template.width / 2, template.height / 2, 0, 0, Math.PI * 2)
  else ctx.rect(0, 0, template.width, template.height)
  ctx.closePath()
}

export function shapeConfig(element: GraphicElement, image?: HTMLImageElement) {
  const base = { width: element.width, height: element.height, fill: element.fill }
  switch (element.kind) {
    case 'ellipse': return { x: element.width / 2, y: element.height / 2, radiusX: element.width / 2, radiusY: element.height / 2, fill: element.fill }
    case 'text': return { ...base, text: element.text ?? '', fontSize: element.fontSize ?? 28, fontFamily: 'Segoe UI', fontStyle: 'bold', lineHeight: 1.12, wrap: 'word' }
    case 'image': return { width: element.width, height: element.height, image }
    default: return { ...base, cornerRadius: 2 }
  }
}

export function makeNode(element: GraphicElement, image?: HTMLImageElement): Konva.Group {
  const group = new Konva.Group({ x: element.x, y: element.y, width: element.width, height: element.height, rotation: element.rotation, opacity: element.opacity, visible: element.visible })
  const config = shapeConfig(element, image)
  const inner = new Konva.Group(innerTransform(element))
  if (element.kind === 'rectangle') inner.add(new Konva.Rect(config))
  if (element.kind === 'ellipse') inner.add(new Konva.Ellipse(config as Konva.EllipseConfig))
  if (element.kind === 'text') inner.add(new Konva.Text(config))
  if (element.kind === 'image') inner.add(new Konva.Image(config as Konva.ImageConfig))
  group.add(inner)
  return group
}

export function templateShape(template: Template, inset = 0) {
  const width = template.width - inset * 2, height = template.height - inset * 2
  return template.kind === 'circle'
    ? { x: template.width / 2, y: template.height / 2, radiusX: width / 2, radiusY: height / 2 }
    : { x: inset, y: inset, width, height }
}

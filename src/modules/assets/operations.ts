import type { Asset, GraphicElement, Project } from '../editor/model'
import { uid } from '../editor/model'
export function assetElement(asset: Asset, width = 160, height = 160): GraphicElement {
  return { id: uid(), name: asset.name, kind: 'image', assetId: asset.id, x: 80, y: 80, width, height, scaleX: 1, scaleY: 1, rotation: 0, flipX: false, flipY: false, opacity: 1, visible: true, locked: false, fill: '#c99b62', allowOverflow: asset.category === 'tape', protect: asset.category === 'illustrations' }
}
export function assetUsages(project: Project, id: string): number {
  return [project, ...project.variants].reduce((n, d) => n + d.elements.filter(e => e.assetId === id).length, 0) + project.materials.filter(m => m.assetId === id).length + project.profiles.reduce((n, p) => n + p.rules.filter(r => r.assetId === id).length, 0)
}
export function removeAsset(project: Project, id: string) {
  const materialIds = new Set(project.materials.filter(m => m.assetId === id).map(m => m.id))
  project.assets = project.assets.filter(a => a.id !== id)
  project.materials = project.materials.filter(m => !materialIds.has(m.id))
  for (const design of [project, ...project.variants]) {
    design.elements = design.elements.filter(e => e.assetId !== id)
    if (design.materialId && materialIds.has(design.materialId)) design.materialId = null
  }
  for (const profile of [...project.profiles, ...project.variants.map(v => v.profile)]) {
    profile.rules = profile.rules.filter(r => r.assetId !== id)
    if (profile.materialId && materialIds.has(profile.materialId)) profile.materialId = null
  }
}
export function replaceAsset(project: Project, id: string, replacement: Asset) {
  const index = project.assets.findIndex(a => a.id === id)
  if (index < 0) throw new Error('Asset no longer exists.')
  const previous = project.assets[index]
  project.assets[index] = { ...replacement, id, name: previous.name, category: previous.category }
}

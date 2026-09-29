import type { Composition, GenerationProfile, GenerationRule, GraphicElement, Project } from '../editor/model'
import { clone } from '../editor/model'
import { elementBounds, insideTemplate, overlaps, regionBounds } from './geometry'

export function seededRandom(seed: number, salt = '') {
  let state = seed >>> 0
  for (let i = 0; i < salt.length; i++) state = Math.imul(state ^ salt.charCodeAt(i), 16777619) >>> 0
  return () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 4294967296 }
}
function inZone(x: number, y: number, rule: GenerationRule, circle: boolean) {
  if (rule.zone === 'surface') return true
  if (rule.zone === 'custom') return rule.regions.some(r => x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height)
  if (rule.zone === 'perimeter') return circle ? Math.hypot((x - .5) * 2, (y - .5) * 2) >= 1 - rule.band * 2 : Math.min(x, y, 1 - x, 1 - y) <= rule.band
  // Circular corners are four diagonal edge sectors, not the invisible bounding-box corners.
  if (circle) return Math.hypot((x - .5) * 2, (y - .5) * 2) >= 1 - rule.band * 2 && Math.abs(Math.abs(x - .5) - Math.abs(y - .5)) < rule.band
  return Math.min(x, 1 - x) <= rule.band && Math.min(y, 1 - y) <= rule.band
}
export function keepProperties(candidate: GraphicElement, previous?: GraphicElement): GraphicElement {
  if (!previous) return candidate
  if (previous.locked) return clone(previous)
  const e = clone(candidate), locks = previous.propertyLocks ?? []
  if (locks.includes('position')) { e.x = previous.x; e.y = previous.y }
  if (locks.includes('scale')) { e.width = previous.width; e.height = previous.height; e.scaleX = previous.scaleX; e.scaleY = previous.scaleY }
  if (locks.includes('rotation')) e.rotation = previous.rotation
  if (locks.includes('opacity')) e.opacity = previous.opacity
  if (locks.includes('flip')) { e.flipX = previous.flipX; e.flipY = previous.flipY }
  if (locks.includes('asset')) e.assetId = previous.assetId
  e.propertyLocks = locks; e.visible = previous.visible
  return e
}
export function generateComposition(project: Project, profile: GenerationProfile, seed: number): { composition: Composition; warnings: string[] } {
  const template = clone(profile.template), warnings: string[] = []
  const protections = project.protectedZones.map(r => regionBounds(r, template))
  if (profile.protectContent) for (const el of project.elements) {
    if (el.visible && !el.generated && (el.protect ?? (el.kind === 'text' || project.assets.find(a => a.id === el.assetId)?.category === 'illustrations'))) protections.push(elementBounds(el))
  }
  const generated = new Map<string, GraphicElement>()
  for (const rule of profile.rules) {
    if (!rule.enabled) continue
    const asset = project.assets.find(a => a.id === rule.assetId)
    if (!asset) { warnings.push(`Unavailable asset: ${rule.assetId}`); continue }
    const random = seededRandom(seed, rule.id), range = ([min, max]: [number, number]) => min + random() * (max - min)
    if (random() >= rule.probability) continue
    const count = Math.floor(range([rule.count[0], rule.count[1] + 1]))
    for (let slot = 0; slot < count; slot++) {
      const id = `gen-${profile.id}-${rule.id}-${slot}`
      const previous = project.elements.find(e => e.id === id)
      if (previous?.locked) { generated.set(id, clone(previous)); continue }
      let placed = false
      for (let attempt = 0; attempt < 160; attempt++) {
        const x = range(rule.x), y = range(rule.y)
        if (!inZone(x, y, rule, template.kind === 'circle') || !insideTemplate(x * template.width, y * template.height, template)) continue
        const scale = range(rule.scale), rotation = range(rule.rotation), angle = rotation * Math.PI / 180
        const half = 80 * scale
        const element: GraphicElement = keepProperties({ id, name: `${asset.name} ${slot + 1}`, kind: 'image', assetId: asset.id,
          x: x * template.width - half * Math.cos(angle) + half * Math.sin(angle), y: y * template.height - half * Math.sin(angle) - half * Math.cos(angle),
          width: 160, height: 160, scaleX: scale, scaleY: scale, rotation, opacity: range(rule.opacity), flipX: rule.flipX && random() > .5, flipY: rule.flipY && random() > .5,
          fill: '#c99b62', locked: false, visible: true, propertyLocks: [], allowOverflow: asset.category === 'tape', generated: { profileId: profile.id, ruleId: rule.id, slot },
        }, previous)
        const b = elementBounds(element)
        if (protections.some(p => overlaps(p, b))) continue
        generated.set(id, element); placed = true; break
      }
      if (!placed) warnings.push(`${asset.name}: slot ${slot + 1} could not fit outside protected zones.`)
    }
  }
  const elements: GraphicElement[] = []
  for (const old of project.elements) {
    if (!old.generated || old.locked || (old.propertyLocks?.length && !generated.has(old.id))) { elements.push(clone(old)); generated.delete(old.id) }
    else if (generated.has(old.id)) { elements.push(generated.get(old.id)!); generated.delete(old.id) }
  }
  const additions = [...generated.values()]
  elements.unshift(...additions.filter(e => !e.allowOverflow))
  elements.push(...additions.filter(e => e.allowOverflow))
  for (const e of elements.filter(e => e.generated && e.locked)) if (protections.some(p => overlaps(p, elementBounds(e)))) warnings.push(`${e.name} is locked and overlaps a protected area.`)
  return { composition: { template, materialId: profile.materialId, elements, protectedZones: clone(project.protectedZones) }, warnings }
}

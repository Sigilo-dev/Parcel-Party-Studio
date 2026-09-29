import type { GenerationProfile, GenerationRule, Template } from '../editor/model'
import { clone } from '../editor/model'
import { imperfections } from '../assets/catalog'
export function defaultRule(assetId: string, id = `rule-${assetId}`): GenerationRule {
  return { id, assetId, enabled: true, probability: 0.85, count: [1, 3], x: [0, 1], y: [0, 1], scale: [0.3, 0.8], rotation: [-180, 180], opacity: [0.25, 0.65], flipX: true, flipY: true, zone: assetId.includes('tape') ? 'perimeter' : 'surface', band: 0.18, regions: [] }
}
export function defaultProfile(template: Template): GenerationProfile {
  return { id: 'profile-default', name: 'Everyday parcel', template: clone(template), materialId: 'kraft-light', protectContent: true,
    rules: imperfections.map(c => ({ ...defaultRule(`asset-${c.id}`, `rule-${c.id}`), enabled: ['creases', 'dirt', 'tape'].includes(c.id) })) }
}

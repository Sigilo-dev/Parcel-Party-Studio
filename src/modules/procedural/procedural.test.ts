import { describe, expect, it } from 'vitest'
import { createProject } from '../assets/placeholders'
import { clone } from '../editor/model'
import { generateComposition, seededRandom } from './engine'
import { elementBounds, overlaps, regionBounds, compositionBounds } from './geometry'
import { assetElement, removeAsset, replaceAsset } from '../assets/operations'
import { builtinAssets, placeholderSvg } from '../assets/catalog'
import { migrateProject } from '../persistence/migrate'
import { createTemplate } from '../templates/catalog'

function input() {
  const p = createProject(), profile = p.profiles[0]
  profile.template = createTemplate('square')
  profile.rules = [profile.rules[0]]
  profile.rules[0] = { ...profile.rules[0], probability: 1, count: [8, 8], scale: [.15, .35], rotation: [-180, 180] }
  return { p, profile }
}
describe('seeded visual composition', () => {
  it('reproduces every identifier and resulting parameter without mutating inputs', () => {
    const { p, profile } = input(), before = clone(p)
    expect(generateComposition(p, profile, 42)).toEqual(generateComposition(p, profile, 42))
    expect(p).toEqual(before)
    expect(generateComposition(p, profile, 43).composition.elements).not.toEqual(generateComposition(p, profile, 42).composition.elements)
  })
  it('regenerates the identical design after serialization and reopening', () => {
    const { p, profile } = input()
    Object.assign(p, generateComposition(p, profile, 77).composition); p.seed = 77
    const restored = migrateProject(JSON.parse(JSON.stringify(p)))
    expect(generateComposition(restored, restored.profiles[0], restored.seed).composition).toEqual({ template: p.template, materialId: p.materialId, elements: p.elements, protectedZones: p.protectedZones })
  })
  it('uses independent reproducible random streams, including seed zero', () => {
    const a = seededRandom(0, 'a'), b = seededRandom(0, 'a'), c = seededRandom(0, 'b')
    expect(Array.from({ length: 20 }, a)).toEqual(Array.from({ length: 20 }, b))
    expect(c()).not.toBe(a())
  })
  it('enforces counts, zero probability and allowed transforms', () => {
    const { p, profile } = input(), r = profile.rules[0]
    r.opacity = [.3, .4]; r.rotation = [15, 25]; r.flipX = false; r.flipY = false
    const elements = generateComposition(p, profile, 10).composition.elements
    expect(elements).toHaveLength(8)
    for (const e of elements) { expect(e.opacity).toBeGreaterThanOrEqual(.3); expect(e.opacity).toBeLessThanOrEqual(.4); expect(e.rotation).toBeGreaterThanOrEqual(15); expect(e.rotation).toBeLessThanOrEqual(25); expect(e.flipX).toBe(false); expect(e.flipY).toBe(false) }
    r.probability = 0; expect(generateComposition(p, profile, 10).composition.elements).toHaveLength(0)
  })
  it('never intersects protected regions, including rotated and scaled marks', () => {
    const { p, profile } = input()
    p.protectedZones = [{ id: 'center', name: 'Number', x: .25, y: .25, width: .5, height: .5 }]
    for (let seed = 0; seed < 30; seed++) {
      const output = generateComposition(p, profile, seed)
      for (const e of output.composition.elements) expect(overlaps(elementBounds(e), regionBounds(p.protectedZones[0], profile.template))).toBe(false)
    }
  })
  it('reports impossible placements rather than violating a protected region', () => {
    const { p, profile } = input()
    p.protectedZones = [{ id: 'all', name: 'All', x: 0, y: 0, width: 1, height: 1 }]
    const result = generateComposition(p, profile, 1)
    expect(result.composition.elements).toHaveLength(0); expect(result.warnings).toHaveLength(8)
  })
  it('protects readable text and marked illustrations automatically', () => {
    const { p, profile } = input()
    p.elements = [{ ...assetElement(p.assets.find(a => a.id === 'asset-parcel')!, 600, 600), x: 0, y: 0, protect: true }]
    expect(generateComposition(p, profile, 3).composition.elements).toHaveLength(1)
    profile.protectContent = false; expect(generateComposition(p, profile, 3).composition.elements).toHaveLength(9)
  })
  it.each(['surface', 'perimeter', 'corners', 'custom'] as const)('places centers inside the %s distribution', zone => {
    const { p, profile } = input(), rule = profile.rules[0]
    rule.zone = zone; rule.band = .2; rule.regions = [{ id: 'region', name: 'Top', x: .1, y: .1, width: .2, height: .2 }]
    const result = generateComposition(p, profile, 8)
    expect(result.composition.elements).toHaveLength(8)
    for (const e of result.composition.elements) {
      const a = e.rotation * Math.PI / 180, half = 80 * e.scaleX!
      const x = (e.x + half * Math.cos(a) - half * Math.sin(a)) / 600, y = (e.y + half * Math.sin(a) + half * Math.cos(a)) / 600
      if (zone === 'perimeter') expect(Math.min(x, y, 1 - x, 1 - y)).toBeLessThanOrEqual(.2)
      if (zone === 'corners') { expect(Math.min(x, 1 - x)).toBeLessThanOrEqual(.2); expect(Math.min(y, 1 - y)).toBeLessThanOrEqual(.2) }
      if (zone === 'custom') { expect(x).toBeGreaterThanOrEqual(.1); expect(x).toBeLessThanOrEqual(.3); expect(y).toBeGreaterThanOrEqual(.1); expect(y).toBeLessThanOrEqual(.3) }
    }
  })
  it('preserves locked layers, chosen properties and manual ordering', () => {
    const { p, profile } = input()
    p.elements = generateComposition(p, profile, 8).composition.elements
    p.elements[0].locked = true; p.elements[1].propertyLocks = ['position', 'scale', 'rotation', 'flip', 'asset', 'opacity']
    const before = clone(p.elements)
    const output = generateComposition(p, profile, 109).composition.elements
    expect(output[0]).toEqual(before[0]); expect(output[1]).toEqual(before[1])
    expect(output.map(e => e.id)).toEqual(before.map(e => e.id))
  })
  it.each(['perimeter', 'corners'] as const)('places circular %s marks inside the actual circular mask', zone => {
    const { p, profile } = input(); profile.template = createTemplate('circle'); profile.rules[0].zone = zone
    const result = generateComposition(p, profile, 12)
    expect(result.composition.elements.length).toBeGreaterThan(0)
    for (const e of result.composition.elements) {
      const a = e.rotation * Math.PI / 180, half = 80 * e.scaleX!
      const x = (e.x + half * Math.cos(a) - half * Math.sin(a) - 300) / 300
      const y = (e.y + half * Math.sin(a) + half * Math.cos(a) - 300) / 300
      expect(x * x + y * y).toBeLessThanOrEqual(1)
      expect(Math.hypot(x, y)).toBeGreaterThanOrEqual(1 - profile.rules[0].band * 2)
    }
  })
})
describe('materials, references and transformation bounds', () => {
  it('provides five replaceable materials and seven imperfection categories without remote images', () => {
    const assets = builtinAssets()
    expect(assets.filter(a => a.category === 'materials')).toHaveLength(5)
    expect(new Set(assets.filter(a => a.category !== 'materials' && a.category !== 'illustrations').map(a => a.category)).size).toBe(7)
    for (const a of assets) { const svg = placeholderSvg(a.builtin!); expect(svg).toContain('<svg'); expect(svg).not.toContain('<image'); expect(svg).not.toContain('href=') }
  })
  it('calculates rotation, nonuniform scale and flips without moving the anchor box', () => {
    const e = { ...assetElement(builtinAssets()[5], 100, 50), x: 10, y: 20, scaleX: 2, scaleY: 3, rotation: 90 }
    expect(elementBounds(e).x).toBeCloseTo(-140)
    expect(elementBounds(e).width).toBeCloseTo(150)
    expect(elementBounds(e).height).toBeCloseTo(200)
    expect(elementBounds({ ...e, flipX: true, flipY: true })).toEqual(elementBounds(e))
  })
  it('includes visible overflowing tape in exported bounds', () => {
    const p = createProject(), tape = assetElement(p.assets.find(a => a.category === 'tape')!)
    tape.x = -50; tape.y = -30; p.elements = [tape]
    expect(compositionBounds(p)).toEqual({ x: -50, y: -30, width: 490, height: 710 })
    tape.visible = false; expect(compositionBounds(p).x).toBe(0)
  })
  it('replaces a shared asset without changing references, and removes every reference on deletion', () => {
    const { p, profile } = input(), id = profile.rules[0].assetId
    p.elements = [assetElement(p.assets.find(a => a.id === id)!)]
    p.variants = [{ id: 'v', name: 'Saved', seed: 5, profile: clone(profile), template: clone(p.template), elements: clone(p.elements), materialId: p.materialId, protectedZones: [] }]
    replaceAsset(p, id, { id: 'new', name: 'Replacement', mime: 'image/png', path: 'assets/new.png', source: 'file' })
    expect(p.elements[0].assetId).toBe(id); expect(p.variants[0].elements[0].assetId).toBe(id)
    expect(p.assets.find(a => a.id === id)?.path).toBe('assets/new.png')
    removeAsset(p, id)
    expect(p.elements).toHaveLength(0); expect(p.variants[0].elements).toHaveLength(0)
    expect(p.profiles[0].rules).toHaveLength(0); expect(p.variants[0].profile.rules).toHaveLength(0)
  })
  it('migrates version one while preserving the original geometry and solid fill', () => {
    const old = { version: 1, id: 'legacy', name: 'Legacy', template: createTemplate('bold'), elements: [], assets: [] }
    const p = migrateProject(old)
    expect(p.version).toBe(2); expect(p.materialId).toBeNull(); expect(p.template).toEqual(old.template)
    expect(p.materials).toHaveLength(5); expect(p.profiles).toHaveLength(1)
  })
})

import { describe, expect, it } from 'vitest'
import { assetElement } from '../assets/operations'
import { builtinAssets } from '../assets/catalog'
import { innerTransform, makeNode, templateShape } from './rendering'
import { createTemplate } from '../templates/catalog'

describe('shared editor and export transformations', () => {
  it('reflects both axes within the original anchor box', () => {
    const e = { ...assetElement(builtinAssets()[5], 120, 60), scaleX: 2, scaleY: .5, flipX: true, flipY: true }
    expect(innerTransform(e)).toEqual({ x: 240, y: 30, scaleX: -2, scaleY: -.5 })
    expect(innerTransform({ ...e, flipX: false, flipY: false })).toEqual({ x: 0, y: 0, scaleX: 2, scaleY: .5 })
  })
  it('uses the same transform for export nodes without leaking group scale', () => {
    const e = { ...assetElement(builtinAssets()[5], 100, 80), kind: 'rectangle' as const, x: 40, y: 60, rotation: 35, scaleX: 1.4, scaleY: 2.1, flipX: true }
    const group = makeNode(e)
    expect(group.position()).toEqual({ x: 40, y: 60 }); expect(group.rotation()).toBe(35)
    expect(group.scale()).toEqual({ x: 1, y: 1 })
    expect(group.getChildren()[0].scale()).toEqual({ x: -1.4, y: 2.1 })
    expect(group.getChildren()[0].x()).toBe(140)
    group.destroy()
  })
  it.each(['rectangular', 'square', 'bold', 'circle'] as const)('builds an inset contour for the %s mask', kind => {
    const t = createTemplate(kind), shape = templateShape(t, 12)
    if (kind === 'circle') { expect(shape.radiusX).toBe(288); expect(shape.radiusY).toBe(288) }
    else { expect(shape.width).toBe(t.width - 24); expect(shape.height).toBe(t.height - 24); expect(shape.x).toBe(12) }
  })
})

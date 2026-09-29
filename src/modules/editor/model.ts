export type TemplateKind = 'rectangular' | 'square' | 'circle' | 'bold'
export type ElementKind = 'rectangle' | 'ellipse' | 'text' | 'image'
export type AssetCategory = 'materials' | 'textures' | 'illustrations' | 'creases' | 'grease' | 'dirt' | 'folds' | 'dents' | 'wear' | 'tape'
export type PropertyLock = 'position' | 'scale' | 'rotation' | 'opacity' | 'flip' | 'asset'
export interface Region { id: string; name: string; x: number; y: number; width: number; height: number }

export interface Template {
  kind: TemplateKind
  width: number
  height: number
  fill: string
  outline: string
  outlineWidth: number
  safeInset: number
}

export interface GraphicElement {
  id: string
  kind: ElementKind
  name: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
  visible: boolean
  locked: boolean
  fill: string
  text?: string
  fontSize?: number
  assetId?: string
  scaleX?: number
  scaleY?: number
  flipX?: boolean
  flipY?: boolean
  allowOverflow?: boolean
  protect?: boolean
  propertyLocks?: PropertyLock[]
  generated?: { profileId: string; ruleId: string; slot: number }
}

export interface Asset {
  id: string
  name: string
  path: string
  mime: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/svg+xml'
  source?: 'builtin' | 'file'
  builtin?: string
  category?: AssetCategory
}

export interface Material { id: string; name: string; assetId: string; color: string; opacity: number }
export interface GenerationRule {
  id: string
  assetId: string
  enabled: boolean
  probability: number
  count: [number, number]
  x: [number, number]
  y: [number, number]
  scale: [number, number]
  rotation: [number, number]
  opacity: [number, number]
  flipX: boolean
  flipY: boolean
  zone: 'surface' | 'perimeter' | 'corners' | 'custom'
  band: number
  regions: Region[]
}
export interface GenerationProfile {
  id: string
  name: string
  template: Template
  materialId: string | null
  protectContent: boolean
  rules: GenerationRule[]
}
export interface Composition {
  template: Template
  materialId: string | null
  elements: GraphicElement[]
  protectedZones: Region[]
}
export interface Variant extends Composition {
  id: string
  name: string
  seed: number
  profile: GenerationProfile
}
export interface Project extends Composition {
  version: 2
  id: string
  name: string
  assets: Asset[]
  materials: Material[]
  profiles: GenerationProfile[]
  activeProfileId: string
  seed: number
  variants: Variant[]
}

export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
export const uid = () => crypto.randomUUID()

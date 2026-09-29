export type TemplateKind = 'rectangular' | 'square' | 'circle' | 'bold'
export type ElementKind = 'rectangle' | 'ellipse' | 'text' | 'image'

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
}

export interface Asset {
  id: string
  name: string
  path: string
  mime: 'image/png' | 'image/jpeg' | 'image/webp'
}

export interface Project {
  version: 1
  id: string
  name: string
  template: Template
  elements: GraphicElement[]
  assets: Asset[]
}

export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
export const uid = () => crypto.randomUUID()

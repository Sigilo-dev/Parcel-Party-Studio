import type { GraphicElement, Project } from '../editor/model'
import { uid } from '../editor/model'
import { createTemplate } from '../templates/catalog'

export function createElement(kind: GraphicElement['kind'], x = 80, y = 100): GraphicElement {
  return { id: uid(), kind, name: kind === 'text' ? 'Text label' : kind === 'ellipse' ? 'Paper circle' : 'Cardboard piece', x, y, width: kind === 'text' ? 260 : 150, height: kind === 'text' ? 80 : 120, rotation: 0, opacity: 1, visible: true, locked: false, fill: kind === 'text' ? '#493522' : '#e8c795', ...(kind === 'text' ? { text: 'HANDLE WITH CARE', fontSize: 28 } : {}) }
}

export function createProject(): Project {
  return { version: 1, id: uid(), name: 'Untitled parcel', template: createTemplate(), assets: [], elements: [] }
}

export function createDemo(): Project {
  const project = createProject()
  project.name = 'The little delivery'
  const piece = (name: string, x: number, y: number, width: number, height: number, fill: string, rotation = 0): GraphicElement => ({ ...createElement('rectangle', x, y), name, width, height, fill, rotation })
  const text = (name: string, value: string, x: number, y: number, width: number, height: number, fontSize: number): GraphicElement => ({ ...createElement('text', x, y), name, text: value, width, height, fontSize })
  project.elements = [
    piece('Packing tape', 171, -10, 98, 720, '#dfbb85'),
    piece('Delivery label', 46, 171, 348, 314, '#f4e7ce', -3),
    text('Label eyebrow', 'PARCEL / 001', 73, 196, 280, 35, 17),
    text('Main lettering', 'SPECIAL\nDELIVERY', 73, 250, 305, 115, 41),
    text('Destination', 'A LITTLE BOX.\nA BIG ADVENTURE.', 73, 384, 286, 60, 17),
    piece('Stamp backing', 298, 520, 83, 83, '#805a38', 8),
    { ...createElement('text', 305, 537), name: 'Stamp', text: 'PP', width: 70, height: 60, fontSize: 35, fill: '#f4e7ce', rotation: 8 },
    text('Footer marking', 'CRAFTED FOR YOUR WORLD', 40, 615, 365, 30, 16),
  ]
  return project
}

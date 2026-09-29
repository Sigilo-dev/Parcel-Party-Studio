import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useEditor } from './store'
import { createProject } from '../assets/placeholders'
import { createTemplate, resizeTemplate, templates } from '../templates/catalog'
import { generateFibers } from '../procedural/generate'
import { createElement } from '../assets/placeholders'
import { applyTransform } from './transforms'

beforeEach(() => setActivePinia(createPinia()))
describe('document editing', () => {
  it('scales lettering along with its frame and constrains document transforms', () => {
    const text = createElement('text')
    const scaled = applyTransform(text, { x: 50000, y: -50000, scaleX: 2, scaleY: 2, rotation: 400 })
    expect(scaled).toMatchObject({ width: 520, height: 160, fontSize: 56, x: 32768, y: -32768, rotation: 40 })
  })
  it('undoes and redoes creation, transforms and deletion without changing ids', () => {
    const editor = useEditor(); editor.load(createProject()); editor.add('rectangle')
    const id = editor.selectedId!
    editor.update(id, { x: 44, width: 234, rotation: 30 })
    editor.undo(); expect(editor.project.elements[0].x).not.toBe(44)
    editor.redo(); expect(editor.project.elements[0]).toMatchObject({ id, x: 44, width: 234, rotation: 30 })
    editor.selectedId = id; editor.remove(); expect(editor.project.elements).toHaveLength(0)
    editor.undo(); expect(editor.project.elements[0].id).toBe(id)
  })
  it('duplicates with a new id and clears the redo branch', () => {
    const editor = useEditor(); editor.load(createProject()); editor.add('text')
    const id = editor.selectedId; editor.duplicate()
    expect(editor.selectedId).not.toBe(id); expect(editor.project.elements).toHaveLength(2)
    editor.undo(); editor.add('ellipse'); expect(editor.future).toHaveLength(0)
  })
  it('protects locked elements and records visibility and order', () => {
    const editor = useEditor(); editor.load(createProject()); editor.add('rectangle'); editor.add('ellipse')
    const id = editor.selectedId!; editor.toggle(id, 'locked')
    editor.remove(); editor.duplicate(); editor.update(id, { x: 900 }); editor.reorder(id, -1)
    expect(editor.project.elements).toHaveLength(2); expect(editor.project.elements[1].x).not.toBe(900)
    editor.toggle(id, 'locked'); editor.reorder(id, -1); expect(editor.project.elements[0].id).toBe(id)
    editor.toggle(id, 'visible'); expect(editor.project.elements[0].visible).toBe(false)
  })
  it('tracks saved snapshots through undo and reload', () => {
    const editor = useEditor(); editor.load(createProject()); expect(editor.dirty).toBe(false)
    editor.add('text'); expect(editor.dirty).toBe(true)
    editor.markSaved(editor.project); editor.update(editor.selectedId!, { text: 'Updated' })
    editor.undo(); expect(editor.dirty).toBe(false)
    editor.load(editor.project); expect(editor.past).toHaveLength(0)
  })
})
describe('templates and procedural assets', () => {
  it.each(templates)('maintains height:width proportions for $kind', preset => {
    const template = createTemplate(preset.kind)
    expect(template.height / template.width).toBeCloseTo(preset.height / preset.width, 2)
    const resized = resizeTemplate(template, 'height', 900)
    expect(resized.height / resized.width).toBeCloseTo(preset.height / preset.width, 2)
    expect(Math.max(...Object.values(resizeTemplate(template, 'width', 99999)).filter(v => typeof v === 'number') as number[])).toBeLessThanOrEqual(4096)
  })
  it('generates deterministic fibers with unique element identifiers', () => {
    const first = generateFibers(createTemplate(), 23), second = generateFibers(createTemplate(), 23)
    expect(first.map(({ id: _id, ...rest }) => rest)).toEqual(second.map(({ id: _id, ...rest }) => rest))
    expect(new Set(first.map(e => e.id)).size).toBe(32)
  })
})

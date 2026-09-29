import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { clone, uid } from './model'
import type { GraphicElement, Project, TemplateKind } from './model'
import { createDemo, createElement } from '../assets/placeholders'
import { createTemplate } from '../templates/catalog'

export const useEditor = defineStore('editor', () => {
  const project = ref<Project>(createDemo())
  const selectedId = ref<string | null>(null)
  const past = ref<Project[]>([])
  const future = ref<Project[]>([])
  const saved = ref('')
  const zoom = ref(0.8)
  const tool = ref<'select' | 'hand'>('select')
  const showSafe = ref(true)
  const selected = computed(() => project.value.elements.find(e => e.id === selectedId.value))
  const dirty = computed(() => JSON.stringify(project.value) !== saved.value)

  function change(edit: (draft: Project) => void) {
    const before = clone(project.value)
    edit(project.value)
    if (JSON.stringify(before) === JSON.stringify(project.value)) return
    past.value.push(before)
    if (past.value.length > 100) past.value.shift()
    future.value = []
  }
  function load(value: Project, isSaved = true) {
    project.value = clone(value)
    past.value = []; future.value = []; selectedId.value = null
    saved.value = isSaved ? JSON.stringify(value) : ''
  }
  function markSaved(snapshot: Project) { saved.value = JSON.stringify(snapshot) }
  function undo() {
    const value = past.value.pop()
    if (!value) return
    future.value.push(clone(project.value)); project.value = value; selectedId.value = null
  }
  function redo() {
    const value = future.value.pop()
    if (!value) return
    past.value.push(clone(project.value)); project.value = value; selectedId.value = null
  }
  function add(kind: GraphicElement['kind']) {
    const el = createElement(kind, project.value.template.width / 2 - 75, project.value.template.height / 2 - 60)
    change(p => p.elements.push(el)); selectedId.value = el.id
  }
  function update(id: string, patch: Partial<GraphicElement>) {
    change(p => {
      const el = p.elements.find(e => e.id === id)
      if (el && !el.locked) Object.assign(el, patch, { id: el.id, kind: el.kind })
    })
  }
  function toggle(id: string, key: 'visible' | 'locked') {
    change(p => { const el = p.elements.find(e => e.id === id); if (el) el[key] = !el[key] })
  }
  function remove() {
    if (!selected.value || selected.value.locked) return
    change(p => { p.elements = p.elements.filter(e => e.id !== selectedId.value) }); selectedId.value = null
  }
  function duplicate() {
    if (!selected.value || selected.value.locked) return
    const el = { ...clone(selected.value), id: uid(), name: `${selected.value.name} copy`, x: selected.value.x + 16, y: selected.value.y + 16 }
    change(p => p.elements.splice(p.elements.findIndex(e => e.id === selectedId.value) + 1, 0, el)); selectedId.value = el.id
  }
  function reorder(id: string, direction: -1 | 1) {
    change(p => {
      const index = p.elements.findIndex(e => e.id === id)
      const next = index + direction
      if (index < 0 || p.elements[index].locked || next < 0 || next >= p.elements.length) return
      ;[p.elements[index], p.elements[next]] = [p.elements[next], p.elements[index]]
    })
  }
  function setTemplate(kind: TemplateKind) { change(p => { p.template = createTemplate(kind) }) }
  return { project, selectedId, selected, past, future, dirty, zoom, tool, showSafe, change, load, markSaved, undo, redo, add, update, toggle, remove, duplicate, reorder, setTemplate }
})

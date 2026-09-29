import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { useEditor } from '../editor/store'
import { useGeneration } from './useGeneration'
import { createProject } from '../assets/placeholders'

vi.mock('../assets/store', () => ({ useAssets: () => ({ prepare: vi.fn().mockResolvedValue(undefined), missing: [] }) }))
beforeEach(() => { setActivePinia(createPinia()); useEditor().load(createProject()) })
describe('generation controls and variant lifecycle', () => {
  it('previews batches without modifying the canvas, and only keeps selected variants', async () => {
    const editor = useEditor(), generation = useGeneration(), original = JSON.stringify(editor.project)
    await generation.generate(4, true)
    expect(generation.candidates.value).toHaveLength(4)
    expect(JSON.stringify(editor.project)).toBe(original)
    generation.chosen.value = [generation.candidates.value[1].id, generation.candidates.value[3].id]
    generation.keep()
    expect(editor.project.variants.map(v => v.seed)).toEqual([2, 4])
    expect(generation.candidates.value).toHaveLength(2)
    expect(new Set(editor.project.variants.map(v => v.id)).size).toBe(2)
    editor.undo(); expect(editor.project.variants).toHaveLength(0)
  })
  it('restores the retained profile, regions, seed and result when applying a variant', async () => {
    const editor = useEditor(), generation = useGeneration()
    editor.project.protectedZones = [{ id: 'region', name: 'Readability', x: .2, y: .2, width: .3, height: .3 }]
    await generation.generate(2, true)
    const v = generation.candidates.value[1]
    generation.editProfile({ name: 'Changed later' }); editor.project.protectedZones = []
    generation.apply(v)
    expect(editor.project.seed).toBe(v.seed)
    expect(editor.project.profiles[0]).toEqual(v.profile)
    expect(editor.project.elements).toEqual(v.elements)
    expect(editor.project.protectedZones).toEqual(v.protectedZones)
  })
  it('increments and wraps uint32 seeds, and updates the canvas in one undo step', async () => {
    const editor = useEditor(), generation = useGeneration()
    editor.project.seed = 4294967295
    await generation.generate(1, false, true)
    expect(editor.project.seed).toBe(0); expect(editor.past).toHaveLength(1)
    editor.undo(); expect(editor.project.seed).toBe(4294967295); expect(editor.project.elements).toHaveLength(0)
  })
  it('copies and removes profiles while retaining a valid active profile', () => {
    const editor = useEditor(), generation = useGeneration()
    generation.copyProfile(); expect(editor.project.profiles).toHaveLength(2)
    expect(editor.project.activeProfileId).not.toBe('profile-default')
    generation.removeProfile(); expect(editor.project.profiles).toHaveLength(1)
    expect(editor.project.activeProfileId).toBe('profile-default')
    generation.removeProfile(); expect(editor.project.profiles).toHaveLength(1)
  })
  it('invalidates unsaved previews if their asset catalog changes', async () => {
    const editor = useEditor(), generation = useGeneration()
    await generation.generate(2, true)
    editor.project.assets.pop(); await nextTick()
    expect(generation.candidates.value).toHaveLength(0)
  })
})

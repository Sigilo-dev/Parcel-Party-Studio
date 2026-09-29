import { computed, ref, watch } from 'vue'
import { useEditor } from '../editor/store'
import { useAssets } from '../assets/store'
import { clone, uid } from '../editor/model'
import type { GenerationProfile, Variant } from '../editor/model'
import { generateComposition } from './engine'

export function useGeneration() {
  const editor = useEditor(), assets = useAssets()
  const candidates = ref<Variant[]>([]), chosen = ref<string[]>([]), messages = ref<string[]>([]), working = ref(false)
  const profile = computed(() => editor.project.profiles.find(p => p.id === editor.project.activeProfileId)!)
  watch(() => `${editor.project.id}:${editor.project.assets.map(a => a.id).join(',')}:${editor.project.materials.map(m => m.id).join(',')}`, () => {
    candidates.value = []; chosen.value = []
  })
  function editProfile(patch: Partial<GenerationProfile>) { editor.change(p => { Object.assign(p.profiles.find(v => v.id === p.activeProfileId)!, patch) }) }
  function copyProfile() {
    if (editor.project.profiles.length >= 50) return
    const next = { ...clone(profile.value), id: uid(), name: `${profile.value.name} copy` }
    editor.change(p => { p.profiles.push(next); p.activeProfileId = next.id })
  }
  function removeProfile() {
    if (editor.project.profiles.length < 2) return
    editor.change(p => { p.profiles = p.profiles.filter(v => v.id !== p.activeProfileId); p.activeProfileId = p.profiles[0].id })
  }
  async function generate(count = 1, batch = false, nextSeed = false) {
    working.value = true; messages.value = []
    try {
      await assets.prepare(editor.project.assets)
      if (assets.missing.length) throw new Error('Repair missing assets in the library before generating.')
      const seed = nextSeed ? (editor.project.seed + 1) >>> 0 : editor.project.seed
      const input = clone(editor.project), snapshot = clone(profile.value), variants: Variant[] = []
      for (let i = 0; i < count; i++) {
        const currentSeed = (seed + i) >>> 0, result = generateComposition(input, snapshot, currentSeed)
        if (result.composition.elements.length > 5000) throw new Error('The result exceeds 5000 layers. Reduce the rule counts.')
        messages.value.push(...result.warnings.map(w => `Seed ${currentSeed}: ${w}`))
        variants.push({ ...result.composition, id: `preview-${currentSeed}`, name: `${snapshot.name} · ${currentSeed}`, seed: currentSeed, profile: snapshot })
      }
      if (batch) { candidates.value = variants; chosen.value = [] }
      else { const v = variants[0]; editor.change(p => { p.template = v.template; p.elements = v.elements; p.materialId = v.materialId; p.seed = v.seed }); editor.selectedId = null }
    } catch (e) { messages.value = [e instanceof Error ? e.message : String(e)] }
    finally { working.value = false }
  }
  function keep() {
    const selected = candidates.value.filter(v => chosen.value.includes(v.id))
    if (selected.length + editor.project.variants.length > 32) { messages.value = ['Keep at most 32 variants per project.']; return }
    editor.change(p => p.variants.push(...selected.map(v => ({ ...clone(v), id: uid() }))))
    candidates.value = candidates.value.filter(v => !chosen.value.includes(v.id)); chosen.value = []
  }
  function apply(variant: Variant) {
    if (!editor.project.profiles.some(p => p.id === variant.profile.id) && editor.project.profiles.length >= 50) { messages.value = ['Remove a profile before restoring this variant.']; return }
    editor.change(p => {
      const v = clone(variant)
      p.template = v.template; p.elements = v.elements; p.protectedZones = v.protectedZones; p.materialId = v.materialId; p.seed = v.seed
      const index = p.profiles.findIndex(profile => profile.id === v.profile.id)
      if (index >= 0) p.profiles[index] = v.profile; else p.profiles.push(v.profile)
      p.activeProfileId = v.profile.id
    }); editor.selectedId = null
  }
  return { profile, candidates, chosen, messages, working, editProfile, copyProfile, removeProfile, generate, keep, apply }
}

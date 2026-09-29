import { ref } from 'vue'
import { useEditor } from '../editor/store'
import { useAssets } from '../assets/store'
import { createElement, createProject } from '../assets/placeholders'
import { clone } from '../editor/model'
import { generateFibers } from '../procedural/generate'
import { nativeFiles } from './native'
import type { LoadedProject } from './native'
import { renderPng } from '../export/png'

export function useWorkspace(confirmDiscard: () => Promise<'save' | 'discard' | 'cancel'>) {
  const editor = useEditor(), assets = useAssets()
  const busy = ref(false), status = ref('Your next little world starts here.'), error = ref(false)
  async function install(loaded: LoadedProject) {
    assets.directory = loaded.directory; assets.images = {}; editor.load(loaded.project)
    await assets.load(loaded.assetData)
  }
  async function save() {
    const snapshot = clone(editor.project)
    if (assets.directory) { await nativeFiles.save(snapshot); editor.markSaved(snapshot) }
    else {
      const loaded = await nativeFiles.create(snapshot)
      if (!loaded) return false
      await install(loaded)
    }
    status.value = 'Project saved locally.'
    return true
  }
  async function canLeave() {
    if (!editor.dirty) return true
    const answer = await confirmDiscard()
    if (answer === 'cancel') return false
    return answer === 'discard' || await save()
  }
  async function action(name: string) {
    if (busy.value) return
    busy.value = true; error.value = false
    try {
      switch (name) {
        case 'new': {
          if (!await canLeave()) break
          const loaded = await nativeFiles.create(createProject())
          if (loaded) { await install(loaded); status.value = 'New local project created.' }
          break
        }
        case 'open': {
          if (!await canLeave()) break
          const loaded = await nativeFiles.open()
          if (loaded) { await install(loaded); status.value = 'Project opened. Welcome back.' }
          break
        }
        case 'save': await save(); break
        case 'import': {
          if (!assets.directory && !await save()) break
          const result = await nativeFiles.import()
          if (!result) break
          const image = await assets.add(result.asset.id, result.data)
          const scale = Math.min(1, 320 / image.width, 320 / image.height)
          const element = { ...createElement('image'), name: result.asset.name, assetId: result.asset.id, width: Math.max(1, Math.round(image.width * scale)), height: Math.max(1, Math.round(image.height * scale)) }
          editor.change(p => { p.assets.push(result.asset); p.elements.push(element) }); editor.selectedId = element.id
          status.value = 'Image copied into the project assets folder.'; break
        }
        case 'export': {
          const file = await nativeFiles.export(renderPng(editor.project, assets.images))
          if (file) status.value = `PNG exported to ${file}`
          break
        }
        case 'fibers': {
          if (editor.project.elements.length + 32 > 5000) throw new Error('The project has reached the 5000 layer limit.')
          const fibers = generateFibers(editor.project.template, crypto.getRandomValues(new Uint32Array(1))[0])
          editor.change(p => p.elements.unshift(...fibers)); status.value = '32 paper fibers generated beneath your artwork.'; break
        }
        case 'undo': editor.undo(); break
        case 'redo': editor.redo(); break
        case 'delete': editor.remove(); break
        case 'duplicate': editor.duplicate(); break
        case 'rectangle': case 'ellipse': case 'text': editor.add(name); break
      }
    } catch (e) { status.value = e instanceof Error ? e.message : String(e); error.value = true }
    finally { busy.value = false }
  }
  async function requestClose(): Promise<boolean> {
    if (busy.value) return false
    busy.value = true
    try { return await canLeave() }
    catch (e) { status.value = String(e); error.value = true; return false }
    finally { busy.value = false }
  }
  return { busy, status, error, action, requestClose }
}

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { CircleCheck, AlertCircle, Package, HardDrive, LoaderCircle } from '@lucide/vue'
import TopBar from './modules/ui/TopBar.vue'
import LeftPanel from './modules/ui/LeftPanel.vue'
import InspectorPanel from './modules/ui/InspectorPanel.vue'
import EditorCanvas from './modules/editor/EditorCanvas.vue'
import { useEditor } from './modules/editor/store'
import { useAssets } from './modules/assets/store'
import { useWorkspace } from './modules/persistence/useWorkspace'
import { desktopAvailable } from './modules/persistence/native'
import { useShortcuts } from './modules/editor/shortcuts'
import ProceduralStudio from './modules/procedural/ProceduralStudio.vue'
const editor = useEditor(), assets = useAssets()
const dialog = ref<HTMLDialogElement>()
let resolveChoice: ((choice: 'save' | 'discard' | 'cancel') => void) | null = null
function confirmDiscard() {
  return new Promise<'save' | 'discard' | 'cancel'>(resolve => { resolveChoice = resolve; dialog.value?.showModal() })
}
function choose(choice: 'save' | 'discard' | 'cancel') { dialog.value?.close(); resolveChoice?.(choice); resolveChoice = null }
const workspace = useWorkspace(confirmDiscard)
useShortcuts(editor, workspace.action, () => workspace.busy.value || !!document.querySelector('dialog[open]'))
watch(() => editor.project.assets, () => { void assets.prepare(editor.project.assets).catch(e => { workspace.status.value = String(e); workspace.error.value = true }) }, { immediate: true, deep: true })
let unlisten: (() => void) | undefined
watch(() => [editor.project.name, editor.dirty], () => {
  document.title = `${editor.dirty ? '• ' : ''}${editor.project.name} — Parcel Party Studio`
  if (desktopAvailable) void getCurrentWindow().setTitle(document.title).catch(() => {})
}, { immediate: true })
function beforeUnload(event: BeforeUnloadEvent) { if (editor.dirty) { event.preventDefault(); event.returnValue = '' } }
onMounted(async () => {
  if (desktopAvailable) unlisten = await getCurrentWindow().onCloseRequested(async event => {
    event.preventDefault()
    if (await workspace.requestClose()) await getCurrentWindow().destroy()
  })
  else window.addEventListener('beforeunload', beforeUnload)
})
onBeforeUnmount(() => { unlisten?.(); window.removeEventListener('beforeunload', beforeUnload) })
</script>

<template>
  <main :class="$style.app">
    <TopBar :busy="workspace.busy.value" @action="workspace.action" />
    <div :class="$style.body" :inert="workspace.busy.value || undefined">
      <LeftPanel @action="workspace.action" /><EditorCanvas /><InspectorPanel />
    </div>
    <footer :class="$style.footer">
      <span :class="[$style.saveState, editor.dirty ? $style.unsaved : $style.success]">● {{ editor.dirty ? 'Unsaved changes' : 'Saved locally' }}</span><i />
      <component :is="workspace.error.value ? AlertCircle : workspace.busy.value ? LoaderCircle : CircleCheck" :size="13" :class="workspace.error.value ? $style.error : $style.success" />
      <span role="status" aria-live="polite" :class="[$style.status, workspace.error.value && $style.error]" :title="workspace.status.value">{{ workspace.busy.value ? 'Working…' : workspace.status.value }}</span>
      <span :class="$style.metric">{{ editor.project.template.width }} × {{ editor.project.template.height }} px</span><i /><span :class="$style.metric">{{ Math.round(editor.zoom * 100) }}%</span><i />
      <span :class="$style.local" :title="assets.directory ?? 'Save to choose a project folder'"><HardDrive :size="12" />{{ desktopAvailable ? assets.directory ? 'LOCAL PROJECT' : 'LOCAL WORKSPACE' : 'FRONTEND PREVIEW' }}</span>
    </footer>
    <ProceduralStudio />
    <dialog ref="dialog" :class="$style.dialog" @cancel.prevent="choose('cancel')">
      <Package :size="30" /><h2>Keep your latest changes?</h2><p>Save this parcel before leaving. Unsaved edits will be lost if you discard them.</p>
      <div><button @click="choose('cancel')">Cancel</button><button @click="choose('discard')">Discard changes</button><button class="primary" autofocus @click="choose('save')">Save project</button></div>
    </dialog>
  </main>
</template>

<style module>
.saveState { flex-shrink: 0; font-size: 10px; }.unsaved { color: #e4b578; }
.body { grid-template-rows: minmax(0, 1fr); }
.app { height: 100dvh; min-width: 1024px; min-height: 680px; display: flex; flex-direction: column; overflow: hidden; }.body { display: grid; grid-template-columns: 252px minmax(0, 1fr) 272px; flex: 1; min-height: 0; }.footer { height: 30px; flex-shrink: 0; padding: 0 16px; background: #1e242b; border-top: 1px solid #353d47; display: flex; align-items: center; gap: 10px; font-size: 10px; color: #939eac; }.status { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.success { color: #8eae98; }.error { color: #f0a696; }.footer i { height: 12px; width: 1px; background: #404852; margin: 0 4px; }.metric { color: #abb5c2; font-variant-numeric: tabular-nums; }.local { display: flex; gap: 6px; align-items: center; font-size: 8px; letter-spacing: 1px; }.dialog { background: #272e37; color: #d6dce4; border: 1px solid #4d5866; padding: 28px; border-radius: 10px; width: 465px; box-shadow: 0 25px 100px #0008; }.dialog::backdrop { background: #0d111abb; }.dialog > svg { color: #d9ab72; }.dialog h2 { font-size: 19px; font-weight: 500; }.dialog p { color: #a0adbd; font-size: 13px; line-height: 1.6; }.dialog > div { display: flex; justify-content: flex-end; gap: 8px; margin-top: 26px; }
</style>

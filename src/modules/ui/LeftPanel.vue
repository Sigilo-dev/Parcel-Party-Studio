<script setup lang="ts">
import { ref } from 'vue'
import { MousePointer2, Hand, Square, Circle, Type, ImagePlus, Sparkles, Shapes, Folder } from '@lucide/vue'
import TemplatePicker from '../templates/TemplatePicker.vue'
import LayerPanel from '../editor/LayerPanel.vue'
import { useEditor } from '../editor/store'
import AssetLibrary from '../assets/AssetLibrary.vue'
const editor = useEditor()
const tab = ref<'templates' | 'assets'>('templates')
defineEmits<{ action: [name: string] }>()
</script>
<template>
  <aside :class="$style.panel">
    <div :class="$style.tools" aria-label="Drawing tools">
      <button title="Select (V)" aria-label="Select" :class="{ active: editor.tool === 'select' }" @click="editor.tool = 'select'"><MousePointer2 :size="17" /></button>
      <button title="Pan (H)" aria-label="Pan" :class="{ active: editor.tool === 'hand' }" @click="editor.tool = 'hand'"><Hand :size="17" /></button><i />
      <button title="Rectangle (R)" aria-label="Add rectangle" @click="editor.add('rectangle')"><Square :size="17" /></button>
      <button title="Circle (C)" aria-label="Add circle" @click="editor.add('ellipse')"><Circle :size="17" /></button>
      <button title="Text (T)" aria-label="Add text" @click="editor.add('text')"><Type :size="17" /></button>
      <button title="Import image" aria-label="Import image" @click="$emit('action', 'import')"><ImagePlus :size="17" /></button>
    </div>
    <div :class="$style.tabs"><button :class="{ active: tab === 'templates' }" @click="tab = 'templates'"><Shapes :size="13" />Templates</button><button :class="{ active: tab === 'assets' }" @click="tab = 'assets'"><Folder :size="13" />Assets</button></div>
    <div :class="$style.library">
    <TemplatePicker v-if="tab === 'templates'" />
    <AssetLibrary v-else @action="$emit('action', $event)" />
    <button :class="$style.generate" @click="$emit('action', 'procedural')"><Sparkles :size="16" /><span><strong>A little texture goes a long way</strong><small>Open procedural studio</small></span><span>+</span></button>
    </div>
    <LayerPanel />
  </aside>
</template>
<style module>
.library { min-height: 160px; max-height: 55%; overflow-y: auto; flex-shrink: 1; }.tabs { flex-shrink: 0; }
.panel { width: 252px; display: flex; flex-direction: column; background: #20262e; min-height: 0; border-right: 1px solid #343b45; }.tools { display: flex; height: 48px; align-items: center; justify-content: center; gap: 1px; border-bottom: 1px solid #343b45; flex-shrink: 0; }.tools button { padding: 8px; }.tools i { height: 18px; width: 1px; background: #39414c; margin: 0 4px; }.tabs { display: flex; padding: 14px 14px 0; gap: 6px; }.tabs button { flex: 1; font-size: 11px; border-bottom: 1px solid #3b434e; border-radius: 3px 3px 0 0; padding-bottom: 11px; }.generate { display: flex; margin: 0 14px 18px; padding: 12px 10px; text-align: left; background: #2b3036; border: 1px solid #414447; gap: 10px; color: #d5ad76; }.generate strong { display: block; font-size: 9px; color: #c7ccd2; font-weight: 500; }.generate small { display: block; font-size: 10px; color: #ab906c; margin-top: 5px; }.generate > span:last-child { margin-left: auto; }.assets { padding: 18px 16px; min-height: 298px; max-height: 335px; overflow: auto; }.assets p { font-size: 11px; color: #8b96a4; }.assetList { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-top: 12px; }.assetList button { flex-direction: column; min-width: 0; font-size: 10px; }.assetList img { width: 50px; height: 50px; object-fit: contain; }.assetList span { max-width: 85px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>

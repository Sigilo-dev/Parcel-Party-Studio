<script setup lang="ts">
import { FlipHorizontal2, FlipVertical2 } from '@lucide/vue'
import { useEditor } from './store'
import type { PropertyLock } from './model'
import NumberField from '../ui/NumberField.vue'
const editor = useEditor()
const locks: PropertyLock[] = ['position', 'scale', 'rotation', 'opacity', 'flip', 'asset']
function toggleLock(lock: PropertyLock) { const e = editor.selected; if (e) editor.update(e.id, { propertyLocks: e.propertyLocks?.includes(lock) ? e.propertyLocks.filter(l => l !== lock) : [...(e.propertyLocks ?? []), lock] }) }
</script>
<template>
  <fieldset v-if="editor.selected" :disabled="editor.selected.locked" :class="$style.options">
    <div class="two-columns"><NumberField label="Scale X" :value="editor.selected.scaleX ?? 1" :min=".01" :max="100" :step=".05" @change="editor.update(editor.selectedId!, { scaleX: $event })" /><NumberField label="Scale Y" :value="editor.selected.scaleY ?? 1" :min=".01" :max="100" :step=".05" @change="editor.update(editor.selectedId!, { scaleY: $event })" /></div>
    <div :class="$style.flips"><button :class="{ active: editor.selected.flipX }" @click="editor.update(editor.selectedId!, { flipX: !editor.selected.flipX })"><FlipHorizontal2 :size="15" />Flip H</button><button :class="{ active: editor.selected.flipY }" @click="editor.update(editor.selectedId!, { flipY: !editor.selected.flipY })"><FlipVertical2 :size="15" />Flip V</button></div>
    <label class="check-label"><input type="checkbox" :checked="editor.selected.allowOverflow" @change="editor.update(editor.selectedId!, { allowOverflow: ($event.target as HTMLInputElement).checked })" />Allow outside contour</label>
    <label class="check-label"><input type="checkbox" :checked="editor.selected.protect ?? editor.selected.kind === 'text'" @change="editor.update(editor.selectedId!, { protect: ($event.target as HTMLInputElement).checked })" />Protect from imperfections</label>
    <template v-if="editor.selected.generated"><div class="section-title" :class="$style.heading">KEEP WHEN REGENERATING</div><div :class="$style.locks"><label v-for="lock in locks" :key="lock" class="check-label"><input type="checkbox" :checked="editor.selected.propertyLocks?.includes(lock)" @change="toggleLock(lock)" />{{ lock }}</label></div></template>
  </fieldset>
</template>
<style module>
.options { margin-top: 15px; }.flips { display: flex; gap: 6px; margin-top: 12px; }.heading { margin: 18px 0 8px; }.locks { display: grid; grid-template-columns: 1fr 1fr; }
</style>

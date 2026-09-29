<script setup lang="ts">
import { computed } from 'vue'
import { Eye, EyeOff, LockKeyhole, LockKeyholeOpen, Type, Square, Circle, Image, ChevronUp, ChevronDown, Copy, Trash2, Layers } from '@lucide/vue'
import { useEditor } from './store'
const editor = useEditor()
const layers = computed(() => [...editor.project.elements].reverse())
const icons = { rectangle: Square, ellipse: Circle, text: Type, image: Image }
</script>
<template>
  <section :class="$style.panel" aria-label="Layers">
    <div :class="$style.heading"><div class="section-title">LAYERS<span>{{ editor.project.elements.length.toString().padStart(2, '0') }}</span></div><Layers :size="14" /></div>
    <div :class="$style.list">
      <div v-if="!layers.length" :class="$style.empty">Your story starts here.<br>Add a shape or a text label.</div>
      <div v-for="element in layers" :key="element.id" :class="[$style.layer, editor.selectedId === element.id && $style.selected, !element.visible && $style.hidden]">
        <button :class="$style.select" :title="element.name" @click="editor.selectedId = element.id"><component :is="icons[element.kind]" :size="14" /><span>{{ element.name }}</span></button>
        <button :aria-label="`${element.visible ? 'Hide' : 'Show'} ${element.name}`" :title="element.visible ? 'Hide layer' : 'Show layer'" @click="editor.toggle(element.id, 'visible')"><component :is="element.visible ? Eye : EyeOff" :size="12" /></button>
        <button :aria-label="`${element.locked ? 'Unlock' : 'Lock'} ${element.name}`" :title="element.locked ? 'Unlock layer' : 'Lock layer'" @click="editor.toggle(element.id, 'locked')"><component :is="element.locked ? LockKeyhole : LockKeyholeOpen" :size="12" /></button>
      </div>
    </div>
    <div :class="$style.actions">
      <button title="Move layer up" aria-label="Move layer up" :disabled="!editor.selected || editor.selected.locked" @click="editor.reorder(editor.selectedId!, 1)"><ChevronUp :size="15" /></button>
      <button title="Move layer down" aria-label="Move layer down" :disabled="!editor.selected || editor.selected.locked" @click="editor.reorder(editor.selectedId!, -1)"><ChevronDown :size="15" /></button>
      <span /><button title="Duplicate layer" aria-label="Duplicate layer" :disabled="!editor.selected || editor.selected.locked" @click="editor.duplicate"><Copy :size="14" /></button>
      <button title="Delete layer" aria-label="Delete layer" :disabled="!editor.selected || editor.selected.locked" @click="editor.remove"><Trash2 :size="14" /></button>
    </div>
  </section>
</template>
<style module>
.heading, .actions { flex-shrink: 0; }.list { min-height: 0; }
.panel { display: flex; flex-direction: column; min-height: 140px; flex: 1; border-top: 1px solid #363d46; }.heading { display: flex; align-items: center; padding: 18px 16px 14px; color: #86929f; gap: 14px; }.heading > div { flex: 1; }.list { overflow-y: auto; flex: 1; padding: 0 7px 8px; }.layer { display: flex; align-items: center; gap: 0; border-radius: 4px; margin-bottom: 2px; border: 1px solid transparent; }.layer button { padding: 7px 5px; color: #7d8997; }.select { min-width: 0; flex: 1; gap: 9px; height: 36px; text-align: left; }.select span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; color: #c0c8d3; }.select svg { flex-shrink: 0; }.selected { background: #38342e; border-color: #675039; }.selected .select svg { color: #d7ad78; }.hidden { opacity: 0.45; }.actions { display: flex; padding: 6px 12px; border-top: 1px solid #313943; }.actions span { flex: 1; }.empty { text-align: center; font-size: 11px; color: #7e8b99; line-height: 1.8; padding: 30px 0; }
</style>

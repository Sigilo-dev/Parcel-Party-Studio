<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Package, Save, Undo2, Redo2, Download, ChevronDown, FolderOpen } from '@lucide/vue'
import { useEditor } from '../editor/store'
const props = defineProps<{ busy: boolean }>()
const emit = defineEmits<{ action: [name: string] }>()
const editor = useEditor(), open = ref<string | null>(null)
const menus = computed<{ title: string; items: { label: string; key: string; action: string; disabled?: boolean }[] }[]>(() => [
  { title: 'File', items: [{ label: 'New project…', key: 'Ctrl+N', action: 'new' }, { label: 'Open project…', key: 'Ctrl+O', action: 'open' }, { label: 'Save project', key: 'Ctrl+S', action: 'save' }] },
  { title: 'Edit', items: [{ label: 'Undo', key: 'Ctrl+Z', action: 'undo', disabled: !editor.past.length }, { label: 'Redo', key: 'Ctrl+Shift+Z', action: 'redo', disabled: !editor.future.length }, { label: 'Duplicate', key: 'Ctrl+D', action: 'duplicate', disabled: !editor.selected || editor.selected.locked }, { label: 'Delete', key: 'Del', action: 'delete', disabled: !editor.selected || editor.selected.locked }] },
  { title: 'Assets', items: [{ label: 'Import image…', key: 'Ctrl+I', action: 'import' }, { label: 'Cardboard rectangle', key: 'R', action: 'rectangle' }, { label: 'Paper circle', key: 'C', action: 'ellipse' }, { label: 'Text label', key: 'T', action: 'text' }] },
  { title: 'Generate', items: [{ label: 'Paper fibers', key: '', action: 'fibers' }] },
  { title: 'Export', items: [{ label: 'Export PNG for Godot…', key: 'Ctrl+E', action: 'export' }] },
])
function action(name: string) { open.value = null; emit('action', name) }
function close() { open.value = null }
function escape(event: KeyboardEvent) { if (event.key === 'Escape') close() }
onMounted(() => { window.addEventListener('click', close); window.addEventListener('keydown', escape) })
onBeforeUnmount(() => { window.removeEventListener('click', close); window.removeEventListener('keydown', escape) })
</script>

<template>
  <header :class="$style.header">
    <div :class="$style.top">
      <div :class="$style.brand"><span :class="$style.logo"><Package :size="23" :stroke-width="1.7" /></span><div>PARCEL PARTY <b>STUDIO</b><small>A WORKSHOP FOR LITTLE WORLDS</small></div></div>
      <div :class="$style.document"><span :class="[$style.dot, !editor.dirty && $style.saved]" />{{ editor.project.name }}<span :class="$style.documentState">{{ editor.dirty ? 'Unsaved changes' : 'Saved locally' }}</span></div>
      <span :class="$style.version">WORKSHOP / 0.1</span>
    </div>
    <div :class="$style.toolbar">
      <nav aria-label="Main menu" :class="$style.menus">
        <div v-for="menu in menus" :key="menu.title" :class="$style.menu">
          <button :disabled="props.busy" :aria-expanded="open === menu.title" aria-haspopup="menu" @click.stop="open = open === menu.title ? null : menu.title">{{ menu.title }}<ChevronDown :size="11" /></button>
          <div v-if="open === menu.title" :class="$style.dropdown" role="menu">
            <button v-for="item in menu.items" :key="item.action" role="menuitem" :disabled="item.disabled" @click="action(item.action)">{{ item.label }}<kbd>{{ item.key }}</kbd></button>
          </div>
        </div>
      </nav>
      <div :class="$style.divider" />
      <button title="Undo (Ctrl+Z)" aria-label="Undo" :disabled="busy || !editor.past.length" @click="action('undo')"><Undo2 :size="16" /></button>
      <button title="Redo (Ctrl+Shift+Z)" aria-label="Redo" :disabled="busy || !editor.future.length" @click="action('redo')"><Redo2 :size="16" /></button>
      <span :class="$style.spacer" />
      <button title="Open project" aria-label="Open project" :disabled="busy" @click="action('open')"><FolderOpen :size="16" /></button>
      <button :disabled="busy" @click="action('save')"><Save :size="15" />Save</button>
      <button class="primary" :disabled="busy" @click="action('export')"><Download :size="15" />Export PNG</button>
    </div>
  </header>
</template>

<style module>
.header { background: #20252c; z-index: 10; }.top { display: flex; align-items: center; height: 68px; padding: 0 22px; border-bottom: 1px solid #30363f; gap: 24px; }.brand { display: flex; align-items: center; gap: 11px; font-size: 13px; letter-spacing: 1.5px; font-weight: 700; color: #f2f2ee; }.brand b { font-weight: 400; color: #daa96a; }.brand small { display: block; font-size: 8px; color: #87919f; letter-spacing: 1.7px; margin-top: 5px; }.logo { width: 38px; height: 38px; display: grid; place-items: center; background: #d7aa72; color: #29231c; border-radius: 9px; }.document { display: flex; align-items: center; gap: 9px; margin: auto; font-size: 12px; color: #c9cfd7; }.documentState { font-size: 10px; color: #828c98; margin-left: 8px; }.dot { width: 5px; height: 5px; border-radius: 50%; background: #daa96a; }.saved { background: #87bca1; }.version { font-size: 9px; color: #74808d; letter-spacing: 1.7px; }.toolbar { height: 46px; padding: 0 15px; display: flex; align-items: center; gap: 6px; border-bottom: 1px solid #343b45; }.menus { display: flex; gap: 2px; }.menu { position: relative; }.menu > button { gap: 7px; color: #cbd2dc; font-size: 12px; }.dropdown { position: absolute; top: 36px; left: 0; width: 270px; padding: 5px; background: #282e37; border: 1px solid #434c58; border-radius: 5px; box-shadow: 0 15px 40px #0006; }.dropdown button { width: 100%; justify-content: space-between; padding: 10px; text-align: left; }.dropdown kbd { color: #8a96a5; font-size: 10px; }.divider { width: 1px; height: 20px; background: #39414a; margin: 0 9px; }.spacer { flex: 1; }
@media (max-width: 1150px) { .documentState, .version { display: none; }.document { margin-right: 0; } }
</style>

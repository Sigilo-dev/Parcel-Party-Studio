<script setup lang="ts">
import { computed, ref } from 'vue'
import { ImagePlus, RefreshCw, AlertTriangle, Search, Plus } from '@lucide/vue'
import { categories, builtinUrl } from './catalog'
import { useEditor } from '../editor/store'
import { useAssets } from './store'
import { assetElement, assetUsages, removeAsset } from './operations'
import type { Asset, AssetCategory } from '../editor/model'
const emit = defineEmits<{ action: [name: string] }>()
const editor = useEditor(), assets = useAssets(), category = ref('all'), search = ref(''), selectedId = ref('')
const detail = ref<HTMLDialogElement>(), confirmRemove = ref(false)
const selected = computed(() => editor.project.assets.find(a => a.id === selectedId.value))
const filtered = computed(() => editor.project.assets.filter(a => (category.value === 'all' || a.category === category.value) && a.name.toLowerCase().includes(search.value.toLowerCase())))
const url = (a: Asset) => assets.images[a.id]?.src ?? (a.source === 'builtin' ? builtinUrl(a.builtin!) : '')
function inspect(asset: Asset) { selectedId.value = asset.id; confirmRemove.value = false; detail.value?.showModal() }
function place(asset: Asset) {
  if (asset.category === 'materials') {
    editor.change(p => {
      let material = p.materials.find(m => m.assetId === asset.id)
      if (!material) { material = { id: `material-${asset.id}`, name: asset.name, assetId: asset.id, color: '#c99b62', opacity: 1 }; p.materials.push(material) }
      p.materialId = material.id
    })
  } else {
    const image = assets.images[asset.id]
    if (!image) return
    const ratio = Math.min(1, 240 / Math.max(image.width, image.height))
    const el = assetElement(asset, Math.max(1, Math.round(image.width * ratio)), Math.max(1, Math.round(image.height * ratio)))
    editor.change(p => p.elements.push(el)); editor.selectedId = el.id
  }
  detail.value?.close()
}
function remove() {
  if (!selected.value) return
  editor.change(p => removeAsset(p, selectedId.value)); detail.value?.close()
}
function edit(key: 'name' | 'category', event: Event) {
  const value = (event.target as HTMLInputElement).value
  editor.change(p => { const a = p.assets.find(a => a.id === selectedId.value)!; if (key === 'category') a.category = value as AssetCategory; else a.name = value.trim() || 'Untitled asset' })
}
</script>
<template>
  <section :class="$style.library">
    <div :class="$style.actions"><button class="secondary" @click="emit('action', 'import')"><ImagePlus :size="14" />Import image</button><button title="Check missing files" aria-label="Check missing files" @click="emit('action', 'refresh')"><RefreshCw :size="14" /></button></div>
    <p v-if="assets.missing.length" class="warning"><AlertTriangle :size="13" />{{ assets.missing.length }} missing — replace or remove.</p>
    <label :class="$style.search"><Search :size="13" /><input v-model="search" aria-label="Search assets" placeholder="Find an asset…" /></label>
    <select v-model="category" aria-label="Asset category filter"><option value="all">All categories · {{ editor.project.assets.length }}</option><option v-for="c in categories" :key="c.id" :value="c.id">{{ c.label }}</option></select>
    <div :class="$style.grid"><button v-for="asset in filtered" :key="asset.id" :title="asset.name" @click="inspect(asset)"><img v-if="url(asset)" :src="url(asset)" alt="" /><AlertTriangle v-else :size="30" /><span>{{ asset.name }}</span><small>{{ asset.source === 'builtin' ? 'PLACEHOLDER' : 'LOCAL IMAGE' }}</small></button></div>
    <p v-if="!filtered.length" class="muted">No assets in this category.</p>
    <dialog ref="detail" :class="$style.dialog">
      <template v-if="selected">
        <header><strong>Asset details</strong><button @click="detail?.close()">Close</button></header>
        <div :class="$style.preview"><img v-if="url(selected)" :src="url(selected)" alt="Asset preview" /><p v-else class="warning">Missing or unreadable file. Replace it to repair all references.</p></div>
        <label class="field-label">Name<input :value="selected.name" maxlength="120" @change="edit('name', $event)" /></label>
        <label class="field-label">Category<select :value="selected.category" @change="edit('category', $event)"><option v-for="c in categories" :key="c.id" :value="c.id">{{ c.label }}</option></select></label>
        <p class="muted">{{ assetUsages(editor.project, selected.id) }} references across designs, materials and profiles. Replacement updates them all.</p>
        <div :class="$style.actions"><button class="primary" :disabled="assets.missing.includes(selected.id)" @click="place(selected)"><Plus :size="14" />{{ selected.category === 'materials' ? 'Apply material' : 'Place on canvas' }}</button><button class="secondary" @click="emit('action', `replace:${selected.id}`)">Replace image…</button><button @click="confirmRemove = !confirmRemove">Remove…</button></div>
        <div v-if="confirmRemove" class="warning"><p>Remove this asset and all its layer, material and profile references? Undo restores them.</p><button class="danger" @click="remove">Remove asset and references</button></div>
      </template>
    </dialog>
  </section>
</template>
<style module>
.library { padding: 14px; }.actions { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }.search { display: flex; gap: 6px; align-items: center; margin: 12px 0 8px; color: #8696a8; }.search input { width: 100%; }.library select { width: 100%; }.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; }.grid button { flex-direction: column; overflow: hidden; background: #191f26; border-color: #384350; padding: 10px 5px; }.grid img { width: 72px; height: 65px; object-fit: contain; background: repeating-conic-gradient(#303840 0% 25%, #252c33 0% 50%) 50% / 12px 12px; }.grid span { font-size: 10px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.grid small { font-size: 7px; color: #8c99a6; letter-spacing: .6px; }.dialog { width: 490px; }.dialog header { display: flex; justify-content: space-between; align-items: center; }.preview { height: 215px; background: repeating-conic-gradient(#303840 0% 25%, #252c33 0% 50%) 50% / 24px 24px; margin-top: 14px; display: grid; place-items: center; padding: 10px; }.preview img { max-width: 100%; max-height: 195px; object-fit: contain; }
</style>

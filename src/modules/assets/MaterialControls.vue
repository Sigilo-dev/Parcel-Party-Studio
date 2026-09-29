<script setup lang="ts">
import { computed } from 'vue'
import { useEditor } from '../editor/store'
import NumberField from '../ui/NumberField.vue'
const editor = useEditor()
const material = computed(() => editor.project.materials.find(m => m.id === editor.project.materialId))
function set(event: Event) { editor.change(p => { p.materialId = (event.target as HTMLSelectElement).value || null }) }
function patch(key: 'name' | 'color' | 'opacity', value: string | number) { editor.change(p => { const m = p.materials.find(m => m.id === p.materialId); if (m) Object.assign(m, { [key]: value }) }) }
</script>
<template>
  <section class="inspector-section">
    <div class="section-title">BASE MATERIAL</div>
    <label class="field-label">Material<select :value="editor.project.materialId ?? ''" @change="set"><option value="">Solid cardboard</option><option v-for="m in editor.project.materials" :key="m.id" :value="m.id">{{ m.name }}</option></select></label>
    <template v-if="material">
      <label class="field-label">Material name<input :value="material.name" maxlength="120" @change="patch('name', ($event.target as HTMLInputElement).value)" /></label>
      <div class="two-columns"><label class="field-label">Base color<input type="color" :value="material.color" @change="patch('color', ($event.target as HTMLInputElement).value)" /></label><NumberField label="Texture opacity" :value="material.opacity * 100" :min="0" :max="100" suffix="%" @change="patch('opacity', $event / 100)" /></div>
      <p class="muted">Edit or replace its image in Assets. Changes apply to every design using this material.</p>
    </template>
  </section>
</template>

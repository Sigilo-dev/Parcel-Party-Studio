<script setup lang="ts">
import type { Region } from '../editor/model'
import { clone, uid } from '../editor/model'
import NumberField from '../ui/NumberField.vue'
const props = defineProps<{ regions: Region[]; label: string }>()
const emit = defineEmits<{ change: [regions: Region[]] }>()
function add() { emit('change', [...props.regions, { id: uid(), name: `Region ${props.regions.length + 1}`, x: .25, y: .25, width: .5, height: .5 }]) }
function update(index: number, key: 'x' | 'y' | 'width' | 'height', percent: number) {
  const all = clone(props.regions), r = all[index]
  r[key] = percent / 100
  r.x = Math.min(.99, r.x); r.y = Math.min(.99, r.y)
  r.width = Math.max(.01, Math.min(1 - r.x, r.width)); r.height = Math.max(.01, Math.min(1 - r.y, r.height))
  emit('change', all)
}
</script>
<template>
  <section :class="$style.regions">
    <div class="section-title">{{ label }}<button :disabled="regions.length >= 100" @click="add">+ Region</button></div>
    <p v-if="!regions.length" class="muted">Add a rectangular region in canvas percentages.</p>
    <div v-for="(r, index) in regions" :key="r.id" :class="$style.region"><header><span>{{ r.name }}</span><button @click="emit('change', regions.filter(z => z.id !== r.id))">Remove</button></header><div class="two-columns"><NumberField v-for="key in (['x', 'y', 'width', 'height'] as const)" :key="key" :label="key" :value="r[key] * 100" :min="key === 'width' || key === 'height' ? 1 : 0" :max="100" suffix="%" @change="update(index, key, $event)" /></div></div>
  </section>
</template>
<style module>
.regions { margin-top: 18px; }.region { padding: 10px; background: #191f27; border: 1px solid #384351; margin-top: 8px; border-radius: 5px; }.region header { display: flex; align-items: center; justify-content: space-between; color: #a6b4c5; font-size: 10px; margin-bottom: 9px; }
</style>

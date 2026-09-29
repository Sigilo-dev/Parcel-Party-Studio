<script setup lang="ts">
import NumberField from '../ui/NumberField.vue'
const props = defineProps<{ label: string; value: [number, number]; min: number; max: number; step?: number; percent?: boolean }>()
const emit = defineEmits<{ change: [value: [number, number]] }>()
function change(index: number, value: number) {
  const range: [number, number] = [...props.value]
  range[index] = props.percent ? value / 100 : props.label === 'Count' ? Math.floor(value) : value
  if (index === 0) range[1] = Math.max(range[0], range[1]); else range[0] = Math.min(range[0], range[1])
  emit('change', range)
}
</script>
<template><div class="two-columns"><NumberField :label="`${label} min`" :value="value[0] * (percent ? 100 : 1)" :min="min" :max="max" :step="step" :suffix="percent ? '%' : undefined" @change="change(0, $event)" /><NumberField :label="`${label} max`" :value="value[1] * (percent ? 100 : 1)" :min="min" :max="max" :step="step" :suffix="percent ? '%' : undefined" @change="change(1, $event)" /></div></template>

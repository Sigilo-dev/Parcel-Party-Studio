<script setup lang="ts">
const props = defineProps<{ label: string; value: number; min?: number; max?: number; step?: number; disabled?: boolean; suffix?: string }>()
const emit = defineEmits<{ change: [value: number] }>()
function change(event: Event) {
  const input = event.target as HTMLInputElement
  const value = input.valueAsNumber
  if (!Number.isFinite(value)) { input.value = String(props.value); return }
  const next = Math.max(Number(input.min || -Infinity), Math.min(Number(input.max || Infinity), value))
  input.value = String(next)
  emit('change', next)
}
</script>
<template><label :class="$style.field"><span>{{ label }}</span><div><input type="number" :aria-label="label" :value="Math.round(value * 100) / 100" :min="min" :max="max" :step="step ?? 1" :disabled="disabled" @change="change" /><small v-if="suffix">{{ suffix }}</small></div></label></template>
<style module>
.field { display: block; min-width: 0; }.field > span { color: #8d99a7; font-size: 10px; display: block; margin-bottom: 7px; }.field > div { position: relative; }.field input { width: 100%; padding-right: 26px; }.field small { position: absolute; right: 8px; top: 9px; font-size: 9px; color: #748191; pointer-events: none; }
</style>

<script setup lang="ts">
import type { Asset, GenerationRule } from '../editor/model'
import RangeFields from './RangeFields.vue'
import RegionEditor from './RegionEditor.vue'
import NumberField from '../ui/NumberField.vue'
defineProps<{ rule: GenerationRule; assets: Asset[] }>()
const emit = defineEmits<{ change: [patch: Partial<GenerationRule>]; remove: [] }>()
</script>
<template>
  <section :class="$style.rule">
    <div class="section-title">IMPERFECTION RULE<button @click="emit('remove')">Remove rule</button></div>
    <label class="field-label">Resource<select :value="rule.assetId" @change="emit('change', { assetId: ($event.target as HTMLSelectElement).value })"><option v-for="a in assets" :key="a.id" :value="a.id">{{ a.name }}</option></select></label>
    <label class="check-label"><input type="checkbox" :checked="rule.enabled" @change="emit('change', { enabled: !rule.enabled })" />Enabled</label>
    <NumberField label="Appearance probability" :value="rule.probability * 100" :min="0" :max="100" suffix="%" @change="emit('change', { probability: $event / 100 })" />
    <RangeFields label="Count" :value="rule.count" :min="0" :max="50" @change="emit('change', { count: $event })" />
    <p class="muted">Probability decides whether this rule appears. Count applies when it does; impossible placements are reported.</p>
    <RangeFields label="Center X" :value="rule.x" :min="0" :max="100" percent @change="emit('change', { x: $event })" />
    <RangeFields label="Center Y" :value="rule.y" :min="0" :max="100" percent @change="emit('change', { y: $event })" />
    <RangeFields label="Scale" :value="rule.scale" :min=".05" :max="8" :step=".05" @change="emit('change', { scale: $event })" />
    <RangeFields label="Rotation" :value="rule.rotation" :min="-360" :max="360" @change="emit('change', { rotation: $event })" />
    <RangeFields label="Opacity" :value="rule.opacity" :min="0" :max="100" percent @change="emit('change', { opacity: $event })" />
    <div class="two-columns"><label class="check-label"><input type="checkbox" :checked="rule.flipX" @change="emit('change', { flipX: !rule.flipX })" />Allow flip H</label><label class="check-label"><input type="checkbox" :checked="rule.flipY" @change="emit('change', { flipY: !rule.flipY })" />Allow flip V</label></div>
    <label class="field-label">Distribution zone<select :value="rule.zone" @change="emit('change', { zone: ($event.target as HTMLSelectElement).value as GenerationRule['zone'] })"><option value="surface">Entire surface</option><option value="perimeter">Perimeter</option><option value="corners">Corners</option><option value="custom">Custom regions</option></select></label>
    <NumberField v-if="rule.zone === 'perimeter' || rule.zone === 'corners'" label="Edge band" :value="rule.band * 100" :min="1" :max="50" suffix="%" @change="emit('change', { band: $event / 100 })" />
    <RegionEditor v-if="rule.zone === 'custom'" :regions="rule.regions" label="ALLOWED REGIONS" @change="emit('change', { regions: $event })" />
  </section>
</template>
<style module>
.rule { border-top: 1px solid #3c4654; padding-top: 12px; margin-top: 16px; display: flex; flex-direction: column; gap: 12px; }.rule label { margin-top: 0; margin-bottom: 0; }.rule p { margin: 0; }
</style>

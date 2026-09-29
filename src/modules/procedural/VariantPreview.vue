<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Composition } from '../editor/model'
import { useEditor } from '../editor/store'
import { useAssets } from '../assets/store'
import { renderPng } from '../export/png'
const props = defineProps<{ composition: Composition }>()
const editor = useEditor(), assets = useAssets(), preview = ref(''), error = ref('')
watch(() => [props.composition, editor.project.materials, assets.images], () => {
  try { preview.value = renderPng(editor.project, assets.images, props.composition, 220); error.value = '' }
  catch (e) { error.value = String(e) }
}, { immediate: true, deep: true })
</script>
<template><div :class="$style.preview"><img v-if="preview" :src="preview" alt="Variant preview" /><span v-else>{{ error || 'Rendering…' }}</span></div></template>
<style module>
.preview { height: 145px; display: grid; place-items: center; padding: 10px; background: repeating-conic-gradient(#262f39 0% 25%, #202731 0% 50%) 50% / 16px 16px; border-radius: 5px; }.preview img { max-width: 100%; max-height: 125px; object-fit: contain; }.preview span { color: #ecad9d; font-size: 10px; }
</style>

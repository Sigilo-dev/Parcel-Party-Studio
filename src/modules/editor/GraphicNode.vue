<script setup lang="ts">
import { computed } from 'vue'
import type Konva from 'konva'
import type { GraphicElement } from './model'
import { shapeConfig } from './rendering'
import { useAssets } from '../assets/store'
import { useEditor } from './store'
import { applyTransform } from './transforms'
const props = defineProps<{ element: GraphicElement }>()
const editor = useEditor(), assets = useAssets()
const config = computed(() => shapeConfig(props.element, props.element.assetId ? assets.images[props.element.assetId] : undefined))
const group = computed(() => ({ ...props.element, id: props.element.id, draggable: !props.element.locked && editor.tool === 'select', listening: !props.element.locked && editor.tool === 'select' }))
function select(event: Konva.KonvaEventObject<MouseEvent>) { event.cancelBubble = true; editor.selectedId = props.element.id }
function move(event: Konva.KonvaEventObject<DragEvent>) {
  editor.update(props.element.id, { x: Math.max(-32768, Math.min(32768, Math.round(event.target.x()))), y: Math.max(-32768, Math.min(32768, Math.round(event.target.y()))) })
}
function transform(event: Konva.KonvaEventObject<Event>) {
  const node = event.target
  const patch = applyTransform(props.element, { x: node.x(), y: node.y(), rotation: node.rotation(), scaleX: node.scaleX(), scaleY: node.scaleY() })
  node.scale({ x: 1, y: 1 })
  editor.update(props.element.id, patch)
}
</script>

<template>
  <v-group :config="group" @mousedown="select" @tap="select" @dragstart="select" @dragend="move" @transformend="transform">
    <v-rect v-if="element.kind === 'rectangle'" :config="config" />
    <v-ellipse v-else-if="element.kind === 'ellipse'" :config="config" />
    <v-text v-else-if="element.kind === 'text'" :config="config" />
    <v-image v-else :config="config" />
  </v-group>
</template>

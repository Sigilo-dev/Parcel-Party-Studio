<script setup lang="ts">
import { computed } from 'vue'
import type Konva from 'konva'
import type { GraphicElement } from './model'
import { shapeConfig } from './rendering'
import { useAssets } from '../assets/store'
import { useEditor } from './store'
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
  const width = Math.max(4, Math.min(16384, props.element.width * node.scaleX()))
  const height = Math.max(4, Math.min(16384, props.element.height * node.scaleY()))
  node.scale({ x: 1, y: 1 })
  editor.update(props.element.id, { x: Math.round(node.x()), y: Math.round(node.y()), width: Math.round(width), height: Math.round(height), rotation: Math.round(node.rotation()) })
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

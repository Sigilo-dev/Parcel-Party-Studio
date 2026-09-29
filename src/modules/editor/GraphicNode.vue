<script setup lang="ts">
import { computed } from 'vue'
import type Konva from 'konva'
import type { GraphicElement } from './model'
import { shapeConfig, innerTransform } from './rendering'
import { useAssets } from '../assets/store'
import { useEditor } from './store'
import { applyTransform } from './transforms'
const props = defineProps<{ element: GraphicElement }>()
const editor = useEditor(), assets = useAssets()
const config = computed(() => shapeConfig(props.element, props.element.assetId ? assets.images[props.element.assetId] : undefined))
const group = computed(() => ({ x: props.element.x, y: props.element.y, rotation: props.element.rotation, width: props.element.width * (props.element.scaleX ?? 1), height: props.element.height * (props.element.scaleY ?? 1), opacity: props.element.opacity, visible: props.element.visible, id: props.element.id, draggable: !props.element.locked && editor.tool === 'select', listening: !props.element.locked && editor.tool === 'select' }))
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
    <v-group :config="innerTransform(element)">
    <v-rect v-if="element.kind === 'rectangle'" :config="config" />
    <v-ellipse v-else-if="element.kind === 'ellipse'" :config="config" />
    <v-text v-else-if="element.kind === 'text'" :config="config" />
    <v-image v-else-if="element.assetId && assets.images[element.assetId]" :config="config" />
    <v-group v-else><v-rect :config="{ width: element.width, height: element.height, fill: '#663d4a', stroke: '#ef9ca9', dash: [6, 4] }" /><v-text :config="{ text: 'MISSING ASSET', width: element.width, y: element.height / 2, align: 'center', fill: '#ffd5db', fontSize: 12 }" /></v-group>
    </v-group>
  </v-group>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Konva from 'konva'
import { Minus, Plus, Scan, Hand, MousePointer2, ShieldCheck } from '@lucide/vue'
import { useEditor } from './store'
import GraphicNode from './GraphicNode.vue'
import { clipTemplate, templateShape } from './rendering'
const editor = useEditor()
const host = ref<HTMLDivElement>()
const stageRef = ref<{ getNode(): Konva.Stage }>()
const transformerRef = ref<{ getNode(): Konva.Transformer }>()
const size = ref({ width: 800, height: 760 })
const pan = ref({ x: 0, y: 0 })
const t = computed(() => editor.project.template)
const origin = computed(() => ({ x: (size.value.width - t.value.width * editor.zoom) / 2 + pan.value.x, y: (size.value.height - t.value.height * editor.zoom) / 2 + pan.value.y, scaleX: editor.zoom, scaleY: editor.zoom }))
const outline = computed(() => ({ ...templateShape(t.value, t.value.outlineWidth / 2), stroke: t.value.outline, strokeWidth: t.value.outlineWidth, listening: false }))
const safe = computed(() => ({ ...templateShape(t.value, t.value.safeInset), stroke: '#fff0d4', opacity: 0.55, strokeWidth: 1 / editor.zoom, dash: [5 / editor.zoom, 5 / editor.zoom], listening: false }))
function fit() { editor.zoom = Math.min(2, Math.max(0.1, Math.min((size.value.width - 130) / t.value.width, (size.value.height - 130) / t.value.height))); pan.value = { x: 0, y: 0 } }
function zoomBy(factor: number) { editor.zoom = Math.min(4, Math.max(0.1, editor.zoom * factor)) }
function wheel(event: Konva.KonvaEventObject<WheelEvent>) {
  event.evt.preventDefault()
  const pointer = stageRef.value?.getNode().getPointerPosition()
  if (!pointer) return
  const old = editor.zoom, before = origin.value
  const x = (pointer.x - before.x) / old, y = (pointer.y - before.y) / old
  zoomBy(event.evt.deltaY > 0 ? 0.9 : 1 / 0.9)
  pan.value = { x: pointer.x - x * editor.zoom - (size.value.width - t.value.width * editor.zoom) / 2, y: pointer.y - y * editor.zoom - (size.value.height - t.value.height * editor.zoom) / 2 }
}
let drag: { x: number; y: number; px: number; py: number } | null = null
function down(event: PointerEvent) {
  if (!(event.target instanceof HTMLCanvasElement)) return
  if (editor.tool !== 'hand' && event.button !== 1) return
  event.preventDefault(); host.value?.setPointerCapture(event.pointerId)
  drag = { x: event.clientX, y: event.clientY, px: pan.value.x, py: pan.value.y }
}
function move(event: PointerEvent) { if (drag) pan.value = { x: drag.px + event.clientX - drag.x, y: drag.py + event.clientY - drag.y } }
function up() { drag = null }
function blank(event: Konva.KonvaEventObject<MouseEvent>) { if (event.target === event.target.getStage() || event.target.name() === 'paper') editor.selectedId = null }
async function syncTransformer() {
  await nextTick()
  const stage = stageRef.value?.getNode(), transformer = transformerRef.value?.getNode()
  if (!stage || !transformer) return
  const element = editor.selected
  const node = element && !element.locked && element.visible && editor.tool === 'select' ? stage.findOne(`#${element.id}`) : undefined
  transformer.nodes(node ? [node] : []); transformer.getLayer()?.batchDraw()
}
watch(() => [editor.selectedId, editor.project, editor.tool], syncTransformer, { deep: true })
watch(() => [t.value.width, t.value.height], fit)
let observer: ResizeObserver
onMounted(() => {
  observer = new ResizeObserver(entries => { const rect = entries[0].contentRect; size.value = { width: rect.width, height: rect.height } })
  observer.observe(host.value!); size.value = { width: host.value!.clientWidth, height: host.value!.clientHeight }; fit()
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <section :class="$style.workspace" aria-label="Design canvas">
    <div :class="$style.breadcrumb"><span>WORKSPACE</span><span>/</span><strong>{{ editor.project.name }}</strong><span :class="$style.tag">{{ t.kind }}</span></div>
    <div ref="host" :class="[$style.canvas, editor.tool === 'hand' && $style.hand]" @pointerdown.capture="down" @pointermove="move" @pointerup="up" @pointercancel="up" @contextmenu.prevent>
      <v-stage ref="stageRef" :config="size" @wheel="wheel" @mousedown="blank">
        <v-layer>
          <v-group :config="origin">
            <v-group :config="{ clipFunc: (ctx: Konva.Context) => clipTemplate(ctx, t) }">
              <v-rect :config="{ name: 'paper', width: t.width, height: t.height, fill: t.fill }" />
              <GraphicNode v-for="element in editor.project.elements" :key="element.id" :element="element" />
            </v-group>
            <component :is="t.kind === 'circle' ? 'v-ellipse' : 'v-rect'" :config="outline" />
            <component :is="t.kind === 'circle' ? 'v-ellipse' : 'v-rect'" v-if="editor.showSafe" :config="safe" />
            <v-transformer ref="transformerRef" :config="{ flipEnabled: false, rotateEnabled: true, borderStroke: '#e5b572', anchorStroke: '#e5b572', anchorFill: '#20252b', anchorSize: 8, padding: 2, boundBoxFunc: (oldBox: Konva.Box, newBox: Konva.Box) => Math.abs(newBox.width) < 4 || Math.abs(newBox.height) < 4 ? oldBox : newBox }" />
          </v-group>
        </v-layer>
      </v-stage>
      <div :class="$style.paperLabel">{{ t.width }} × {{ t.height }} px <span>·</span> {{ t.kind === 'circle' ? 'CIRCULAR CUT' : 'CARDBOARD CUT' }}</div>
      <div :class="$style.controls">
        <button title="Select (V)" aria-label="Select tool" :class="{ active: editor.tool === 'select' }" @click="editor.tool = 'select'"><MousePointer2 :size="16" /></button>
        <button title="Pan (H or hold Space)" aria-label="Pan tool" :class="{ active: editor.tool === 'hand' }" @click="editor.tool = 'hand'"><Hand :size="16" /></button>
        <i />
        <button title="Zoom out" aria-label="Zoom out" @click="zoomBy(0.8)"><Minus :size="16" /></button><span>{{ Math.round(editor.zoom * 100) }}%</span><button title="Zoom in" aria-label="Zoom in" @click="zoomBy(1.25)"><Plus :size="16" /></button>
        <i /><button title="Fit to canvas" aria-label="Fit to canvas" @click="fit"><Scan :size="16" /></button>
        <button title="Toggle safe area" aria-label="Toggle safe area" :class="{ active: editor.showSafe }" @click="editor.showSafe = !editor.showSafe"><ShieldCheck :size="16" /></button>
      </div>
    </div>
    <div :class="$style.hint">Scroll to zoom <span>·</span> Space + drag to pan <span>·</span> Shift + drag a handle for proportions</div>
  </section>
</template>

<style module>
.workspace { min-width: 0; display: flex; flex-direction: column; background: #15191e; }
.breadcrumb { height: 48px; border-bottom: 1px solid #2a2f36; display: flex; align-items: center; gap: 14px; padding: 0 24px; color: #6d7784; font-size: 10px; letter-spacing: 1.3px; flex-shrink: 0; }
.breadcrumb strong { color: #aeb7c2; letter-spacing: 0; font-size: 12px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tag { margin-left: auto; text-transform: uppercase; background: #252a31; color: #a7b0ba; padding: 4px 7px; font-size: 9px; border-radius: 3px; }
.canvas { flex: 1; min-height: 0; position: relative; overflow: hidden; background-image: radial-gradient(#333941 0.8px, transparent 0.8px); background-size: 20px 20px; touch-action: none; }
.hand { cursor: grab; }.hand:active { cursor: grabbing; }
.paperLabel { position: absolute; top: 20px; left: 24px; color: #6c7580; font: 10px 'Segoe UI', sans-serif; letter-spacing: 1px; pointer-events: none; }.paperLabel span { margin: 0 8px; }
.controls { position: absolute; bottom: 22px; left: 50%; transform: translateX(-50%); display: flex; gap: 3px; align-items: center; padding: 5px; background: #242a32; border: 1px solid #39414b; border-radius: 7px; box-shadow: 0 8px 22px #0004; }
.controls button { padding: 7px; }.controls span { width: 45px; text-align: center; font-size: 11px; }.controls i { height: 20px; width: 1px; background: #3a414b; margin: 0 4px; }
.hint { height: 32px; flex-shrink: 0; display: flex; justify-content: center; align-items: center; gap: 12px; font-size: 10px; color: #75808c; background: #191e24; border-top: 1px solid #282e35; }
</style>

<script setup lang="ts">
import { computed } from 'vue'
import { SlidersHorizontal, LockKeyhole, Link2, Package, ShieldCheck } from '@lucide/vue'
import { useEditor } from '../editor/store'
import { resizeTemplate } from '../templates/catalog'
import type { GraphicElement } from '../editor/model'
import MaterialControls from '../assets/MaterialControls.vue'
import ElementOptions from '../editor/ElementOptions.vue'
import RegionEditor from '../procedural/RegionEditor.vue'
import NumberField from './NumberField.vue'
const editor = useEditor()
const selected = computed(() => editor.selected)
const t = computed(() => editor.project.template)
function update(key: keyof GraphicElement, value: number | string) { if (selected.value) editor.update(selected.value.id, { [key]: value }) }
function text(event: Event) { return (event.target as HTMLInputElement).value }
function resize(axis: 'width' | 'height', value: number) { editor.change(p => { p.template = resizeTemplate(p.template, axis, value) }) }
</script>
<template>
  <aside :class="$style.panel">
    <div :class="$style.header"><SlidersHorizontal :size="14" /><span>PROPERTIES</span><span :class="$style.badge">{{ selected ? 'LAYER' : 'DOCUMENT' }}</span></div>
    <div :class="$style.scroll">
      <section v-if="selected" :class="$style.section">
        <div class="section-title">{{ selected.kind.toUpperCase() }}<LockKeyhole v-if="selected.locked" :size="13" /></div>
        <label class="field-label">Layer name<input :value="selected.name" :disabled="selected.locked" maxlength="120" @change="update('name', text($event))" /></label>
        <p v-if="selected.locked" :class="$style.locked">Unlock this layer to edit its properties.</p>
        <fieldset :disabled="selected.locked">
          <div class="section-title" :class="$style.subheading">TRANSFORM</div>
          <div :class="$style.grid">
            <NumberField label="X position" :value="selected.x" :min="-32768" :max="32768" suffix="px" @change="update('x', $event)" />
            <NumberField label="Y position" :value="selected.y" :min="-32768" :max="32768" suffix="px" @change="update('y', $event)" />
            <NumberField label="Width" :value="selected.width" :min="4" :max="16384" suffix="px" @change="update('width', $event)" />
            <NumberField label="Height" :value="selected.height" :min="4" :max="16384" suffix="px" @change="update('height', $event)" />
            <NumberField label="Rotation" :value="selected.rotation" :min="-360" :max="360" suffix="°" @change="update('rotation', $event)" />
            <NumberField label="Opacity" :value="selected.opacity * 100" :min="0" :max="100" suffix="%" @change="update('opacity', $event / 100)" />
          </div>
          <label v-if="selected.kind !== 'image'" :class="$style.color">Fill color<input type="color" :value="selected.fill" @change="update('fill', text($event))" /><code>{{ selected.fill }}</code></label>
          <template v-if="selected.kind === 'text'">
            <label class="field-label">Text content<textarea :value="selected.text" maxlength="10000" rows="4" @change="update('text', text($event))" /></label>
            <NumberField label="Font size" :value="selected.fontSize ?? 28" :min="1" :max="1024" suffix="px" @change="update('fontSize', $event)" />
          </template>
        </fieldset>
        <ElementOptions />
      </section>
      <section v-else :class="$style.empty"><div><Package :size="25" :stroke-width="1.3" /></div><strong>Made of possibility.</strong><p>Select a layer to make it yours,<br>or set up your canvas below.</p></section>
      <MaterialControls />
      <section :class="$style.section">
        <div class="section-title">CANVAS SETTINGS<Package :size="13" /></div>
        <label class="field-label">Project name<input :value="editor.project.name" maxlength="120" @change="editor.change(p => p.name = text($event).trim() || 'Untitled parcel')" /></label>
        <div :class="$style.ratio"><span>{{ t.kind.toUpperCase() }}</span><Link2 :size="12" /><small>Proportions locked</small></div>
        <div :class="$style.grid">
          <NumberField label="Canvas width" :value="t.width" :min="64" :max="4096" suffix="px" @change="resize('width', $event)" />
          <NumberField label="Canvas height" :value="t.height" :min="64" :max="4096" suffix="px" @change="resize('height', $event)" />
        </div>
        <label :class="$style.color">Cardboard<input type="color" :value="t.fill" @change="editor.change(p => p.template.fill = text($event))" /><code>{{ t.fill }}</code></label>
        <label :class="$style.color">Outline<input type="color" :value="t.outline" @change="editor.change(p => p.template.outline = text($event))" /><code>{{ t.outline }}</code></label>
        <div :class="$style.grid">
          <NumberField label="Outline width" :value="t.outlineWidth" :min="0" :max="32" suffix="px" @change="editor.change(p => p.template.outlineWidth = $event)" />
          <NumberField label="Safe inset" :value="t.safeInset" :min="0" :max="Math.floor(Math.min(t.width, t.height) / 2)" suffix="px" @change="editor.change(p => p.template.safeInset = $event)" />
        </div>
        <label :class="$style.check"><input v-model="editor.showSafe" type="checkbox" /><ShieldCheck :size="13" />Show safe area</label>
      </section>
      <section :class="$style.section"><label class="check-label"><input v-model="editor.showProtected" type="checkbox" />Show protected regions</label><RegionEditor :regions="editor.project.protectedZones" label="PROTECTED REGIONS" @change="editor.change(p => p.protectedZones = $event)" /></section>
      <div :class="$style.tip"><span>FROM CARDBOARD TO GAME WORLD</span><p>Export a clean PNG at canvas size.<br>Ready to drop into your Godot project.</p><div>PNG <span>·</span> TRANSPARENT BACKGROUND</div></div>
    </div>
  </aside>
</template>
<style module>
.panel { width: 272px; display: flex; flex-direction: column; background: #20262e; border-left: 1px solid #343b45; min-height: 0; }.header { display: flex; align-items: center; gap: 9px; padding: 0 17px; height: 48px; flex-shrink: 0; border-bottom: 1px solid #343b45; font-size: 10px; letter-spacing: 1.2px; color: #bdc5d0; }.badge { margin-left: auto; color: #828f9d; font-size: 8px; }.scroll { overflow-y: auto; flex: 1; }.section { padding: 20px 17px; border-bottom: 1px solid #343b45; }.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 13px 10px; }.subheading { margin: 21px 0 14px; }.color { display: flex; align-items: center; gap: 7px; margin: 17px 0; font-size: 11px; color: #97a4b4; }.color input { margin-left: auto; width: 25px; height: 25px; padding: 2px; cursor: pointer; }.color code { font-family: inherit; width: 62px; color: #c5cdd8; font-size: 11px; }.ratio { display: flex; align-items: center; gap: 6px; font-size: 9px; margin: 19px 0 14px; color: #d0ac7f; }.ratio > span { margin-right: auto; font-size: 9px; letter-spacing: 0.7px; }.ratio small { color: #8995a3; font-size: 9px; }.check { display: flex; align-items: center; gap: 7px; font-size: 11px; color: #aab5c3; margin-top: 18px; }.check input { accent-color: #d4a76f; }.empty { padding: 28px 17px 24px; text-align: center; border-bottom: 1px solid #343b45; }.empty > div { margin: auto auto 12px; width: 48px; height: 48px; border-radius: 12px; background: #2e3135; color: #c6a277; display: grid; place-items: center; }.empty strong { font-size: 12px; font-weight: 500; color: #c7cfd9; }.empty p { color: #818e9d; font-size: 11px; line-height: 1.7; }.tip { margin: 22px 17px; font-size: 8px; letter-spacing: 1px; color: #ba9b74; }.tip p { letter-spacing: 0; color: #8694a4; font-size: 10px; line-height: 1.8; margin: 12px 0; }.tip > div { color: #68788b; font-size: 8px; letter-spacing: 0.6px; }.tip > div span { margin: 0 8px; }.locked { font-size: 11px; color: #d4b284; }
</style>

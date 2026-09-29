<script setup lang="ts">
import { useEditor } from '../editor/store'
import { templates } from './catalog'
const editor = useEditor()
</script>
<template>
  <section :class="$style.section">
    <div class="section-title">START WITH A SHAPE<span>04</span></div>
    <p :class="$style.intro">A blank canvas. A little possibility.</p>
    <div :class="$style.grid">
      <button v-for="preset in templates" :key="preset.kind" :class="[$style.card, editor.project.template.kind === preset.kind && $style.selected]" @click="editor.setTemplate(preset.kind)">
        <div :class="$style.preview"><span :class="[$style.shape, $style[preset.kind]]"><i /></span></div>
        <strong>{{ preset.label }}</strong><small>{{ preset.ratio }} <span>H:W</span></small>
      </button>
    </div>
    <div :class="$style.note"><span />Clipping mask & safe area included</div>
  </section>
</template>
<style module>
.section { padding: 18px 16px; }.intro { color: #82909f; font-size: 11px; margin: 9px 0 17px; }.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }.card { display: flex; flex-direction: column; align-items: stretch; border: 1px solid #39414b; background: #242a32; padding: 0 0 10px; gap: 0; overflow: hidden; }.card:hover { background: #2d343e; }.selected { border-color: #d3a468; background: #302c28; }.preview { height: 76px; display: grid; place-items: center; }.shape { display: block; width: 39px; height: 49px; background: #c99b62; box-shadow: 3px 3px 0 #0002; position: relative; }.shape i { position: absolute; inset: 5px; border: 1px dashed #f5dfb581; }.rectangular { height: 52px; width: 34px; }.square { width: 43px; height: 43px; }.circle { width: 45px; height: 45px; border-radius: 50%; }.circle i { border-radius: 50%; }.bold { width: 57px; height: 43px; }.card strong { font-size: 10px; font-weight: 500; color: #dce0e6; }.card small { margin-top: 5px; color: #a8b0ba; font-size: 10px; }.card small span { margin-left: 5px; color: #75808d; font-size: 8px; }.note { font-size: 9px; color: #8b96a3; display: flex; align-items: center; gap: 7px; margin-top: 14px; }.note > span { width: 5px; height: 5px; border-radius: 50%; background: #90b99b; }
</style>

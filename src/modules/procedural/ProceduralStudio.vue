<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Sparkles, Shuffle, Copy, X, Layers } from '@lucide/vue'
import { useEditor } from '../editor/store'
import { uid } from '../editor/model'
import type { GenerationRule, TemplateKind } from '../editor/model'
import { useGeneration } from './useGeneration'
import { defaultRule } from './profiles'
import { createTemplate, resizeTemplate, templates } from '../templates/catalog'
import NumberField from '../ui/NumberField.vue'
import RuleEditor from './RuleEditor.vue'
import RegionEditor from './RegionEditor.vue'
import VariantPreview from './VariantPreview.vue'
const editor = useEditor(), generation = useGeneration(), dialog = ref<HTMLDialogElement>(), ruleId = ref(''), batchSize = ref(6), pane = ref<'preview' | 'saved'>('preview')
const profile = generation.profile
const rule = computed(() => profile.value.rules.find(r => r.id === ruleId.value) ?? profile.value.rules[0])
const available = computed(() => editor.project.assets.filter(a => a.category !== 'materials'))
function editRule(patch: Partial<GenerationRule>) { generation.editProfile({ rules: profile.value.rules.map(r => r.id === rule.value?.id ? { ...r, ...patch } : r) }) }
function addRule() { if (!available.value.length || profile.value.rules.length >= 64) return; const r = defaultRule(available.value[0].id, uid()); generation.editProfile({ rules: [...profile.value.rules, r] }); ruleId.value = r.id }
watch(() => editor.proceduralOpen, open => { if (open) dialog.value?.showModal(); else dialog.value?.close() })
onMounted(() => { if (editor.proceduralOpen) dialog.value?.showModal() })
</script>
<template>
  <dialog ref="dialog" :class="$style.studio" @cancel.prevent="editor.proceduralOpen = false">
    <header :class="$style.header"><div><Sparkles :size="18" /><strong>Procedural studio</strong><span>ONE SEED. A WORLD OF POSSIBILITIES.</span></div><button aria-label="Close procedural studio" @click="editor.proceduralOpen = false"><X :size="18" /></button></header>
    <div :class="$style.layout">
      <section :class="$style.settings">
        <label class="field-label">Generation profile<select :value="editor.project.activeProfileId" @change="editor.change(p => p.activeProfileId = ($event.target as HTMLSelectElement).value)"><option v-for="p in editor.project.profiles" :key="p.id" :value="p.id">{{ p.name }}</option></select></label>
        <div class="two-columns"><button class="secondary" @click="generation.copyProfile"><Copy :size="13" />Copy profile</button><button :disabled="editor.project.profiles.length < 2" @click="generation.removeProfile">Remove profile</button></div>
        <label class="field-label">Profile name<input :value="profile.name" maxlength="120" @change="generation.editProfile({ name: ($event.target as HTMLInputElement).value.trim() || 'Untitled profile' })" /></label>
        <div class="two-columns"><label class="field-label">Template<select :value="profile.template.kind" @change="generation.editProfile({ template: createTemplate(($event.target as HTMLSelectElement).value as TemplateKind) })"><option v-for="t in templates" :key="t.kind" :value="t.kind">{{ t.label }}</option></select></label><label class="field-label">Material<select :value="profile.materialId ?? ''" @change="generation.editProfile({ materialId: ($event.target as HTMLSelectElement).value || null })"><option value="">Solid cardboard</option><option v-for="m in editor.project.materials" :key="m.id" :value="m.id">{{ m.name }}</option></select></label></div>
        <NumberField label="Template width" :value="profile.template.width" :min="64" :max="4096" suffix="px" @change="generation.editProfile({ template: resizeTemplate(profile.template, 'width', $event) })" />
        <label class="check-label"><input type="checkbox" :checked="profile.protectContent" @change="generation.editProfile({ protectContent: !profile.protectContent })" />Protect text & marked illustrations</label>
        <RegionEditor :regions="editor.project.protectedZones" label="PROTECTED REGIONS" @change="editor.change(p => p.protectedZones = $event)" />
        <label class="field-label">Imperfection rules<select :value="rule?.id" @change="ruleId = ($event.target as HTMLSelectElement).value"><option v-for="r in profile.rules" :key="r.id" :value="r.id">{{ r.enabled ? '●' : '○' }} {{ editor.project.assets.find(a => a.id === r.assetId)?.name }}</option></select></label><button class="secondary" @click="addRule">+ Add rule</button>
        <RuleEditor v-if="rule" :rule="rule" :assets="available" @change="editRule" @remove="generation.editProfile({ rules: profile.rules.filter(r => r.id !== rule!.id) })" />
      </section>
      <section :class="$style.results">
        <div :class="$style.seedbar"><NumberField label="Seed (uint32)" :value="editor.project.seed" :min="0" :max="4294967295" @change="editor.change(p => p.seed = Math.floor($event))" /><button class="primary" :disabled="generation.working.value" @click="generation.generate()"><Sparkles :size="14" />Generate</button><button class="secondary" :disabled="generation.working.value" @click="generation.generate(1, false, true)"><Shuffle :size="14" />Next seed</button></div>
        <p class="muted">Manual layers stay. Locked layers and checked properties are preserved. Results are editable and undoable.</p>
        <div :class="$style.batchbar"><NumberField label="Batch size" :value="batchSize" :min="1" :max="16" @change="batchSize = Math.floor($event)" /><button class="secondary" :disabled="generation.working.value" @click="pane = 'preview'; generation.generate(batchSize, true)"><Layers :size="14" />Preview batch</button><button class="primary" :disabled="!generation.chosen.value.length" @click="generation.keep">Keep selected ({{ generation.chosen.value.length }})</button></div>
        <div :class="$style.tabs"><button :class="{ active: pane === 'preview' }" @click="pane = 'preview'">Batch previews · {{ generation.candidates.value.length }}</button><button :class="{ active: pane === 'saved' }" @click="pane = 'saved'">Saved variants · {{ editor.project.variants.length }}/32</button></div>
        <div :class="$style.grid" v-if="pane === 'preview'"><article v-for="v in generation.candidates.value" :key="v.id"><VariantPreview :composition="v" /><label class="check-label"><input v-model="generation.chosen.value" type="checkbox" :value="v.id" />Seed {{ v.seed }}</label><button @click="generation.apply(v)">Use on canvas</button></article></div>
        <div :class="$style.grid" v-else><article v-for="v in editor.project.variants" :key="v.id"><VariantPreview :composition="v" /><p>{{ v.name }}</p><button @click="generation.apply(v)">Use on canvas</button><button @click="editor.change(p => p.variants = p.variants.filter(item => item.id !== v.id))">Remove</button></article></div>
        <div v-if="!generation.candidates.value.length && pane === 'preview'" :class="$style.empty"><VariantPreview :composition="editor.project" /><p>Preview a batch to compare seeds.<br>Select the variants you want to keep in your project.</p></div>
        <details v-if="generation.messages.value.length" :class="$style.messages" open><summary>{{ generation.messages.value.length }} placement or resource notice(s)</summary><p v-for="(message, i) in generation.messages.value.slice(0, 60)" :key="i">{{ message }}</p></details>
      </section>
    </div>
  </dialog>
</template>
<style module>
.studio { width: min(1080px, 96vw); max-width: none; height: min(850px, 92vh); padding: 0; overflow: hidden; }.header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #424c58; }.header > div { display: flex; align-items: center; gap: 12px; }.header svg { color: #d8af7a; }.header strong { font-size: 14px; font-weight: 500; }.header span { color: #8091a5; font-size: 8px; letter-spacing: 1px; }.layout { height: calc(100% - 64px); display: grid; grid-template-columns: 345px 1fr; }.settings { overflow-y: auto; padding: 4px 20px 25px; border-right: 1px solid #424c58; }.results { overflow-y: auto; padding: 20px; }.seedbar, .batchbar { display: flex; gap: 10px; align-items: flex-end; }.seedbar > label { width: 145px; }.batchbar { margin: 22px 0 18px; }.batchbar > label { width: 80px; }.tabs { display: flex; gap: 8px; margin-bottom: 15px; border-bottom: 1px solid #424c58; padding-bottom: 10px; }.grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }.grid article { padding: 8px; border: 1px solid #424c58; border-radius: 6px; }.grid p { font-size: 10px; color: #a9b8c9; }.grid button { font-size: 9px; padding: 5px; }.empty { max-width: 330px; margin: 22px auto; text-align: center; color: #8f9fb1; font-size: 12px; line-height: 1.8; }.empty > div { height: 260px; }.empty img { max-height: 240px; }.messages { margin-top: 16px; color: #e6b989; font-size: 11px; background: #302c27; padding: 12px; border-radius: 5px; }.messages p { font-size: 10px; }
</style>

import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import type { Asset } from '../editor/model'
import { useEditor } from '../editor/store'
import { assetKey, builtinUrl } from './catalog'

export function decodeImage(data: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      if (image.naturalWidth > 8192 || image.naturalHeight > 8192) reject(new Error('Image dimensions must be at most 8192 × 8192.'))
      else resolve(image)
    }
    image.onerror = () => reject(new Error('The image could not be decoded. Use a valid PNG, JPEG or WebP.'))
    image.src = data
  })
}

export const useAssets = defineStore('assets', () => {
  const editor = useEditor()
  const cache = shallowRef<Record<string, HTMLImageElement>>({})
  const images = computed(() => Object.fromEntries(editor.project.assets.flatMap(a => cache.value[assetKey(a)] ? [[a.id, cache.value[assetKey(a)]]] : [])))
  const missing = computed(() => editor.project.assets.filter(a => a.source !== 'builtin' && !cache.value[assetKey(a)]).map(a => a.id))
  const directory = ref<string | null>(null)
  const pending = new Map<string, Promise<void>>()
  async function prepare(assets: Asset[]) {
    await Promise.all(assets.filter(a => a.source === 'builtin').map(async a => {
      const key = assetKey(a)
      if (cache.value[key]) return
      if (!pending.has(key)) pending.set(key, decodeImage(builtinUrl(a.builtin!)).then(image => { cache.value = { ...cache.value, [key]: image } }).finally(() => pending.delete(key)))
      await pending.get(key)
    }))
  }
  async function load(data: Record<string, string>, assets = editor.project.assets) {
    const failures: string[] = []
    await Promise.all(assets.filter(a => a.source !== 'builtin').map(async asset => {
      try { if (!data[asset.id]) throw new Error('Missing'); await add(asset, data[asset.id]) }
      catch { failures.push(asset.id) }
    }))
    await prepare(assets)
    return failures
  }
  async function add(asset: Asset, data: string) {
    const image = await decodeImage(data)
    cache.value = { ...cache.value, [assetKey(asset)]: image }
    return image
  }
  function reset() { cache.value = {} }
  function forget(assets: Asset[]) { const next = { ...cache.value }; for (const a of assets) if (a.source !== 'builtin') delete next[assetKey(a)]; cache.value = next }
  return { images, missing, directory, load, add, prepare, reset, forget }
})

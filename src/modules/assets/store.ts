import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'

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
  const images = shallowRef<Record<string, HTMLImageElement>>({})
  const directory = ref<string | null>(null)
  async function load(data: Record<string, string>) {
    const entries = await Promise.all(Object.entries(data).map(async ([id, value]) => [id, await decodeImage(value)] as const))
    images.value = Object.fromEntries(entries)
  }
  async function add(id: string, data: string) {
    const image = await decodeImage(data)
    images.value = { ...images.value, [id]: image }
    return image
  }
  return { images, directory, load, add }
})

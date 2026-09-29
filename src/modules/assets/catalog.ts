import type { Asset, AssetCategory, Material } from '../editor/model'

export const categories: { id: AssetCategory; label: string }[] = [
  { id: 'materials', label: 'Materials' }, { id: 'textures', label: 'Textures' }, { id: 'illustrations', label: 'Illustrations' },
  { id: 'creases', label: 'Creases' }, { id: 'grease', label: 'Grease stains' }, { id: 'dirt', label: 'Dirt' },
  { id: 'folds', label: 'Folds' }, { id: 'dents', label: 'Dents' }, { id: 'wear', label: 'Wear' }, { id: 'tape', label: 'Adhesive tape' },
]
export const materialPresets = [
  { id: 'kraft-light', name: 'Light kraft', color: '#cda676' },
  { id: 'kraft-dark', name: 'Dark kraft', color: '#8c6344' },
  { id: 'recycled', name: 'Recycled cardboard', color: '#a79c80' },
  { id: 'cardstock', name: 'Cardstock', color: '#eee5d1' },
  { id: 'weathered', name: 'Weathered cardboard', color: '#b5936d' },
]
export const imperfections = categories.slice(3)
export function builtinAssets(): Asset[] {
  return [...materialPresets.map(m => ({ id: `asset-${m.id}`, name: m.name, builtin: m.id, category: 'materials' as const })),
    ...imperfections.map(c => ({ id: `asset-${c.id}`, name: `${c.label} placeholder`, builtin: c.id, category: c.id })),
    { id: 'asset-parcel', name: 'Parcel illustration', builtin: 'parcel', category: 'illustrations' as const },
  ].map(a => ({ ...a, source: 'builtin', path: '', mime: 'image/svg+xml' }))
}
export function defaultMaterials(): Material[] { return materialPresets.map(m => ({ ...m, assetId: `asset-${m.id}`, opacity: 1 })) }
export const assetKey = (asset: Asset) => asset.source === 'builtin' ? `builtin:${asset.builtin}` : asset.path

export function placeholderSvg(key: string): string {
  const material = materialPresets.find(m => m.id === key)
  let body = ''
  if (material) {
    body = `<rect width="160" height="160" fill="${material.color}"/>`
    for (let i = 0; i < (key === 'cardstock' ? 26 : 90); i++) {
      const x = (i * 47 + 11) % 160, y = (i * 31 + 7) % 160
      body += `<path d="M${x} ${y}l${3 + i % 11} ${i % 3 - 1}" stroke="${i % 2 ? '#fff1d7' : '#563a28'}" stroke-opacity="${key === 'cardstock' ? '.09' : '.18'}" stroke-width="${i % 4 === 0 ? 2 : 1}"/>`
    }
    if (key === 'weathered') body += '<path d="M0 0h160v12L12 8l-2 138 150 4v10H0z" fill="#654f35" opacity=".24"/>'
  } else {
    const marks: Record<string, string> = {
      creases: '<path d="M15 120L60 48 100 65 145 15" stroke="#493322" stroke-width="5" fill="none" opacity=".65"/><path d="M19 121L64 50 102 69 149 17" stroke="#fff0d3" stroke-width="3" fill="none"/>',
      grease: '<path d="M22 63Q17 21 65 27Q117 6 131 61Q159 105 111 134Q56 154 32 114Z" fill="#59422b" opacity=".34"/><ellipse cx="83" cy="80" rx="40" ry="43" fill="#493722" opacity=".16"/>',
      dirt: Array.from({ length: 34 }, (_, i) => `<circle cx="${12 + i * 43 % 138}" cy="${12 + i * 29 % 138}" r="${1 + i % 7}" fill="#493e2d" opacity=".${2 + i % 4}"/>`).join(''),
      folds: '<path d="M8 0L35 160h15L23 0z" fill="#674932" opacity=".35"/><path d="M23 0L50 160" stroke="#fae9cc" stroke-width="4" opacity=".8"/>',
      dents: '<path d="M18 61L62 22 130 42 147 109 96 144 34 123z" fill="#614730" opacity=".2"/><path d="M18 61L62 22 130 42" stroke="#533c28" stroke-width="4" fill="none" opacity=".5"/><path d="M147 109L96 144 34 123" stroke="#fff0ce" stroke-width="4" fill="none" opacity=".6"/>',
      wear: '<path d="M0 20l20 7-10 12 22 10-17 19 13 16-21 16 15 23-22 18zM160 15l-12 9 6 17-20 8 11 24-8 26 23 17z" fill="#f5ddba" opacity=".85"/>',
      tape: '<path d="M8 42l8 5 8-5 8 5 8-5h80l8 5 8-5 8 5 8-5v76l-8-5-8 5-8-5-8 5H40l-8-5-8 5-8-5-8 5z" fill="#d9b979" fill-opacity=".86" stroke="#a78349"/><path d="M12 57h136M12 102h136" stroke="#f7e7bb" opacity=".6"/>',
      parcel: '<path d="M28 46l52-24 52 24v68l-52 26-52-26z" fill="#ad7847" stroke="#61442d" stroke-width="4"/><path d="M28 46l52 25 52-25M80 71v69M54 34l54 26v24l-13 7V66L42 40" fill="none" stroke="#efcf95" stroke-width="7"/>',
    }
    body = marks[key] ?? '<path d="M20 20l120 120M140 20L20 140" stroke="#d79079" stroke-width="8"/>'
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">${body}</svg>`
}
export const builtinUrl = (key: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(placeholderSvg(key))}`

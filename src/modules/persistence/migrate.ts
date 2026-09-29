import type { Project } from '../editor/model'
import { clone } from '../editor/model'
import { builtinAssets, defaultMaterials } from '../assets/catalog'
import { defaultProfile } from '../procedural/profiles'

// v1 documents keep their original solid material until the user selects a preset.
export function migrateProject(value: unknown): Project {
  const p = clone(value) as Project
  if ((p.version as number) === 1) {
    p.version = 2; p.materialId = null; p.protectedZones = []; p.materials = defaultMaterials()
    p.assets = [...p.assets.map(a => ({ ...a, source: 'file' as const, category: 'illustrations' as const })), ...builtinAssets()]
    p.profiles = [defaultProfile(p.template)]; p.activeProfileId = p.profiles[0].id; p.seed = 1; p.variants = []
  }
  return p
}

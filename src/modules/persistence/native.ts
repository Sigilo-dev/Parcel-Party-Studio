import { invoke, isTauri } from '@tauri-apps/api/core'
import type { Asset, Project } from '../editor/model'

export interface LoadedProject { project: Project; directory: string; assetData: Record<string, string>; missingAssets?: string[] }
export const desktopAvailable = isTauri()
function native<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!desktopAvailable) return Promise.reject(new Error('Local files are available in the desktop app. Run npm run desktop.'))
  return invoke<T>(command, args)
}
export const nativeFiles = {
  create: (project: Project) => native<LoadedProject | null>('create_project', { project }),
  open: () => native<LoadedProject | null>('open_project'),
  save: (project: Project) => native<void>('save_project', { project }),
  import: () => native<{ asset: Asset; data: string } | null>('import_asset'),
  refresh: (project: Project) => native<LoadedProject>('refresh_assets', { project }),
  export: (data: string) => native<string | null>('export_png', { data }),
}

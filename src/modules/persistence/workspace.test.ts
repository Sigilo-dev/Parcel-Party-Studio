import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createProject } from '../assets/placeholders'
import { useEditor } from '../editor/store'
import { useAssets } from '../assets/store'
import { useWorkspace } from './useWorkspace'
import { nativeFiles } from './native'

vi.mock('./native', () => ({ nativeFiles: { create: vi.fn(), open: vi.fn(), save: vi.fn(), import: vi.fn(), export: vi.fn(), refresh: vi.fn() } }))
vi.mock('../export/png', () => ({ renderPng: vi.fn(() => 'data:image/png;base64,test') }))
beforeEach(() => {
  setActivePinia(createPinia()); vi.clearAllMocks()
  vi.stubGlobal('Image', class {
    width = 160; height = 160; naturalWidth = 160; naturalHeight = 160
    onload: (() => void) | null = null
    set src(_value: string) { queueMicrotask(() => this.onload?.()) }
  })
})
describe('native workspace lifecycle', () => {
  it('keeps the document when the unsaved-changes prompt is cancelled', async () => {
    const editor = useEditor(), initial = editor.project.id
    const workspace = useWorkspace(async () => 'cancel')
    await workspace.action('open')
    expect(nativeFiles.open).not.toHaveBeenCalled(); expect(editor.project.id).toBe(initial)
    expect(workspace.busy.value).toBe(false)
  })
  it('does not discard the document if the save folder dialog is cancelled', async () => {
    vi.mocked(nativeFiles.create).mockResolvedValue(null)
    const editor = useEditor(), initial = editor.project.id
    const workspace = useWorkspace(async () => 'save')
    await workspace.action('new')
    expect(editor.project.id).toBe(initial); expect(editor.dirty).toBe(true)
    expect(nativeFiles.create).toHaveBeenCalledTimes(1)
  })
  it('retains dirty state and blocks closing when writing fails', async () => {
    useAssets().directory = 'C:/test'
    vi.mocked(nativeFiles.save).mockRejectedValue(new Error('Disk full'))
    const workspace = useWorkspace(async () => 'save')
    expect(await workspace.requestClose()).toBe(false)
    expect(useEditor().dirty).toBe(true); expect(workspace.error.value).toBe(true)
    expect(workspace.status.value).toContain('Disk full'); expect(workspace.busy.value).toBe(false)
  })
  it('loads stable identifiers and marks a reopened project clean', async () => {
    const project = createProject()
    vi.mocked(nativeFiles.open).mockResolvedValue({ project, directory: 'C:/parcel', assetData: {} })
    const workspace = useWorkspace(async () => 'discard')
    await workspace.action('open')
    expect(useEditor().project).toEqual(project); expect(useEditor().dirty).toBe(false)
    expect(useAssets().directory).toBe('C:/parcel')
    expect(workspace.error.value).toBe(false)
    expect(Object.keys(useAssets().images)).toHaveLength(project.assets.length)
  })
  it('never marks an unsuccessful save as saved', async () => {
    useAssets().directory = 'C:/parcel'
    vi.mocked(nativeFiles.save).mockResolvedValue()
    const workspace = useWorkspace(async () => 'cancel')
    await workspace.action('save'); expect(useEditor().dirty).toBe(false)
    useEditor().add('rectangle'); vi.mocked(nativeFiles.save).mockRejectedValue('Permission denied')
    await workspace.action('save'); expect(useEditor().dirty).toBe(true)
    expect(workspace.status.value).toBe('Permission denied')
  })
  it('opens a document with a missing file, reports it and prevents an invalid save', async () => {
    const project = createProject()
    project.assets.push({ id: 'missing', name: 'Missing', path: 'assets/missing.png', mime: 'image/png', source: 'file', category: 'illustrations' })
    const loaded = { project, directory: 'C:/parcel', assetData: {}, missingAssets: ['missing'] }
    vi.mocked(nativeFiles.open).mockResolvedValue(loaded); vi.mocked(nativeFiles.refresh).mockResolvedValue(loaded)
    const workspace = useWorkspace(async () => 'discard')
    await workspace.action('open')
    expect(useAssets().missing).toEqual(['missing']); expect(workspace.status.value).toContain('missing')
    await workspace.action('save'); expect(nativeFiles.save).not.toHaveBeenCalled()
    expect(workspace.error.value).toBe(true)
  })
  it('replaces a missing image while retaining its stable asset identifier', async () => {
    const editor = useEditor(), assets = useAssets()
    assets.directory = 'C:/parcel'
    editor.project.assets.push({ id: 'missing', name: 'Artwork', path: 'assets/missing.png', mime: 'image/png', source: 'file', category: 'illustrations' })
    vi.mocked(nativeFiles.import).mockResolvedValue({ asset: { id: 'new-file', name: 'New', path: 'assets/new.png', mime: 'image/png' }, data: 'data:image/png;base64,replacement' })
    const workspace = useWorkspace(async () => 'cancel')
    await workspace.action('replace:missing')
    expect(workspace.error.value).toBe(false)
    expect(editor.project.assets.find(a => a.id === 'missing')).toMatchObject({ path: 'assets/new.png', name: 'Artwork' })
    expect(assets.missing).toHaveLength(0)
    editor.undo(); expect(assets.missing).toContain('missing')
    editor.redo(); expect(assets.missing).toHaveLength(0)
  })
})

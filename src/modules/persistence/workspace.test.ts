import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createProject } from '../assets/placeholders'
import { useEditor } from '../editor/store'
import { useAssets } from '../assets/store'
import { useWorkspace } from './useWorkspace'
import { nativeFiles } from './native'

vi.mock('./native', () => ({ nativeFiles: { create: vi.fn(), open: vi.fn(), save: vi.fn(), import: vi.fn(), export: vi.fn() } }))
vi.mock('../export/png', () => ({ renderPng: vi.fn(() => 'data:image/png;base64,test') }))
beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks() })
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
})

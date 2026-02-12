'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Play, Pencil, Trash2, Search, Code, Clock, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import ScriptEditorModal from '@/components/modals/ScriptEditorModal'
import { listScripts, createScript, deleteScript, runScript, type Script, type ScriptOutput } from '@/lib/api'
import { toast } from '@/lib/toast'

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<Script[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingScript, setEditingScript] = useState<Script | null>(null)
  const [runningId, setRunningId] = useState<string | null>(null)
  const [lastOutput, setLastOutput] = useState<Record<string, ScriptOutput>>({})

  const fetchScripts = useCallback(async () => {
    const resp = await listScripts()
    if (resp.success && resp.data) setScripts(resp.data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchScripts() }, [fetchScripts])

  const handleCreate = async () => {
    const resp = await createScript('新建脚本', undefined, undefined)
    if (resp.success && resp.data) {
      setScripts((prev) => [...prev, resp.data!])
      setEditingScript(resp.data)
      toast.success('脚本已创建')
    } else if (resp.error) toast.error(resp.error.message)
  }

  const handleDelete = async (id: string) => {
    const resp = await deleteScript(id)
    if (resp.success) { setScripts((prev) => prev.filter((s) => s.id !== id)); toast.success('脚本已删除') }
    else if (resp.error) toast.error(resp.error.message)
  }

  const handleRun = async (id: string) => {
    setRunningId(id)
    const resp = await runScript(id)
    if (resp.success && resp.data) {
      setLastOutput((prev) => ({ ...prev, [id]: resp.data! }))
      if (resp.data.error) toast.error(`脚本执行出错: ${resp.data.error}`)
      else toast.success(`脚本执行成功 (${resp.data.duration_ms}ms)`)
    } else if (resp.error) toast.error(resp.error.message)
    setRunningId(null)
  }

  const filtered = scripts.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-fg">Lua 脚本</h1>
          <p className="text-xs text-fg-2 mt-0.5">{scripts.length} 个脚本</p>
        </div>
        <Input leftIcon={<Search className="w-3.5 h-3.5" />} placeholder="搜索..." className="max-w-[180px]"
          value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button variant="primary" size="sm" onClick={handleCreate} icon={<Plus className="w-3.5 h-3.5" />}>
          新建脚本
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-fg-2 text-sm">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> 加载中...
        </div>
      ) : filtered.length === 0 ? (
        <Card className="py-12 text-center">
          <Code className="w-8 h-8 text-fg-3 mx-auto mb-2" />
          <p className="text-sm text-fg">暂无脚本</p>
          <p className="text-xs text-fg-2 mt-1">点击「新建脚本」编写 Lua 自动化任务</p>
        </Card>
      ) : (
        <div className="space-y-1">
          {filtered.map((script) => {
            const output = lastOutput[script.id]
            const isRunning = runningId === script.id
            return (
              <div key={script.id} className="flex items-center h-row px-3 rounded-md hover:bg-surface-1 transition-colors group">
                <Code className="w-4 h-4 text-fg-3 flex-shrink-0 mr-3" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-fg">{script.name}</span>
                  {script.description && <span className="text-xs text-fg-3 ml-2">{script.description}</span>}
                </div>
                {output && (
                  <div className="flex items-center gap-2 mr-3 text-xs">
                    {output.error
                      ? <Badge variant="danger"><AlertCircle className="w-3 h-3" /> 出错</Badge>
                      : <Badge variant="success"><CheckCircle2 className="w-3 h-3" /> 成功</Badge>}
                    <span className="text-fg-3 flex items-center gap-1"><Clock className="w-3 h-3" />{output.duration_ms}ms</span>
                  </div>
                )}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleRun(script.id)} disabled={isRunning}
                    className="p-1.5 rounded-md text-success hover:bg-success-tint transition-colors disabled:opacity-50">
                    {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  </button>
                  <button onClick={() => setEditingScript(script)}
                    className="p-1.5 rounded-md text-fg-3 hover:text-fg hover:bg-surface-1 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(script.id)}
                    className="p-1.5 rounded-md text-fg-3 hover:text-danger hover:bg-danger-tint transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editingScript && <ScriptEditorModal script={editingScript} onClose={() => { setEditingScript(null); fetchScripts() }} />}
    </div>
  )
}

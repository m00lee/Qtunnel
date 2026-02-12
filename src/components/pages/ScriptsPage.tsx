'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Play, Pencil, Trash2, Search, Code, Clock, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import ScriptEditorModal from '@/components/modals/ScriptEditorModal'
import {
  listScripts,
  createScript,
  deleteScript,
  runScript,
  type Script,
  type ScriptOutput,
} from '@/lib/api'

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<Script[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingScript, setEditingScript] = useState<Script | null>(null)
  const [runningId, setRunningId] = useState<string | null>(null)
  const [lastOutput, setLastOutput] = useState<Record<string, ScriptOutput>>({})

  const fetchScripts = useCallback(async () => {
    const resp = await listScripts()
    if (resp.success && resp.data) {
      setScripts(resp.data)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchScripts() }, [fetchScripts])

  const handleCreate = async () => {
    const resp = await createScript('新建脚本', undefined, undefined)
    if (resp.success && resp.data) {
      setScripts((prev) => [...prev, resp.data!])
      setEditingScript(resp.data)
    }
  }

  const handleDelete = async (id: string) => {
    const resp = await deleteScript(id)
    if (resp.success) {
      setScripts((prev) => prev.filter((s) => s.id !== id))
    }
  }

  const handleRun = async (id: string) => {
    setRunningId(id)
    const resp = await runScript(id)
    if (resp.success && resp.data) {
      setLastOutput((prev) => ({ ...prev, [id]: resp.data! }))
    }
    setRunningId(null)
  }

  const handleEditorClose = () => {
    setEditingScript(null)
    fetchScripts()
  }

  const filtered = scripts.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-5">
      {/* 顶部操作栏 */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="搜索脚本..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="primary" size="sm" onClick={handleCreate} icon={<Plus className="w-3.5 h-3.5" />}>
          新建脚本
        </Button>
      </div>

      {/* 统计 */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Code className="w-3.5 h-3.5" /> 共 {scripts.length} 个脚本
        </span>
      </div>

      {/* 脚本列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> 加载中...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Code className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm font-medium">暂无脚本</p>
          <p className="text-xs mt-1">点击「新建脚本」开始编写 Lua 自动化任务</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((script) => {
            const output = lastOutput[script.id]
            const isRunning = runningId === script.id
            return (
              <Card key={script.id} className="p-4 space-y-3 group hover:border-primary/30 transition-colors">
                {/* 标题 */}
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-foreground truncate">{script.name}</h4>
                    {script.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {script.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* 最近运行结果 */}
                {output && (
                  <div className="flex items-center gap-2 text-[10px]">
                    {output.error ? (
                      <span className="flex items-center gap-1 text-danger">
                        <AlertCircle className="w-3 h-3" /> 出错
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-success">
                        <CheckCircle2 className="w-3 h-3" /> 成功
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-3 h-3" /> {output.duration_ms}ms
                    </span>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleRun(script.id)}
                    disabled={isRunning}
                    icon={
                      isRunning
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Play className="w-3 h-3" />
                    }
                  >
                    {isRunning ? '运行中' : '运行'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingScript(script)}
                    icon={<Pencil className="w-3 h-3" />}
                  >
                    编辑
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(script.id)}
                    icon={<Trash2 className="w-3 h-3 text-danger" />}
                  />
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* 编辑弹窗 */}
      {editingScript && (
        <ScriptEditorModal script={editingScript} onClose={handleEditorClose} />
      )}
    </div>
  )
}

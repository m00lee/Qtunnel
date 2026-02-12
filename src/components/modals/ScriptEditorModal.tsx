'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Play, Save, Loader2, Clock, Cpu } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import LuaEditor from '@/components/editors/LuaEditor'
import { updateScript, runScript, type Script, type ScriptOutput, type ScriptLogEntry } from '@/lib/api'

interface Props { script: Script; onClose: () => void }

export default function ScriptEditorModal({ script, onClose }: Props) {
  const [name, setName] = useState(script.name)
  const [description, setDescription] = useState(script.description)
  const [code, setCode] = useState(script.code)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [output, setOutput] = useState<ScriptOutput | null>(null)
  const consoleRef = useRef<HTMLDivElement>(null)

  useEffect(() => { consoleRef.current?.scrollTo(0, consoleRef.current.scrollHeight) }, [output])

  const handleSave = async () => { setSaving(true); await updateScript(script.id, name, description, code); setSaving(false) }
  const handleRun = async () => {
    await updateScript(script.id, name, description, code)
    setRunning(true); setOutput(null)
    const resp = await runScript(script.id)
    if (resp.success && resp.data) setOutput(resp.data)
    else if (resp.error) setOutput({ logs: [], error: resp.error.message, duration_ms: 0, memory_used: 0 })
    setRunning(false)
  }

  const levelColor: Record<string, string> = { info: 'text-[#89b4fa]', warn: 'text-[#f9e2af]', error: 'text-[#f38ba8]' }

  const fmtTime = (ts: string) => { try { return new Date(ts).toLocaleTimeString('zh-CN', { hour12: false }) } catch { return ts } }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay animate-fade-in">
      <div className="bg-surface-0 rounded-lg shadow-modal flex flex-col w-[92vw] h-[88vh] max-w-5xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-sep-subtle bg-surface-1 flex-shrink-0">
          <div className="flex-1 min-w-0 flex items-center gap-3">
            <Input className="text-sm font-semibold bg-transparent border-none shadow-none focus:ring-0 px-0 max-w-[220px]"
              value={name} onChange={(e) => setName(e.target.value)} placeholder="脚本名称" />
            <span className="text-xs text-fg-3 hidden sm:block">—</span>
            <Input className="text-xs text-fg-3 bg-transparent border-none shadow-none focus:ring-0 px-0 flex-1 hidden sm:block"
              value={description} onChange={(e) => setDescription(e.target.value)} placeholder="添加描述..." />
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Button variant="primary" size="sm" onClick={handleRun} disabled={running}
              icon={running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}>
              {running ? '执行中' : '运行'}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSave} disabled={saving} icon={<Save className="w-3.5 h-3.5" />}>保存</Button>
            <button onClick={onClose} className="p-1.5 rounded-md text-fg-3 hover:text-fg hover:bg-surface-2 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Editor + Console */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex-[3] min-h-0 overflow-hidden p-2">
            <LuaEditor initialCode={code} onChange={setCode} />
          </div>
          <div className="flex-[2] min-h-0 border-t border-sep-subtle flex flex-col bg-[#11111b]">
            <div className="flex items-center justify-between px-4 py-1.5 border-b border-[#313244] flex-shrink-0">
              <span className="text-xs font-medium text-[#a6adc8]">控制台</span>
              <div className="flex items-center gap-3">
                {output && (
                  <>
                    <span className="flex items-center gap-1 text-xs text-[#6c7086]"><Clock className="w-3 h-3" />{output.duration_ms}ms</span>
                    <span className="flex items-center gap-1 text-xs text-[#6c7086]"><Cpu className="w-3 h-3" />{(output.memory_used / 1024).toFixed(0)}KB</span>
                  </>
                )}
                <button onClick={() => setOutput(null)} className="text-xs text-[#6c7086] hover:text-[#a6adc8] transition-colors">清除</button>
              </div>
            </div>
            <div ref={consoleRef} className="flex-1 overflow-auto p-3 font-mono text-xs leading-5 space-y-0.5">
              {running && <div className="flex items-center gap-2 text-[#a6adc8]"><Loader2 className="w-3 h-3 animate-spin" />正在执行...</div>}
              {output?.logs.map((entry: ScriptLogEntry, i: number) => (
                <div key={i} className="flex gap-2">
                  <span className="text-[#585b70] flex-shrink-0">{fmtTime(entry.timestamp)}</span>
                  <span className={`flex-shrink-0 uppercase w-12 ${levelColor[entry.level] || 'text-[#cdd6f4]'}`}>[{entry.level}]</span>
                  <span className="text-[#cdd6f4] break-all">{entry.message}</span>
                </div>
              ))}
              {output?.error && (
                <div className="mt-2 px-3 py-2 rounded-md bg-[#f38ba8]/10 border border-[#f38ba8]/20">
                  <span className="text-[#f38ba8] text-xs">错误: {output.error}</span>
                </div>
              )}
              {output && !output.error && output.logs.length === 0 && <div className="text-[#585b70]">执行完成（无输出）</div>}
              {!output && !running && <div className="text-[#585b70]">点击「运行」执行脚本</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

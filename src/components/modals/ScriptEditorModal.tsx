'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Play, Save, Loader2, Clock, Cpu } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import LuaEditor from '@/components/editors/LuaEditor'
import {
  updateScript,
  runScript,
  type Script,
  type ScriptOutput,
  type ScriptLogEntry,
} from '@/lib/api'

interface Props {
  script: Script
  onClose: () => void
}

export default function ScriptEditorModal({ script, onClose }: Props) {
  const [name, setName] = useState(script.name)
  const [description, setDescription] = useState(script.description)
  const [code, setCode] = useState(script.code)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [output, setOutput] = useState<ScriptOutput | null>(null)
  const consoleRef = useRef<HTMLDivElement>(null)

  // 控制台自动滚到底部
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight
    }
  }, [output])

  const handleSave = async () => {
    setSaving(true)
    await updateScript(script.id, name, description, code)
    setSaving(false)
  }

  const handleRun = async () => {
    // 先保存再执行
    await updateScript(script.id, name, description, code)
    setRunning(true)
    setOutput(null)
    const resp = await runScript(script.id)
    if (resp.success && resp.data) {
      setOutput(resp.data)
    } else if (resp.error) {
      setOutput({
        logs: [],
        error: resp.error.message,
        duration_ms: 0,
        memory_used: 0,
      })
    }
    setRunning(false)
  }

  const clearConsole = () => setOutput(null)

  const levelColor: Record<string, string> = {
    info: 'text-[#89b4fa]',
    warn: 'text-[#f9e2af]',
    error: 'text-[#f38ba8]',
  }

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts)
      return d.toLocaleTimeString('zh-CN', { hour12: false })
    } catch {
      return ts
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border-subtle rounded-2xl shadow-2xl flex flex-col w-[92vw] h-[88vh] max-w-5xl overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border-subtle bg-surface flex-shrink-0">
          <div className="flex-1 min-w-0 flex items-center gap-3">
            <Input
              className="text-sm font-semibold bg-transparent border-none shadow-none focus:ring-0 px-0 max-w-[240px]"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="脚本名称"
            />
            <span className="text-xs text-muted-foreground hidden sm:block">—</span>
            <Input
              className="text-xs text-muted-foreground bg-transparent border-none shadow-none focus:ring-0 px-0 flex-1 hidden sm:block"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="添加描述..."
            />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="primary"
              size="sm"
              onClick={handleRun}
              disabled={running}
              icon={
                running
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Play className="w-3.5 h-3.5" />
              }
            >
              {running ? '执行中...' : '运行'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              icon={<Save className="w-3.5 h-3.5" />}
            >
              保存
            </Button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card-hover transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 编辑器区域 */}
        <div className="flex-1 min-h-0 flex flex-col">
          {/* 代码编辑器 ~60% */}
          <div className="flex-[3] min-h-0 overflow-hidden p-2">
            <LuaEditor initialCode={code} onChange={setCode} />
          </div>

          {/* 控制台 ~40% */}
          <div className="flex-[2] min-h-0 border-t border-border-subtle flex flex-col bg-[#11111b]">
            {/* 控制台头部 */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#313244] flex-shrink-0">
              <span className="text-[11px] font-medium text-[#a6adc8]">控制台</span>
              <div className="flex items-center gap-3">
                {output && (
                  <>
                    <span className="flex items-center gap-1 text-[10px] text-[#6c7086]">
                      <Clock className="w-3 h-3" /> {output.duration_ms}ms
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-[#6c7086]">
                      <Cpu className="w-3 h-3" /> {(output.memory_used / 1024).toFixed(0)}KB
                    </span>
                  </>
                )}
                <button
                  onClick={clearConsole}
                  className="text-[10px] text-[#6c7086] hover:text-[#a6adc8] transition-colors"
                >
                  清除
                </button>
              </div>
            </div>

            {/* 控制台内容 */}
            <div ref={consoleRef} className="flex-1 overflow-auto p-3 font-mono text-[12px] leading-5 space-y-0.5">
              {running && (
                <div className="flex items-center gap-2 text-[#a6adc8]">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>正在执行脚本...</span>
                </div>
              )}

              {output?.logs.map((entry: ScriptLogEntry, i: number) => (
                <div key={i} className="flex gap-2">
                  <span className="text-[#585b70] flex-shrink-0">{formatTime(entry.timestamp)}</span>
                  <span className={`flex-shrink-0 uppercase w-12 ${levelColor[entry.level] || 'text-[#cdd6f4]'}`}>
                    [{entry.level}]
                  </span>
                  <span className="text-[#cdd6f4] break-all">{entry.message}</span>
                </div>
              ))}

              {output?.error && (
                <div className="mt-2 px-3 py-2 rounded-lg bg-[#f38ba8]/10 border border-[#f38ba8]/20">
                  <span className="text-[#f38ba8] text-[11px] font-medium">错误: </span>
                  <span className="text-[#f38ba8] text-[11px]">{output.error}</span>
                </div>
              )}

              {output && !output.error && output.logs.length === 0 && (
                <div className="text-[#585b70]">脚本执行完成（无输出）</div>
              )}

              {!output && !running && (
                <div className="text-[#585b70]">点击「运行」执行脚本，输出将在此显示</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Trash2, CloudOff, Plus, X, Loader2 } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { purgeAllCache, purgeCacheByUrls } from '@/lib/api'
import { toast } from '@/lib/toast'

interface Props { zoneId: string; zoneName: string }

export default function ZoneCache({ zoneId, zoneName }: Props) {
  const [mode, setMode] = useState<'all' | 'urls'>('all')
  const [urls, setUrls] = useState<string[]>([''])
  const [purging, setPurging] = useState(false)

  const handlePurgeAll = async () => {
    setPurging(true)
    const resp = await purgeAllCache(zoneId)
    if (resp.success) toast.success(`已清除 ${zoneName} 的全部缓存`)
    else if (resp.error) toast.error(resp.error.message)
    setPurging(false)
  }

  const handlePurgeUrls = async () => {
    const validUrls = urls.filter((u) => u.trim().length > 0)
    if (validUrls.length === 0) { toast.warning('请至少输入一个 URL'); return }
    setPurging(true)
    const resp = await purgeCacheByUrls(zoneId, validUrls)
    if (resp.success) { toast.success(`已清除 ${validUrls.length} 个 URL 的缓存`); setUrls(['']) }
    else if (resp.error) toast.error(resp.error.message)
    setPurging(false)
  }

  return (
    <div className="space-y-4">
      {/* 清除方式选择 */}
      <div className="flex gap-2">
        <Button variant={mode === 'all' ? 'primary' : 'ghost'} size="sm" onClick={() => setMode('all')}
          icon={<Trash2 className="w-3.5 h-3.5" />}>
          清除全部
        </Button>
        <Button variant={mode === 'urls' ? 'primary' : 'ghost'} size="sm" onClick={() => setMode('urls')}
          icon={<CloudOff className="w-3.5 h-3.5" />}>
          按 URL 清除
        </Button>
      </div>

      {mode === 'all' ? (
        <Card className="p-5 space-y-4">
          <div>
            <p className="text-sm font-medium text-fg">清除全部缓存</p>
            <p className="text-xs text-fg-3 mt-1">
              将清除 <span className="font-mono text-primary">{zoneName}</span> 域名下的所有缓存资源。
              此操作可能会导致源站短时间压力增大。
            </p>
          </div>

          <div className="p-3 rounded-md bg-warning-tint text-xs text-warning space-y-1">
            <p className="font-medium">⚠ 注意</p>
            <p>清除全部缓存后，所有资源将在下次请求时回源，可能影响网站性能。建议在低流量时段操作。</p>
          </div>

          <Button variant="danger" size="sm" onClick={handlePurgeAll} disabled={purging}
            icon={purging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}>
            {purging ? '清除中...' : '确认清除全部缓存'}
          </Button>
        </Card>
      ) : (
        <Card className="p-5 space-y-4">
          <div>
            <p className="text-sm font-medium text-fg">按 URL 清除缓存</p>
            <p className="text-xs text-fg-3 mt-1">输入要清除缓存的完整 URL（包含协议），最多 30 个</p>
          </div>

          <div className="space-y-2">
            {urls.map((url, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input type="text" placeholder="https://example.com/path/to/resource"
                  value={url} onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const next = [...urls]; next[idx] = e.target.value; setUrls(next)
                  }} />
                {urls.length > 1 && (
                  <button onClick={() => setUrls(urls.filter((_, i) => i !== idx))}
                    className="p-1.5 rounded text-fg-3 hover:text-danger transition-colors flex-shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {urls.length < 30 && (
              <Button variant="ghost" size="sm" onClick={() => setUrls([...urls, ''])}
                icon={<Plus className="w-3.5 h-3.5" />}>
                添加 URL
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={handlePurgeUrls} disabled={purging}
              icon={purging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CloudOff className="w-3.5 h-3.5" />}>
              {purging ? '清除中...' : '清除指定 URL 缓存'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

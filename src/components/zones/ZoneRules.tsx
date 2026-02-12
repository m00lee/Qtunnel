'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Loader2, Shuffle, Database, ArrowRight, ToggleLeft } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import { listRules, createRule, deleteRule, type FlatRule } from '@/lib/api'
import { toast } from '@/lib/toast'

interface Props { zoneId: string }

const PHASE_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  http_request_dynamic_redirect: { label: '重定向规则', icon: Shuffle, color: 'text-primary' },
  http_request_cache_settings: { label: '缓存规则', icon: Database, color: 'text-success' },
  http_config_settings: { label: '配置规则', icon: ToggleLeft, color: 'text-warning' },
  http_request_late_transform: { label: 'URL 改写', icon: ArrowRight, color: 'text-fg-2' },
  http_request_transform: { label: '请求头改写', icon: ArrowRight, color: 'text-fg-2' },
  http_response_headers_transform: { label: '响应头改写', icon: ArrowRight, color: 'text-fg-2' },
}

const RULE_TEMPLATES = [
  { value: 'redirect', label: '301/302 重定向' },
  { value: 'cache', label: '缓存设置' },
]

export default function ZoneRules({ zoneId }: Props) {
  const [rules, setRules] = useState<FlatRule[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)

  const fetchRules = useCallback(async () => {
    setLoading(true)
    const resp = await listRules(zoneId)
    if (resp.success && resp.data) setRules(resp.data)
    else if (resp.error) toast.error(resp.error.message)
    setLoading(false)
  }, [zoneId])

  useEffect(() => { fetchRules() }, [fetchRules])

  const handleDelete = async (rule: FlatRule) => {
    const resp = await deleteRule(zoneId, rule.ruleset_id, rule.id)
    if (resp.success) { setRules((prev) => prev.filter((r) => r.id !== rule.id)); toast.success('规则已删除') }
    else if (resp.error) toast.error(resp.error.message)
  }

  // 按 phase 分组
  const grouped = rules.reduce<Record<string, FlatRule[]>>((acc, r) => {
    if (!acc[r.phase]) acc[r.phase] = []
    acc[r.phase].push(r)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-fg-2">管理重定向、缓存、URL 改写等规则（Rulesets API）</p>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(!showCreate)}
          icon={<Plus className="w-3.5 h-3.5" />}>
          添加规则
        </Button>
      </div>

      {showCreate && (
        <CreateRuleForm zoneId={zoneId} onCreated={(rule) => {
          setRules((prev) => [...prev, rule])
          setShowCreate(false)
        }} onCancel={() => setShowCreate(false)} />
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-fg-3" /></div>
      ) : rules.length > 0 ? (
        <div className="space-y-4">
          {Object.entries(grouped).map(([phase, phaseRules]) => {
            const info = PHASE_LABELS[phase] || { label: phase, icon: ToggleLeft, color: 'text-fg-3' }
            const Icon = info.icon
            return (
              <div key={phase} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${info.color}`} />
                  <span className="text-xs font-medium text-fg">{info.label}</span>
                  <Badge variant="default">{phaseRules.length}</Badge>
                </div>
                {phaseRules.map((rule) => (
                  <RuleCard key={rule.id} rule={rule} onDelete={() => handleDelete(rule)} />
                ))}
              </div>
            )
          })}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Shuffle className="w-8 h-8 text-fg-3 mx-auto mb-3" />
          <p className="text-sm text-fg-2">暂无规则</p>
          <p className="text-xs text-fg-3 mt-1">可添加重定向、缓存等规则来控制域名行为</p>
        </Card>
      )}
    </div>
  )
}

function RuleCard({ rule, onDelete }: { rule: FlatRule; onDelete: () => void }) {
  return (
    <Card className="p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          {rule.description && (
            <p className="text-xs font-medium text-fg">{rule.description}</p>
          )}
          <div className="flex flex-wrap gap-1.5">
            <Badge variant={rule.enabled ? 'success' : 'default'} dot>
              {rule.enabled ? '启用' : '禁用'}
            </Badge>
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-surface-1 text-xs font-mono text-fg-2">
              {rule.action}
            </span>
          </div>
          <p className="text-xs font-mono text-fg-3 truncate" title={rule.expression}>
            {rule.expression || '(所有请求)'}
          </p>
          {rule.action_parameters != null && (
            <ActionParamsPreview action={rule.action} params={rule.action_parameters} />
          )}
        </div>
        <button onClick={onDelete}
          className="p-1.5 rounded text-fg-3 hover:text-danger transition-colors flex-shrink-0">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </Card>
  )
}

function ActionParamsPreview({ action, params }: { action: string; params: unknown }) {
  const p = params as Record<string, unknown>
  if (action === 'redirect') {
    const fromVal = p.from_value as Record<string, unknown> | undefined
    if (fromVal) {
      const target = fromVal.target_url as Record<string, unknown> | undefined
      const code = fromVal.status_code as number | undefined
      return (
        <p className="text-xs text-primary">
          {code || 301} → {(target?.value as string) || (target?.expression as string) || ''}
        </p>
      )
    }
  }
  if (action === 'set_cache_settings') {
    const edge = p.edge_ttl as Record<string, unknown> | undefined
    const browser = p.browser_ttl as Record<string, unknown> | undefined
    const parts: string[] = []
    if (edge) parts.push(`Edge TTL: ${edge.default}s`)
    if (browser) parts.push(`Browser TTL: ${browser.default}s`)
    if (p.cache === true) parts.push('缓存所有')
    if (parts.length > 0) return <p className="text-xs text-success">{parts.join(' · ')}</p>
  }
  return null
}

function CreateRuleForm({ zoneId, onCreated, onCancel }: {
  zoneId: string; onCreated: (rule: FlatRule) => void; onCancel: () => void
}) {
  const [template, setTemplate] = useState('redirect')
  const [expression, setExpression] = useState('')
  const [description, setDescription] = useState('')
  const [redirectUrl, setRedirectUrl] = useState('')
  const [redirectCode, setRedirectCode] = useState('301')
  const [cacheEdgeTtl, setCacheEdgeTtl] = useState('86400')
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    let phase: string
    let action: string
    let actionParameters: unknown

    if (template === 'redirect') {
      if (!redirectUrl.trim()) { toast.warning('请输入目标 URL'); return }
      phase = 'http_request_dynamic_redirect'
      action = 'redirect'
      actionParameters = {
        from_value: {
          target_url: { value: redirectUrl },
          status_code: parseInt(redirectCode, 10),
          preserve_query_string: true,
        },
      }
    } else {
      phase = 'http_request_cache_settings'
      action = 'set_cache_settings'
      actionParameters = {
        cache: true,
        edge_ttl: { mode: 'override_origin', default: parseInt(cacheEdgeTtl, 10) },
      }
    }

    const expr = expression.trim() || 'true'

    setCreating(true)
    const resp = await createRule(zoneId, phase, expr, action, actionParameters, description || `QTunnel ${template} rule`)
    if (resp.success && resp.data) {
      toast.success('规则已创建')
      onCreated(resp.data)
    } else if (resp.error) toast.error(resp.error.message)
    setCreating(false)
  }

  return (
    <Card className="p-4 space-y-3 border-primary/30 animate-fade-in">
      <div className="flex items-center gap-2 text-xs font-medium text-fg">
        <Plus className="w-3.5 h-3.5 text-primary" /> 新建规则
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-fg-2 mb-1 block">规则类型</label>
          <Select value={template} onChange={(e) => setTemplate(e.target.value)} options={RULE_TEMPLATES} />
        </div>
        <div>
          <label className="text-xs text-fg-2 mb-1 block">描述</label>
          <Input type="text" placeholder="我的规则" value={description}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)} />
        </div>
      </div>

      <div>
        <label className="text-xs text-fg-2 mb-1 block">匹配表达式 <span className="text-fg-3">(留空匹配所有请求)</span></label>
        <Input type="text"
          placeholder='(http.request.uri.path eq "/old") or (http.host eq "old.example.com")'
          value={expression}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExpression(e.target.value)} />
        <p className="text-xs text-fg-3 mt-1">
          使用 Cloudflare 表达式语法，如 <code className="text-primary">http.request.uri.path</code>、<code className="text-primary">http.host</code>
        </p>
      </div>

      {template === 'redirect' && (
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <label className="text-xs text-fg-2 mb-1 block">目标 URL</label>
            <Input type="text" placeholder="https://example.com/new-path" value={redirectUrl}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRedirectUrl(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-fg-2 mb-1 block">状态码</label>
            <Select value={redirectCode} onChange={(e) => setRedirectCode(e.target.value)}
              options={[{ value: '301', label: '301 永久' }, { value: '302', label: '302 临时' }]} />
          </div>
        </div>
      )}

      {template === 'cache' && (
        <div>
          <label className="text-xs text-fg-2 mb-1 block">Edge TTL (秒)</label>
          <Select value={cacheEdgeTtl} onChange={(e) => setCacheEdgeTtl(e.target.value)}
            options={[
              { value: '60', label: '1 分钟' }, { value: '300', label: '5 分钟' },
              { value: '3600', label: '1 小时' }, { value: '86400', label: '1 天' },
              { value: '604800', label: '1 周' }, { value: '2592000', label: '1 月' },
            ]} />
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button variant="primary" size="sm" onClick={handleCreate} disabled={creating}>
          {creating ? '创建中...' : '创建规则'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>取消</Button>
      </div>
    </Card>
  )
}

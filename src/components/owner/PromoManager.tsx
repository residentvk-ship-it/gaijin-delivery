// Управление промокодами: создать, активировать/деактивировать, удалить.

'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, ToggleLeft, ToggleRight, Copy, Loader2, X } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import toast from 'react-hot-toast'

interface PromoCode {
  id: string
  code: string
  discount_type: 'percent' | 'fixed'
  discount_value: number
  expires_at: string | null
  usage_limit: number | null
  used_count: number
  is_active: boolean
  created_at: string
}

const ANON     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const h = {
  'apikey':        ANON,
  'Authorization': `Bearer ${ANON}`,
  'Content-Type':  'application/json',
}

export function PromoManager() {
  const [promos,   setPromos]   = useState<PromoCode[]>([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res  = await fetch(`${SUPA_URL}/rest/v1/promo_codes?order=created_at.desc`, { headers: h })
    const data = await res.json()
    setPromos(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  async function toggleActive(p: PromoCode) {
    await fetch(`${SUPA_URL}/rest/v1/promo_codes?id=eq.${p.id}`, {
      method: 'PATCH', headers: h,
      body: JSON.stringify({ is_active: !p.is_active }),
    })
    setPromos(prev => prev.map(x => x.id === p.id ? { ...x, is_active: !x.is_active } : x))
    toast.success(p.is_active ? 'Промокод деактивирован' : 'Промокод активирован')
  }

  async function deletePromo(id: string) {
    if (!confirm('Удалить промокод?')) return
    await fetch(`${SUPA_URL}/rest/v1/promo_codes?id=eq.${id}`, { method: 'DELETE', headers: h })
    setPromos(prev => prev.filter(x => x.id !== id))
    toast.success('Промокод удалён')
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
    toast.success(`Скопировано: ${code}`)
  }

  function generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Промокоды</h2>
          <p className="text-sm text-text-secondary mt-0.5">
            {promos.filter(p => p.is_active).length} активных из {promos.length}
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Создать промокод
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="bg-white rounded-card h-20 animate-pulse" />)}
        </div>
      ) : promos.length === 0 ? (
        <div className="bg-white rounded-card shadow-card p-12 text-center text-text-muted">
          <p className="text-4xl mb-3">🎟</p>
          <p className="font-medium">Промокодов пока нет</p>
          <p className="text-sm mt-1">Создайте первый промокод для покупателей</p>
        </div>
      ) : (
        <div className="bg-white rounded-card shadow-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-border text-left">
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase">Код</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase">Скидка</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase hidden sm:table-cell">Использований</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase hidden md:table-cell">Истекает</th>
                <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase">Действия</th>
              </tr>
            </thead>
            <tbody>
              {promos.map(p => (
                <tr key={p.id}
                  className={`border-b border-surface-border last:border-0 transition-colors
                    ${!p.is_active ? 'opacity-50' : 'hover:bg-surface-section'}`}>
                  {/* Код */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-text-primary bg-surface-section
                                       px-2 py-0.5 rounded text-sm">
                        {p.code}
                      </span>
                      <button onClick={() => copyCode(p.code)}
                        className="text-text-muted hover:text-brand transition-colors">
                        <Copy size={13} />
                      </button>
                    </div>
                  </td>
                  {/* Скидка */}
                  <td className="px-4 py-3">
                    <span className={`font-semibold text-sm ${p.discount_type === 'percent' ? 'text-green-600' : 'text-blue-600'}`}>
                      {p.discount_type === 'percent'
                        ? `−${p.discount_value}%`
                        : `−${formatPrice(p.discount_value)}`
                      }
                    </span>
                  </td>
                  {/* Использований */}
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-sm text-text-secondary">
                      {p.used_count}
                      {p.usage_limit ? ` / ${p.usage_limit}` : ' / ∞'}
                    </span>
                    {p.usage_limit && (
                      <div className="h-1 bg-surface-border rounded-full mt-1 w-20">
                        <div
                          className="h-full bg-brand rounded-full"
                          style={{ width: `${Math.min((p.used_count / p.usage_limit) * 100, 100)}%` }}
                        />
                      </div>
                    )}
                  </td>
                  {/* Истекает */}
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-sm text-text-secondary">
                      {p.expires_at
                        ? new Date(p.expires_at).toLocaleDateString('ru-RU')
                        : '∞ бессрочно'
                      }
                    </span>
                  </td>
                  {/* Действия */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleActive(p)} title={p.is_active ? 'Деактивировать' : 'Активировать'}
                        className={`p-1.5 transition-colors ${p.is_active ? 'text-green-500 hover:text-green-700' : 'text-text-muted hover:text-green-500'}`}>
                        {p.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>
                      <button onClick={() => deletePromo(p.id)}
                        className="p-1.5 text-text-muted hover:text-red-500 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <PromoForm
          onClose={() => { setShowForm(false); load() }}
          generateCode={generateCode}
        />
      )}
    </div>
  )
}

// ─── Форма создания промокода ─────────────────────────────────────────────────

function PromoForm({ onClose, generateCode }: {
  onClose: () => void
  generateCode: () => string
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    code:           generateCode(),
    discount_type:  'percent' as 'percent' | 'fixed',
    discount_value: '',
    expires_at:     '',
    usage_limit:    '',
    is_active:      true,
  })

  function set(field: string, value: unknown) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit() {
    if (!form.code.trim())      { toast.error('Введите код');    return }
    if (!form.discount_value)   { toast.error('Введите скидку'); return }

    setSaving(true)
    const payload = {
      code:           form.code.trim().toUpperCase(),
      discount_type:  form.discount_type,
      discount_value: Number(form.discount_value),
      expires_at:     form.expires_at || null,
      usage_limit:    form.usage_limit ? Number(form.usage_limit) : null,
      is_active:      form.is_active,
    }

    const res = await fetch(`${SUPA_URL}/rest/v1/promo_codes`, {
      method: 'POST', headers: h, body: JSON.stringify(payload),
    })
    setSaving(false)

    if (res.ok) { toast.success('Промокод создан!'); onClose() }
    else { const t = await res.text(); console.error(t); toast.error('Ошибка создания') }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-card w-full max-w-md shadow-modal" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <h3 className="font-bold text-text-primary">Создать промокод</h3>
          <button onClick={onClose} className="p-1.5 text-text-muted hover:text-text-primary">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Код */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Код промокода</label>
            <div className="flex gap-2">
              <input className="input font-mono uppercase" placeholder="SUMMER20"
                value={form.code}
                onChange={e => set('code', e.target.value.toUpperCase())} />
              <button type="button" onClick={() => set('code', generateCode())}
                className="btn-secondary px-3 text-sm flex-shrink-0">
                🎲
              </button>
            </div>
          </div>

          {/* Тип и размер скидки */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Тип скидки</label>
              <select className="input" value={form.discount_type}
                onChange={e => set('discount_type', e.target.value)}>
                <option value="percent">Процент (%)</option>
                <option value="fixed">Фиксированная (₽)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Размер {form.discount_type === 'percent' ? '(%)' : '(₽)'}
              </label>
              <input className="input" type="number" min="1"
                max={form.discount_type === 'percent' ? '99' : undefined}
                placeholder={form.discount_type === 'percent' ? '20' : '500'}
                value={form.discount_value}
                onChange={e => set('discount_value', e.target.value)} />
            </div>
          </div>

          {/* Срок и лимит */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Истекает <span className="text-text-muted text-xs">(необяз.)</span>
              </label>
              <input className="input" type="date"
                value={form.expires_at}
                onChange={e => set('expires_at', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Лимит использований <span className="text-text-muted text-xs">(необяз.)</span>
              </label>
              <input className="input" type="number" min="1" placeholder="∞"
                value={form.usage_limit}
                onChange={e => set('usage_limit', e.target.value)} />
            </div>
          </div>

          {/* Активен */}
          <label className="flex items-center gap-2 cursor-pointer">
            <div onClick={() => set('is_active', !form.is_active)}
              className={`w-10 h-6 rounded-full transition-colors relative
                ${form.is_active ? 'bg-brand' : 'bg-surface-border'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform
                ${form.is_active ? 'translate-x-5' : 'translate-x-1'}`} />
            </div>
            <span className="text-sm text-text-primary">Активен сразу после создания</span>
          </label>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-surface-border">
          <button onClick={handleSubmit} disabled={saving}
            className="btn-primary flex-1 flex items-center justify-center gap-2">
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? 'Создаю...' : 'Создать промокод'}
          </button>
          <button onClick={onClose} className="btn-secondary px-5">Отмена</button>
        </div>
      </div>
    </div>
  )
}
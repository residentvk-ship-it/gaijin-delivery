// Вкладка "Переменные" в панели владельца — редактирование site_config

'use client'

import { useEffect, useState } from 'react'
import { Save, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { BannerManager } from '@/components/owner/BannerManager'
import toast from 'react-hot-toast'

type Row = { key: string; value: string }

// Описание полей — что показывать в форме
const FIELDS: {
  group:  string
  items:  { key: string; label: string; hint?: string; type?: 'text' | 'number' | 'time' | 'toggle' }[]
}[] = [
  {
    group: 'Доставка',
    items: [
      { key: 'delivery_cost',           label: 'Стоимость доставки (₽)',       type: 'number' },
      { key: 'free_delivery_threshold', label: 'Порог бесплатной доставки (₽)', type: 'number' },
      { key: 'min_order_amount',        label: 'Минимальная сумма заказа (₽)',  type: 'number' },
    ],
  },
  {
    group: 'Акции',
    items: [
      { key: 'gift_threshold', label: 'Порог подарка (₽)', type: 'number' },
    ],
  },
  {
    group: 'Режим работы',
    items: [
      { key: 'is_open',            label: 'Приём заказов',              type: 'toggle' },
      { key: 'working_hours_from', label: 'Открытие',                   type: 'time'   },
      { key: 'working_hours_to',   label: 'Закрытие',                   type: 'time'   },
      { key: 'night_mode_from',    label: 'Ночной режим с',             type: 'time',  hint: 'С этого времени заказы принимаются на следующий день' },
      { key: 'night_mode_to',      label: 'Ночной режим до',            type: 'time'   },
      { key: 'min_order_time',     label: 'Минимальное время доставки', type: 'number', hint: 'В минутах' },
    ],
  },
]

export function SiteConfigManager() {
  const [values,  setValues]  = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data, error } = await supabase.from('site_config').select('*')
      if (error || !data) { toast.error('Не удалось загрузить настройки'); setLoading(false); return }
      const map: Record<string, string> = {}
      for (const row of data as Row[]) map[row.key] = row.value
      setValues(map)
      setLoading(false)
    }
    load()
  }, [])

  function set(key: string, value: string) {
    setValues(prev => ({ ...prev, [key]: value }))
  }

  async function save() {
    setSaving(true)
    const supabase = createClient()
    const rows: Row[] = Object.entries(values).map(([key, value]) => ({ key, value }))
    const { error } = await supabase.from('site_config').upsert(rows, { onConflict: 'key' })
    setSaving(false)
    if (error) { toast.error('Ошибка сохранения'); return }
    toast.success('Настройки сохранены!')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-brand" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">

      {FIELDS.map(({ group, items }) => (
        <div key={group} className="bg-white rounded-card shadow-card p-5">
          <h3 className="font-semibold text-text-primary mb-4">{group}</h3>
          <div className="space-y-4">
            {items.map(({ key, label, hint, type = 'text' }) => (
              <div key={key}>
                <label className="block text-sm text-text-secondary mb-1">{label}</label>

                {type === 'toggle' ? (
                  <button
                    onClick={() => set(key, values[key] === 'true' ? 'false' : 'true')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                      ${values[key] === 'true' ? 'bg-brand' : 'bg-surface-border'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                      ${values[key] === 'true' ? 'translate-x-6' : 'translate-x-1'}`}
                    />
                  </button>
                ) : (
                  <input
                    type={type}
                    className="input text-sm"
                    value={values[key] ?? ''}
                    onChange={e => set(key, e.target.value)}
                  />
                )}

                {hint && <p className="text-xs text-text-muted mt-1">{hint}</p>}
              </div>
            ))}
          </div>
        </div>
      ))}

      <button onClick={save} disabled={saving}
        className="btn-primary flex items-center gap-2 px-6">
        {saving
          ? <><Loader2 size={16} className="animate-spin" /> Сохраняю...</>
          : <><Save size={16} /> Сохранить все настройки</>
        }
      </button>

      {/* Баннеры — логика и UI живут в BannerManager без изменений */}
      <div className="bg-white rounded-card shadow-card p-5">
        <h3 className="font-semibold text-text-primary mb-4">Баннеры</h3>
        <BannerManager />
      </div>

    </div>
  )
}
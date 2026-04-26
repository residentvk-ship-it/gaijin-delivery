'use client'

import { useState, useRef } from 'react'
import { X, Upload, Loader2, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Product, Category, Badge, Topping } from '@/types'
import toast from 'react-hot-toast'

interface Props {
  product:    Product | null
  categories: Category[]
  onClose:    () => void
}

const BADGES: { value: Badge; label: string }[] = [
  { value: 'hit',   label: '🔥 Хит' },
  { value: 'new',   label: '✨ Новинка' },
  { value: 'spicy', label: '🌶 Острое' },
  { value: 'sale',  label: '% Скидка' },
  { value: 'vegan', label: '🌿 Веган' },
]

function genId() {
  return Math.random().toString(36).slice(2, 10)
}

export function ProductForm({ product, categories, onClose }: Props) {
  const supabase = createClient()
  const fileRef  = useRef<HTMLInputElement>(null)

  const [saving,       setSaving]       = useState(false)
  const [uploading,    setUploading]    = useState(false)
  const [imageUrl,     setImageUrl]     = useState(product?.image_url ?? '')
  const [imagePreview, setImagePreview] = useState(product?.image_url ?? '')
  const [toppings,     setToppings]     = useState<Topping[]>(product?.toppings ?? [])

  const [form, setForm] = useState({
    name:             product?.name             ?? '',
    description:      product?.description      ?? '',
    price:            product?.price            ?? 0,
    weight:           product?.weight           ?? '',
    calories:         product?.calories         ?? '',
    category_id:      product?.category_id      ?? (categories[0]?.id ?? ''),
    badges:           (product?.badges          ?? []) as Badge[],
    allergens:        (product?.allergens        ?? []).join(', '),
    discount_percent: product?.discount_percent ?? '',
    discount_fixed:   product?.discount_fixed   ?? '',
    is_visible:       product?.is_visible       ?? true,
    is_featured:      product?.is_featured      ?? false,
    sort_order:       product?.sort_order       ?? 0,
  })

  function set(field: string, value: unknown) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function toggleBadge(badge: Badge) {
    set('badges', form.badges.includes(badge)
      ? form.badges.filter(b => b !== badge)
      : [...form.badges, badge]
    )
  }

  // ── Топпинги ──────────────────────────────────────────────────────────────

  function addTopping() {
    setToppings(t => [...t, { id: genId(), name: '', price: 0 }])
  }

  function updateTopping(id: string, field: keyof Topping, value: string | number) {
    setToppings(t => t.map(top => top.id === id ? { ...top, [field]: value } : top))
  }

  function removeTopping(id: string) {
    setToppings(t => t.filter(top => top.id !== id))
  }

  // ── Фото ──────────────────────────────────────────────────────────────────

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImagePreview(URL.createObjectURL(file))
    setUploading(true)
    const data = new FormData()
    data.append('file', file)
    try {
      const res  = await fetch('/api/upload', { method: 'POST', body: data })
      const json = await res.json()
      if (json.url) { setImageUrl(json.url); toast.success('Фото загружено') }
      else          { toast.error(json.error ?? 'Ошибка загрузки'); setImagePreview(imageUrl) }
    } catch {
      toast.error('Ошибка загрузки фото'); setImagePreview(imageUrl)
    } finally {
      setUploading(false)
    }
  }

  // ── Сохранение ────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!form.name.trim()) { toast.error('Введите название');    return }
    if (!form.price)        { toast.error('Введите цену');        return }
    if (!form.category_id)  { toast.error('Выберите категорию'); return }

    const invalidTopping = toppings.find(t => !t.name.trim())
    if (invalidTopping)   { toast.error('Заполните название топпинга'); return }

    setSaving(true)

    const payload = {
      name:             form.name.trim(),
      description:      form.description.trim() || null,
      price:            Number(form.price),
      weight:           form.weight   ? Number(form.weight)   : null,
      calories:         form.calories ? Number(form.calories) : null,
      category_id:      form.category_id,
      badges:           form.badges,
      allergens:        form.allergens ? form.allergens.split(',').map(s => s.trim()).filter(Boolean) : [],
      discount_percent: form.discount_percent ? Number(form.discount_percent) : null,
      discount_fixed:   form.discount_fixed   ? Number(form.discount_fixed)   : null,
      is_visible:       form.is_visible,
      is_featured:      form.is_featured,
      sort_order:       Number(form.sort_order),
      image_url:        imageUrl || null,
      toppings:         toppings,
    }

    const { error } = product
      ? await supabase.from('products').update(payload).eq('id', product.id)
      : await supabase.from('products').insert(payload)

    setSaving(false)

    if (error) { toast.error('Ошибка сохранения: ' + error.message) }
    else       { toast.success(product ? 'Блюдо обновлено' : 'Блюдо добавлено'); onClose() }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
         onClick={onClose}>
      <div className="bg-white rounded-card w-full max-w-2xl max-h-[90dvh] overflow-y-auto shadow-modal"
           onClick={e => e.stopPropagation()}>

        {/* Шапка */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-text-primary">
            {product ? 'Редактировать блюдо' : 'Добавить блюдо'}
          </h2>
          <button onClick={onClose}
            className="p-1.5 rounded-btn text-text-muted hover:text-text-primary transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* Фото */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Фото</label>
            <div className="flex gap-4 items-start">
              <div
                className="w-32 h-32 rounded-card overflow-hidden bg-surface-input border-2 border-dashed border-surface-border
                           flex items-center justify-center cursor-pointer hover:border-brand transition-colors flex-shrink-0"
                onClick={() => fileRef.current?.click()}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-text-muted">
                    <Upload size={24} />
                    <span className="text-xs">Загрузить</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="btn-secondary flex items-center gap-2 text-sm">
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {uploading ? 'Загружаю...' : 'Выбрать файл'}
                </button>
                <p className="text-xs text-text-muted">JPG, PNG, WebP · макс 5MB</p>
                {imageUrl && (
                  <button type="button"
                    onClick={() => { setImageUrl(''); setImagePreview('') }}
                    className="text-xs text-brand hover:underline text-left">
                    Удалить фото
                  </button>
                )}
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          {/* Название */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Название <span className="text-brand">*</span>
            </label>
            <input className="input" value={form.name}
              onChange={e => set('name', e.target.value)} placeholder="Филадельфия с лососем" />
          </div>

          {/* Описание */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Состав / описание</label>
            <textarea className="input resize-none" rows={3} value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Лосось, авокадо, огурец, сливочный сыр..." />
          </div>

          {/* Категория */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Категория <span className="text-brand">*</span>
            </label>
            <select className="input" value={form.category_id}
              onChange={e => set('category_id', e.target.value)}>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Цена, вес, калории */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Цена, ₽ <span className="text-brand">*</span>
              </label>
              <input className="input" type="number" min="0" value={form.price}
                onChange={e => set('price', e.target.value)} placeholder="490" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Вес, г</label>
              <input className="input" type="number" min="0" value={form.weight}
                onChange={e => set('weight', e.target.value)} placeholder="245" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Калории</label>
              <input className="input" type="number" min="0" value={form.calories}
                onChange={e => set('calories', e.target.value)} placeholder="320" />
            </div>
          </div>

          {/* Скидки */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Скидка %</label>
              <input className="input" type="number" min="0" max="99" value={form.discount_percent}
                onChange={e => set('discount_percent', e.target.value)} placeholder="15" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Скидка ₽</label>
              <input className="input" type="number" min="0" value={form.discount_fixed}
                onChange={e => set('discount_fixed', e.target.value)} placeholder="100" />
            </div>
          </div>

          {/* Топпинги */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-text-primary">
                Топпинги / модификаторы
              </label>
              <button type="button" onClick={addTopping}
                className="flex items-center gap-1 text-xs text-brand hover:underline">
                <Plus size={13} /> Добавить
              </button>
            </div>

            {toppings.length === 0 && (
              <p className="text-xs text-text-muted py-2">
                Нет топпингов — клиент не увидит доп. опций
              </p>
            )}

            <div className="space-y-2">
              {toppings.map(top => (
                <div key={top.id} className="flex gap-2 items-center">
                  <input
                    className="input flex-1"
                    placeholder="Название (напр. Халапеньо / Без лука)"
                    value={top.name}
                    onChange={e => updateTopping(top.id, 'name', e.target.value)}
                  />
                  <input
                    className="input w-24"
                    type="number"
                    min="0"
                    placeholder="₽"
                    value={top.price}
                    onChange={e => updateTopping(top.id, 'price', Number(e.target.value))}
                  />
                  <button type="button" onClick={() => removeTopping(top.id)}
                    className="text-text-muted hover:text-brand transition-colors flex-shrink-0">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>

            {toppings.length > 0 && (
              <p className="text-xs text-text-muted mt-1.5">
                Цена 0 ₽ — бесплатно или убрать ингредиент
              </p>
            )}
          </div>

          {/* Бейджи */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Бейджи</label>
            <div className="flex flex-wrap gap-2">
              {BADGES.map(b => (
                <button key={b.value} type="button" onClick={() => toggleBadge(b.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                    form.badges.includes(b.value)
                      ? 'bg-brand text-white border-brand'
                      : 'bg-white text-text-secondary border-surface-border hover:border-brand hover:text-brand'
                  )}>
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Аллергены */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Аллергены <span className="text-text-muted text-xs">(через запятую)</span>
            </label>
            <input className="input" value={form.allergens}
              onChange={e => set('allergens', e.target.value)}
              placeholder="глютен, лактоза, рыба" />
          </div>

          {/* Переключатели */}
          <div className="flex flex-wrap gap-4 pt-1">
            {[
              { field: 'is_visible',  label: 'Отображать в меню' },
              { field: 'is_featured', label: '⭐ Часто заказывают' },
            ].map(({ field, label }) => (
              <label key={field} className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => set(field, !form[field as keyof typeof form])}
                  className={cn(
                    'w-10 h-6 rounded-full transition-colors relative',
                    form[field as keyof typeof form] ? 'bg-brand' : 'bg-surface-border'
                  )}
                >
                  <div className={cn(
                    'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform',
                    form[field as keyof typeof form] ? 'translate-x-5' : 'translate-x-1'
                  )} />
                </div>
                <span className="text-sm text-text-primary">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Кнопки */}
        <div className="flex gap-3 px-6 py-4 border-t border-surface-border">
          <button onClick={handleSubmit} disabled={saving}
            className="btn-primary flex-1 flex items-center justify-center gap-2">
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? 'Сохраняю...' : (product ? 'Сохранить' : 'Добавить')}
          </button>
          <button onClick={onClose} className="btn-secondary px-6">Отмена</button>
        </div>
      </div>
    </div>
  )
}
// Управление баннерами: добавить, редактировать, скрыть, удалить, загрузить фото/гифку.

'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Pencil, Trash2, Eye, EyeOff, Upload, Loader2, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface Banner {
  id: string
  title: string | null
  image_url: string
  link_url: string | null
  sort_order: number
  is_active: boolean
}

const ANON     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

const h = {
  'apikey':        ANON,
  'Authorization': `Bearer ${ANON}`,
  'Content-Type':  'application/json',
}

export function BannerManager() {
  const [banners,  setBanners]  = useState<Banner[]>([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState<Banner | null>(null)

  async function load() {
    setLoading(true)
    const res  = await fetch(`${SUPA_URL}/rest/v1/banners?order=sort_order`, { headers: h })
    const data = await res.json()
    setBanners(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function toggleActive(b: Banner) {
    await fetch(`${SUPA_URL}/rest/v1/banners?id=eq.${b.id}`, {
      method: 'PATCH', headers: h,
      body: JSON.stringify({ is_active: !b.is_active }),
    })
    setBanners(prev => prev.map(x => x.id === b.id ? { ...x, is_active: !x.is_active } : x))
  }

  async function deleteBanner(id: string) {
    if (!confirm('Удалить баннер?')) return
    await fetch(`${SUPA_URL}/rest/v1/banners?id=eq.${id}`, { method: 'DELETE', headers: h })
    setBanners(prev => prev.filter(x => x.id !== id))
    toast.success('Баннер удалён')
  }

  function openAdd()          { setEditing(null); setShowForm(true) }
  function openEdit(b: Banner){ setEditing(b);    setShowForm(true) }
  function closeForm()        { setShowForm(false); setEditing(null); load() }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Баннеры</h2>
          <p className="text-sm text-text-secondary mt-0.5">Показываются над секцией "Часто заказывают"</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Добавить баннер
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2].map(i => <div key={i} className="bg-white rounded-card h-20 animate-pulse" />)}
        </div>
      ) : banners.length === 0 ? (
        <div className="bg-white rounded-card shadow-card p-12 text-center text-text-muted">
          <p className="text-4xl mb-3">🖼</p>
          <p className="font-medium">Баннеров пока нет</p>
          <p className="text-sm mt-1">Добавьте первый баннер с акцией</p>
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map(b => (
            <div key={b.id}
              className={`bg-white rounded-card shadow-card overflow-hidden flex items-center gap-4 p-3
                ${!b.is_active ? 'opacity-50' : ''}`}>
              <div className="w-32 h-16 rounded-lg overflow-hidden bg-surface-input flex-shrink-0">
                <img src={b.image_url} alt={b.title ?? ''} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text-primary text-sm">{b.title ?? 'Без названия'}</p>
                {b.link_url && <p className="text-xs text-text-muted truncate mt-0.5">{b.link_url}</p>}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => toggleActive(b)}
                  className="p-1.5 text-text-muted hover:text-brand transition-colors">
                  {b.is_active ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
                <button onClick={() => openEdit(b)}
                  className="p-1.5 text-text-muted hover:text-brand transition-colors">
                  <Pencil size={15} />
                </button>
                <button onClick={() => deleteBanner(b.id)}
                  className="p-1.5 text-text-muted hover:text-red-500 transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <BannerForm banner={editing} onClose={closeForm} />}
    </div>
  )
}

// ─── Форма ────────────────────────────────────────────────────────────────────

function BannerForm({ banner, onClose }: { banner: Banner | null; onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [saving,    setSaving]    = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preview,   setPreview]   = useState(banner?.image_url ?? '')
  const [imageUrl,  setImageUrl]  = useState(banner?.image_url ?? '')
  const [form, setForm] = useState({
    title:      banner?.title      ?? '',
    link_url:   banner?.link_url   ?? '',
    sort_order: banner?.sort_order ?? 0,
    is_active:  banner?.is_active  ?? true,
  })

  function set(field: string, value: unknown) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Превью через FileReader — без конфликта с URL переменной
    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    setUploading(true)
    const data = new FormData()
    data.append('file', file)
    try {
      const res  = await fetch('/api/upload', { method: 'POST', body: data })
      const json = await res.json()
      if (json.url) { setImageUrl(json.url); toast.success('Файл загружен') }
      else toast.error(json.error ?? 'Ошибка загрузки')
    } catch {
      toast.error('Ошибка загрузки')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit() {
    if (!imageUrl) { toast.error('Загрузите изображение'); return }
    setSaving(true)

    const payload = {
      title:      form.title     || null,
      link_url:   form.link_url  || null,
      image_url:  imageUrl,
      sort_order: Number(form.sort_order),
      is_active:  form.is_active,
    }

    const res = banner
      ? await fetch(`${SUPA_URL}/rest/v1/banners?id=eq.${banner.id}`, {
          method: 'PATCH', headers: h, body: JSON.stringify(payload),
        })
      : await fetch(`${SUPA_URL}/rest/v1/banners`, {
          method: 'POST', headers: h, body: JSON.stringify(payload),
        })

    setSaving(false)

    if (res.ok) {
      toast.success(banner ? 'Баннер обновлён' : 'Баннер добавлен')
      onClose()
    } else {
      const text = await res.text()
      console.error('Banner save error:', text)
      toast.error('Ошибка сохранения')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
         onClick={onClose}>
      <div className="bg-white rounded-card w-full max-w-md shadow-modal"
           onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <h3 className="font-bold text-text-primary">
            {banner ? 'Редактировать баннер' : 'Добавить баннер'}
          </h3>
          <button onClick={onClose} className="p-1.5 text-text-muted hover:text-text-primary">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Загрузка фото */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Изображение или GIF
            </label>
            <div
              className="w-full h-32 rounded-card overflow-hidden bg-surface-input border-2 border-dashed
                         border-surface-border hover:border-brand cursor-pointer flex items-center justify-center transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {preview ? (
                <img src={preview} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-text-muted">
                  <Upload size={24} />
                  <span className="text-sm">Нажмите чтобы загрузить</span>
                  <span className="text-xs">JPG, PNG, WebP, GIF</span>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*,.gif" className="hidden" onChange={handleFile} />
            {uploading && (
              <p className="text-xs text-text-muted mt-1 flex items-center gap-1">
                <Loader2 size={12} className="animate-spin" /> Загружаю...
              </p>
            )}
          </div>

          {/* Название */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Название <span className="text-text-muted text-xs">(необязательно)</span>
            </label>
            <input className="input" placeholder="Скидка 20% на роллы"
              value={form.title} onChange={e => set('title', e.target.value)} />
          </div>

          {/* Ссылка */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Ссылка при клике <span className="text-text-muted text-xs">(необязательно)</span>
            </label>
            <input className="input" placeholder="https://..."
              value={form.link_url} onChange={e => set('link_url', e.target.value)} />
          </div>

          {/* Порядок */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Порядок</label>
            <input className="input" type="number" min="0"
              value={form.sort_order} onChange={e => set('sort_order', e.target.value)} />
          </div>

          {/* Активен */}
          <label className="flex items-center gap-2 cursor-pointer">
            <div onClick={() => set('is_active', !form.is_active)}
              className={`w-10 h-6 rounded-full transition-colors relative
                ${form.is_active ? 'bg-brand' : 'bg-surface-border'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform
                ${form.is_active ? 'translate-x-5' : 'translate-x-1'}`} />
            </div>
            <span className="text-sm text-text-primary">Показывать на сайте</span>
          </label>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-surface-border">
          <button onClick={handleSubmit} disabled={saving || uploading}
            className="btn-primary flex-1 flex items-center justify-center gap-2">
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? 'Сохраняю...' : (banner ? 'Сохранить' : 'Добавить')}
          </button>
          <button onClick={onClose} className="btn-secondary px-5">Отмена</button>
        </div>
      </div>
    </div>
  )
}
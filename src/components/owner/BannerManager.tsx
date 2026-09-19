'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Pencil, Trash2, Eye, EyeOff, Upload, Loader2, X, Monitor, Smartphone, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface Banner {
  id: string
  title: string | null
  image_url: string
  link_url: string | null
  content: string | null
  sort_order: number
  is_active: boolean
}

export function BannerManager() {
  const supabase = createClient()
  
  const [banners,        setBanners]        = useState<Banner[]>([])
  const [loading,        setLoading]        = useState(true)
  const [showForm,       setShowForm]       = useState(false)
  const [editing,        setEditing]        = useState<Banner | null>(null)
  const [bannersDesktop, setBannersDesktop] = useState(1)
  const [bannersMobile,  setBannersMobile]  = useState(1)
  const [savingConfig,   setSavingConfig]   = useState(false)
  const [isAuthorized,   setIsAuthorized]   = useState(false)

  // Проверка авторизации при монтировании (как защита)
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setIsAuthorized(true)
        load()
      } else {
        setIsAuthorized(false)
        toast.error('Доступ запрещен. Войдите в систему.')
      }
      setLoading(false)
    }
    checkAuth()
  }, [])

  async function load() {
    const { data: bannersData } = await supabase
      .from('banners')
      .select('*')
      .order('sort_order')

    const { data: configData } = await supabase
      .from('site_config')
      .select('*')
      .in('key', ['banners_desktop', 'banners_mobile'])

    setBanners(bannersData || [])
    
    if (configData) {
      setBannersDesktop(Number(configData.find((c: any) => c.key === 'banners_desktop')?.value ?? 1))
      setBannersMobile(Number(configData.find((c: any) => c.key === 'banners_mobile')?.value ?? 1))
    }
  }

  async function saveConfig(key: string, value: number) {
    setSavingConfig(true)
    const { error } = await supabase
      .from('site_config')
      .upsert({ key, value: String(value) }, { onConflict: 'key' })
    
    setSavingConfig(false)
    if (error) toast.error('Ошибка сохранения настроек')
    else toast.success('Настройки сохранены')
  }

  async function toggleActive(b: Banner) {
    const { error } = await supabase
      .from('banners')
      .update({ is_active: !b.is_active })
      .eq('id', b.id)

    if (!error) {
      setBanners(prev => prev.map(x => x.id === b.id ? { ...x, is_active: !x.is_active } : x))
    }
  }

  async function deleteBanner(id: string) {
    if (!confirm('Удалить баннер?')) return
    const { error } = await supabase.from('banners').delete().eq('id', id)
    
    if (!error) {
      setBanners(prev => prev.filter(x => x.id !== id))
      toast.success('Баннер удалён')
    }
  }

  function openAdd()           { setEditing(null); setShowForm(true) }
  function openEdit(b: Banner) { setEditing(b);    setShowForm(true) }
  function closeForm()         { setShowForm(false); setEditing(null); load() }

  if (loading) {
    return <div className="p-12 text-center text-text-muted"><Loader2 className="animate-spin mx-auto" /></div>
  }

  if (!isAuthorized) {
    return (
      <div className="bg-white rounded-card shadow-card p-12 text-center text-text-muted">
        <LogOut size={48} className="mx-auto mb-4 text-red-500" />
        <p className="font-medium text-lg">Доступ запрещен</p>
        <p className="text-sm mt-2">Пожалуйста, войдите в систему для управления баннерами.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Настройки отображения */}
      <div className="bg-white rounded-card shadow-card p-4 mb-6">
        <h3 className="font-semibold text-text-primary text-sm mb-4">Количество баннеров в ряд</h3>
        <div className="flex gap-6 flex-wrap">
          <div className="flex items-center gap-3">
            <Monitor size={18} className="text-text-muted flex-shrink-0" />
            <span className="text-sm text-text-secondary">Десктоп</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map(n => (
                <button key={n}
                  onClick={() => { setBannersDesktop(n); saveConfig('banners_desktop', n) }}
                  className={`w-9 h-9 rounded-btn text-sm font-semibold transition-colors
                    ${bannersDesktop === n ? 'bg-brand text-white' : 'bg-surface-input text-text-secondary hover:text-brand'}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Smartphone size={18} className="text-text-muted flex-shrink-0" />
            <span className="text-sm text-text-secondary">Мобильный</span>
            <div className="flex gap-1">
              {[1, 2, 3].map(n => (
                <button key={n}
                  onClick={() => { setBannersMobile(n); saveConfig('banners_mobile', n) }}
                  className={`w-9 h-9 rounded-btn text-sm font-semibold transition-colors
                    ${bannersMobile === n ? 'bg-brand text-white' : 'bg-surface-input text-text-secondary hover:text-brand'}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          {savingConfig && (
            <div className="flex items-center gap-1 text-text-muted text-xs">
              <Loader2 size={12} className="animate-spin" /> Сохраняю...
            </div>
          )}
        </div>
      </div>

      {/* Список */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Баннеры</h2>
          <p className="text-sm text-text-secondary mt-0.5">Показываются над секцией "Часто заказывают"</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Добавить баннер
        </button>
      </div>

      {banners.length === 0 ? (
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
                {b.content && (
                  <p className="text-xs text-text-muted truncate mt-0.5">{b.content.slice(0, 60)}...</p>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {b.link_url && (
                  <button onClick={() => window.open(b.link_url!, '_blank')}
                    className="p-1.5 text-text-muted hover:text-brand transition-colors text-xs" title="Открыть ссылку">
                    🔗
                  </button>
                )}
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

// ── Форма баннера (максимально приближена к ProductForm) ─────────────────────

function BannerForm({ banner, onClose }: { banner: Banner | null; onClose: () => void }) {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [saving,    setSaving]    = useState(false)
  const [uploading, setUploading] = useState(false)
  const [imageUrl,  setImageUrl]  = useState(banner?.image_url ?? '')
  const [imagePreview, setImagePreview] = useState(banner?.image_url ?? '')

  const [form, setForm] = useState({
    title:      banner?.title      ?? '',
    link_url:   banner?.link_url   ?? '',
    content:    banner?.content    ?? '',
    sort_order: banner?.sort_order ?? 0,
    is_active:  banner?.is_active  ?? true,
  })

  function set(field: string, value: unknown) {
    setForm(f => ({ ...f, [field]: value }))
  }

  // Идентичная логика загрузки фото как в ProductForm
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
      if (json.url) { 
        setImageUrl(json.url)
        toast.success('Фото загружено') 
      } else { 
        toast.error(json.error ?? 'Ошибка загрузки')
        setImagePreview(imageUrl) // Откат при ошибке
      }
    } catch {
      toast.error('Ошибка загрузки фото')
      setImagePreview(imageUrl) // Откат при ошибке
    } finally {
      setUploading(false)
    }
  }

  // Идентичная логика сохранения как в ProductForm
  async function handleSubmit() {
    if (!imageUrl) { toast.error('Загрузите изображение'); return }
    if (!form.title.trim()) { toast.error('Введите название'); return }

    setSaving(true)

    const payload = {
      title:      form.title.trim(),
      link_url:   form.link_url.trim() || null,
      content:    form.content.trim() || null,
      image_url:  imageUrl,
      sort_order: Number(form.sort_order),
      is_active:  form.is_active,
    }

    const { error } = banner
      ? await supabase.from('banners').update(payload).eq('id', banner.id)
      : await supabase.from('banners').insert(payload)

    setSaving(false)

    if (error) { 
      toast.error('Ошибка сохранения: ' + error.message) 
    } else { 
      toast.success(banner ? 'Баннер обновлён' : 'Баннер добавлен')
      onClose() 
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-card w-full max-w-2xl max-h-[90dvh] overflow-y-auto shadow-modal"
           onClick={e => e.stopPropagation()}>

        {/* Шапка */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-text-primary">
            {banner ? 'Редактировать баннер' : 'Добавить баннер'}
          </h2>
          <button onClick={onClose}
            className="p-1.5 rounded-btn text-text-muted hover:text-text-primary transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Фото */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Изображение или GIF</label>
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
                <p className="text-xs text-text-muted">JPG, PNG, WebP, GIF · макс 5MB</p>
                {imageUrl && (
                  <button type="button"
                    onClick={() => { setImageUrl(''); setImagePreview('') }}
                    className="text-xs text-brand hover:underline text-left">
                    Удалить фото
                  </button>
                )}
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*,.gif" className="hidden" onChange={handleFileChange} />
          </div>

          {/* Название */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Название <span className="text-brand">*</span>
            </label>
            <input className="input" value={form.title}
              onChange={e => set('title', e.target.value)} placeholder="Скидка 20% на роллы" />
          </div>

          {/* Ссылка (добавлено для полноты) */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Ссылка при клике <span className="text-text-muted text-xs">(необязательно)</span>
            </label>
            <input className="input" value={form.link_url}
              onChange={e => set('link_url', e.target.value)} placeholder="https://... или /catalog/pizza" />
          </div>

          {/* Контент страницы */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Текст акции <span className="text-text-muted text-xs">(показывается на отдельной странице)</span>
            </label>
            <textarea className="input resize-none" rows={4} value={form.content}
              onChange={e => set('content', e.target.value)}
              placeholder="Опишите условия акции, сроки, детали..." />
          </div>

          {/* Порядок */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Порядок сортировки</label>
            <input className="input w-32" type="number" min="0" value={form.sort_order}
              onChange={e => set('sort_order', e.target.value)} />
          </div>

          {/* Активность */}
          <div className="flex flex-wrap gap-4 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => set('is_active', !form.is_active)}
                className={`w-10 h-6 rounded-full transition-colors relative ${form.is_active ? 'bg-brand' : 'bg-surface-border'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-1'}`} />
              </div>
              <span className="text-sm text-text-primary">Показывать на сайте</span>
            </label>
          </div>
        </div>

        {/* Кнопки */}
        <div className="flex gap-3 px-6 py-4 border-t border-surface-border">
          <button onClick={handleSubmit} disabled={saving || uploading}
            className="btn-primary flex-1 flex items-center justify-center gap-2">
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? 'Сохраняю...' : (banner ? 'Сохранить' : 'Добавить')}
          </button>
          <button onClick={onClose} className="btn-secondary px-6">Отмена</button>
        </div>
      </div>
    </div>
  )
}
// Модалка ввода адреса: Яндекс Карты + поиск + поля улица, дом, квартира, подъезд, этаж.

'use client'

import { useState, useEffect, useRef } from 'react'
import { X, MapPin, Search, Check, Loader2 } from 'lucide-react'

interface Props {
  value:     string
  onConfirm: (address: string) => void
  onClose:   () => void
}

interface Suggestion {
  title:    string
  subtitle: string
  value:    string
  coords:   [number, number]
}

export function AddressModal({ value, onConfirm, onClose }: Props) {
  const mapRef      = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markerRef   = useRef<any>(null)
  const ymapsRef    = useRef<any>(null)

  const [search,    setSearch]    = useState('')
  const [suggests,  setSuggests]  = useState<Suggestion[]>([])
  const [searching, setSearching] = useState(false)
  const [mapReady,  setMapReady]  = useState(false)

  const [street,   setStreet]   = useState('')
  const [building, setBuilding] = useState('')
  const [apt,      setApt]      = useState('')
  const [entrance, setEntrance] = useState('')
  const [floor,    setFloor]    = useState('')

  useEffect(() => {
    if (value) setStreet(value)
  }, [value])

  // Загружаем Яндекс Карты
  useEffect(() => {
    if (typeof window === 'undefined') return
    if ((window as any).ymaps) { initMap((window as any).ymaps); return }

    const key = process.env.NEXT_PUBLIC_YANDEX_MAPS_KEY
    const script = document.createElement('script')
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${key}&lang=ru_RU`
    script.onload = () => {
      (window as any).ymaps.ready(() => {
        ymapsRef.current = (window as any).ymaps
        initMap((window as any).ymaps)
      })
    }
    document.head.appendChild(script)
  }, [])

  function initMap(ymaps: any) {
    if (!mapRef.current || mapInstance.current) return

    const map = new ymaps.Map(mapRef.current, {
      center: [59.9343, 30.3351], // Санкт-Петербург
      zoom:   10,
      controls: ['zoomControl'],
    })

    map.events.add('click', async (e: any) => {
      const coords = e.get('coords') as [number, number]
      placeMarker(coords)
      await reverseGeocode(coords)
    })

    mapInstance.current = map
    setMapReady(true)
  }

  function placeMarker(coords: [number, number]) {
    const ymaps = ymapsRef.current || (window as any).ymaps
    if (!mapInstance.current || !ymaps) return
    if (markerRef.current) mapInstance.current.geoObjects.remove(markerRef.current)
    const placemark = new ymaps.Placemark(coords, {}, {
      preset: 'islands#redDotIcon',
    })
    mapInstance.current.geoObjects.add(placemark)
    markerRef.current = placemark
  }

  async function reverseGeocode(coords: [number, number]) {
    try {
      const key = process.env.NEXT_PUBLIC_YANDEX_MAPS_KEY
      const res  = await fetch(
        `https://geocode-maps.yandex.ru/1.x/?apikey=${key}&geocode=${coords[1]},${coords[0]}&format=json&lang=ru_RU&results=1`
      )
      const data = await res.json()
      const obj  = data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject
      if (!obj) return
      const comp = obj.metaDataProperty?.GeocoderMetaData?.Address?.Components ?? []
      const road = comp.find((c: any) => c.kind === 'street')?.name ?? ''
      const num  = comp.find((c: any) => c.kind === 'house')?.name ?? ''
      setStreet(road)
      setBuilding(num)
    } catch {}
  }

  // Поиск через Suggest API
  async function handleSearch() {
    if (!search.trim()) return
    setSearching(true)
    setSuggests([])
    try {
      const key = process.env.NEXT_PUBLIC_YANDEX_MAPS_KEY
      const res  = await fetch(
        `https://geocode-maps.yandex.ru/1.x/?apikey=${key}&geocode=${encodeURIComponent(search)}&format=json&lang=ru_RU&results=5`
      )
      const data = await res.json()
      const members = data?.response?.GeoObjectCollection?.featureMember ?? []
      const list: Suggestion[] = members.map((m: any) => {
        const obj    = m.GeoObject
        const pos    = obj.Point.pos.split(' ').map(Number)
        return {
          title:    obj.name,
          subtitle: obj.description ?? '',
          value:    obj.name,
          coords:   [pos[1], pos[0]] as [number, number],
        }
      })
      setSuggests(list)
    } catch {}
    setSearching(false)
  }

  function selectSuggestion(s: Suggestion) {
    setSuggests([])
    setSearch('')
    placeMarker(s.coords)
    mapInstance.current?.setCenter(s.coords, 17)
    reverseGeocode(s.coords)
  }

  function handleConfirm() {
    if (!street.trim()) return
    const parts = [street.trim()]
    if (building.trim()) parts.push(`д. ${building.trim()}`)
    if (apt.trim())      parts.push(`кв. ${apt.trim()}`)
    if (entrance.trim()) parts.push(`подъезд ${entrance.trim()}`)
    if (floor.trim())    parts.push(`этаж ${floor.trim()}`)
    onConfirm(parts.join(', '))
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-2xl shadow-modal overflow-hidden flex flex-col"
        style={{ maxHeight: '90dvh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Шапка */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border flex-shrink-0">
          <h3 className="font-bold text-text-primary flex items-center gap-2">
            <MapPin size={18} className="text-brand" />
            Адрес доставки
          </h3>
          <button onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text-primary transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Поиск */}
        <div className="px-5 py-3 border-b border-surface-border relative flex-shrink-0">
          <div className="flex gap-2">
            <input
              className="input text-sm"
              placeholder="Начните вводить адрес..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch} disabled={searching}
              className="btn-primary px-4 flex items-center gap-1 flex-shrink-0 text-sm">
              {searching
                ? <Loader2 size={14} className="animate-spin" />
                : <Search size={14} />
              }
            </button>
          </div>

          {/* Подсказки */}
          {suggests.length > 0 && (
            <div className="absolute left-5 right-5 top-full mt-1 bg-white rounded-card
                            shadow-modal border border-surface-border z-10 overflow-hidden">
              {suggests.map((s, i) => (
                <button key={i} onClick={() => selectSuggestion(s)}
                  className="w-full text-left px-4 py-2.5 hover:bg-surface-section
                             transition-colors border-b border-surface-border last:border-0">
                  <p className="text-sm text-text-primary font-medium">{s.title}</p>
                  <p className="text-xs text-text-muted">{s.subtitle}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Карта */}
        <div ref={mapRef} className="w-full flex-shrink-0" style={{ height: '220px' }}>
          {!mapReady && (
            <div className="w-full h-full flex items-center justify-center bg-surface-input">
              <Loader2 size={24} className="animate-spin text-text-muted" />
            </div>
          )}
        </div>

        {/* Поля */}
        <div className="px-5 py-4 space-y-3 overflow-y-auto">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-text-secondary mb-1">Улица</label>
              <input className="input text-sm" placeholder="ул. Невский пр."
                value={street} onChange={e => setStreet(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Дом</label>
              <input className="input text-sm" placeholder="1"
                value={building} onChange={e => setBuilding(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-text-secondary mb-1">
                Квартира <span className="text-text-muted text-[10px]">необяз.</span>
              </label>
              <input className="input text-sm" placeholder="42"
                value={apt} onChange={e => setApt(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">
                Подъезд <span className="text-text-muted text-[10px]">необяз.</span>
              </label>
              <input className="input text-sm" placeholder="2"
                value={entrance} onChange={e => setEntrance(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">
                Этаж <span className="text-text-muted text-[10px]">необяз.</span>
              </label>
              <input className="input text-sm" placeholder="5"
                value={floor} onChange={e => setFloor(e.target.value)} />
            </div>
          </div>

          <button onClick={handleConfirm} disabled={!street.trim()}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2">
            <Check size={16} />
            Подтвердить адрес
          </button>
        </div>
      </div>
    </div>
  )
}
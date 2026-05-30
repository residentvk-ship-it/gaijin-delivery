'use client'

import { useState, useEffect, useRef } from 'react'
import { X, MapPin, Search, Check, Loader2, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─── типы ────────────────────────────────────────────────────────────────────

interface DeliveryZone {
  id: string
  name: string
  polygon: Array<{ lat: number; lng: number }>
  min_order: number
  delivery_price: number
  delivery_time_min: number
}

interface Props {
  value:     string
  onConfirm: (address: string, zone: DeliveryZone) => void
  onClose:   () => void
}

interface Suggestion {
  title:    string
  subtitle: string
  value:    string
  coords:   [number, number]
}

// ─── ray-casting: точка внутри полигона? ─────────────────────────────────────

function isPointInPolygon(
  point: { lat: number; lng: number },
  polygon: Array<{ lat: number; lng: number }>
): boolean {
  let inside = false
  const { lat: py, lng: px } = point
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const { lat: iy, lng: ix } = polygon[i]
    const { lat: jy, lng: jx } = polygon[j]
    const intersect = iy > py !== jy > py && px < ((jx - ix) * (py - iy)) / (jy - iy) + ix
    if (intersect) inside = !inside
  }
  return inside
}

function findZone(
  coords: [number, number],
  zones: DeliveryZone[]
): DeliveryZone | null {
  const point = { lat: coords[0], lng: coords[1] }
  return zones.find(z => isPointInPolygon(point, z.polygon)) ?? null
}

// ─── компонент ───────────────────────────────────────────────────────────────

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

  // зоны доставки
  const [zones,       setZones]       = useState<DeliveryZone[]>([])
  const [activeZone,  setActiveZone]  = useState<DeliveryZone | null>(null)
  const [outOfZone,   setOutOfZone]   = useState(false)
  const [lastCoords,  setLastCoords]  = useState<[number, number] | null>(null)

  useEffect(() => {
    if (value) setStreet(value)
  }, [value])

  // ── загружаем зоны из Supabase ────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('delivery_zones')
      .select('*')
      .then(({ data, error }) => {
        if (error) console.error('Ошибка загрузки зон:', error)
        else setZones((data as DeliveryZone[]) ?? [])
      })
  }, [])

  // ── инициализация карты ───────────────────────────────────────────────────
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

  // рисуем полигоны зон когда карта И зоны готовы
  useEffect(() => {
    if (!mapInstance.current || zones.length === 0) return
    const ymaps = ymapsRef.current || (window as any).ymaps
    zones.forEach(zone => {
      const coords = zone.polygon.map(p => [p.lat, p.lng])
      const poly = new ymaps.Polygon([coords], { hintContent: zone.name }, {
        fillColor:   '#5B6EF520',
        strokeColor: '#5B6EF5',
        strokeWidth: 2,
        fillOpacity: 0.3,
        interactivityModel: 'default#transparent',
      })
      mapInstance.current.geoObjects.add(poly)
    })
  }, [zones, mapReady])

  function initMap(ymaps: any) {
    if (!mapRef.current || mapInstance.current) return

    const map = new ymaps.Map(mapRef.current, {
      center:   [59.664845, 30.531739],
      zoom:     13,
      controls: ['zoomControl'],
    })

    map.events.add('click', async (e: any) => {
      const coords = e.get('coords') as [number, number]
      setLastCoords(coords)
      placeMarker(coords)
      checkZone(coords)
      await reverseGeocode(coords)
    })

    mapInstance.current = map
    setMapReady(true)
  }

  function checkZone(coords: [number, number]) {
    const zone = findZone(coords, zones)
    if (zone) {
      setActiveZone(zone)
      setOutOfZone(false)
    } else {
      setActiveZone(null)
      setOutOfZone(true)
    }
  }

  function placeMarker(coords: [number, number]) {
    const ymaps = ymapsRef.current || (window as any).ymaps
    if (!mapInstance.current || !ymaps) return
    if (markerRef.current) mapInstance.current.geoObjects.remove(markerRef.current)
    const placemark = new ymaps.Placemark(coords, {}, { preset: 'islands#redDotIcon' })
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

  async function handleSearch() {
    if (!search.trim()) return
    setSearching(true)
    setSuggests([])
    try {
      const key = process.env.NEXT_PUBLIC_YANDEX_MAPS_KEY
      const res  = await fetch(
        `https://geocode-maps.yandex.ru/1.x/?apikey=${key}&geocode=${encodeURIComponent(search + ' Фёдоровское Ленинградская область')}&format=json&lang=ru_RU&results=5`
      )
      const data = await res.json()
      const members = data?.response?.GeoObjectCollection?.featureMember ?? []
      if (members.length === 0) {
        setSuggests([{ title: 'Ничего не найдено', subtitle: 'Попробуйте другой запрос', value: '', coords: [59.664845, 30.531739] }])
        setSearching(false)
        return
      }
      const list: Suggestion[] = members.map((m: any) => {
        const obj = m.GeoObject
        const pos = obj.Point.pos.split(' ').map(Number)
        return {
          title:    obj.name,
          subtitle: obj.description ?? '',
          value:    obj.name,
          coords:   [pos[1], pos[0]] as [number, number],
        }
      })
      setSuggests(list)
    } catch (e) {
      console.error('Ошибка поиска:', e)
    }
    setSearching(false)
  }

  function selectSuggestion(s: Suggestion) {
    setSuggests([])
    setSearch('')
    setLastCoords(s.coords)
    placeMarker(s.coords)
    mapInstance.current?.setCenter(s.coords, 17)
    checkZone(s.coords)
    reverseGeocode(s.coords)
  }

  function handleConfirm() {
    if (!street.trim() || !activeZone) return
    const parts = [street.trim()]
    if (building.trim()) parts.push(`д. ${building.trim()}`)
    if (apt.trim())      parts.push(`кв. ${apt.trim()}`)
    if (entrance.trim()) parts.push(`подъезд ${entrance.trim()}`)
    if (floor.trim())    parts.push(`этаж ${floor.trim()}`)
    onConfirm(parts.join(', '), activeZone)
  }

  const canConfirm = street.trim() && activeZone

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-3xl shadow-modal overflow-hidden flex flex-col"
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
              {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            </button>
          </div>
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

        {/* Статус зоны */}
        {outOfZone && (
          <div className="mx-5 mt-3 flex items-center gap-2 bg-red-50 border border-red-200
                          text-red-600 text-sm rounded-xl px-4 py-3 flex-shrink-0">
            <AlertTriangle size={16} className="flex-shrink-0" />
            <span>Адрес вне зоны доставки. Выберите другую точку на карте.</span>
          </div>
        )}
        {activeZone && (
          <div className="mx-5 mt-3 grid grid-cols-3 gap-2 flex-shrink-0">
            <div className="bg-violet-50 rounded-xl py-2 text-center">
              <p className="text-violet-700 font-semibold text-sm">
                {activeZone.delivery_price === 0 ? 'Бесплатно' : `${activeZone.delivery_price} ₽`}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Доставка</p>
            </div>
            <div className="bg-violet-50 rounded-xl py-2 text-center">
              <p className="text-violet-700 font-semibold text-sm">{activeZone.delivery_time_min} мин</p>
              <p className="text-xs text-gray-500 mt-0.5">Время</p>
            </div>
            <div className="bg-violet-50 rounded-xl py-2 text-center">
              <p className="text-violet-700 font-semibold text-sm">{activeZone.min_order} ₽</p>
              <p className="text-xs text-gray-500 mt-0.5">Мин. заказ</p>
            </div>
          </div>
        )}

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

          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2"
          >
            <Check size={16} />
            Подтвердить адрес
          </button>
        </div>
      </div>
    </div>
  )
}
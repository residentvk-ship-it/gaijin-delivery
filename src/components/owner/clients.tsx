'use client'

import { useState, useEffect } from 'react'
import { Eye } from 'lucide-react'

const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const h = {
  'apikey':        ANON,
  'Authorization': `Bearer ${ANON}`,
  'Content-Type':  'application/json',
}

type Client = {
  id: string
  name: string | null
  phone: string
  created_at: string
  orders_count?: number
}

export function Clients() {
  const [clients,   setClients]   = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      const res = await fetch(
        `${URL}/rest/v1/users_profiles?select=id,name,phone,created_at&order=created_at.desc`,
        { headers: h }
      )
      const data = await res.json()
      setClients(Array.isArray(data) ? data as Client[] : [])
      setIsLoading(false)
    }
    load()
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-card h-14 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-card shadow-card overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-surface-border text-left">
            <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase">Имя</th>
            <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase">Телефон</th>
            <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase hidden sm:table-cell">Дата регистрации</th>
            <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase">Действия</th>
          </tr>
        </thead>
        <tbody>
          {clients.map(c => (
            <tr key={c.id}
              className="border-b border-surface-border last:border-0 hover:bg-surface-section transition-colors">
              <td className="px-4 py-3">
                <span className="font-medium text-text-primary text-sm">
                  {c.name ?? '—'}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="text-text-secondary text-sm">{c.phone}</span>
              </td>
              <td className="px-4 py-3 hidden sm:table-cell">
                <span className="text-text-secondary text-sm">
                  {new Date(c.created_at).toLocaleDateString('ru-RU')}
                </span>
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => alert(`Клиент: ${c.name ?? c.phone}`)}
                  className="p-1.5 rounded-btn text-text-muted hover:text-brand transition-colors">
                  <Eye size={15} />
                </button>
              </td>
            </tr>
          ))}
          {clients.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-12 text-center text-text-muted">
                Нет клиентов
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
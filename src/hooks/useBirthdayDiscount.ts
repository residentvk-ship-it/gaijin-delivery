// Скидка ко дню рождения: ±3 дня от даты, 15% на весь заказ

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const BIRTHDAY_DISCOUNT_PCT = 15
const WINDOW_DAYS            = 3

function isNearBirthday(birthday: string): boolean {
  const today = new Date()
  const bday  = new Date(birthday)

  // Сравниваем только день и месяц
  const todayMD = today.getMonth() * 100 + today.getDate()
  const bdayMD  = bday.getMonth()  * 100 + bday.getDate()

  // Разница в днях (учитываем переход через год)
  const todayDayOfYear = Math.floor(
    (Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) -
     Date.UTC(today.getFullYear(), 0, 0)) / 86400000
  )
  const bdayDayOfYear = Math.floor(
    (Date.UTC(today.getFullYear(), bday.getMonth(), bday.getDate()) -
     Date.UTC(today.getFullYear(), 0, 0)) / 86400000
  )

  const diff = Math.abs(todayDayOfYear - bdayDayOfYear)
  // Учитываем переход через конец года (31 дек → 1 янв)
  const diffWrapped = Math.min(diff, 365 - diff)

  return diffWrapped <= WINDOW_DAYS
}

export function useBirthdayDiscount(subtotal: number) {
  const [isActive,  setIsActive]  = useState(false)
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    async function check() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }

      const { data } = await supabase
        .from('users_profiles')
        .select('birthday')
        .eq('id', session.user.id)
        .single()

      if (data?.birthday) {
        setIsActive(isNearBirthday(data.birthday))
      }
      setLoading(false)
    }
    check()
  }, [])

  const discountAmount = isActive ? Math.round(subtotal * BIRTHDAY_DISCOUNT_PCT / 100) : 0

  return { isActive, discountAmount, loading, pct: BIRTHDAY_DISCOUNT_PCT }
}
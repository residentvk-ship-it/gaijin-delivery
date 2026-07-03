// ============================================
// Файл: src/lib/email.ts
// ============================================
import nodemailer from 'nodemailer'
import type { Topping } from '@/types'

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465, // 465 -> true, 587 -> false, сам разберётся
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  logger: true, // Включает базовые логи транзакций в консоли
  debug: true,  // Включает детализированные SMTP-логи (трафик сервера)
})

type OrderItem = {
  name: string
  quantity: number
  price_at_order: number
  selectedToppings?: Topping[]
}

type OrderForEmail = {
  id: string
  customer_name: string
  customer_phone: string
  address: string
  items: OrderItem[]
  total: number
  payment_method: 'cash' | 'card'
  comment?: string | null
  persons?: number
  bonus_applied?: string | null
}

function formatOrderHtml(order: OrderForEmail) {
  const itemsHtml = order.items
    .map(i => {
      const toppingsText = i.selectedToppings?.length
        ? `<br><span style="font-size:12px;color:#888;">+ ${i.selectedToppings.map(t => t.name).join(', ')}</span>`
        : ''

      return `
      <tr>
        <td style="padding:4px 8px;border-bottom:1px solid #eee;">
          ${i.name} × ${i.quantity}${toppingsText}
        </td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right;">
          ${(i.price_at_order * i.quantity).toLocaleString('ru-RU')} ₽
        </td>
      </tr>`
    })
    .join('')

  return `
    <div style="font-family:Arial,sans-serif;max-width:480px;">
      <h2>Новый заказ #${order.id.slice(0, 8).toUpperCase()}</h2>
      <p><b>Клиент:</b> ${order.customer_name} · ${order.customer_phone}</p>
      <p><b>Адрес:</b> ${order.address}</p>
      ${order.persons ? `<p><b>Персон:</b> ${order.persons}</p>` : ''}
      ${order.bonus_applied ? `<p><b>Бонус:</b> ${order.bonus_applied}</p>` : ''}
      <p><b>Оплата:</b> ${order.payment_method === 'cash' ? 'Наличные' : 'Онлайн'}</p>
      ${order.comment ? `<p><b>Комментарий:</b> ${order.comment}</p>` : ''}
      <table style="width:100%;border-collapse:collapse;margin-top:12px;">
        ${itemsHtml}
      </table>
      <p style="margin-top:12px;font-size:16px;">
        <b>Итого: ${order.total.toLocaleString('ru-RU')} ₽</b>
      </p>
    </div>
  `
}

export async function sendOrderNotification(order: OrderForEmail) {
  const recipients = (process.env.ORDER_NOTIFY_EMAILS ?? '')
    .split(',')
    .map(e => e.trim())
    .filter(Boolean)

  if (recipients.length === 0) {
    console.warn('ORDER_NOTIFY_EMAILS не задан в .env — письмо не отправлено')
    return
  }

  await transporter.sendMail({
    from:    process.env.SMTP_USER, // отправляем с той же почты, с которой шлются коды
    to:      recipients,            // один или два адреса, через запятую в .env
    subject: `Новый заказ #${order.id.slice(0, 8).toUpperCase()} · ${order.total.toLocaleString('ru-RU')} ₽`,
    html:    formatOrderHtml(order),
  })
}


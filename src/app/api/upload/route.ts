// API загрузки фото: сохраняет изображение в public/uploads/products и возвращает URL.

import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export async function POST(req: NextRequest) {
  try {
    const data = await req.formData()
    const file = data.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 })
    }

    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Только изображения' }, { status: 400 })
    }

    // Проверяем размер (макс 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Файл слишком большой (макс 5MB)' }, { status: 400 })
    }

    const bytes  = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Уникальное имя файла
    const ext      = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const dir      = join(process.cwd(), 'public', 'uploads', 'products')

    // Создаём папку если нет
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, filename), buffer)

    const url = `/uploads/products/${filename}`
    return NextResponse.json({ url })

  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Ошибка загрузки' }, { status: 500 })
  }
}
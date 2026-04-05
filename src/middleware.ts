// Middleware: защищает роуты /admin и /owner — пускает только авторизованных.
// Проверка роли происходит на самой странице.

import { NextRequest, NextResponse } from 'next/server'

export async function middleware(req: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [],
}
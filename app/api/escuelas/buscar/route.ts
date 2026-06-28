import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const cct = request.nextUrl.searchParams.get('cct')?.trim().toUpperCase()
  if (!cct || cct.length < 4) return NextResponse.json([])

  const supabase = createAdminClient()

  const { data } = await supabase
    .from('escuelas')
    .select('id, nombre, cct, municipio, zona_id')
    .ilike('cct', `%${cct}%`)
    .limit(5)

  return NextResponse.json(data ?? [])
}

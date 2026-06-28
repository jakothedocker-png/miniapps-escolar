import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ message: 'Por implementar' }, { status: 501 })
}

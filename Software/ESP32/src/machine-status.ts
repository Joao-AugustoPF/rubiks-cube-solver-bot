// src/app/api/machine/status/route.ts
//
// Faz polling de status no ESP32 e repassa ao frontend.
// Mantém o mesmo contrato que o mock anterior.

import { NextRequest, NextResponse } from 'next/server'
import { getDeviceIp } from '../device/register/route'
import type { MachineStatusResponse } from '@/types/machine'

const DEVICE_SECRET      = process.env.DEVICE_SECRET ?? ''
const REQUEST_TIMEOUT_MS = 5_000

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get('jobId')

  if (!jobId) {
    return NextResponse.json({ error: 'jobId ausente' }, { status: 400 })
  }

  const deviceIp = getDeviceIp()
  if (!deviceIp) {
    return NextResponse.json(
      { error: 'ESP32 não registrado' },
      { status: 503 }
    )
  }

  const url = `http://${deviceIp}/status?jobId=${encodeURIComponent(jobId)}`
  let espResponse: Response

  try {
    espResponse = await fetch(url, {
      headers: { 'X-Device-Secret': DEVICE_SECRET },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[machine/status] Erro ao contactar ESP32 (${url}):`, msg)
    return NextResponse.json(
      { error: 'ESP32 inacessível', detail: msg },
      { status: 502 }
    )
  }

  let data: MachineStatusResponse
  try {
    data = await espResponse.json()
  } catch {
    return NextResponse.json({ error: 'Resposta inválida do ESP32' }, { status: 502 })
  }

  return NextResponse.json(data, { status: espResponse.ok ? 200 : espResponse.status })
}

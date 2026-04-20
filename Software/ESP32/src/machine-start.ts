// src/app/api/machine/start/route.ts
//
// Recebe o mechanicalPlan do frontend e encaminha ao ESP32.
// O ESP32 responde {status:"queued"} imediatamente.
//
// Variáveis de ambiente:
//   DEVICE_SECRET=mude-esta-chave-secreta
//   DEVICE_IP_OVERRIDE=192.168.x.x   (opcional, sobrescreve IP registrado)

import { NextRequest, NextResponse } from 'next/server'
import { getDeviceIp } from '../device/register/route'
import type { MachineStartRequest, MachineStatusResponse } from '@/types/machine'

const DEVICE_SECRET  = process.env.DEVICE_SECRET ?? ''
const REQUEST_TIMEOUT_MS = 10_000

export async function POST(req: NextRequest) {
  // 1. Valida body
  let body: MachineStartRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  if (!body.jobId || !Array.isArray(body.actions)) {
    return NextResponse.json({ error: 'jobId e actions são obrigatórios' }, { status: 400 })
  }

  // 2. Resolve IP do ESP32
  const deviceIp = getDeviceIp()
  if (!deviceIp) {
    return NextResponse.json(
      { error: 'ESP32 não registrado. Aguarde o boot do dispositivo.' },
      { status: 503 }
    )
  }

  // 3. Encaminha ao ESP32
  const url = `http://${deviceIp}/start`
  let espResponse: Response

  try {
    espResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Secret': DEVICE_SECRET,
      },
      body: JSON.stringify({ jobId: body.jobId, actions: body.actions }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[machine/start] Erro ao contactar ESP32 (${url}):`, msg)
    return NextResponse.json(
      { error: 'ESP32 inacessível', detail: msg },
      { status: 502 }
    )
  }

  // 4. Repassa resposta do ESP32 ao frontend
  let data: MachineStatusResponse
  try {
    data = await espResponse.json()
  } catch {
    return NextResponse.json({ error: 'Resposta inválida do ESP32' }, { status: 502 })
  }

  console.log(`[machine/start] jobId=${body.jobId} → ESP32 status=${data.status}`)
  return NextResponse.json(data, { status: espResponse.ok ? 200 : espResponse.status })
}

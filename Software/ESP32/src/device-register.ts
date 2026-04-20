// src/app/api/device/register/route.ts
//
// O ESP32 chama esta rota no boot para registrar o próprio IP.
// O Next.js guarda o IP e usa nas chamadas subsequentes a /start e /status.
//
// Variáveis de ambiente necessárias (.env.local / VPS):
//   DEVICE_SECRET=mude-esta-chave-secreta   ← mesma string do firmware
//   DEVICE_IP_OVERRIDE=192.168.x.x          ← opcional: força IP fixo para testes

import { NextRequest, NextResponse } from 'next/server'

// Armazena o IP em memória do processo Node.js.
// Em produção com múltiplos workers, use Redis ou uma variável de ambiente.
let registeredDeviceIp: string | null = process.env.DEVICE_IP_OVERRIDE ?? null

export function getDeviceIp(): string | null {
  return registeredDeviceIp
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-device-secret')
  if (secret !== process.env.DEVICE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { ip?: string; deviceId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  if (!body.ip) {
    return NextResponse.json({ error: 'ip ausente' }, { status: 400 })
  }

  registeredDeviceIp = body.ip
  console.log(`[device/register] ESP32 registrado: ip=${body.ip} deviceId=${body.deviceId}`)

  return NextResponse.json({ ok: true, ip: body.ip })
}

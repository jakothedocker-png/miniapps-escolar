# Configuración API Kimi (Moonshot AI Internacional)

## Dónde generar el API Key

- Plataforma: **https://platform.kimi.ai/console/api-keys**
- Es la versión **internacional** de Moonshot AI (distinta a la China en `platform.moonshot.cn`)
- Los keys tienen formato: `sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## Endpoints

| URL | Estado |
|-----|--------|
| `https://api.moonshot.ai/v1` | ✅ Internacional — usar este |
| `https://api.moonshot.cn/v1` | ❌ Solo para keys de la plataforma China |
| `https://api.kimi.ai/v1` | ❌ No existe |

## Modelos disponibles

| Modelo | Contexto | Uso recomendado |
|--------|----------|-----------------|
| `moonshot-v1-8k` | 8K tokens | Textos cortos, observaciones, respuestas simples |
| `moonshot-v1-32k` | 32K tokens | Documentos medianos |
| `moonshot-v1-128k` | 128K tokens | Documentos largos, PDFs completos |

## Variables de entorno (.env.local)

```env
KIMI_API_KEY=sk-tu-key-aqui
```

> La variable debe estar solo en el servidor (nunca en el cliente).

## Cliente mínimo (Next.js App Router)

```typescript
// lib/kimi/client.ts
const KIMI_BASE_URL = 'https://api.moonshot.ai/v1'
export const MODELO_IA = 'moonshot-v1-8k'

interface KimiResponse {
  choices: Array<{ message: { content: string } }>
  usage: { prompt_tokens: number; completion_tokens: number }
}

export const kimi = {
  messages: {
    async create(params: {
      model: string
      max_tokens: number
      system: string
      messages: Array<{ role: string; content: string }>
    }) {
      const res = await fetch(`${KIMI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.KIMI_API_KEY}`,
        },
        body: JSON.stringify({
          model: params.model,
          messages: [
            { role: 'system', content: params.system },
            ...params.messages,
          ],
          max_tokens: params.max_tokens,
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Kimi API ${res.status}: ${text}`)
      }

      const data: KimiResponse = await res.json()
      return {
        content: [{ type: 'text' as const, text: data.choices[0]?.message?.content ?? '' }],
        usage: {
          input_tokens:  data.usage?.prompt_tokens ?? 0,
          output_tokens: data.usage?.completion_tokens ?? 0,
        },
      }
    },
  },
}
```

## Endpoint de prueba (Route Handler)

```typescript
// app/api/ia/test/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  const res = await fetch('https://api.moonshot.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.KIMI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'moonshot-v1-8k',
      messages: [{ role: 'user', content: 'Hola' }],
      max_tokens: 10,
    }),
  })
  const data = await res.json()
  return NextResponse.json({ ok: res.ok, status: res.status, data })
}
```

## Diagnóstico de errores comunes

| Error | Código | Causa | Solución |
|-------|--------|-------|----------|
| `Invalid Authentication` | 401 | Key inválido o de plataforma equivocada | Verificar que el key sea de `platform.kimi.ai` y usar `api.moonshot.ai` |
| `fetch failed` | 0 | URL no existe o sin red | Verificar la URL base — solo `api.moonshot.ai` funciona para keys internacionales |
| `Model not found` | 400 | Nombre de modelo incorrecto | Usar `moonshot-v1-8k`, `moonshot-v1-32k` o `moonshot-v1-128k` |
| `Insufficient balance` | 429 | Sin créditos | Recargar en `platform.kimi.ai` |

## Notas importantes

- La API es **compatible con el formato OpenAI** (mismo schema de request/response)
- El `system` prompt se pasa como primer mensaje con `role: "system"`
- La respuesta viene en `choices[0].message.content`
- Los tokens se reportan como `prompt_tokens` y `completion_tokens` (no `input_tokens`/`output_tokens` como Anthropic)
- **Rotar el key** después de exponerlo en cualquier chat o log

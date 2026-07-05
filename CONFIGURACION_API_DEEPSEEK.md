# Configuración API DeepSeek

## Dónde generar el API Key

- Plataforma: **https://platform.deepseek.com/api_keys**
- Los keys tienen formato: `sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## Endpoint

| URL | Estado |
|-----|--------|
| `https://api.deepseek.com/v1` | ✅ Compatible con formato OpenAI — usar este |

## Modelos disponibles

| Modelo | Uso recomendado |
|--------|-----------------|
| `deepseek-chat` | Observaciones, textos cortos — el que usa la plataforma |
| `deepseek-reasoner` | Razonamiento complejo (más caro y lento, no necesario aquí) |

## Precios (deepseek-chat, cache miss)

- Input: ~$0.28 USD por 1M tokens
- Output: ~$0.42 USD por 1M tokens
- Estos valores están codificados en `lib/ia/client.ts` (`PRECIO_INPUT_1M`, `PRECIO_OUTPUT_1M`) para el cálculo de `costo_usd` en `logs_ia` — actualizar si DeepSeek cambia tarifas

## Variables de entorno

```env
DEEPSEEK_API_KEY=sk-tu-key-aqui
```

> Solo en el servidor (`.env.local` y variables de entorno de Vercel). Nunca en el cliente.

## Cliente

El cliente vive en `lib/ia/client.ts` y expone `iaClient.messages.create(...)` con la misma
interfaz que el SDK de Anthropic, por lo que el route handler no depende del proveedor.
La API de DeepSeek usa el formato de chat/completions de OpenAI.

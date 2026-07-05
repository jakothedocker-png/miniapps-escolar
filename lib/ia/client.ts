const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1'
export const MODELO_IA = 'deepseek-chat'

// Precios por 1M tokens (USD) — deepseek-chat, cache miss
export const PRECIO_INPUT_1M = 0.28
export const PRECIO_OUTPUT_1M = 0.42

interface DeepSeekResponse {
  choices: Array<{ message: { content: string } }>
  usage: { prompt_tokens: number; completion_tokens: number }
}

export const iaClient = {
  messages: {
    async create(params: {
      model: string
      max_tokens: number
      system: string
      messages: Array<{ role: string; content: string }>
    }) {
      const res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
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
        throw new Error(`DeepSeek API ${res.status}: ${text}`)
      }

      const data: DeepSeekResponse = await res.json()
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

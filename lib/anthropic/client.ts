const KIMI_BASE_URL = 'https://api.moonshot.ai/v1'
export const MODELO_IA = 'moonshot-v1-8k'

interface KimiResponse {
  choices: Array<{ message: { content: string } }>
  usage: { prompt_tokens: number; completion_tokens: number }
}

export const anthropic = {
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

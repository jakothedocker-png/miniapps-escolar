'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export interface DatosCampo {
  campo: string
  t1: number | null
  t2: number | null
  t3: number | null
}

interface Props {
  datos: DatosCampo[]
  titulo?: string
}

const sinDatos = (datos: DatosCampo[]) =>
  datos.every(d => d.t1 === null && d.t2 === null && d.t3 === null)

export default function GraficaPromedios({ datos, titulo }: Props) {
  if (sinDatos(datos)) {
    return (
      <div className="text-center py-16 text-sm text-gray-400">
        Sin datos suficientes para mostrar estadísticas
      </div>
    )
  }

  const chartData = datos.map(d => ({
    campo: d.campo,
    'T1': d.t1 ?? undefined,
    'T2': d.t2 ?? undefined,
    'T3': d.t3 ?? undefined,
  }))

  return (
    <div>
      {titulo && (
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">{titulo}</p>
      )}
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.2)" />
          <XAxis
            dataKey="campo"
            tick={{ fontSize: 11, fill: 'currentColor' }}
            className="text-gray-500 dark:text-gray-400"
          />
          <YAxis
            domain={[0, 10]}
            ticks={[0, 2, 4, 6, 8, 10]}
            tick={{ fontSize: 11, fill: 'currentColor' }}
            className="text-gray-500 dark:text-gray-400"
          />
          <Tooltip
            formatter={(value: number) => [value.toFixed(1), '']}
            contentStyle={{
              borderRadius: '12px',
              border: '1px solid rgba(99,102,241,0.2)',
              background: 'var(--tooltip-bg, #1f2937)',
              color: '#f9fafb',
              fontSize: 12,
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
          />
          <Bar dataKey="T1" name="T1" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={32} />
          <Bar dataKey="T2" name="T2" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
          <Bar dataKey="T3" name="T3" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

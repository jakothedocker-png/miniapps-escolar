'use client'
'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { Download, Upload, CheckCircle, XCircle, Loader2, ArrowLeft, FileSpreadsheet } from 'lucide-react'
import { importarAlumnos } from '@/app/actions/alumnos'

interface Grupo {
  id: string
  grado: string
  grupo: string
  ciclo_escolar: string
}

interface FilaPreview {
  nombre: string
  apellido_paterno: string
  apellido_materno: string
  curp: string
  valida: boolean
  estado: string
}

const cardStyle = {
  background: '#FFFFFF',
  border: '1px solid rgba(6,135,216,0.12)',
  boxShadow: '0 4px 24px rgba(30,45,61,0.08), 0 1px 4px rgba(30,45,61,0.04)',
}

export default function ImportarClient({ grupo }: { grupo: Grupo }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [filas, setFilas] = useState<FilaPreview[]>([])
  const [resultado, setResultado] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [pending, startTransition] = useTransition()

  function descargarPlantilla() {
    const ws = XLSX.utils.aoa_to_sheet([
      ['nombre', 'apellido_paterno', 'apellido_materno', 'curp'],
      ['María', 'García', 'López', 'GALM020315MVZRPL01'],
    ])
    ws['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 22 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Alumnos')
    XLSX.writeFile(wb, `plantilla_alumnos_${grupo.grado}_${grupo.grupo}.xlsx`)
  }

  function parsearArchivo(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })

        const parsed: FilaPreview[] = rows.map(row => {
          const nombre = String(row['nombre'] ?? '').trim()
          const apellido_paterno = String(row['apellido_paterno'] ?? '').trim()
          const apellido_materno = String(row['apellido_materno'] ?? '').trim()
          const curp = String(row['curp'] ?? '').trim().toUpperCase()

          const errores: string[] = []
          if (!nombre) errores.push('Nombre requerido')
          if (!apellido_paterno) errores.push('Apellido paterno requerido')
          if (curp && curp.length !== 18) errores.push(`CURP debe tener 18 caracteres (tiene ${curp.length})`)

          return {
            nombre,
            apellido_paterno,
            apellido_materno,
            curp,
            valida: errores.length === 0,
            estado: errores.length === 0 ? 'Válida' : errores.join(' · '),
          }
        })

        setFilas(parsed)
        setResultado(null)
        setError(null)
      } catch {
        setError('No se pudo leer el archivo. Asegúrate de que sea un .xlsx válido.')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  function handleFile(file: File | undefined) {
    if (!file) return
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Solo se aceptan archivos .xlsx')
      return
    }
    parsearArchivo(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  function handleImportar() {
    const validas = filas.filter(f => f.valida)
    if (validas.length === 0) return
    setError(null)
    startTransition(async () => {
      const res = await importarAlumnos(
        validas.map(f => ({
          nombre: f.nombre,
          apellido_paterno: f.apellido_paterno,
          apellido_materno: f.apellido_materno || undefined,
          curp: f.curp || undefined,
        })),
        grupo.id
      )
      if (res.error) { setError(res.error); return }
      setResultado(`${res.insertados} alumno${res.insertados !== 1 ? 's' : ''} importado${res.insertados !== 1 ? 's' : ''} exitosamente.`)
      setFilas([])
    })
  }

  const validas = filas.filter(f => f.valida).length
  const invalidas = filas.filter(f => !f.valida).length

  return (
    <div className="p-6 max-w-4xl mx-auto" style={{ background: '#F5F8FF', minHeight: '100%' }}>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm mb-4 transition-colors"
          style={{ color: '#64748B' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#1E2D3D'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#64748B'}
        >
          <ArrowLeft size={15} />
          Volver
        </button>
        <h1 className="text-2xl font-bold" style={{ color: '#1E2D3D' }}>Importar alumnos</h1>
        <p className="text-sm mt-1" style={{ color: '#64748B' }}>
          Grupo {grupo.grado} &quot;{grupo.grupo}&quot; — {grupo.ciclo_escolar}
        </p>
      </div>

      {/* Descargar plantilla */}
      <div className="rounded-2xl p-5 mb-6 flex items-center justify-between" style={cardStyle}>
        <div>
          <p className="text-sm font-semibold" style={{ color: '#1E2D3D' }}>Paso 1: Descarga la plantilla</p>
          <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
            Llena la plantilla con los datos de tus alumnos (nombre, apellidos, CURP opcional).
          </p>
        </div>
        <button
          onClick={descargarPlantilla}
          className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-medium rounded-xl transition-colors whitespace-nowrap"
          style={{ background: 'linear-gradient(135deg, #15803D 0%, #166534 100%)', boxShadow: '0 4px 16px rgba(21,128,61,0.25)' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.9'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
        >
          <Download size={15} />
          Descargar plantilla
        </button>
      </div>

      {/* Subir archivo */}
      <div className="rounded-2xl p-5 mb-6" style={cardStyle}>
        <p className="text-sm font-semibold mb-4" style={{ color: '#1E2D3D' }}>Paso 2: Sube tu archivo</p>
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors"
          style={{
            borderColor: dragging ? '#0687D8' : '#CBD5E1',
            background: dragging ? 'rgba(6,135,216,0.04)' : 'transparent',
          }}
          onMouseEnter={e => {
            if (!dragging) {
              (e.currentTarget as HTMLElement).style.borderColor = '#0687D8'
              ;(e.currentTarget as HTMLElement).style.background = 'rgba(6,135,216,0.02)'
            }
          }}
          onMouseLeave={e => {
            if (!dragging) {
              (e.currentTarget as HTMLElement).style.borderColor = '#CBD5E1'
              ;(e.currentTarget as HTMLElement).style.background = 'transparent'
            }
          }}
        >
          <FileSpreadsheet size={32} className="mx-auto mb-3" style={{ color: '#94A3B8' }} />
          <p className="text-sm font-medium" style={{ color: '#1E2D3D' }}>
            Arrastra tu archivo aquí o haz clic para seleccionar
          </p>
          <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>Solo archivos .xlsx</p>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={e => handleFile(e.target.files?.[0])}
          />
        </div>
      </div>

      {/* Preview */}
      {filas.length > 0 && (
        <div className="rounded-2xl overflow-hidden mb-6" style={cardStyle}>
          <div className="px-5 py-4 flex items-center justify-between"
            style={{ borderBottom: '1px solid rgba(6,135,216,0.08)' }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#1E2D3D' }}>Vista previa</p>
              <div className="flex items-center gap-4 mt-1 text-xs">
                <span className="font-medium" style={{ color: '#15803D' }}>{validas} válida{validas !== 1 ? 's' : ''}</span>
                {invalidas > 0 && (
                  <span className="font-medium" style={{ color: '#DC2626' }}>{invalidas} con error{invalidas !== 1 ? 'es' : ''}</span>
                )}
              </div>
            </div>
            {validas > 0 && (
              <button
                onClick={handleImportar}
                disabled={pending}
                className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #0687D8 0%, #0569B0 100%)', boxShadow: '0 4px 16px rgba(6,135,216,0.30)' }}
              >
                {pending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                Importar {validas} alumno{validas !== 1 ? 's' : ''} válido{validas !== 1 ? 's' : ''}
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(6,135,216,0.08)' }}>
                  {['Nombre', 'Ap. Paterno', 'Ap. Materno', 'CURP', 'Estado'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                      style={{ background: '#F8FAFF', color: '#64748B' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.map((fila, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderTop: idx > 0 ? '1px solid rgba(6,135,216,0.06)' : undefined,
                      background: fila.valida ? 'rgba(21,128,61,0.04)' : 'rgba(220,38,38,0.04)',
                    }}
                  >
                    <td className="px-4 py-3" style={{ color: '#1E2D3D' }}>
                      {fila.nombre || <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>vacío</span>}
                    </td>
                    <td className="px-4 py-3" style={{ color: '#1E2D3D' }}>
                      {fila.apellido_paterno || <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>vacío</span>}
                    </td>
                    <td className="px-4 py-3" style={{ color: '#64748B' }}>{fila.apellido_materno || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: '#64748B' }}>{fila.curp || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {fila.valida
                          ? <CheckCircle size={14} style={{ color: '#15803D', flexShrink: 0 }} />
                          : <XCircle size={14} style={{ color: '#DC2626', flexShrink: 0 }} />
                        }
                        <span className="text-xs" style={{ color: fila.valida ? '#15803D' : '#DC2626' }}>
                          {fila.estado}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-2xl px-5 py-4 text-sm mb-4"
          style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}>
          {error}
        </div>
      )}

      {resultado && (
        <div className="rounded-2xl px-5 py-4 flex items-center gap-3 mb-4"
          style={{ background: '#EFF9F0', border: '1px solid rgba(21,128,61,0.20)' }}>
          <CheckCircle size={18} style={{ color: '#15803D', flexShrink: 0 }} />
          <p className="text-sm font-medium" style={{ color: '#15803D' }}>{resultado}</p>
          <button
            onClick={() => router.push(`/app/grupos/${grupo.id}/alumnos`)}
            className="ml-auto text-sm underline hover:no-underline transition-all"
            style={{ color: '#15803D' }}
          >
            Ver lista
          </button>
        </div>
      )}
    </div>
  )
}

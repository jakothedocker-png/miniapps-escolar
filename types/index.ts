export type Rol = 'superadmin' | 'supervisor' | 'director' | 'maestro'

export type PlanIA = 'legacy' | 'prueba' | 'trimestre' | 'anual'

export type LicenciaPlan = 'legacy' | 'trial' | 'trimestre' | 'anual'

export type EstatusZona = 'activo' | 'suspendido' | 'trial' | 'vencido'

export interface Zona {
  id: string
  nombre: string
  estado: string
  contacto_admin: { nombre?: string; email?: string } | null
  plan: PlanIA
  ia_plan: PlanIA
  ia_habilitada: boolean
  ia_vence: string | null
  ia_usos_prueba: number
  licencia_vence: string | null
  pagos_requeridos: boolean
  mostrar_jakosoft: boolean
  estatus: EstatusZona
  created_at: string
}

export interface Usuario {
  id: string
  nombre: string
  email: string
  zona_id: string
  escuela_id: string | null
  rol: Rol
  estatus: string
  licencia_plan: LicenciaPlan
  licencia_vence: string | null
  licencia_max_alumnos: number | null
  licencia_ciclo: string | null
  licencia_periodos: string[]
  ultimo_acceso: string | null
}

export interface Escuela {
  id: string
  nombre: string
  cct: string
  zona_id: string
  director_id: string | null
  estatus: string
  created_at: string
}

export interface Alumno {
  id: string
  nombre: string
  apellido_paterno: string
  apellido_materno: string
  curp: string
  grupo_id: string
  escuela_id: string
  zona_id: string
  activo: boolean
  deleted: boolean
}

export interface CamposFormativos {
  lenguajes: number | null
  saberes: number | null
  etica: number | null
  humanos: number | null
}

export interface Evaluacion {
  id: string
  alumno_id: string
  grupo_id: string
  maestro_id: string
  trimestre: 1 | 2 | 3
  ciclo_escolar: string
  campos_formativos: CamposFormativos
  promedio_general: number | null
  zona_id: string
  escuela_id: string
}

export interface Observacion {
  id: string
  alumno_id: string
  grupo_id: string
  maestro_id: string
  trimestre: 1 | 2 | 3
  ciclo_escolar: string
  descripcion_maestro: string
  observacion_1: string
  observacion_2: string
  observacion_seleccionada: 1 | 2 | null
  generada_con_ia: boolean
  zona_id: string
  escuela_id: string
  created_at: string
}

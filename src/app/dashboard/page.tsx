import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { crearJornada } from './actions';
import { Plus, ChevronRight, Layers, CalendarDays } from 'lucide-react';

export default async function DashboardPage() {
  const supabase = await createClient();

  // El layout ya protege la ruta, pero lo requerimos para extraer el rol del usuario
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single();

  const esCoordinador = perfil?.rol === 'coordinador';

  // Obtener jornadas con sus tareas (cajas) anidadas
  const { data: jornadas } = await supabase
    .from('jornadas')
    .select(`
      *,
      tareas_jornada ( id, tipo_caja, estado )
    `)
    .order('fecha', { ascending: false });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Cabecera del Módulo y Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-[#211B20]">
            Registro de Operaciones
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Control de preparación de cajas e inventario por fecha operativa.
          </p>
        </div>

        {esCoordinador && (
          <details className="group relative z-30">
            <summary 
              className="list-none inline-flex items-center gap-2 px-4 py-2.5 bg-[#07833F] hover:bg-[#066e35] active:bg-[#055b2c] text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-all shadow-2xs cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#07833F] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F3EF]"
              aria-haspopup="dialog"
              aria-label="Desplegar formulario para nueva jornada"
            >
              <Plus className="w-4 h-4 transition-transform duration-200 group-open:rotate-45" aria-hidden="true" />
              <span>Nueva Jornada</span>
            </summary>

            {/* Formulario Flotante de Creación Rápida */}
            <div 
              role="dialog" 
              aria-label="Programar nueva jornada operativa"
              className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200/90 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] p-5 origin-top-right animate-in zoom-in-95 duration-200"
            >
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-4 border-b border-slate-100 pb-2">
                Programar Nueva Jornada
              </h2>
              <form action={crearJornada} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="fecha" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Fecha Operativa
                  </label>
                  <input
                    id="fecha"
                    name="fecha"
                    type="date"
                    required
                    className="w-full px-3 py-2 bg-slate-50/60 border border-slate-200 rounded-lg text-sm text-[#211B20] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#07833F]/20 focus:border-[#07833F] transition-all shadow-2xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="ponente" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Ponente / Charlista
                  </label>
                  <input
                    id="ponente"
                    name="ponente"
                    type="text"
                    required
                    placeholder="Ej. Padre Juan"
                    className="w-full px-3 py-2 bg-slate-50/60 border border-slate-200 rounded-lg text-sm text-[#211B20] placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#07833F]/20 focus:border-[#07833F] transition-all shadow-2xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="dinamica" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Dinámica de Apertura
                  </label>
                  <input
                    id="dinamica"
                    name="dinamica"
                    type="text"
                    placeholder="Opcional"
                    className="w-full px-3 py-2 bg-slate-50/60 border border-slate-200 rounded-lg text-sm text-[#211B20] placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#07833F]/20 focus:border-[#07833F] transition-all shadow-2xs"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#211B20] hover:bg-black active:bg-slate-800 text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#07833F] focus-visible:ring-offset-1"
                  >
                    Generar Jornada y Cajas
                  </button>
                </div>
              </form>
            </div>
          </details>
        )}
      </div>

      {/* 2. Contenedor del Data Grid (Estilo SaaS) */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
        
        {/* Cabecera de Tabla (Oculta en móviles, visible en Desktop) */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3.5 bg-slate-50/80 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500" aria-hidden="true">
          <div className="col-span-3">Fecha y Ticket</div>
          <div className="col-span-4">Ponente y Dinámica</div>
          <div className="col-span-2">Fase de Jornada</div>
          <div className="col-span-2 text-center">Estado de Cajas</div>
          <div className="col-span-1 text-right">Acción</div>
        </div>

        {/* Cuerpo de la Tabla */}
        {jornadas && jornadas.length > 0 ? (
          <div className="divide-y divide-slate-100" role="list" aria-label="Lista de jornadas operativas">
            {jornadas.map((j) => (
              <div 
                key={j.id} 
                role="listitem" 
                className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-4 items-center px-5 sm:px-6 py-4 hover:bg-slate-50/50 transition-colors group"
              >
                {/* Columna: Fecha y Ticket */}
                <div className="col-span-3 flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-slate-100/80 border border-slate-200/70 flex flex-col items-center justify-center shrink-0 shadow-2xs" aria-hidden="true">
                    <span className="text-[9px] uppercase font-bold text-slate-500 leading-none mb-0.5">
                      {new Date(j.fecha).toLocaleDateString('es-PE', { month: 'short' })}
                    </span>
                    <span className="text-sm font-bold text-[#211B20] leading-none">
                      {new Date(j.fecha).getUTCDate()}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#211B20]">{j.fecha}</span>
                    <span className="text-[10px] text-slate-400 font-mono mt-0.5" aria-label={`ID de ticket: ${j.id.slice(0, 8)}`}>
                      #{j.id.slice(0, 8)}
                    </span>
                  </div>
                </div>

                {/* Columna: Ponente */}
                <div className="col-span-4 flex flex-col justify-center">
                  <span className="text-xs font-bold text-[#211B20] truncate">{j.ponente}</span>
                  <span className={`text-[11px] truncate mt-0.5 ${j.dinamica_apertura ? 'text-slate-500' : 'text-slate-400 italic font-medium'}`}>
                    {j.dinamica_apertura || 'Sin dinámica asignada'}
                  </span>
                </div>

                {/* Columna: Estado General */}
                <div className="col-span-2 flex items-center">
                  <span 
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest border ${
                      j.estado === 'en_curso' ? 'bg-[#07833F]/10 text-[#07833F] border-[#07833F]/20' : 
                      j.estado === 'planificacion' ? 'bg-[#E0B84F]/10 text-[#9a761e] border-[#E0B84F]/20' : 
                      'bg-slate-100 text-slate-500 border-slate-200/80'
                    }`}
                    aria-label={`Estado actual: ${j.estado.replace('_', ' ')}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${j.estado === 'en_curso' ? 'bg-[#07833F]' : j.estado === 'planificacion' ? 'bg-[#E0B84F]' : 'bg-slate-400'}`} aria-hidden="true" />
                    {j.estado.replace('_', ' ')}
                  </span>
                </div>

                {/* Columna: Etiquetas de Cajas */}
                <div 
                  className="col-span-2 flex items-center justify-start md:justify-center gap-1.5 flex-wrap" 
                  aria-label={`${j.tareas_jornada?.length || 0} cajas vinculadas`}
                >
                  {j.tareas_jornada?.map((tarea: any) => (
                    <span 
                      key={tarea.id} 
                      title={`Caja ${tarea.tipo_caja}: ${tarea.estado}`} 
                      className={`text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded border transition-colors ${
                        tarea.estado === 'completado' ? 'bg-[#07833F]/10 border-[#07833F]/25 text-[#07833F]' : 
                        tarea.estado === 'en_progreso' ? 'bg-[#E0B84F]/15 border-[#E0B84F]/30 text-[#9a761e]' : 
                        'bg-slate-100/70 border-slate-200 text-slate-500'
                      }`}
                    >
                      {tarea.tipo_caja.slice(0, 3)}
                    </span>
                  ))}
                </div>

                {/* Columna: Acción (Enlace Accesible) */}
                <div className="col-span-1 flex md:justify-end mt-2 md:mt-0">
                  <Link
                    href={`/jornada/${j.id}`}
                    aria-label={`Gestionar logística de la jornada del ${j.fecha}`}
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg border border-slate-200/90 bg-white hover:bg-slate-50 active:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#07833F] text-[11px] font-bold uppercase tracking-wider text-[#211B20] transition-all shadow-2xs group-hover:border-[#07833F]/30"
                  >
                    <span>Abrir</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#07833F] transition-colors" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State Accesible */
          <div className="p-16 text-center space-y-4" role="status" aria-live="polite">
            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center mx-auto shadow-2xs" aria-hidden="true">
              <CalendarDays className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#211B20]">No hay jornadas programadas</p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                {esCoordinador 
                  ? 'Utiliza el botón "Nueva Jornada" en la parte superior para inicializar el cronograma y estructurar las cajas.' 
                  : 'Aún no se han programado eventos operativos para el equipo. Revisa más tarde.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
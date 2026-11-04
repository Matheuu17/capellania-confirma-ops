import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import ChecklistCaja from './checklist-caja';
import SupervisorRealtime from './supervisor-realtime';
import {
  agregarComentarioCierre,
  actualizarDatosJornada,
  cambiarEstadoJornada,
  eliminarJornada,
} from './actions';
import {
  ArrowLeft,
  MessageSquare,
  Send,
  Settings,
  Info,
  Inbox,
  ShieldCheck,
  Users,
  CheckCircle2,
  ClockAlert,
  AlertTriangle,
  XCircle,
  Trash2,
} from 'lucide-react';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function JornadaDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol, nombre')
    .eq('id', user.id)
    .single();

  const esCoordinador = perfil?.rol === 'coordinador';

  // 1. Obtener jornada
  const { data: jornada } = await supabase
    .from('jornadas')
    .select('*')
    .eq('id', id)
    .single();

  if (!jornada) notFound();

  // 2. Obtener lista de miembros para asignación y asistencia
  const { data: perfiles } = await supabase
    .from('perfiles')
    .select('id, nombre, rol')
    .eq('rol', 'miembro')
    .order('nombre');

  const miembros = perfiles || [];

  // 3. Obtener asistencias registradas para esta jornada
  const { data: asistenciasRaw } = await supabase
    .from('asistencias')
    .select('usuario_id, registrado_en, distancia_metros')
    .eq('jornada_id', id);

  const mapaAsistencias = new Map(
    (asistenciasRaw || []).map((a) => [a.usuario_id, a])
  );

  // 4. Mapear estado de asistencia con las 3 reglas:
  //    - Hasta 2:15 PM (<= 855 min): A Tiempo (P)
  //    - De 2:16 PM a 2:44 PM (< 885 min): Tardanza (T)
  //    - Desde 2:45 PM en adelante: Falta (F)
  //    - Sin registro: Sin Marcar
  const reporteMiembros = miembros.map((m) => {
    const reg = mapaAsistencias.get(m.id);
    if (!reg) {
      return {
        id: m.id,
        nombre: m.nombre,
        rol: m.rol,
        estado: 'ausente' as const,
        hora: null,
        distancia: null,
      };
    }

    const fechaRegistro = new Date(reg.registrado_en);
    const horas = fechaRegistro.getHours();
    const minutos = fechaRegistro.getMinutes();
    const minutosTotales = horas * 60 + minutos;

    let estadoCalculado: 'a_tiempo' | 'tardanza' | 'falta' = 'a_tiempo';
    if (minutosTotales <= 855) {
      estadoCalculado = 'a_tiempo';
    } else if (minutosTotales < 885) {
      estadoCalculado = 'tardanza';
    } else {
      estadoCalculado = 'falta';
    }

    return {
      id: m.id,
      nombre: m.nombre,
      rol: m.rol,
      estado: estadoCalculado,
      hora: fechaRegistro.toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      distancia: reg.distancia_metros,
    };
  });

  // 5. Tareas y materiales
  const { data: todasLasTareas } = await supabase
    .from('tareas_jornada')
    .select('*')
    .eq('jornada_id', id);

  const tareasVisibles = esCoordinador
    ? todasLasTareas || []
    : (todasLasTareas || []).filter((t) => {
        const asignados: string[] = t.asignados_a || (t.asignado_a ? [t.asignado_a] : []);
        return asignados.includes(user.id);
      });
  const { data: materiales } = await supabase
    .from('catalogo_materiales')
    .select('*')
    .order('nombre');

  // 6. Bitácora de comentarios
  const { data: comentarios } = await supabase
    .from('comentarios_cierre')
    .select(`
      id,
      comentario,
      creado_en,
      perfiles:usuario_id ( nombre, rol )
    `)
    .eq('jornada_id', id)
    .order('creado_en', { ascending: false });

  return (
    <div className="min-h-screen bg-[#F4F3EF] text-[#211B20] font-sans selection:bg-[#07833F]/15 selection:text-[#07833F] pb-20">
      {/* Top Header / Breadcrumbs & Selector de Fase */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-20 px-4 sm:px-8 py-2.5 shadow-2xs">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <nav aria-label="Migas de pan" className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 hover:text-[#211B20] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#07833F] rounded transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Dashboard</span>
            </Link>
            <span className="text-slate-300" aria-hidden="true">/</span>
            <span className="text-xs font-bold text-[#211B20] tracking-tight">
              Jornada {jornada.fecha}
            </span>
          </nav>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden sm:inline">
              Fase Operativa:
            </span>
            {esCoordinador ? (
              <div className="inline-flex bg-slate-100/90 p-0.5 rounded-lg border border-slate-200/70">
                {(['planificacion', 'en_curso', 'finalizada'] as const).map((est) => (
                  <form key={est} action={cambiarEstadoJornada.bind(null, jornada.id, est)}>
                    <button
                      type="submit"
                      className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#07833F] ${
                        jornada.estado === est
                          ? est === 'en_curso'
                            ? 'bg-[#07833F] text-white shadow-2xs'
                            : est === 'planificacion'
                            ? 'bg-[#E0B84F] text-[#211B20] shadow-2xs'
                            : 'bg-[#211B20] text-white shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                      }`}
                    >
                      {est.replace('_', ' ')}
                    </button>
                  </form>
                ))}
              </div>
            ) : (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                  jornada.estado === 'en_curso'
                    ? 'bg-[#07833F]/10 text-[#07833F] border border-[#07833F]/20'
                    : jornada.estado === 'planificacion'
                    ? 'bg-[#E0B84F]/15 text-[#9a761e] border border-[#E0B84F]/30'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {jornada.estado.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        {/* 1. Ficha Resumen Operativa */}
        <section className="bg-white border border-slate-200/80 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
          {esCoordinador ? (
            <details className="group">
              <summary className="flex flex-wrap sm:flex-nowrap justify-between items-center cursor-pointer list-none p-5 hover:bg-slate-50/60 transition-colors">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 w-full">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Fecha Operativa
                    </span>
                    <span className="text-xs font-bold text-[#211B20]">{jornada.fecha}</span>
                  </div>

                  <div className="flex flex-col col-span-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Ponente / Charlista
                    </span>
                    <span className="text-xs font-bold text-[#211B20] truncate">{jornada.ponente}</span>
                    {jornada.dinamica_apertura && (
                      <span className="text-[11px] text-slate-500 truncate mt-0.5">
                        {jornada.dinamica_apertura}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:items-end justify-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Identificador
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      #{jornada.id.slice(0, 8)}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 mt-4 sm:mt-0 sm:ml-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200/90 bg-white group-hover:bg-slate-50 text-[11px] font-semibold text-slate-700 transition-colors shadow-2xs">
                    <Settings className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                    <span>Ajustes</span>
                  </span>
                </div>
              </summary>

              <form action={actualizarDatosJornada} className="p-5 border-t border-slate-100 bg-slate-50/50 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <input type="hidden" name="jornadaId" value={jornada.id} />
                <div className="space-y-1">
                  <label htmlFor="fecha" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Fecha Operativa
                  </label>
                  <input
                    id="fecha"
                    type="date"
                    name="fecha"
                    defaultValue={jornada.fecha}
                    required
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-[#211B20] focus:ring-2 focus:ring-[#07833F]"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="ponente" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Ponente / Charlista
                  </label>
                  <input
                    id="ponente"
                    type="text"
                    name="ponente"
                    defaultValue={jornada.ponente}
                    required
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-[#211B20] focus:ring-2 focus:ring-[#07833F]"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="dinamica" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Dinámica de Apertura
                  </label>
                  <input
                    id="dinamica"
                    type="text"
                    name="dinamica"
                    defaultValue={jornada.dinamica_apertura || ''}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-[#211B20] focus:ring-2 focus:ring-[#07833F]"
                  />
                </div>

                <div className="sm:col-span-3 flex flex-col-reverse sm:flex-row justify-between items-center gap-3 pt-3 border-t border-slate-200/60 mt-1">
                  <button
                    formAction={eliminarJornada}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar Jornada</span>
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-5 py-2 bg-[#211B20] hover:bg-black text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors shadow-2xs cursor-pointer"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </details>
          ) : (
            <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Fecha Operativa</span>
                <span className="text-xs font-bold text-[#211B20]">{jornada.fecha}</span>
              </div>
              <div className="flex flex-col col-span-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Ponente / Charlista</span>
                <span className="text-xs font-bold text-[#211B20] truncate">{jornada.ponente}</span>
              </div>
              <div className="flex flex-col sm:items-end justify-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Identificador</span>
                <span className="text-[11px] font-mono text-slate-500">#{jornada.id.slice(0, 8)}</span>
              </div>
            </div>
          )}
        </section>

        {/* 2. REPORTE DE ASISTENCIA Y PUNTUALIDAD (Estilo Holded / Excel) */}
        {esCoordinador && (
          <section className="bg-white border border-slate-200/80 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#07833F]" aria-hidden="true" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Control de Asistencia del Equipo
                </h2>
                <span className="text-[10px] text-slate-400 font-medium">
                  (P ≤ 2:15 PM | T &lt; 2:45 PM | F ≥ 2:45 PM)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#07833F]/10 text-[#07833F] border border-[#07833F]/20">
                  {reporteMiembros.filter((m) => m.estado !== 'ausente' && m.estado !== 'falta').length}/{reporteMiembros.length} Presentes
                </span>
              </div>
            </div>

            {/* Tabla Semántica: Perfecta para copiar y pegar en Excel */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-5">Miembro</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4">Hora de Marcado</th>
                    <th className="py-3 px-4 text-right">Distancia GPS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {reporteMiembros.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-5 font-semibold text-[#211B20]">
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {m.nombre.charAt(0).toUpperCase()}
                          </div>
                          <span>{m.nombre}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {m.estado === 'a_tiempo' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-[#07833F]/10 text-[#07833F] border border-[#07833F]/20">
                            <CheckCircle2 className="w-3 h-3" /> A Tiempo (P)
                          </span>
                        )}
                        {m.estado === 'tardanza' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-[#E0B84F]/15 text-[#9a761e] border border-[#E0B84F]/30">
                            <ClockAlert className="w-3 h-3" /> Tardanza (T)
                          </span>
                        )}
                        {m.estado === 'falta' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-300">
                            <AlertTriangle className="w-3 h-3" /> Falta (F)
                          </span>
                        )}
                        {m.estado === 'ausente' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                            <XCircle className="w-3 h-3" /> Sin Marcar
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                        {m.hora || '—'}
                      </td>

                      <td className="py-3 px-4 text-right text-slate-500 font-mono text-[11px]">
                        {m.distancia !== null ? `${m.distancia} m` : '—'}
                      </td>
                    </tr>
                  ))}

                  {reporteMiembros.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-xs text-slate-400">
                        No hay miembros registrados en el sistema.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* 3. Módulos de Verificación / Checklists de Cajas */}
        {(esCoordinador || tareasVisibles.length > 0) && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight text-[#211B20] uppercase">
                  {esCoordinador ? 'Gestión y Verificación de Cajas' : 'Cajas Asignadas a Mi Cargo'}
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 bg-slate-200/70 text-slate-700 rounded-md">
                  {tareasVisibles.length}
                </span>
              </div>
            </div>

            {tareasVisibles.length > 0 ? (
              <div className="space-y-4">
                {tareasVisibles.map((tarea) => {
                  const mats = (materiales || []).filter((m) => m.tipo_caja === tarea.tipo_caja);
                  return (
                    <ChecklistCaja
                      key={tarea.id}
                      tarea={tarea}
                      materiales={mats}
                      jornadaId={jornada.id}
                      esCoordinador={esCoordinador}
                      miembros={miembros}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="p-10 text-center bg-white border border-dashed border-slate-200/90 rounded-xl space-y-2">
                <Inbox className="w-7 h-7 mx-auto text-slate-400" aria-hidden="true" />
                <p className="font-bold text-xs text-[#211B20]">Sin tareas asignadas</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  No tienes cajas asignadas para esta jornada.
                </p>
              </div>
            )}
          </section>
        )}

        {/* 4. Bitácora de Observaciones */}
        <section className="bg-white border border-slate-200/80 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-slate-500" aria-hidden="true" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Bitácora de Incidencias
              </h3>
            </div>
            {esCoordinador && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#07833F] bg-[#07833F]/10 px-2 py-0.5 rounded border border-[#07833F]/20">
                <ShieldCheck className="w-3 h-3" /> Supervisión Activa
              </span>
            )}
          </div>

          <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
            {comentarios && comentarios.length > 0 ? (
              comentarios.map((c: any) => {
                const autor = Array.isArray(c.perfiles) ? c.perfiles[0] : c.perfiles;
                return (
                  <div key={c.id} className="p-4 hover:bg-slate-50/40 transition-colors">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#211B20]">{autor?.nombre || 'Operador'}</span>
                        <span className="text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/60">
                          {autor?.rol || 'miembro'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(c.creado_en).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{c.comentario}</p>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs font-medium">
                No hay observaciones registradas.
              </div>
            )}
          </div>

          {!esCoordinador ? (
            <div className="p-3 bg-slate-50/80 border-t border-slate-100">
              <form action={agregarComentarioCierre} className="flex gap-2">
                <input type="hidden" name="jornadaId" value={jornada.id} />
                <input
                  type="text"
                  name="comentario"
                  required
                  placeholder="Registrar incidencia operativa..."
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-[#211B20] focus:ring-2 focus:ring-[#07833F]"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#211B20] hover:bg-black text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors shadow-2xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Registrar</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="px-4 py-2.5 bg-slate-50/60 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-400 font-medium">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Los miembros del equipo registran novedades operativas desde su vista.</span>
            </div>
          )}
        </section>

        {esCoordinador && <SupervisorRealtime jornadaId={jornada.id} fechaJornada={jornada.fecha} />}
      </main>
    </div>
  );
}
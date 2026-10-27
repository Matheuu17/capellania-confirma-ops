import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import ChecklistCaja from './checklist-caja';
import SupervisorRealtime from './supervisor-realtime';
import { agregarComentarioCierre, actualizarDatosJornada, cambiarEstadoJornada } from './actions';
import { ArrowLeft, Calendar, MessageSquare, Send, Settings, ShieldCheck, Info, Inbox } from 'lucide-react';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function JornadaDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
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

  // 2. Obtener lista de miembros para asignación
  const { data: perfiles } = await supabase
    .from('perfiles')
    .select('id, nombre')
    .eq('rol', 'miembro')
    .order('nombre');

  const miembros = perfiles || [];

  // 3. Obtener tareas y filtrar por asignación si es miembro
  const { data: todasLasTareas } = await supabase
    .from('tareas_jornada')
    .select('*')
    .eq('jornada_id', id);

  const tareasVisibles = esCoordinador
    ? (todasLasTareas || [])
    : (todasLasTareas || []).filter((t) => t.asignado_a === user.id);

  const { data: materiales } = await supabase
    .from('catalogo_materiales')
    .select('*')
    .order('nombre');

  // 4. Obtener comentarios
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
    <div className="min-h-screen bg-[#F4F3EF] text-[#211B20] font-sans pb-16">
      {/* Navegación Superior */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-10 px-4 py-3 sm:px-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#211B20] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al Panel</span>
          </Link>

          {/* Selector de Estado de Jornada */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">Estado:</span>
            {esCoordinador ? (
              <div className="flex bg-[#F4F3EF] p-1 rounded-xl border border-slate-200 gap-1 text-xs font-semibold">
                {(['planificacion', 'en_curso', 'finalizada'] as const).map((est) => (
                  <form key={est} action={cambiarEstadoJornada.bind(null, jornada.id, est)}>
                    <button
                      type="submit"
                      className={`px-3 py-1 rounded-lg capitalize transition-colors cursor-pointer ${
                        jornada.estado === est
                          ? est === 'en_curso'
                            ? 'bg-[#07833F] text-white shadow-xs'
                            : est === 'planificacion'
                            ? 'bg-[#E0B84F] text-[#211B20] shadow-xs'
                            : 'bg-[#211B20] text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {est.replace('_', ' ')}
                    </button>
                  </form>
                ))}
              </div>
            ) : (
              <span className="text-xs uppercase tracking-wider font-bold px-2.5 py-1 rounded bg-[#07833F]/10 text-[#07833F] border border-[#07833F]/20">
                {jornada.estado.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-5xl mx-auto px-4 pt-6 space-y-6">
        
        {/* Ficha Resumen */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          {esCoordinador ? (
            <details className="group">
              <summary className="flex justify-between items-center cursor-pointer list-none">
                <div>
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
                    <Calendar className="w-4 h-4 text-[#07833F]" />
                    <span>Fecha: {jornada.fecha}</span>
                  </div>
                  <h1 className="text-xl font-bold text-[#211B20]">
                    Charlista / Ponente: {jornada.ponente}
                  </h1>
                  {jornada.dinamica_apertura && (
                    <p className="text-sm text-slate-600 mt-1">
                      <span className="font-semibold text-[#211B20]">Dinámica:</span> {jornada.dinamica_apertura}
                    </p>
                  )}
                </div>
                <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 group-open:bg-slate-200 text-slate-700">
                  <Settings className="w-3.5 h-3.5" />
                  Editar Datos
                </span>
              </summary>

              <form action={actualizarDatosJornada} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 mt-4 border-t border-slate-100">
                <input type="hidden" name="jornadaId" value={jornada.id} />
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Fecha</label>
                  <input
                    type="date"
                    name="fecha"
                    defaultValue={jornada.fecha}
                    required
                    className="w-full px-3 py-2 bg-[#F4F3EF]/60 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Ponente</label>
                  <input
                    type="text"
                    name="ponente"
                    defaultValue={jornada.ponente}
                    required
                    className="w-full px-3 py-2 bg-[#F4F3EF]/60 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Dinámica</label>
                  <input
                    type="text"
                    name="dinamica"
                    defaultValue={jornada.dinamica_apertura || ''}
                    className="w-full px-3 py-2 bg-[#F4F3EF]/60 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div className="sm:col-span-3 flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#07833F] hover:bg-[#066e35] text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </details>
          ) : (
            <div>
              <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
                <Calendar className="w-4 h-4 text-[#07833F]" />
                <span>Fecha: {jornada.fecha}</span>
              </div>
              <h1 className="text-xl font-bold text-[#211B20]">
                Charlista / Ponente: {jornada.ponente}
              </h1>
              {jornada.dinamica_apertura && (
                <p className="text-sm text-slate-600 mt-1">
                  <span className="font-semibold text-[#211B20]">Dinámica:</span> {jornada.dinamica_apertura}
                </p>
              )}
            </div>
          )}
        </section>

        {/* Checklists por Cajas (Filtradas para Miembros) */}
        <section className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-[#211B20]">
              {esCoordinador ? 'Logística General de Cajas' : 'Mis Cajas Asignadas'}
            </h2>
          </div>

          {tareasVisibles.length > 0 ? (
            tareasVisibles.map((tarea) => {
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
            })
          ) : (
            <div className="p-8 text-center bg-white border border-dashed border-slate-200 rounded-2xl space-y-2">
              <Inbox className="w-8 h-8 mx-auto text-slate-400" />
              <p className="font-bold text-sm text-[#211B20]">No tienes cajas asignadas</p>
              <p className="text-xs text-slate-500">
                El coordinador de pastoral aún no te ha asignado una caja para esta jornada.
              </p>
            </div>
          )}
        </section>

        {/* Bitácora de Observaciones */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#211B20] flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#07833F]" />
              Reportes y Feedback del Equipo
            </h3>
            {esCoordinador && (
              <span className="flex items-center gap-1.5 text-xs text-slate-500 bg-[#F4F3EF] px-2.5 py-1 rounded-lg border border-slate-200">
                <ShieldCheck className="w-3.5 h-3.5 text-[#07833F]" />
                Modo Coordinador (Supervisión)
              </span>
            )}
          </div>

          <div className="space-y-3">
            {comentarios && comentarios.length > 0 ? (
              comentarios.map((c: any) => {
                const autor = Array.isArray(c.perfiles) ? c.perfiles[0] : c.perfiles;
                return (
                  <div key={c.id} className="p-4 bg-[#F4F3EF]/60 rounded-xl border border-slate-200 text-sm space-y-1">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#211B20]">
                          {autor?.nombre || 'Miembro del equipo'}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-medium capitalize">
                          {autor?.rol || 'miembro'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {new Date(c.creado_en).toLocaleDateString([], { day: '2-digit', month: 'short' })} ·{' '}
                        {new Date(c.creado_en).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-700 leading-relaxed">{c.comentario}</p>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center bg-[#F4F3EF]/40 border border-dashed border-slate-200 rounded-xl text-slate-500 text-xs">
                Aún no hay reportes registrados para esta jornada.
              </div>
            )}
          </div>

          {!esCoordinador ? (
            <form action={agregarComentarioCierre} className="pt-2 flex gap-2">
              <input type="hidden" name="jornadaId" value={jornada.id} />
              <input
                type="text"
                name="comentario"
                required
                placeholder="Escribe una observación, faltante o sugerencia sobre la logística..."
                className="flex-1 px-3.5 py-2.5 bg-[#F4F3EF]/60 border border-slate-200 rounded-xl text-[#211B20] placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#07833F]"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-[#07833F] hover:bg-[#066e35] text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Enviar</span>
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>Los miembros asignados pueden registrar reportes de faltantes o incidencias.</span>
            </div>
          )}
        </section>

        {/* Supervisor en Tiempo Real */}
        {esCoordinador && (
          <SupervisorRealtime
            jornadaId={jornada.id}
            fechaJornada={jornada.fecha}
          />
        )}
      </main>
    </div>
  );
}
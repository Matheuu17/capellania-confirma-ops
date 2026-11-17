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
  agregarCajaAJornada,
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
  Plus,
  RotateCcw,
  Package,
  UserCheck,
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

  // 2. Obtener lista de miembros para asignación y control de asistencia
  const { data: perfiles } = await supabase
    .from('perfiles')
    .select('id, nombre, rol')
    .eq('rol', 'miembro')
    .order('nombre');

  const miembros = perfiles || [];

  // 3. Obtener asistencias registradas
  const { data: asistenciasRaw } = await supabase
    .from('asistencias')
    .select('usuario_id, registrado_en, distancia_metros')
    .eq('jornada_id', id);

  const mapaAsistencias = new Map(
    (asistenciasRaw || []).map((a) => [a.usuario_id, a])
  );

  // 4. Mapear estado de asistencia con las 3 reglas operativas:
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

  const presentesCount = reporteMiembros.filter(
    (m) => m.estado !== 'ausente' && m.estado !== 'falta'
  ).length;
  const porcentajeAsistencia =
    reporteMiembros.length > 0
      ? Math.round((presentesCount / reporteMiembros.length) * 100)
      : 0;

  // 5. Tareas y materiales
  const { data: todasLasTareas } = await supabase
    .from('tareas_jornada')
    .select('*')
    .eq('jornada_id', id);

  const tareasVisibles = esCoordinador
    ? todasLasTareas || []
    : (todasLasTareas || []).filter((t) => {
        const asignados: string[] =
          t.asignados_a || (t.asignado_a ? [t.asignado_a] : []);
        return asignados.includes(user.id);
      });

  const { data: materiales } = await supabase
    .from('catalogo_materiales')
    .select('*')
    .order('nombre');

  const tiposExistentes = new Set(
    (todasLasTareas || []).map((t) => t.tipo_caja)
  );
  const cajasFaltantes = (['interna', 'externa', 'agape'] as const).filter(
    (tipo) => !tiposExistentes.has(tipo)
  );

  // 6. Bitácora de comentarios del equipo
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

  const estaCancelada = jornada.estado === 'cancelada';

  // Parsear fecha local sin desfase UTC
  const [year, month, day] = jornada.fecha.split('-').map(Number);
  const fechaObj = new Date(year, month - 1, day);
  const mesAbrev = fechaObj
    .toLocaleDateString('es-PE', { month: 'short' })
    .replace('.', '');
  const diaNum = fechaObj.getDate();

  const ponentePendiente =
    !jornada.ponente ||
    jornada.ponente.toLowerCase().includes('confirmar') ||
    jornada.ponente.trim().length <= 2;

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-[#1F1A17] font-sans pb-20 selection:bg-[#DDF4E4] selection:text-[#0B8A43]">
      
      {/* ⚠️ Banner de Jornada Cancelada */}
      {estaCancelada && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 sm:px-8 py-3 text-rose-800 text-xs">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                <strong>Jornada cancelada o en archivo.</strong> Las asistencias y cajas quedan deshabilitadas.
              </span>
            </div>
            {esCoordinador && (
              <form action={cambiarEstadoJornada.bind(null, jornada.id, 'planificacion')}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-rose-300 hover:bg-rose-100/60 rounded-md text-[11px] font-bold uppercase tracking-wider text-rose-700 transition-colors cursor-pointer shadow-2xs"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restaurar a Planificación</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Barra de Navegación Superior */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-20 px-4 sm:px-8 py-3 shadow-2xs">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <nav aria-label="Navegación de retorno" className="flex items-center gap-2 text-xs font-medium text-[#667085]">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 hover:text-[#1F1A17] rounded transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Jornadas</span>
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-bold text-[#1F1A17]">
              Jornada {jornada.fecha}
            </span>
          </nav>

          {/* Selector de Fase Operativa */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#667085] hidden sm:inline">
              Fase:
            </span>
            {esCoordinador && !estaCancelada ? (
              <div className="inline-flex bg-[#FAFAF7] p-0.5 rounded-xl border border-slate-200/80">
                {(['planificacion', 'en_curso', 'finalizada'] as const).map((est) => (
                  <form key={est} action={cambiarEstadoJornada.bind(null, jornada.id, est)}>
                    <button
                      type="submit"
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        jornada.estado === est
                          ? est === 'en_curso'
                            ? 'bg-[#0B8A43] text-white shadow-2xs'
                            : est === 'planificacion'
                            ? 'bg-[#FFF4D6] text-[#D9A321] border border-[#D9A321]/30 font-extrabold'
                            : 'bg-[#1F1A17] text-white shadow-2xs'
                          : 'text-[#667085] hover:text-[#1F1A17] hover:bg-slate-100'
                      }`}
                    >
                      {est.replace('_', ' ')}
                    </button>
                  </form>
                ))}
              </div>
            ) : (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                  jornada.estado === 'en_curso'
                    ? 'bg-[#DDF4E4] text-[#0B8A43] border-[#0B8A43]/20'
                    : jornada.estado === 'planificacion'
                    ? 'bg-[#FFF4D6] text-[#D9A321] border-[#D9A321]/30'
                    : jornada.estado === 'cancelada'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {jornada.estado.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        
        {/* 1. CABECERA HERO OPERATIVA */}
        <section className="bg-white rounded-3xl p-6 sm:p-7 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-5">
              {/* Ticket Negro Institucional */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#1F1A17] text-white flex flex-col items-center justify-center shrink-0 shadow-xs">
                <span className="text-[10px] font-bold uppercase text-[#0B8A43] tracking-widest leading-none mb-1">
                  {mesAbrev}
                </span>
                <span className="text-xl sm:text-2xl font-bold leading-none">
                  {diaNum}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-400">
                    #{jornada.id.slice(0, 8)}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs text-[#667085]">
                    {tareasVisibles.length} {tareasVisibles.length === 1 ? 'caja activa' : 'cajas activas'}
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl font-bold text-[#1F1A17] tracking-tight">
                  Jornada del {fechaObj.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}
                </h1>

                <div className="pt-1 flex flex-wrap items-center gap-2.5">
                  {ponentePendiente ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#FFF4D6] text-[#D9A321] border border-[#D9A321]/30">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Ponente por confirmar
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-[#1F1A17]">
                      Ponente: {jornada.ponente}
                    </span>
                  )}

                  {jornada.dinamica_apertura && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs text-[#667085]">
                        Dinámica: {jornada.dinamica_apertura}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Ajustes del Coordinador */}
            {esCoordinador && (
              <details className="group self-start md:self-center relative">
                <summary className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FAFAF7] hover:bg-slate-100 border border-slate-200/80 rounded-xl text-xs font-semibold text-[#1F1A17] transition-colors cursor-pointer select-none">
                  <Settings className="w-3.5 h-3.5 text-[#667085]" />
                  <span>Ajustes</span>
                </summary>

                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl p-5 z-30 animate-in zoom-in-95 duration-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#1F1A17] mb-3 pb-2 border-b border-slate-100">
                    Modificar datos de la jornada
                  </h3>

                  <form action={actualizarDatosJornada} className="space-y-3.5">
                    <input type="hidden" name="jornadaId" value={jornada.id} />
                    
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-[#667085]">Fecha Operativa</label>
                      <input
                        type="date"
                        name="fecha"
                        defaultValue={jornada.fecha}
                        required
                        className="w-full px-3 py-1.5 bg-[#FAFAF7] border border-slate-200 rounded-lg text-xs text-[#1F1A17] outline-none focus:ring-2 focus:ring-[#0B8A43]/20 focus:border-[#0B8A43]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-[#667085]">Ponente / Charlista</label>
                      <input
                        type="text"
                        name="ponente"
                        defaultValue={jornada.ponente}
                        required
                        className="w-full px-3 py-1.5 bg-[#FAFAF7] border border-slate-200 rounded-lg text-xs text-[#1F1A17] outline-none focus:ring-2 focus:ring-[#0B8A43]/20 focus:border-[#0B8A43]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-[#667085]">Dinámica de Apertura</label>
                      <input
                        type="text"
                        name="dinamica"
                        defaultValue={jornada.dinamica_apertura || ''}
                        className="w-full px-3 py-1.5 bg-[#FAFAF7] border border-slate-200 rounded-lg text-xs text-[#1F1A17] outline-none focus:ring-2 focus:ring-[#0B8A43]/20 focus:border-[#0B8A43]"
                      />
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="submit"
                        formAction={eliminarJornada}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Cancelar fecha</span>
                      </button>

                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-[#0B8A43] hover:bg-[#097337] text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer shadow-2xs"
                      >
                        Guardar
                      </button>
                    </div>
                  </form>
                </div>
              </details>
            )}
          </div>
        </section>

        {/* 2. ASISTENCIA VIVA DEL EQUIPO (Visible con Barra de Progreso) */}
        {esCoordinador && (
          <section className="bg-white rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-slate-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#0B8A43]" />
                <h2 className="text-sm font-bold text-[#1F1A17]">
                  Asistencia presencial del equipo
                </h2>
              </div>
              
              <span className="text-xs font-bold text-[#1F1A17]">
                {presentesCount} de {reporteMiembros.length} presentes ({porcentajeAsistencia}%)
              </span>
            </div>

            {/* Barra de progreso visual continua */}
            <div className="w-full bg-[#F4F3EF] h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  porcentajeAsistencia === 100
                    ? 'bg-[#0B8A43]'
                    : porcentajeAsistencia > 0
                    ? 'bg-[#D9A321]'
                    : 'bg-transparent'
                }`}
                style={{ width: `${porcentajeAsistencia}%` }}
              />
            </div>

            {/* Desglose colapsable / accesible */}
            <details className="group pt-1">
              <summary className="text-xs font-semibold text-[#0B8A43] hover:underline cursor-pointer select-none">
                Ver detalle de marcaciones por miembro
              </summary>

              <div className="mt-3 overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#FAFAF7] border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-[#667085]">
                      <th className="py-2.5 px-4">Miembro</th>
                      <th className="py-2.5 px-3">Estado</th>
                      <th className="py-2.5 px-3">Hora</th>
                      <th className="py-2.5 px-4 text-right">Distancia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reporteMiembros.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-[#1F1A17]">
                          {m.nombre}
                        </td>
                        <td className="py-2.5 px-3">
                          {m.estado === 'a_tiempo' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#DDF4E4] text-[#0B8A43] font-semibold text-[10px]">
                              <CheckCircle2 className="w-3 h-3" /> A Tiempo
                            </span>
                          )}
                          {m.estado === 'tardanza' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#FFF4D6] text-[#D9A321] font-semibold text-[10px]">
                              <ClockAlert className="w-3 h-3" /> Tardanza
                            </span>
                          )}
                          {m.estado === 'falta' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-semibold text-[10px]">
                              <AlertTriangle className="w-3 h-3" /> Falta
                            </span>
                          )}
                          {m.estado === 'ausente' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-medium text-[10px]">
                              <XCircle className="w-3 h-3" /> Sin Marcar
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[#667085] font-mono text-[11px]">
                          {m.hora || '—'}
                        </td>
                        <td className="py-2.5 px-4 text-right text-[#667085] font-mono text-[11px]">
                          {m.distancia !== null ? `${m.distancia} m` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>
        )}

        {/* 3. MÓDULOS DE VERIFICACIÓN / CHECKLISTS DE CAJAS */}
        {(esCoordinador || tareasVisibles.length > 0) && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-[#1F1A17]" />
                <h2 className="text-base font-bold tracking-tight text-[#1F1A17]">
                  {esCoordinador ? 'Gestión y verificación de cajas' : 'Cajas asignadas a mi cargo'}
                </h2>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-[#DDF4E4] text-[#0B8A43]">
                  {tareasVisibles.length} activas
                </span>
              </div>

              {/* Botones para añadir cajas faltantes */}
              {esCoordinador && cajasFaltantes.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-[#667085]">
                    Añadir caja:
                  </span>
                  {cajasFaltantes.map((tipo) => (
                    <form key={tipo} action={agregarCajaAJornada.bind(null, tipo, jornada.id)}>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-lg text-xs font-semibold text-[#1F1A17] transition-colors cursor-pointer shadow-2xs"
                      >
                        <Plus className="w-3 h-3 text-[#0B8A43]" />
                        <span className="capitalize">{tipo}</span>
                      </button>
                    </form>
                  ))}
                </div>
              )}
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
              <div className="p-10 text-center bg-white border border-dashed border-slate-200 rounded-2xl space-y-2">
                <Inbox className="w-7 h-7 mx-auto text-slate-300" />
                <p className="font-bold text-xs text-[#1F1A17]">Sin cajas asignadas</p>
                <p className="text-[11px] text-[#667085] max-w-sm mx-auto">
                  {esCoordinador
                    ? 'No hay cajas habilitadas para esta jornada. Utiliza los botones superiores para activar una.'
                    : 'No tienes cajas asignadas para esta jornada.'}
                </p>
              </div>
            )}
          </section>
        )}

        {/* 4. BITÁCORA: OBSERVACIONES DEL EQUIPO AL COORDINADOR */}
        <section className="bg-white rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-slate-100 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#D9A321]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1F1A17]">
                Bitácora y observaciones de la jornada
              </h3>
            </div>
            {esCoordinador && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#0B8A43] bg-[#DDF4E4] px-2 py-0.5 rounded-md border border-[#0B8A43]/20">
                <ShieldCheck className="w-3 h-3" /> Supervisión Activa
              </span>
            )}
          </div>

          {/* Formulario de Comentario */}
          <div className="p-3 bg-[#FAFAF7] rounded-xl border border-slate-100">
            <form action={agregarComentarioCierre} className="flex gap-2">
              <input type="hidden" name="jornadaId" value={jornada.id} />
              <input
                type="text"
                name="comentario"
                required
                placeholder="Escribe una observación, falta de material o nota operativa..."
                className="flex-1 px-3.5 py-2 bg-white border border-slate-200/90 rounded-xl text-xs text-[#1F1A17] focus:ring-2 focus:ring-[#0B8A43]/20 focus:border-[#0B8A43] outline-none transition-colors"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0B8A43] hover:bg-[#097337] active:bg-[#075f2d] text-white rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer shadow-2xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Enviar</span>
              </button>
            </form>
          </div>

          {/* Listado de Comentarios */}
          <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto">
            {comentarios && comentarios.length > 0 ? (
              comentarios.map((c: any) => {
                const autor = Array.isArray(c.perfiles) ? c.perfiles[0] : c.perfiles;
                return (
                  <div key={c.id} className="py-3 px-1 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#1F1A17]">
                          {autor?.nombre || 'Operador'}
                        </span>
                        <span className="text-[10px] uppercase font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-[#667085]">
                          {autor?.rol || 'miembro'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(c.creado_en).toLocaleTimeString('es-PE', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-[#667085] leading-relaxed">
                      {c.comentario}
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                Sin observaciones registradas todavía. Cualquier miembro del equipo puede escribir notas aquí.
              </div>
            )}
          </div>
        </section>

        {/* Realtime Supervisor (exclusivo coordinador) */}
        {esCoordinador && (
          <SupervisorRealtime jornadaId={jornada.id} fechaJornada={jornada.fecha} />
        )}

        {/* Frase Manuscrita de Cierre */}
        <div className="text-center pt-6">
          <span className="font-[family-name:var(--font-handwritten)] text-[18px] text-stone-400 select-none">
            “La fe también se organiza”
          </span>
        </div>
      </main>
    </div>
  );
}
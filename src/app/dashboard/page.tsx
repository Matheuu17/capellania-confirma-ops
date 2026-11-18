import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { crearJornada } from './actions';
import {
  Plus,
  Package,
  ChevronRight,
  ArrowRight,
  Bell,
  Leaf,
  Calendar,
} from 'lucide-react';

interface Props {
  searchParams: Promise<{ estado?: string }>;
}

export default async function DashboardPage({ searchParams }: Props) {
  const { estado: filtroEstado = 'activas' } = await searchParams;
  const supabase = await createClient();

  // 1. Autenticación y perfil
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('nombre, rol')
    .eq('id', user.id)
    .single();

  const esCoordinador = perfil?.rol === 'coordinador';
  const nombreUsuario = perfil?.nombre?.split(' ')[0] || 'Matías';

  // 2. Consulta de jornadas
  const { data: jornadasRaw } = await supabase
    .from('jornadas')
    .select(`
      *,
      tareas_jornada ( id, tipo_caja, estado, asignados_a, materiales_verificados )
    `)
    .order('fecha', { ascending: false });

  const todasLasJornadas = jornadasRaw || [];

  // 3. Helper para parsear fechas sin desfase de zona horaria (UTC)
  const parsearFechaLocal = (fechaStr: string) => {
    const [year, month, day] = fechaStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const fechaHoy = new Date();
  fechaHoy.setHours(0, 0, 0, 0);
  const fechaHoyStr = fechaHoy.toISOString().split('T')[0];

  // Identificar la próxima jornada
  const proximasJornadas = [...todasLasJornadas]
    .filter((j) => j.estado !== 'cancelada' && j.estado !== 'finalizada' && j.fecha >= fechaHoyStr)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  const proximaJornada = proximasJornadas[0] || null;

  // Días restantes exactos
  let diasRestantes = 0;
  if (proximaJornada) {
    const fechaObj = parsearFechaLocal(proximaJornada.fecha);
    const diffMs = fechaObj.getTime() - fechaHoy.getTime();
    diasRestantes = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  // Alertas operativas
  const jornadasSinPonente = todasLasJornadas.filter(
    (j) => j.estado !== 'cancelada' && (!j.ponente || j.ponente.toLowerCase().includes('confirmar') || j.ponente.trim().length <= 2)
  ).length;

  let totalCajasPendientes = 0;
  let totalJornadasListas = 0;

  todasLasJornadas.forEach((j) => {
    if (j.estado === 'cancelada') return;
    const tareas = j.tareas_jornada || [];
    const completadas = tareas.filter((t: any) => t.estado === 'completado').length;
    totalCajasPendientes += tareas.length - completadas;
    if (tareas.length > 0 && completadas === tareas.length) totalJornadasListas++;
  });

  // 4. Filtrado en memoria para la tabla
  const jornadasFiltradas = todasLasJornadas.filter((j) => {
    if (filtroEstado === 'canceladas') return j.estado === 'cancelada';
    if (filtroEstado === 'finalizadas') return j.estado === 'finalizada';
    if (filtroEstado === 'planificacion') return j.estado === 'planificacion';
    if (filtroEstado === 'en_curso') return j.estado === 'en_curso';
    return j.estado !== 'cancelada';
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-6">
      
      {/* 1. Header con Saludo y Botón */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1F1A17]">
            Jornadas
          </h1>
          <p className="text-[13px] text-[#667085] mt-0.5">
            Coordinación de recursos, materiales y acompañamiento pastoral.
          </p>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-2 text-right">
              <Leaf className="w-4 h-4 text-[#0B8A43]" />
              <div className="flex flex-col leading-tight">
                <span className="text-xs font-bold text-[#1F1A17]">¡Buenos días, {nombreUsuario}!</span>
                <span className="text-[11px] text-[#667085]">Seguimos sirviendo</span>
              </div>
            </div>

            {esCoordinador && (
              <details className="group relative z-30">
                <summary className="list-none inline-flex items-center gap-2 px-4 py-2 bg-[#0B8A43] hover:bg-[#097337] text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer shadow-xs select-none">
                  <Plus className="w-4 h-4 transition-transform duration-200 group-open:rotate-45" />
                  <span>Nueva Jornada</span>
                </summary>

                {/* Formulario Flotante */}
                <div className="absolute right-0 mt-2 w-84 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-2xl p-5 origin-top-right animate-in zoom-in-95 duration-150">
                  <h2 className="text-xs font-bold text-[#1F1A17] mb-3 pb-2 border-b border-slate-100 uppercase tracking-wider">
                    Programar Nueva Jornada
                  </h2>
                  <form action={crearJornada} className="space-y-3.5">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-[#667085]">Fecha Operativa</label>
                      <input name="fecha" type="date" required className="w-full px-3 py-1.5 bg-[#FAFAF7] border border-slate-200 rounded-lg text-xs text-[#1F1A17] focus:ring-2 focus:ring-[#0B8A43]/20 focus:border-[#0B8A43] outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-[#667085]">Ponente / Charlista</label>
                      <input name="ponente" type="text" required placeholder="Ej. Padre Juan / Por confirmar" className="w-full px-3 py-1.5 bg-[#FAFAF7] border border-slate-200 rounded-lg text-xs text-[#1F1A17] focus:ring-2 focus:ring-[#0B8A43]/20 focus:border-[#0B8A43] outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-[#667085]">Dinámica de Apertura</label>
                      <input name="dinamica" type="text" placeholder="Opcional" className="w-full px-3 py-1.5 bg-[#FAFAF7] border border-slate-200 rounded-lg text-xs text-[#1F1A17] focus:ring-2 focus:ring-[#0B8A43]/20 focus:border-[#0B8A43] outline-none" />
                    </div>
                    <div className="space-y-1 pt-1">
                      <label className="block text-xs font-semibold text-[#667085]">Cajas Requeridas</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'interna', label: 'Interna' },
                          { id: 'externa', label: 'Externa' },
                          { id: 'agape', label: 'Ágape' },
                        ].map((caja) => (
                          <label key={caja.id} className="flex items-center gap-1.5 p-2 bg-[#FAFAF7] border border-slate-200 rounded-lg text-xs font-semibold text-[#1F1A17] cursor-pointer has-checked:bg-[#DDF4E4]/40 has-checked:border-[#0B8A43]/40">
                            <input type="checkbox" name="cajas" value={caja.id} defaultChecked className="rounded border-slate-300 text-[#0B8A43] focus:ring-[#0B8A43]" />
                            <span>{caja.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <button type="submit" className="w-full py-2 bg-[#0B8A43] hover:bg-[#097337] text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors shadow-xs cursor-pointer mt-2">
                      Guardar Jornada
                    </button>
                  </form>
                </div>
              </details>
            )}
          </div>
          
          {/* Frase manuscrita con trazo orgánico bajo el botón */}
            <div className="relative inline-block mt-0.5 select-none self-end sm:self-auto">
              <span className="font-[family-name:var(--font-handwritten)] text-[17px] text-stone-500/80 tracking-wide font-medium leading-none">
                “La fe también se organiza”
              </span>

              {/* Trazo orgánico curvado dibujado a mano */}
              <svg
                viewBox="0 0 200 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="absolute left-0 -bottom-1 w-full h-2 text-stone-400/50 pointer-events-none"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  d="M 2 8 C 50 2, 130 3, 196 9"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </div>
        </div>
      </div>

      {/* 3. Tarjetas Superiores */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Próxima Jornada */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col justify-between">
          {proximaJornada ? (
            (() => {
              const tareas = proximaJornada.tareas_jornada || [];
              const completadas = tareas.filter((t: any) => t.estado === 'completado').length;
              const porcentaje = tareas.length > 0 ? Math.round((completadas / tareas.length) * 100) : 0;
              const fechaLocal = parsearFechaLocal(proximaJornada.fecha);

              return (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-5">
                      {/* Ticket de Fecha */}
                      <div className="w-14 h-14 rounded-xl bg-[#1F1A17] text-white flex flex-col items-center justify-center shrink-0">
                        <span className="text-[9px] font-bold uppercase text-[#0B8A43] tracking-wider mb-0.5">
                          {fechaLocal.toLocaleDateString('es-PE', { month: 'short' }).replace('.', '')}
                        </span>
                        <span className="text-xl font-bold leading-none">
                          {fechaLocal.getDate()}
                        </span>
                      </div>

                      <div className="flex flex-col space-y-1">
                        <div>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#DDF4E4] text-[#0B8A43]">
                            Próxima jornada
                          </span>
                        </div>
                        {/* "5 días" resaltado en verde */}
                        <h2 className="text-[19px] font-medium text-[#1F1A17] tracking-tight">
                          <span className="font-bold text-[#0B8A43]">{diasRestantes} días</span> para la próxima jornada
                        </h2>
                        <div className="pt-1">
                          <p className="text-[13px] text-[#1F1A17] font-semibold">Ponente: {proximaJornada.ponente}</p>
                          <p className="text-[12px] text-[#667085]">{proximaJornada.dinamica_apertura || 'Por confirmar'}</p>
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/jornada/${proximaJornada.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0B8A43] hover:bg-[#097337] text-white text-[13px] font-medium rounded-lg transition-colors shrink-0 shadow-xs"
                    >
                      <span>Abrir Jornada</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>

                  <div className="mt-8 pt-5 border-t border-slate-100">
                    <div className="flex items-center justify-between text-[13px] mb-2">
                      <span className="flex items-center gap-1.5 text-[#1F1A17] font-medium">
                        <Package className="w-4 h-4 text-[#667085]" />
                        Preparación de Cajas: {completadas} de {tareas.length} listas
                      </span>
                      <span className="font-bold text-[#1F1A17]">{porcentaje}%</span>
                    </div>
                    
                    <div className="w-full bg-[#F4F3EF] h-2 rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          porcentaje === 100 ? 'bg-[#0B8A43]' : porcentaje > 0 ? 'bg-[#D9A321]' : 'bg-transparent'
                        }`}
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${porcentaje === 100 ? 'bg-[#0B8A43]' : 'bg-[#D9A321]'}`} />
                      <span className="text-[12px] text-[#667085] font-medium">
                        {porcentaje === 100 ? 'Cajas 100% listas' : 'Preparación en progreso'}
                      </span>
                    </div>
                  </div>
                </>
              );
            })()
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-6">
              <Calendar className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-[#1F1A17]">No hay jornadas próximas agendadas</p>
            </div>
          )}
        </div>

        {/* Alertas Operativas */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Bell className="w-5 h-5 text-[#D9A321]" />
              <h3 className="text-[15px] font-bold text-[#1F1A17]">Alertas operativas</h3>
            </div>

            <div className="space-y-5 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-3 text-[#667085]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D9A321]" />
                  Sin ponente confirmado
                </span>
                <span className="font-bold text-[#1F1A17]">{jornadasSinPonente}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-3 text-[#667085]">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                  Cajas pendientes de check
                </span>
                <span className={`font-bold ${totalCajasPendientes > 0 ? 'text-rose-600' : 'text-[#1F1A17]'}`}>
                  {totalCajasPendientes}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-3 text-[#667085]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0B8A43]" />
                  Jornadas 100% listas
                </span>
                <span className="font-bold text-[#1F1A17]">{totalJornadasListas}</span>
              </div>
            </div>
          </div>

          <div />
        </div>
      </div>

      {/* 4. Filtros en Pastillas */}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        {[
          { id: 'activas', label: 'Activas' },
          { id: 'planificacion', label: 'Planificación' },
          { id: 'en_curso', label: 'En curso' },
          { id: 'finalizadas', label: 'Finalizadas' },
          { id: 'canceladas', label: 'Canceladas / Archivo' },
        ].map((item) => {
          const isSelected = filtroEstado === item.id;
          return (
            <Link
              key={item.id}
              href={`/dashboard?estado=${item.id}`}
              className={`px-4 py-2 rounded-xl text-[13px] font-medium transition-all ${
                isSelected
                  ? 'bg-[#0B8A43] text-white shadow-xs'
                  : 'bg-white text-[#667085] hover:bg-slate-50 border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)]'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* 5. Tabla de Jornadas con Indicador Lateral */}
      <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-100 text-[11px] font-bold text-[#667085] uppercase tracking-wider">
          <div className="col-span-3">Fecha</div>
          <div className="col-span-4">Ponente y dinámica</div>
          <div className="col-span-2">Estado</div>
          <div className="col-span-3">Preparación de cajas</div>
        </div>

        {jornadasFiltradas.length > 0 ? (
          <div className="flex flex-col">
            {jornadasFiltradas.map((j) => {
              const tareas = j.tareas_jornada || [];
              const completadas = tareas.filter((t: any) => t.estado === 'completado').length;
              const total = tareas.length;
              const porcentaje = total > 0 ? Math.round((completadas / total) * 100) : 0;
              const fechaLocal = parsearFechaLocal(j.fecha);
              const isNext = proximaJornada?.id === j.id;

              return (
                <Link
                  key={j.id}
                  href={`/jornada/${j.id}`}
                  className={`grid grid-cols-1 md:grid-cols-12 gap-4 items-center px-6 py-4 hover:bg-slate-50/60 transition-colors group border-l-4 ${
                    isNext ? 'border-[#0B8A43]' : 'border-transparent'
                  } border-b border-slate-100 last:border-b-0`}
                >
                  {/* Fecha */}
                  <div className="col-span-3 flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-[#1F1A17] text-white flex flex-col items-center justify-center shrink-0">
                      <span className="text-[9px] font-bold uppercase text-[#0B8A43] tracking-widest leading-none mb-0.5">
                        {fechaLocal.toLocaleDateString('es-PE', { month: 'short' }).replace('.', '')}
                      </span>
                      <span className="text-base font-bold leading-none">
                        {fechaLocal.getDate()}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-[#1F1A17] group-hover:text-[#0B8A43] transition-colors">
                        {j.fecha}
                      </span>
                    </div>
                  </div>

                  {/* Ponente */}
                  <div className="col-span-4 min-w-0 flex flex-col justify-center">
                    <span className="text-[13px] font-bold text-[#1F1A17] truncate">
                      {j.ponente || 'Por confirmar'}
                    </span>
                    <span className="text-[12px] text-[#667085] truncate">
                      {j.dinamica_apertura || 'Por confirmar'}
                    </span>
                  </div>

                  {/* Estado */}
                  <div className="col-span-2 flex items-center">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium ${
                        j.estado === 'planificacion'
                          ? 'bg-[#FFF4D6] text-[#D9A321]'
                          : j.estado === 'en_curso'
                          ? 'bg-[#DDF4E4] text-[#0B8A43]'
                          : j.estado === 'cancelada'
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-[#F4F3EF] text-[#667085]'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          j.estado === 'planificacion' ? 'bg-[#D9A321]' : j.estado === 'en_curso' ? 'bg-[#0B8A43]' : j.estado === 'cancelada' ? 'bg-rose-500' : 'bg-[#667085]'
                        }`}
                      />
                      {j.estado.charAt(0).toUpperCase() + j.estado.slice(1).replace('_', ' ')}
                    </span>
                  </div>

                  {/* Preparación de Cajas */}
                  <div className="col-span-3 flex items-center justify-between">
                    <div className="w-full max-w-[140px]">
                      <div className="flex justify-between items-center text-[11px] font-semibold mb-1">
                        <span className="text-[#667085]">{completadas}/{total} cajas</span>
                        <span className={`font-bold ${porcentaje === 100 ? 'text-[#0B8A43]' : 'text-[#1F1A17]'}`}>
                          {porcentaje}%
                        </span>
                      </div>
                      <div className="w-full bg-[#F4F3EF] h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            porcentaje === 100 ? 'bg-[#0B8A43]' : porcentaje > 0 ? 'bg-[#D9A321]' : 'bg-transparent'
                          }`}
                          style={{ width: `${porcentaje}%` }}
                        />
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#0B8A43] transition-colors ml-4" />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="p-16 text-center space-y-2">
            <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-[#1F1A17]">No se encontraron jornadas</p>
          </div>
        )}
      </div>

     {/* 6. Footer con Frase Institucional */}
      <div className="flex items-center justify-between pt-8 pb-4 text-xs text-[#667085]">
        {/* Frase manuscrita con trazo orgánico */}
        <div className="relative inline-block select-none">
          <span className="font-[family-name:var(--font-handwritten)] text-[20px] text-stone-500/80 tracking-wide font-medium leading-none">
            “Personas, encuentros, esperanza”
          </span>

          {/* Trazo ondulado a mano alzada */}
          <svg
            viewBox="0 0 240 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute left-0 -bottom-1.5 w-full h-2 text-stone-400/50 pointer-events-none"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M 2 8 C 65 3, 160 4, 236 9"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <span className="text-slate-400 text-xs select-none">
          Capellanía Ops · Confirma
        </span>
      </div>
    </div>
  );
}
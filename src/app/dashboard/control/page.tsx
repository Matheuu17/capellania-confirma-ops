import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ControlClient from './control-client';

export interface MiembroConMetricas {
  id: string;
  nombre: string;
  email: string;
  rol: 'coordinador' | 'miembro';
  estado_cuenta: 'activo' | 'inactivo' | 'suspendido';
  notas: string;
  ultimo_acceso: string | null;
  totalAsistencias: number;
  puntuales: number;
  tardanzas: number;
  faltas: number;
  porcentajePuntualidad: number;
  distanciaPromedioMts: number | null;
  faltasConsecutivas: number;
  ultimaAsistenciaFecha: string | null;
  cajasAsignadas: number;
  historialAsistencias: Array<{
    fecha: string;
    estado: 'P' | 'T' | 'F';
    distancia: number | null;
  }>;
}

export interface KpisGlobales {
  totalMiembros: number;
  activos: number;
  promedioPuntualidad: number;
  enRiesgo: number;
  totalCajasAsignadas: number;
}

export default async function ControlPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: usuarioActual } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single();

  if (usuarioActual?.rol !== 'coordinador') {
    redirect('/dashboard/asistencia');
  }

  // 1. Perfiles registrados
  const { data: perfiles } = await supabase
    .from('perfiles')
    .select('id, nombre, email, rol, estado_cuenta, notas, ultimo_acceso')
    .order('nombre', { ascending: true });

  // 2. Asistencias leídas con usuario_id y registrado_en (esquema real de BD)
  const { data: asistencias } = await supabase
    .from('asistencias')
    .select('id, usuario_id, jornada_id, distancia_metros, registrado_en, jornadas(fecha)')
    .order('registrado_en', { ascending: false });

  // 3. Tareas y asignaciones de cajas
  const { data: tareas } = await supabase
    .from('tareas_jornada')
    .select('id, tipo_caja, asignados_a, asignado_a');

  // 4. Jornadas no canceladas para calcular inasistencias reales
  const { data: jornadas } = await supabase
    .from('jornadas')
    .select('id, fecha, estado')
    .neq('estado', 'cancelada')
    .order('fecha', { ascending: false });

  const totalJornadasPasadas = (jornadas || []).filter((j) => j.estado === 'finalizada').length;

  let sumaPorcentajes = 0;
  let miembrosConAsistencias = 0;

  const miembrosProcesados: MiembroConMetricas[] = (perfiles || []).map((p) => {
    // Vincular correctamente por usuario_id
    const misAsistencias = (asistencias || []).filter((a: any) => a.usuario_id === p.id);

    let sumaDistancias = 0;
    let registrosConDistancia = 0;

    misAsistencias.forEach((a: any) => {
      if (typeof a.distancia_metros === 'number') {
        sumaDistancias += a.distancia_metros;
        registrosConDistancia++;
      }
    });

    // Cada registro en la tabla asistencias es una presencia validada por GPS
    const puntuales = misAsistencias.length;
    const tardanzas = 0;
    
    // Si ha habido jornadas finalizadas y el usuario tiene menos asistencias, calculamos faltas
    const faltas = Math.max(0, totalJornadasPasadas - puntuales);
    const totalEventosEvaluados = puntuales + faltas;

    // Puntualidad: si tiene asistencias y 0 faltas, es 100%
    const porcentajePuntualidad =
      totalEventosEvaluados > 0
        ? Math.round((puntuales / totalEventosEvaluados) * 100)
        : puntuales > 0 ? 100 : 0;

    const distanciaPromedioMts =
      registrosConDistancia > 0 ? Math.round(sumaDistancias / registrosConDistancia) : null;

    if (totalEventosEvaluados > 0 || puntuales > 0) {
      sumaPorcentajes += porcentajePuntualidad;
      miembrosConAsistencias++;
    }

    const cajasAsignadas = (tareas || []).filter((t: any) => {
      const arr = Array.isArray(t.asignados_a) ? t.asignados_a : t.asignado_a ? [t.asignado_a] : [];
      return arr.includes(p.id);
    }).length;

    const historialAsistencias = misAsistencias.slice(0, 8).map((a: any) => ({
      fecha: a.jornadas?.fecha || a.registrado_en?.split('T')[0] || 'N/A',
      estado: 'P' as const,
      distancia: a.distancia_metros,
    }));

    return {
      id: p.id,
      nombre: p.nombre || 'Sin nombre',
      email: p.email || 'Sin correo',
      rol: p.rol || 'miembro',
      estado_cuenta: (p.estado_cuenta as any) || 'activo',
      notas: p.notas || '',
      ultimo_acceso: p.ultimo_acceso,
      totalAsistencias: puntuales,
      puntuales,
      tardanzas,
      faltas,
      porcentajePuntualidad,
      distanciaPromedioMts,
      faltasConsecutivas: faltas,
      ultimaAsistenciaFecha: historialAsistencias[0]?.fecha || null,
      cajasAsignadas,
      historialAsistencias,
    };
  });

  const kpis: KpisGlobales = {
    totalMiembros: miembrosProcesados.length,
    activos: miembrosProcesados.filter((m) => m.estado_cuenta === 'activo').length,
    promedioPuntualidad:
      miembrosConAsistencias > 0 ? Math.round(sumaPorcentajes / miembrosConAsistencias) : 100,
    enRiesgo: miembrosProcesados.filter(
      (m) => m.faltasConsecutivas >= 2 || (m.totalAsistencias > 0 && m.porcentajePuntualidad < 60)
    ).length,
    totalCajasAsignadas: miembrosProcesados.reduce((acc, m) => acc + m.cajasAsignadas, 0),
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-6 animate-in fade-in duration-300">
      {/* Header Institucional Limpio */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1F1A17]">
            Equipo
          </h1>
          <p className="text-[13px] text-[#667085] mt-0.5">
            Acompañamiento pastoral, participación presencial y asignación de responsabilidades.
          </p>
        </div>
      </div>

      <ControlClient miembrosIniciales={miembrosProcesados} kpis={kpis} />

      {/* Frase al pie manuscrita */}
      <div className="text-center pt-8">
        <span className="font-[family-name:var(--font-handwritten)] text-[18px] text-stone-400 select-none">
          “Cuidar de los que sirven para seguir sirviendo”
        </span>
      </div>
    </div>
  );
}
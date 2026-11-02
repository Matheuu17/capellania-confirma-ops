import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import WidgetGPS from './widget-gps';
import { CalendarX2, Navigation } from 'lucide-react';

export default async function AsistenciaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Buscar la jornada activa ('en_curso') o la más próxima ('planificacion')
  const { data: jornadaActiva } = await supabase
    .from('jornadas')
    .select('*')
    .in('estado', ['en_curso', 'planificacion'])
    .order('fecha', { ascending: true })
    .limit(1)
    .maybeSingle();

  // Si hay jornada, validamos si el usuario ya asistió
  let yaAsistio = false;
  if (jornadaActiva) {
    const { data: asistencia } = await supabase
      .from('asistencias')
      .select('id')
      .eq('jornada_id', jornadaActiva.id)
      .eq('usuario_id', user.id)
      .maybeSingle();
      
    yaAsistio = !!asistencia;
  }

  const COORD_OBJETIVO = { lat: -12.073156, lng: -76.9522};

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 space-y-6 animate-in fade-in duration-300">
      
      {/* Header del Módulo */}
      <div>
        <h1 className="text-lg font-bold tracking-tight text-[#211B20]">
          Validación de Asistencia
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Registro presencial de operaciones mediante geolocalización (GPS)
        </p>
      </div>

      {!jornadaActiva ? (
        // Empty State Accesible
        <div className="bg-white border border-slate-200/80 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-10 text-center flex flex-col items-center justify-center space-y-3" role="status" aria-live="polite">
          <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center mb-2" aria-hidden="true">
            <CalendarX2 className="w-6 h-6 text-slate-400" />
          </div>
          <h2 className="text-sm font-bold text-[#211B20]">No hay jornadas activas</h2>
          <p className="text-xs text-slate-500 max-w-sm">
            Actualmente no existe ninguna jornada en curso o programada. El coordinador debe activar una fecha para habilitar el registro de asistencia.
          </p>
        </div>
      ) : (
        // Widget de Control Geográfico
        <section aria-labelledby="titulo-widget">
          <h2 id="titulo-widget" className="sr-only">Widget de Geolocalización</h2>
          <WidgetGPS 
            jornadaId={jornadaActiva.id} 
            fechaJornada={jornadaActiva.fecha}
            usuarioId={user.id} 
            yaAsistio={yaAsistio} 
            coordObjetivo={COORD_OBJETIVO} 
          />
        </section>
      )}
    </div>
  );
}
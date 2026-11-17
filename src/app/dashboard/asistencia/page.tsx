import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import WidgetGPS from './widget-gps';
import { CalendarX2 } from 'lucide-react';

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

  // Coordenadas oficiales de la sede
  const COORD_OBJETIVO = { lat: -12.073156, lng: -76.9522 };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* 1. Header con el mismo tono que Jornadas */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1F1A17]">
          Asistencia
        </h1>
        <p className="text-[13px] text-[#667085] mt-1">
          Registro presencial para la jornada activa.
        </p>
      </div>

      {/* 2. Tarjeta Central */}
      <div className="flex justify-center pt-2">
        {!jornadaActiva ? (
          <div
            className="w-full max-w-lg bg-white rounded-3xl p-10 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-slate-100 text-center space-y-3"
            role="status"
            aria-live="polite"
          >
            <div
              className="w-12 h-12 rounded-2xl bg-[#FAFAF7] text-slate-300 flex items-center justify-center mx-auto border border-slate-200/60"
              aria-hidden="true"
            >
              <CalendarX2 className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-[#1F1A17]">
              No hay jornadas activas
            </h2>
            <p className="text-xs text-[#667085] max-w-xs mx-auto leading-relaxed">
              Actualmente no existe ninguna jornada en curso o programada. El coordinador debe habilitar una fecha para activar el registro.
            </p>
          </div>
        ) : (
          <section aria-labelledby="titulo-widget" className="w-full flex justify-center">
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

      {/* 3. Frase manuscrita al pie */}
      <div className="text-center pt-8 flex flex-col">
        <span className="font-[family-name:var(--font-handwritten)] text-[18px] text-stone-400 select-none">
          “Donde están dos o tres reunidos en mi nombre, ahí estaré.”
        </span>
        <span className="font-[family-name:var(--font-handwritten)] text-[18px] text-stone-400 select-none">
          Mateo 18:20
        </span>
      </div>
    </div>
  );
}
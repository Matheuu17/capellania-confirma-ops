'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { calcularDistanciaMetros } from '@/lib/geo';
import { MapPin, CheckCircle2, AlertTriangle, Loader2, Navigation } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
  jornadaId: string;
  usuarioId: string;
  yaAsistio: boolean;
  coordObjetivo: { lat: number; lng: number };
}

export default function AsistenciaGPS({ jornadaId, usuarioId, yaAsistio, coordObjetivo }: Props) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const RADIO_PERMITIDO = 15; // Metros

  const marcarAsistencia = () => {
    if (!navigator.geolocation) {
      setError('Geolocalización no soportada por el navegador.');
      return;
    }

    setCargando(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const dist = calcularDistanciaMetros(
          pos.coords.latitude,
          pos.coords.longitude,
          coordObjetivo.lat,
          coordObjetivo.lng
        );

        if (dist > RADIO_PERMITIDO) {
          setError(`Fuera de rango. Estás a ${dist}m (Límite: ${RADIO_PERMITIDO}m). Acércate al punto de encuentro.`);
          setCargando(false);
          return;
        }

        const supabase = createClient();
        const { error: dbError } = await supabase.from('asistencias').insert({
          jornada_id: jornadaId,
          usuario_id: usuarioId,
          distancia_metros: dist,
        });

        if (dbError) {
          setError('Error al registrar. Intenta de nuevo.');
        } else {
          router.refresh(); // Recarga para mostrar el estado de éxito
        }
        setCargando(false);
      },
      (err) => {
        setCargando(false);
        setError('Acceso GPS denegado o señal débil. Activa la ubicación de tu celular.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  if (yaAsistio) {
    return (
      <div className="bg-slate-50/50 border border-slate-200/80 p-4 rounded-xl flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#07833F]/10 flex items-center justify-center border border-[#07833F]/20">
            <CheckCircle2 className="w-4 h-4 text-[#07833F]" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#211B20]">Asistencia Registrada</p>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-0.5">Control GPS Validado</p>
          </div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#07833F] bg-[#07833F]/10 px-2 py-0.5 rounded border border-[#07833F]/20">
          Presente
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-2xs space-y-3">
      <div className="flex items-center gap-2">
        <Navigation className="w-4 h-4 text-slate-500" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Control de Asistencia Operativa
        </h3>
      </div>
      
      <p className="text-xs text-slate-500 leading-relaxed">
        Debes encontrarte a menos de <strong>{RADIO_PERMITIDO} metros</strong> del punto de encuentro para habilitar tu registro en la jornada.
      </p>

      {error && (
        <div className="flex items-start gap-2 p-2.5 bg-rose-50/80 border border-rose-200/70 rounded-lg text-xs font-medium text-rose-700 leading-relaxed">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <button
        onClick={marcarAsistencia}
        disabled={cargando}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#211B20] hover:bg-black text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
      >
        {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
        {cargando ? 'Verificando Coordenadas...' : 'Validar Presencia (GPS)'}
      </button>
    </div>
  );
}
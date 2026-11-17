'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { calcularDistanciaMetros } from '@/lib/geo';
import { registrarAsistenciaGPS } from './actions';
import {
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Navigation,
  TestTube,
} from 'lucide-react';

interface WidgetGPSProps {
  jornadaId: string;
  fechaJornada: string;
  usuarioId: string;
  yaAsistio: boolean;
  coordObjetivo: { lat: number; lng: number };
}

export default function WidgetGPS({
  jornadaId,
  fechaJornada,
  usuarioId,
  yaAsistio,
  coordObjetivo,
}: WidgetGPSProps) {
  const router = useRouter();

  // MODO PRUEBA LOCAL: Cambiar a 'false' para activar los 15 metros estrictos
  const MODO_PRUEBA_LOCAL = false;
  const RADIO_PERMITIDO = 15;

  const [cargandoUbicacion, setCargandoUbicacion] = useState(true);
  const [distanciaActual, setDistanciaActual] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parsear fecha sin desfase de zona horaria para el ticket visual
  const [year, month, day] = fechaJornada.split('-').map(Number);
  const fechaObj = new Date(year, month - 1, day);
  const mesAbrev = fechaObj.toLocaleDateString('es-PE', { month: 'short' }).replace('.', '');
  const diaNum = fechaObj.getDate();

  // Lectura GPS al cargar el componente
  const obtenerUbicacion = () => {
    if (!navigator.geolocation) {
      setError('Tu navegador o dispositivo no soporta geolocalización.');
      setCargandoUbicacion(false);
      return;
    }

    setCargandoUbicacion(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = calcularDistanciaMetros(
          pos.coords.latitude,
          pos.coords.longitude,
          coordObjetivo.lat,
          coordObjetivo.lng
        );
        setDistanciaActual(dist);
        setCargandoUbicacion(false);
      },
      (err) => {
        setCargandoUbicacion(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError('Permiso de GPS denegado. Permite la ubicación en los ajustes de tu navegador.');
        } else {
          setError('Buscando señal satelital... Intenta nuevamente.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (!yaAsistio) {
      obtenerUbicacion();
    }
  }, [yaAsistio]);

  const dentroDelRadio = MODO_PRUEBA_LOCAL || (distanciaActual !== null && distanciaActual <= RADIO_PERMITIDO);

  const handleValidarPresencia = async () => {
    if (!dentroDelRadio) {
      setError(`Estás a ${distanciaActual}m del punto autorizado. Acércate a menos de ${RADIO_PERMITIDO}m.`);
      return;
    }

    setEnviando(true);
    setError(null);

    try {
      await registrarAsistenciaGPS(jornadaId, distanciaActual ?? 0);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Error al registrar tu asistencia.');
    } finally {
      setEnviando(false);
    }
  };

  // 1. ESTADO: YA ASISTIÓ
  if (yaAsistio) {
    return (
      <div className="w-full max-w-lg bg-white rounded-3xl p-8 sm:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-slate-100 text-center space-y-6 mx-auto">
        <div className="w-16 h-16 rounded-full bg-[#DDF4E4] text-[#0B8A43] flex items-center justify-center mx-auto shadow-xs">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DDF4E4] text-[#0B8A43] text-xs font-semibold">
            Presencia validada
          </span>
          <h2 className="text-xl font-bold text-[#1F1A17] pt-1">
            ¡Asistencia registrada!
          </h2>
          <p className="text-[13px] text-[#667085]">
            Tu presencia para la jornada del{' '}
            <strong className="text-[#1F1A17]">{fechaJornada}</strong> ya ha sido verificada.
          </p>
        </div>
      </div>
    );
  }

  // 2. ESTADO: PENDIENTE DE ASISTENCIA (Acción única, amplia y enfocada)
  return (
    <div className="w-full max-w-lg bg-white rounded-3xl p-7 sm:p-9 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col justify-between space-y-7 mx-auto">
      
      {/* Cabecera con Badge y Ticket Negro */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DDF4E4] text-[#0B8A43] text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#0B8A43] animate-pulse" />
            Jornada Activa
          </span>

          {MODO_PRUEBA_LOCAL && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
              <TestTube className="w-3 h-3" /> Modo Test
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 pt-1">
          <div className="w-13 h-13 rounded-xl bg-[#1F1A17] text-white flex flex-col items-center justify-center shrink-0 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-[#0B8A43] tracking-widest leading-none mb-0.5">
              {mesAbrev}
            </span>
            <span className="text-xl font-bold leading-none">
              {diaNum}
            </span>
          </div>

          <div className="flex flex-col">
            <h2 className="text-base font-bold text-[#1F1A17]">
              Jornada {fechaJornada}
            </h2>
            <p className="text-xs text-[#667085]">
              Validación de presencia en el punto de encuentro
            </p>
          </div>
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* Estado del GPS visible ANTES de presionar el botón */}
      <div className="space-y-2">
        {cargandoUbicacion ? (
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#FAFAF7] border border-slate-100 text-xs text-[#667085]">
            <Loader2 className="w-4 h-4 animate-spin text-[#0B8A43]" />
            <span>Comprobando tu ubicación GPS...</span>
          </div>
        ) : error ? (
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-xs text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">{error}</p>
              <button
                type="button"
                onClick={obtenerUbicacion}
                className="mt-1 text-[11px] font-bold text-rose-700 underline cursor-pointer"
              >
                Reintentar lectura GPS
              </button>
            </div>
          </div>
        ) : dentroDelRadio ? (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#DDF4E4]/40 border border-[#0B8A43]/20">
            <MapPin className="w-5 h-5 text-[#0B8A43] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-[#1F1A17]">Ubicación validada</p>
              <p className="text-[12px] text-[#667085] mt-0.5">
                Te encuentras dentro del perímetro autorizado ({distanciaActual} m del punto).
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50/70 border border-amber-200/60">
            <Navigation className="w-5 h-5 text-[#D9A321] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-[#1F1A17]">Fuera de perímetro</p>
              <p className="text-[12px] text-[#667085] mt-0.5">
                Estás a {distanciaActual} metros del punto. Acércate a menos de {RADIO_PERMITIDO}m para registrar tu asistencia.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Botón de Acción Principal en Verde Institucional */}
      <div>
        <button
          type="button"
          onClick={handleValidarPresencia}
          disabled={!dentroDelRadio || enviando || cargandoUbicacion}
          className={`w-full py-4 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer ${
            dentroDelRadio && !enviando && !cargandoUbicacion
              ? 'bg-[#0B8A43] hover:bg-[#097337] active:bg-[#075f2d] text-white shadow-[#0B8A43]/20'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/60'
          }`}
        >
          {enviando ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Registrando presencia...</span>
            </>
          ) : (
            <span>Validar mi presencia</span>
          )}
        </button>
      </div>

      <hr className="border-slate-100" />

      {/* Pie de la tarjeta */}
      <div className="flex items-center gap-2 text-xs text-[#667085] pt-0.5">
        {dentroDelRadio ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-[#0B8A43]" />
            <span>Registro disponible (menos de {RADIO_PERMITIDO} metros del punto autorizado)</span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-slate-300" />
            <span>Requiere encontrarse a menos de {RADIO_PERMITIDO} metros de la capilla</span>
          </>
        )}
      </div>
    </div>
  );
}
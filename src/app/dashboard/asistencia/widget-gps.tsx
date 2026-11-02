'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { calcularDistanciaMetros } from '@/lib/geo';
import { registrarAsistenciaGPS } from './actions';
import {
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Navigation,
  Crosshair,
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
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // MODO PRUEBA LOCAL: Cambiar a 'false' para activar los 15 metros estrictos
  const MODO_PRUEBA_LOCAL = false;
  const RADIO_PERMITIDO = 15;
  // -------------------------------------------------------------

  const marcarAsistencia = () => {
    if (!navigator.geolocation) {
      setError('Tu navegador no soporta geolocalización.');
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

        // Validación de distancia (se omite si MODO_PRUEBA_LOCAL está activo)
        if (!MODO_PRUEBA_LOCAL && dist > RADIO_PERMITIDO) {
          setError(
            `Estás a ${dist}m del punto de encuentro. Límite: ${RADIO_PERMITIDO}m. Acércate más para marcar.`
          );
          setCargando(false);
          return;
        }

        try {
          // Llama al Server Action para guardar en BD y disparar el Webhook de Google Sheets
          await registrarAsistenciaGPS(jornadaId, dist);
          router.refresh();
        } catch (err: any) {
          setError(err.message || 'Error al registrar tu asistencia.');
        } finally {
          setCargando(false);
        }
      },
      (err) => {
        setCargando(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError('Acceso GPS denegado. Permite la ubicación en tu navegador.');
        } else {
          setError('No se pudo obtener señal GPS. Intenta nuevamente.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // ESTADO: YA ASISTIÓ
  if (yaAsistio) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-6 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-1 h-full bg-[#07833F]" aria-hidden="true" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-10 h-10 rounded-full bg-[#07833F]/10 flex items-center justify-center border border-[#07833F]/20 shrink-0"
              aria-hidden="true"
            >
              <CheckCircle2 className="w-5 h-5 text-[#07833F]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#211B20]">Registro Exitoso</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tu asistencia presencial para la jornada del{' '}
                <strong className="font-semibold text-slate-700">{fechaJornada}</strong> ha sido verificada.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-[#07833F]/10 text-[#07833F] border border-[#07833F]/20 select-none">
            Validado por GPS
          </span>
        </div>
      </div>
    );
  }

  // ESTADO: PENDIENTE DE ASISTENCIA
  return (
    <div className="bg-white border border-slate-200/80 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
      {/* Header del Widget */}
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-slate-400" aria-hidden="true" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Terminal de Control de Acceso
          </h3>
        </div>
        {MODO_PRUEBA_LOCAL && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
            <TestTube className="w-3 h-3" /> Modo Test Activo
          </span>
        )}
      </div>

      {/* Cuerpo del Widget */}
      <div className="p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row gap-5 items-start">
          <div
            className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <Crosshair className="w-6 h-6 text-[#211B20]" />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-[#211B20]">
              Jornada Activa: {fechaJornada}
            </p>
            <p className="text-xs text-slate-500 leading-relaxed max-w-lg">
              El sistema requiere confirmación geográfica. Debes encontrarte físicamente en el perímetro autorizado{' '}
              <strong className="text-slate-700 font-semibold">
                (menos de {RADIO_PERMITIDO} metros de distancia)
              </strong>{' '}
              para registrar tu entrada.
            </p>
          </div>
        </div>

        {/* Zona de Errores */}
        <div aria-live="assertive" aria-atomic="true">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-50/80 border border-rose-200/70 rounded-lg text-xs font-medium text-rose-700 leading-relaxed animate-in slide-in-from-top-2 duration-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Botón de Acción */}
        <button
          onClick={marcarAsistencia}
          disabled={cargando}
          aria-busy={cargando}
          className="w-full flex items-center justify-center gap-2 py-3 bg-[#211B20] hover:bg-black active:scale-[0.98] active:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#07833F] focus-visible:ring-offset-2 cursor-pointer"
        >
          {cargando ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span>Procesando asistencia...</span>
            </>
          ) : (
            <>
              <MapPin className="w-4 h-4" aria-hidden="true" />
              <span>Validar Presencia (Requiere GPS)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
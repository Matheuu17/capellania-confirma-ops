'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  toggleMaterial,
  cambiarEstadoTarea,
  agregarMaterialExtra,
  asignarResponsableCaja,
} from './actions';
import {
  Check,
  Clock,
  Plus,
  Users,
  PackageCheck,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';

interface Material {
  id: string;
  nombre: string;
  tipo_caja: string;
  es_obligatorio: boolean;
}

interface Miembro {
  id: string;
  nombre: string;
}

interface ChecklistCajaProps {
  tarea: {
    id: string;
    tipo_caja: 'interna' | 'externa' | 'agape';
    estado: 'pendiente' | 'en_progreso' | 'completado';
    materiales_verificados: string[];
    asignados_a?: string[] | null;
    asignado_a?: string | null;
  };
  materiales: Material[];
  jornadaId: string;
  esCoordinador: boolean;
  miembros: Miembro[];
}

export default function ChecklistCaja({
  tarea,
  materiales,
  jornadaId,
  esCoordinador,
  miembros,
}: ChecklistCajaProps) {
  // Estado local sincronizado con Supabase y fallback a singular
  const [asignados, setAsignados] = useState<string[]>(
    Array.isArray(tarea.asignados_a)
      ? tarea.asignados_a
      : tarea.asignado_a
      ? [tarea.asignado_a]
      : []
  );
  const [verificados, setVerificados] = useState<string[]>(tarea.materiales_verificados || []);
  const [estado, setEstado] = useState(tarea.estado);
  const [nuevoItem, setNuevoItem] = useState('');
  const [mostrarInput, setMostrarInput] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [menuAsignarAbierto, setMenuAsignarAbierto] = useState(false);
  const [expandido, setExpandido] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMenuAsignarAbierto(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Suscripción Realtime en Supabase
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`caja_${tarea.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tareas_jornada',
          filter: `id=eq.${tarea.id}`,
        },
        (payload) => {
          const nuevaData = payload.new as any;
          if (nuevaData) {
            setEstado(nuevaData.estado);
            setVerificados(nuevaData.materiales_verificados || []);
            const nuevosAsignados = Array.isArray(nuevaData.asignados_a)
              ? nuevaData.asignados_a
              : nuevaData.asignado_a
              ? [nuevaData.asignado_a]
              : [];
            setAsignados(nuevosAsignados);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tarea.id]);

  const handleToggle = (nombre: string) => {
    if (estado !== 'en_progreso' && !esCoordinador) return;
    const nuevaLista = verificados.includes(nombre)
      ? verificados.filter((m) => m !== nombre)
      : [...verificados, nombre];
    setVerificados(nuevaLista);
    toggleMaterial(tarea.id, nombre, jornadaId);
  };

  const handleEstado = async (nuevoEstado: 'pendiente' | 'en_progreso' | 'completado') => {
    setIsPending(true);
    setEstado(nuevoEstado);
    await cambiarEstadoTarea(tarea.id, nuevoEstado, jornadaId);
    setIsPending(false);
  };

  const handleToggleMiembro = async (usuarioId: string) => {
    const nuevaLista = asignados.includes(usuarioId)
      ? asignados.filter((id) => id !== usuarioId)
      : [...asignados, usuarioId];

    setAsignados(nuevaLista);
    await asignarResponsableCaja(tarea.id, usuarioId, jornadaId);
  };

  const handleCrearExtra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoItem.trim()) return;
    setIsPending(true);
    const nombre = nuevoItem.trim();
    if (!verificados.includes(nombre)) setVerificados((prev) => [...prev, nombre]);
    setNuevoItem('');
    setMostrarInput(false);
    await agregarMaterialExtra(tarea.id, nombre, jornadaId);
    setIsPending(false);
  };

  // Cálculos métricos de la caja
  const nombresCatalogo = new Set(materiales.map((m) => m.nombre));
  const extras = verificados.filter((m) => !nombresCatalogo.has(m));
  const totalItems = materiales.length + extras.length;
  const listos = verificados.length;
  const faltantes = Math.max(0, totalItems - listos);
  const progreso = totalItems > 0 ? Math.round((listos / totalItems) * 100) : 0;

  const miembrosAsignados = miembros.filter((m) => asignados.includes(m.id));

  // Título natural formateado
  const tituloCaja =
    tarea.tipo_caja === 'interna'
      ? 'Caja Interna'
      : tarea.tipo_caja === 'externa'
      ? 'Caja Externa'
      : 'Caja Ágape';

  // Semáforo visual
  const esCompletado = estado === 'completado' || (progreso === 100 && totalItems > 0);
  const esEnProgreso = estado === 'en_progreso' || (progreso > 0 && progreso < 100);

  const configVisual = esCompletado
    ? {
        badgeBg: 'bg-[#DDF4E4]',
        badgeText: 'text-[#0B8A43]',
        badgeBorder: 'border-[#0B8A43]/20',
        dot: 'bg-[#0B8A43]',
        barra: 'bg-[#0B8A43]',
        label: 'Verificada y completa',
        icono: <CheckCircle2 className="w-3.5 h-3.5 text-[#0B8A43]" />,
      }
    : esEnProgreso
    ? {
        badgeBg: 'bg-[#FFF4D6]',
        badgeText: 'text-[#D9A321]',
        badgeBorder: 'border-[#D9A321]/30',
        dot: 'bg-[#D9A321]',
        barra: 'bg-[#D9A321]',
        label: 'En verificación',
        icono: <Clock className="w-3.5 h-3.5 text-[#D9A321]" />,
      }
    : {
        badgeBg: 'bg-slate-100',
        badgeText: 'text-slate-600',
        badgeBorder: 'border-slate-200',
        dot: 'bg-slate-300',
        barra: 'bg-slate-300',
        label: 'Sin iniciar',
        icono: <AlertCircle className="w-3.5 h-3.5 text-slate-400" />,
      };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] overflow-hidden transition-all">
      {/* 1. Header Operativo */}
      <div className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${configVisual.dot}`} />
              <h3 className="text-base font-bold text-[#1F1A17]">{tituloCaja}</h3>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${configVisual.badgeBg} ${configVisual.badgeText} ${configVisual.badgeBorder}`}
              >
                {configVisual.icono}
                <span>{configVisual.label}</span>
              </span>
            </div>

            {/* Responsables asignados */}
            <div className="flex items-center gap-2 text-xs text-[#667085] pt-0.5 flex-wrap">
              <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {miembrosAsignados.length > 0 ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[#667085]">A cargo de:</span>
                  {miembrosAsignados.map((m) => (
                    <span
                      key={m.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FAFAF7] border border-slate-200/80 text-[11px] font-semibold text-[#1F1A17]"
                    >
                      {m.nombre.split(' ')[0]}
                      {esCoordinador && (
                        <button
                          type="button"
                          onClick={() => handleToggleMiembro(m.id)}
                          className="text-slate-400 hover:text-rose-600 ml-0.5 cursor-pointer leading-none"
                          title={`Remover a ${m.nombre}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="italic text-slate-400">Sin responsable asignado</span>
              )}

              {/* Botón de asignación (exclusivo coordinador) */}
              {esCoordinador && (
                <div className="relative inline-block" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setMenuAsignarAbierto(!menuAsignarAbierto)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-[#0B8A43] hover:bg-[#DDF4E4]/40 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Asignar</span>
                  </button>

                  {menuAsignarAbierto && (
                    <div className="absolute left-0 mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-30 max-h-56 overflow-y-auto animate-in zoom-in-95 duration-100">
                      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                        Seleccionar miembros
                      </div>
                      {miembros.map((m) => {
                        const seleccionado = asignados.includes(m.id);
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleToggleMiembro(m.id)}
                            className="w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer text-[#1F1A17]"
                          >
                            <span className="truncate pr-2">{m.nombre}</span>
                            {seleccionado && (
                              <Check className="w-3.5 h-3.5 text-[#0B8A43] shrink-0" strokeWidth={2.5} />
                            )}
                          </button>
                        );
                      })}
                      {miembros.length === 0 && (
                        <div className="p-3 text-center text-xs text-slate-400">
                          No hay miembros activos.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Acciones de fase de la caja */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            {estado === 'pendiente' && (
              <button
                type="button"
                onClick={() => handleEstado('en_progreso')}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 text-xs font-semibold text-[#1F1A17] transition-colors cursor-pointer shadow-2xs"
              >
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Iniciar verificación</span>
              </button>
            )}
            {estado === 'en_progreso' && (
              <button
                type="button"
                onClick={() => handleEstado('completado')}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0B8A43] hover:bg-[#097337] active:bg-[#075f2d] text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
              >
                <PackageCheck className="w-3.5 h-3.5" />
                <span>Marcar lista</span>
              </button>
            )}
            {estado === 'completado' && (
              <button
                type="button"
                onClick={() => handleEstado('pendiente')}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-[#667085] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>Reabrir</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Barra de Progreso Visual */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-[#667085] font-medium">
              {listos} de {totalItems} materiales listos
              {faltantes > 0 && <span className="text-amber-700 ml-1.5">({faltantes} pendientes)</span>}
            </span>
            <span className={esCompletado ? 'text-[#0B8A43] font-bold' : 'text-[#1F1A17]'}>
              {progreso}%
            </span>
          </div>

          <div className="w-full bg-[#F4F3EF] h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${configVisual.barra}`}
              style={{ width: `${progreso}%` }}
            />
          </div>
        </div>

        {/* 3. Selector para Expandir/Ocultar Detalle */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-50 text-xs">
          <span className="text-[#667085]">
            {totalItems} ítems en inventario
          </span>

          <button
            type="button"
            onClick={() => setExpandido(!expandido)}
            className="inline-flex items-center gap-1.5 font-semibold text-[#0B8A43] hover:text-[#097337] transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-[#DDF4E4]/30"
          >
            <span>{expandido ? 'Ocultar materiales' : 'Ver detalle de materiales'}</span>
            {expandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 4. Lista Colapsable de Materiales */}
      {expandido && (
        <div className="px-5 sm:px-6 pb-6 pt-2 bg-[#FAFAF7]/60 border-t border-slate-100 space-y-3 animate-in slide-in-from-top-2 duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {materiales.map((item) => {
              const marcado = verificados.includes(item.nombre);
              const deshabilitado = estado !== 'en_progreso' && !esCoordinador;

              return (
                <button
                  key={item.id}
                  type="button"
                  role="checkbox"
                  aria-checked={marcado}
                  disabled={deshabilitado}
                  onClick={() => handleToggle(item.nombre)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-medium transition-all text-left cursor-pointer ${
                    marcado
                      ? 'bg-white border-[#0B8A43]/30 text-[#1F1A17] shadow-2xs'
                      : 'bg-white/80 border-slate-200/80 text-[#667085] hover:border-slate-300'
                  } ${deshabilitado ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                        marcado
                          ? 'bg-[#0B8A43] border-[#0B8A43] text-white shadow-2xs'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {marcado && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className={`truncate ${marcado ? 'font-semibold text-[#1F1A17]' : 'text-[#667085]'}`}>
                      {item.nombre}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {marcado && (
                      <span className="text-[10px] font-bold text-[#0B8A43] bg-[#DDF4E4] px-1.5 py-0.5 rounded">
                        Listo
                      </span>
                    )}
                    {item.es_obligatorio && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/60">
                        Req
                      </span>
                    )}
                  </div>
                </button>
              );
            })}

            {extras.map((nombreExtra) => {
              const marcado = verificados.includes(nombreExtra);
              const deshabilitado = estado !== 'en_progreso' && !esCoordinador;

              return (
                <button
                  key={nombreExtra}
                  type="button"
                  role="checkbox"
                  aria-checked={marcado}
                  disabled={deshabilitado}
                  onClick={() => handleToggle(nombreExtra)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-medium transition-all text-left cursor-pointer ${
                    marcado
                      ? 'bg-white border-[#0B8A43]/30 text-[#1F1A17] shadow-2xs'
                      : 'bg-white/80 border-slate-200/80 text-[#667085] hover:border-slate-300'
                  } ${deshabilitado ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                        marcado
                          ? 'bg-[#0B8A43] border-[#0B8A43] text-white shadow-2xs'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {marcado && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className={`truncate ${marcado ? 'font-semibold text-[#1F1A17]' : 'text-[#667085]'}`}>
                      {nombreExtra}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {marcado && (
                      <span className="text-[10px] font-bold text-[#0B8A43] bg-[#DDF4E4] px-1.5 py-0.5 rounded">
                        Listo
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/60">
                      <Sparkles className="w-2.5 h-2.5 text-slate-400" />
                      Extra
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Formulario de Material Extra / Imprevisto */}
          <div className="pt-2">
            {!mostrarInput ? (
              <button
                type="button"
                onClick={() => setMostrarInput(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#667085] hover:text-[#0B8A43] transition-colors cursor-pointer py-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar material imprevisto</span>
              </button>
            ) : (
              <form onSubmit={handleCrearExtra} className="flex flex-col sm:flex-row gap-2 pt-1">
                <input
                  type="text"
                  value={nuevoItem}
                  onChange={(e) => setNuevoItem(e.target.value)}
                  placeholder="Ej. Cable HDMI, alargador..."
                  autoFocus
                  disabled={isPending}
                  className="flex-1 px-3 py-2 bg-white border border-slate-200/90 rounded-xl text-xs text-[#1F1A17] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B8A43]/20 focus:border-[#0B8A43] transition-all"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isPending || !nuevoItem.trim()}
                    className="flex-1 sm:flex-none px-4 py-2 bg-[#0B8A43] hover:bg-[#097337] active:bg-[#075f2d] disabled:opacity-50 text-white rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer shadow-2xs"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setMostrarInput(false)}
                    disabled={isPending}
                    className="flex-1 sm:flex-none px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
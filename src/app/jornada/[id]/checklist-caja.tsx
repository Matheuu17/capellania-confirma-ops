'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toggleMaterial, cambiarEstadoTarea, agregarMaterialExtra, asignarResponsableCaja } from './actions';
import { Check, CheckCircle2, Clock, RotateCcw, Plus, UserCheck } from 'lucide-react';

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
  const [verificados, setVerificados] = useState<string[]>(
    tarea.materiales_verificados || []
  );
  const [estado, setEstado] = useState(tarea.estado);
  const [asignadoA, setAsignadoA] = useState<string | null>(tarea.asignado_a || null);
  const [nuevoItem, setNuevoItem] = useState('');
  const [mostrarInput, setMostrarInput] = useState(false);

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
            setAsignadoA(nuevaData.asignado_a || null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tarea.id]);

  const handleToggle = (nombre: string) => {
    const nuevaLista = verificados.includes(nombre)
      ? verificados.filter((m) => m !== nombre)
      : [...verificados, nombre];

    setVerificados(nuevaLista);
    toggleMaterial(tarea.id, nombre, jornadaId);
  };

  const handleEstado = (nuevoEstado: 'pendiente' | 'en_progreso' | 'completado') => {
    setEstado(nuevoEstado);
    cambiarEstadoTarea(tarea.id, nuevoEstado, jornadaId);
  };

  const handleAsignacion = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nuevoId = e.target.value === '' ? null : e.target.value;
    setAsignadoA(nuevoId);
    await asignarResponsableCaja(tarea.id, nuevoId, jornadaId);
  };

  const handleCrearExtra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoItem.trim()) return;

    const nombre = nuevoItem.trim();
    if (!verificados.includes(nombre)) {
      setVerificados((prev) => [...prev, nombre]);
    }
    setNuevoItem('');
    setMostrarInput(false);
    await agregarMaterialExtra(tarea.id, nombre, jornadaId);
  };

  const nombresCatalogo = new Set(materiales.map((m) => m.nombre));
  const extras = verificados.filter((m) => !nombresCatalogo.has(m));
  const totalItems = materiales.length + extras.length;
  const progreso = totalItems > 0 ? Math.round((verificados.length / totalItems) * 100) : 0;

  const miembroAsignado = miembros.find((m) => m.id === asignadoA);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-[#211B20] capitalize">
              Caja {tarea.tipo_caja}
            </h3>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize ${
                estado === 'completado'
                  ? 'bg-[#07833F]/10 text-[#07833F] border border-[#07833F]/20'
                  : estado === 'en_progreso'
                  ? 'bg-[#E0B84F]/15 text-[#9a761e] border border-[#E0B84F]/30'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {estado.replace('_', ' ')}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-1.5">
            <p className="text-xs text-slate-500">
              {verificados.length} de {totalItems} materiales listos ({progreso}%)
            </p>

            {/* Asignación de Responsable */}
            {esCoordinador ? (
              <div className="flex items-center gap-1.5 text-xs bg-[#F4F3EF] px-2 py-1 rounded-lg border border-slate-200">
                <UserCheck className="w-3.5 h-3.5 text-[#07833F]" />
                <span className="text-slate-500 font-medium">Asignar a:</span>
                <select
                  value={asignadoA || ''}
                  onChange={handleAsignacion}
                  className="bg-transparent font-semibold text-[#211B20] focus:outline-none cursor-pointer"
                >
                  <option value="">Sin asignar</option>
                  {miembros.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
              </div>
            ) : miembroAsignado ? (
              <div className="flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                <UserCheck className="w-3 h-3 text-[#07833F]" />
                <span>Responsable: <strong>{miembroAsignado.nombre}</strong></span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Acciones de estado */}
        <div className="flex gap-2">
          {estado !== 'en_progreso' && estado !== 'completado' && (
            <button
              onClick={() => handleEstado('en_progreso')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-[#E0B84F]" />
              Iniciar Preparación
            </button>
          )}

          {estado !== 'completado' && (
            <button
              onClick={() => handleEstado('completado')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#07833F] hover:bg-[#066e35] text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Marcar Caja Lista
            </button>
          )}

          {estado === 'completado' && (
            <button
              onClick={() => handleEstado('pendiente')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs text-slate-600 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reabrir Caja
            </button>
          )}
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
        <div
          className="bg-[#07833F] h-full transition-all duration-200"
          style={{ width: `${progreso}%` }}
        />
      </div>

      {/* Grid de Materiales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {materiales.map((item) => {
          const marcado = verificados.includes(item.nombre);
          return (
            <button
              key={item.id}
              onClick={() => handleToggle(item.nombre)}
              type="button"
              className={`flex items-center justify-between p-3 rounded-xl border text-left transition-colors text-sm font-medium cursor-pointer ${
                marcado
                  ? 'bg-[#07833F]/5 border-[#07833F]/30 text-[#07833F]'
                  : 'bg-[#F4F3EF]/60 border-slate-200 text-[#211B20] hover:border-slate-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <span
                  className={`w-5 h-5 rounded-lg flex items-center justify-center border text-xs transition-colors ${
                    marcado
                      ? 'bg-[#07833F] text-white border-[#07833F]'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {marcado && <Check className="w-3.5 h-3.5" />}
                </span>
                {item.nombre}
              </span>

              {item.es_obligatorio && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#E0B84F]/15 text-[#9a761e]">
                  Req
                </span>
              )}
            </button>
          );
        })}

        {extras.map((nombreExtra) => (
          <button
            key={nombreExtra}
            onClick={() => handleToggle(nombreExtra)}
            type="button"
            className="flex items-center justify-between p-3 rounded-xl border border-[#07833F]/30 bg-[#07833F]/5 text-[#07833F] text-left text-sm font-medium cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-lg flex items-center justify-center border border-[#07833F] bg-[#07833F] text-white text-xs">
                <Check className="w-3.5 h-3.5" />
              </span>
              {nombreExtra}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
              Extra
            </span>
          </button>
        ))}
      </div>

      {/* Agregar material extra */}
      <div className="pt-2 border-t border-slate-100">
        {!mostrarInput ? (
          <button
            type="button"
            onClick={() => setMostrarInput(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#07833F] transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar material imprevisto o adicional a esta caja</span>
          </button>
        ) : (
          <form onSubmit={handleCrearExtra} className="flex gap-2 items-center">
            <input
              type="text"
              value={nuevoItem}
              onChange={(e) => setNuevoItem(e.target.value)}
              placeholder="Ej. Cinta adhesiva / Adaptador HDMI extra..."
              autoFocus
              className="flex-1 px-3 py-1.5 bg-[#F4F3EF]/60 border border-slate-200 rounded-xl text-xs text-[#211B20] focus:outline-none focus:ring-2 focus:ring-[#07833F]"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-[#07833F] hover:bg-[#066e35] text-white rounded-xl text-xs font-semibold cursor-pointer"
            >
              Agregar
            </button>
            <button
              type="button"
              onClick={() => setMostrarInput(false)}
              className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Cancelar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
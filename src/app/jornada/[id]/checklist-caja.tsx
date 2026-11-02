'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toggleMaterial, cambiarEstadoTarea, agregarMaterialExtra, asignarResponsableCaja } from './actions';
import { Check, Clock, Plus, UserCheck, PackageCheck, RotateCcw, ChevronDown, Sparkles } from 'lucide-react';

interface Material { id: string; nombre: string; tipo_caja: string; es_obligatorio: boolean; }
interface Miembro { id: string; nombre: string; }
interface ChecklistCajaProps {
  tarea: { id: string; tipo_caja: 'interna' | 'externa' | 'agape'; estado: 'pendiente' | 'en_progreso' | 'completado'; materiales_verificados: string[]; asignado_a?: string | null; };
  materiales: Material[];
  jornadaId: string;
  esCoordinador: boolean;
  miembros: Miembro[];
}

export default function ChecklistCaja({ tarea, materiales, jornadaId, esCoordinador, miembros }: ChecklistCajaProps) {
  const [verificados, setVerificados] = useState<string[]>(tarea.materiales_verificados || []);
  const [estado, setEstado] = useState(tarea.estado);
  const [asignadoA, setAsignadoA] = useState<string | null>(tarea.asignado_a || null);
  const [nuevoItem, setNuevoItem] = useState('');
  const [mostrarInput, setMostrarInput] = useState(false);
  const [isPending, setIsPending] = useState(false); // Regla 10: Estado de carga para botones

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`caja_${tarea.id}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tareas_jornada', filter: `id=eq.${tarea.id}` }, (payload) => {
      const nuevaData = payload.new as any;
      if (nuevaData) {
        setEstado(nuevaData.estado);
        setVerificados(nuevaData.materiales_verificados || []);
        setAsignadoA(nuevaData.asignado_a || null);
      }
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tarea.id]);

  const handleToggle = (nombre: string) => {
    if (estado !== 'en_progreso' && !esCoordinador) return; // Validación funcional
    const nuevaLista = verificados.includes(nombre) ? verificados.filter((m) => m !== nombre) : [...verificados, nombre];
    setVerificados(nuevaLista);
    toggleMaterial(tarea.id, nombre, jornadaId);
  };

  const handleEstado = async (nuevoEstado: 'pendiente' | 'en_progreso' | 'completado') => {
    setIsPending(true);
    setEstado(nuevoEstado);
    await cambiarEstadoTarea(tarea.id, nuevoEstado, jornadaId);
    setIsPending(false);
  };

  const handleAsignacion = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nuevoId = e.target.value === '' ? null : e.target.value;
    setAsignadoA(nuevoId);
    await asignarResponsableCaja(tarea.id, nuevoId, jornadaId);
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

  const nombresCatalogo = new Set(materiales.map((m) => m.nombre));
  const extras = verificados.filter((m) => !nombresCatalogo.has(m));
  const totalItems = materiales.length + extras.length;
  const progreso = totalItems > 0 ? Math.round((verificados.length / totalItems) * 100) : 0;
  const miembroAsignado = miembros.find((m) => m.id === asignadoA);

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden transition-all focus-within:ring-1 focus-within:ring-slate-300">
      
      {/* Header Operativo */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/60">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <h3 id={`titulo-caja-${tarea.id}`} className="text-sm font-bold text-[#211B20] tracking-tight uppercase">
              Caja {tarea.tipo_caja}
            </h3>
            <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-widest border ${
              estado === 'completado' ? 'bg-[#07833F]/10 border-[#07833F]/25 text-[#07833F]' : 
              estado === 'en_progreso' ? 'bg-[#E0B84F]/15 border-[#E0B84F]/30 text-[#9a761e]' : 
              'bg-slate-200/60 border-slate-300/60 text-slate-600'
            }`} aria-label={`Estado: ${estado.replace('_', ' ')}`}>
              {estado.replace('_', ' ')}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span aria-label={`Progreso: ${progreso} por ciento`}>
              Verificación: <strong className="text-[#211B20] font-bold">{progreso}%</strong>
            </span>
            <span className="h-3 w-px bg-slate-200" aria-hidden="true" />
            
            {esCoordinador ? (
              <div className="relative inline-flex items-center group">
                <UserCheck className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#07833F] transition-colors pointer-events-none mr-1.5" aria-hidden="true" />
                <select
                  aria-label={`Asignar responsable a la caja ${tarea.tipo_caja}`}
                  value={asignadoA || ''}
                  onChange={handleAsignacion}
                  className="bg-transparent text-slate-600 text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[#07833F] rounded cursor-pointer hover:text-[#211B20] transition-colors appearance-none pr-5"
                >
                  <option value="">Sin asignar</option>
                  {miembros.map((m) => (
                    <option key={m.id} value={m.id}>{m.nombre}</option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-0 pointer-events-none group-hover:text-slate-700 transition-colors" />
              </div>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-slate-600 font-medium">
                <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                {miembroAsignado ? miembroAsignado.nombre : 'Sin asignar'}
              </span>
            )}
          </div>
        </div>

        {/* Acciones (Con disabled states) */}
        <div className="flex gap-2 w-full sm:w-auto" role="group" aria-label={`Acciones para la caja ${tarea.tipo_caja}`}>
          {estado === 'pendiente' && (
            <button
              onClick={() => handleEstado('en_progreso')}
              disabled={isPending}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200/90 bg-white hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[#07833F] active:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold text-slate-700 uppercase tracking-wider transition-all shadow-2xs"
            >
              <Clock className="w-3.5 h-3.5 text-slate-400" /> Iniciar
            </button>
          )}
          {estado === 'en_progreso' && (
            <button
              onClick={() => handleEstado('completado')}
              disabled={isPending}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#07833F] hover:bg-[#066e35] focus-visible:ring-2 focus-visible:ring-[#07833F] focus-visible:ring-offset-1 active:bg-[#055b2c] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-2xs"
            >
              <PackageCheck className="w-3.5 h-3.5" /> Marcar Lista
            </button>
          )}
          {estado === 'completado' && (
            <button
              onClick={() => handleEstado('pendiente')}
              disabled={isPending}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200/90 bg-white hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[#07833F] active:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold text-slate-500 uppercase tracking-wider transition-all shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" /> Reabrir
            </button>
          )}
        </div>
      </div>

      <div className="w-full bg-slate-100 h-1" aria-hidden="true">
        <div className="bg-[#07833F] h-full transition-all duration-300 ease-out" style={{ width: `${progreso}%` }} />
      </div>

      {/* Grid de Ítems Accesible (Roles Checkbox) */}
      <div 
        className="divide-y divide-slate-100" 
        role="group" 
        aria-labelledby={`titulo-caja-${tarea.id}`}
      >
        {materiales.map((item) => {
          const marcado = verificados.includes(item.nombre);
          return (
            <button
              key={item.id}
              type="button"
              role="checkbox"
              aria-checked={marcado}
              aria-disabled={estado !== 'en_progreso'} // Semantic state
              disabled={estado !== 'en_progreso' && !esCoordinador} // Visual/Interaction state
              onClick={() => handleToggle(item.nombre)}
              className={`w-full flex items-center justify-between px-5 py-3 text-left transition-colors cursor-pointer group focus-visible:outline-none focus-visible:bg-slate-100 disabled:opacity-70 disabled:cursor-not-allowed ${
                marcado ? 'bg-slate-50/50' : 'hover:bg-slate-50/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <div aria-hidden="true" className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all ${
                  marcado ? 'bg-[#07833F] border-[#07833F] text-white shadow-2xs' : 'border-slate-300 bg-white group-hover:border-slate-400 group-focus-visible:border-[#07833F]'
                }`}>
                  {marcado && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span className={`text-xs min-h-[24px] flex items-center transition-colors ${marcado ? 'text-slate-400 line-through font-normal' : 'text-[#211B20] font-medium'}`}>
                  {item.nombre}
                </span>
              </div>
              {item.es_obligatorio && (
                <span aria-label="Requerido" className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/60">
                  Req
                </span>
              )}
            </button>
          );
        })}

        {extras.map((nombreExtra) => {
          const marcado = verificados.includes(nombreExtra);
          return (
            <button
              key={nombreExtra}
              type="button"
              role="checkbox"
              aria-checked={marcado}
              disabled={estado !== 'en_progreso' && !esCoordinador}
              onClick={() => handleToggle(nombreExtra)}
              className="w-full flex items-center justify-between px-5 py-3 text-left bg-slate-50/60 hover:bg-slate-100/60 focus-visible:outline-none focus-visible:bg-slate-100 disabled:opacity-70 disabled:cursor-not-allowed transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div aria-hidden="true" className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all ${
                  marcado ? 'bg-[#07833F] border-[#07833F] text-white shadow-2xs' : 'border-slate-300 bg-white group-hover:border-slate-400 group-focus-visible:border-[#07833F]'
                }`}>
                  {marcado && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span className={`text-xs min-h-[24px] flex items-center transition-colors ${marcado ? 'text-slate-400 line-through' : 'text-slate-700 font-medium'}`}>
                  {nombreExtra}
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-600 border border-slate-300/50">
                <Sparkles className="w-2.5 h-2.5 text-slate-400" aria-hidden="true" />
                Extra
              </span>
            </button>
          );
        })}
      </div>

      <div className="p-3.5 bg-slate-50/70 border-t border-slate-100">
        {!mostrarInput ? (
          <button
            type="button"
            onClick={() => setMostrarInput(true)}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-[#07833F] focus-visible:ring-2 focus-visible:ring-[#07833F] focus-visible:outline-none rounded transition-colors px-1 py-0.5"
          >
            <Plus className="w-3.5 h-3.5" /> Agregar material imprevisto
          </button>
        ) : (
          <form onSubmit={handleCrearExtra} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={nuevoItem}
              onChange={(e) => setNuevoItem(e.target.value)}
              placeholder="Ej. Cable HDMI..."
              autoFocus
              disabled={isPending}
              className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-[#211B20] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#07833F]/20 focus:border-[#07833F] disabled:opacity-50 transition-all shadow-2xs"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isPending || !nuevoItem.trim()}
                className="flex-1 sm:flex-none px-3.5 py-1.5 bg-[#211B20] hover:bg-black active:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors shadow-2xs"
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={() => setMostrarInput(false)}
                disabled={isPending}
                className="flex-1 sm:flex-none px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-600 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors shadow-2xs"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
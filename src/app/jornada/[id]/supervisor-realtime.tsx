'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle, Clock, Calendar, User, PlusCircle, CheckSquare } from 'lucide-react';

interface Props {
  jornadaId: string;
  fechaJornada: string;
}

interface Notificacion {
  id: string;
  responsable: string;
  mensaje: string;
  caja: string;
  fecha: string;
  tipo: 'progreso' | 'completado' | 'extra' | 'check';
}

export default function SupervisorRealtime({ jornadaId, fechaJornada }: Props) {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  // Guarda el último estado conocido de cada tarea en memoria
  const tareasPrevias = useRef<Record<string, { estado: string; materiales: string[] }>>({});

  useEffect(() => {
    const supabase = createClient();

    // 1. Cargar el estado inicial de las tareas de esta jornada
    supabase
      .from('tareas_jornada')
      .select('id, estado, materiales_verificados')
      .eq('jornada_id', jornadaId)
      .then(({ data }) => {
        if (data) {
          data.forEach((t) => {
            tareasPrevias.current[t.id] = {
              estado: t.estado,
              materiales: t.materiales_verificados || [],
            };
          });
        }
      });

    // 2. Suscribirse a cambios
    const channel = supabase
      .channel('canal-supervisor-global')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tareas_jornada',
        },
        async (payload) => {
          const nuevo = payload.new as any;
          if (!nuevo || nuevo.jornada_id !== jornadaId) return;

          // Obtener nombre del usuario que ejecutó la acción
          let nombreResponsable = 'Un miembro';
          if (nuevo.usuario_id) {
            const { data: perfil } = await supabase
              .from('perfiles')
              .select('nombre')
              .eq('id', nuevo.usuario_id)
              .single();

            if (perfil?.nombre) {
              nombreResponsable = perfil.nombre;
            }
          }

          const cajaNombre = `Caja ${String(nuevo.tipo_caja).toUpperCase()}`;
          const estadoPrevio = tareasPrevias.current[nuevo.id];
          const itemsAntes: string[] = estadoPrevio?.materiales || [];
          const itemsDespues: string[] = nuevo.materiales_verificados || [];

          let textoAccion = '';
          let tipoNotif: Notificacion['tipo'] = 'check';

          if (estadoPrevio && estadoPrevio.estado !== nuevo.estado) {
            if (nuevo.estado === 'en_progreso') {
              textoAccion = `inició la preparación de la ${cajaNombre}.`;
              tipoNotif = 'progreso';
            } else if (nuevo.estado === 'completado') {
              textoAccion = `marcó como LISTA la ${cajaNombre}.`;
              tipoNotif = 'completado';
            } else {
              textoAccion = `reabrió la preparación de la ${cajaNombre}.`;
              tipoNotif = 'progreso';
            }
          } else if (itemsDespues.length > itemsAntes.length) {
            const agregados = itemsDespues.filter((item) => !itemsAntes.includes(item));
            const nombreItem = agregados[0] || 'un material extra';
            textoAccion = `agregó "${nombreItem}" a la ${cajaNombre}.`;
            tipoNotif = 'extra';
          } else if (itemsDespues.length < itemsAntes.length) {
            const quitados = itemsAntes.filter((item) => !itemsDespues.includes(item));
            const nombreItem = quitados[0] || 'un material';
            textoAccion = `desmarcó "${nombreItem}" en la ${cajaNombre}.`;
            tipoNotif = 'check';
          } else {
            textoAccion = `actualizó el inventario de la ${cajaNombre}.`;
            tipoNotif = 'check';
          }

          // Actualizar la referencia local para el próximo evento
          tareasPrevias.current[nuevo.id] = {
            estado: nuevo.estado,
            materiales: itemsDespues,
          };

          const nuevaNotif: Notificacion = {
            id: Math.random().toString(),
            responsable: nombreResponsable,
            mensaje: textoAccion,
            caja: cajaNombre,
            fecha: fechaJornada,
            tipo: tipoNotif,
          };

          setNotificaciones((prev) => [nuevaNotif, ...prev.slice(0, 2)]);

          setTimeout(() => {
            setNotificaciones((prev) => prev.filter((n) => n.id !== nuevaNotif.id));
          }, 5000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jornadaId, fechaJornada]);

  if (notificaciones.length === 0) return null;

  return (
    <aside aria-live="polite" className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {notificaciones.map((n) => (
        <div
          key={n.id}
          className={`p-4 rounded-2xl shadow-xl border backdrop-blur-sm pointer-events-auto transition-all animate-in fade-in slide-in-from-bottom-4 ${
            n.tipo === 'completado'
              ? 'bg-white border-[#07833F]/30 text-[#211B20]'
              : n.tipo === 'extra'
              ? 'bg-white border-[#E0B84F]/50 text-[#211B20]'
              : 'bg-white border-slate-200 text-[#211B20]'
          }`}
        >
          {/* Encabezado */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2.5">
            <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              <Calendar className="w-3.5 h-3.5 text-[#07833F]" />
              Jornada: {n.fecha}
            </span>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#F4F3EF] text-slate-600 border border-slate-200">
              En vivo
            </span>
          </div>

          {/* Cuerpo */}
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                n.tipo === 'completado'
                  ? 'bg-[#07833F]/10 text-[#07833F]'
                  : n.tipo === 'extra'
                  ? 'bg-[#E0B84F]/15 text-[#9a761e]'
                  : n.tipo === 'progreso'
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-[#F4F3EF] text-slate-600'
              }`}
            >
              {n.tipo === 'completado' && <CheckCircle className="w-5 h-5" />}
              {n.tipo === 'extra' && <PlusCircle className="w-5 h-5" />}
              {n.tipo === 'progreso' && <Clock className="w-5 h-5" />}
              {n.tipo === 'check' && <CheckSquare className="w-5 h-5" />}
            </div>

            <div className="space-y-0.5 text-xs">
              <p className="flex items-center gap-1.5 font-bold text-[#211B20]">
                <User className="w-3.5 h-3.5 text-slate-400" />
                {n.responsable}
              </p>
              <p className="text-slate-600 leading-snug">
                {n.mensaje}
              </p>
            </div>
          </div>
        </div>
      ))}
    </aside>
  );
}
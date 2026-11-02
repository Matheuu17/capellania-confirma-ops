import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { actualizarPerfil } from '../actions'; // Asegúrate de que actualizarPerfil esté en tus actions.ts
import { ShieldCheck, UserCircle, Mail } from 'lucide-react';

export default async function PerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('nombre, rol')
    .eq('id', user.id)
    .single();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 space-y-6 animate-in fade-in duration-300">
      
      {/* Header del Módulo */}
      <div>
        <h1 className="text-lg font-bold tracking-tight text-[#211B20]">
          Configuración de Cuenta
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Gestiona tus datos personales y credenciales de acceso.
        </p>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
        
        {/* Cabecera de la Tarjeta */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <UserCircle className="w-4 h-4 text-slate-400" aria-hidden="true" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Información del Perfil
          </h2>
        </div>

        {/* Cuerpo / Formulario */}
        <div className="p-6 sm:p-8">
          <form action={actualizarPerfil} className="space-y-6 max-w-md">
            
            {/* Campo: Nombre (Editable) */}
            <div className="space-y-1.5">
              <label htmlFor="nombre" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Nombre Completo
              </label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                defaultValue={perfil?.nombre}
                required
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-[#211B20] focus:outline-none focus:ring-2 focus:ring-[#07833F]/20 focus:border-[#07833F] transition-all shadow-2xs"
              />
              <p className="text-[10px] text-slate-400 font-medium">
                Este nombre es el que verán los coordinadores en los reportes de asistencia y tareas.
              </p>
            </div>

            {/* Campo: Correo (Solo Lectura) */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  id="email"
                  type="email"
                  defaultValue={user.email}
                  disabled
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500 cursor-not-allowed opacity-80"
                  aria-disabled="true"
                />
              </div>
            </div>

            {/* Rol Institucional */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Rol Institucional
              </label>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200/80">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                  {perfil?.rol || 'Miembro'}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  (Asignado por sistema)
                </span>
              </div>
            </div>

            {/* Botón de Guardar */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 bg-[#211B20] hover:bg-black active:bg-slate-800 text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#211B20]"
              >
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
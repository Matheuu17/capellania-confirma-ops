import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { actualizarPerfil } from '../actions';
import {
  ShieldCheck,
  Mail,
  Calendar,
  Lock,
  KeyRound,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export default async function PerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('nombre, rol')
    .eq('id', user.id)
    .single();

  const nombreUsuario = perfil?.nombre || 'Miembro de Pastoral';
  const rolUsuario = perfil?.rol === 'coordinador' ? 'Coordinador general' : 'Miembro de pastoral';

  // Obtener iniciales para el avatar
  const iniciales = nombreUsuario
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n: string) => n[0] || '')
    .join('')
    .toUpperCase() || 'M';

  // Fechas contextuales formateadas
  const fechaCreacion = user.created_at
    ? new Date(user.created_at).toLocaleDateString('es-PE', {
        month: 'long',
        year: 'numeric',
      })
    : 'Octubre 2026';

  const ultimoAcceso = user.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : 'Hoy';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Encabezado de Página */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1F1A17]">
          Mi Perfil
        </h1>
        <p className="text-[13px] text-[#667085] mt-0.5">
          Información personal y credenciales de acceso institucional.
        </p>
      </div>

      {/* 2. Mini-Ficha de Identidad Visual */}
      <div className="bg-white rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
        <div className="w-16 h-16 rounded-2xl bg-[#1F1A17] text-white flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
          <span className="tracking-wider">{iniciales}</span>
        </div>

        <div className="space-y-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h2 className="text-lg font-bold text-[#1F1A17]">
              {nombreUsuario}
            </h2>
            <span className="inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#DDF4E4] text-[#0B8A43] self-center sm:self-auto">
              <ShieldCheck className="w-3.5 h-3.5" />
              {rolUsuario}
            </span>
          </div>

          <p className="text-xs text-[#667085] font-mono">
            {user.email}
          </p>

          <p className="text-[11px] text-[#667085] pt-1">
            Miembro activo en Capellanía Ops desde {fechaCreacion}.
          </p>
        </div>
      </div>

      {/* 3. Formulario de Datos Personales */}
      <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-[#FAFAF7]/50">
          <h2 className="text-xs font-bold text-[#1F1A17] uppercase tracking-wider">
            Datos de la cuenta
          </h2>
        </div>

        <div className="p-6 sm:p-8">
          <form action={actualizarPerfil} className="space-y-5 max-w-lg">
            
            {/* Campo Nombre: Editable */}
            <div className="space-y-1.5">
              <label htmlFor="nombre" className="block text-xs font-semibold text-[#667085]">
                Nombre completo
              </label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                defaultValue={perfil?.nombre || ''}
                required
                className="w-full px-3.5 py-2.5 bg-[#FAFAF7] border border-slate-200/90 rounded-xl text-sm text-[#1F1A17] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B8A43]/20 focus:border-[#0B8A43] transition-colors"
              />
              <p className="text-[11px] text-[#667085]">
                Este es el nombre visible en las listas de asistencia, asignaciones de cajas y actas de jornada.
              </p>
            </div>

            {/* Campo Correo: Claramente no editable */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-xs font-semibold text-[#667085]">
                Correo electrónico institucional
              </label>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-[#667085]">
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-mono text-[#1F1A17] text-xs">{user.email}</span>
                </div>
                <span className="text-[10px] font-semibold text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200/60">
                  Solo lectura
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                El correo está vinculado a tu acceso institucional y no puede modificarse desde aquí.
              </p>
            </div>

            {/* Botón CTA Verde Institucional */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 bg-[#0B8A43] hover:bg-[#097337] active:bg-[#075f2d] text-white rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors shadow-xs cursor-pointer"
              >
                Guardar cambios
              </button>

              <span className="text-[11px] text-[#667085] hidden sm:inline">
                Los cambios se aplican de inmediato
              </span>
            </div>
          </form>
        </div>
      </div>

      {/* 4. Segunda Sección: Seguridad y Contexto de Acceso */}
      <div className="bg-white rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-slate-100 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Lock className="w-4 h-4 text-[#D9A321]" />
          <h2 className="text-xs font-bold text-[#1F1A17] uppercase tracking-wider">
            Seguridad y sesión
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div className="p-3.5 rounded-xl bg-[#FAFAF7] border border-slate-100 space-y-1">
            <span className="text-[11px] text-[#667085] flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-[#0B8A43]" />
              Autenticación
            </span>
            <p className="text-xs font-semibold text-[#1F1A17]">Protegida por Supabase</p>
            <p className="text-[10px] text-slate-400">Cifrado de credenciales activo</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAFAF7] border border-slate-100 space-y-1">
            <span className="text-[11px] text-[#667085] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#D9A321]" />
              Último acceso
            </span>
            <p className="text-xs font-semibold text-[#1F1A17] capitalize">{ultimoAcceso}</p>
            <p className="text-[10px] text-slate-400">Sesión web iniciada</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAFAF7] border border-slate-100 space-y-1">
            <span className="text-[11px] text-[#667085] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Alta en el sistema
            </span>
            <p className="text-xs font-semibold text-[#1F1A17] capitalize">{fechaCreacion}</p>
            <p className="text-[10px] text-slate-400">Cuenta activa y verificada</p>
          </div>
        </div>
      </div>

      {/* 5. Cierre Manuscrito */}
      <div className="text-center pt-6">
        <span className="font-[family-name:var(--font-handwritten)] text-[18px] text-stone-400 select-none">
          “Llamados a servir con alegría”
        </span>
      </div>
    </div>
  );
}
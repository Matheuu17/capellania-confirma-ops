import { login, signup } from './actions';
import { Package, ShieldCheck } from 'lucide-react';

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const errorMessage = params?.error;

  return (
    <div className="min-h-screen bg-[#F4F3EF] flex flex-col justify-center items-center p-4 font-sans selection:bg-[#07833F]/15 selection:text-[#07833F]">
      <div className="w-full max-w-[400px]">
        {/* Cabecera / Identidad SaaS */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-11 h-11 bg-white border border-slate-200/90 rounded-xl flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.04)] mb-3.5">
            <Package className="w-5 h-5 text-[#07833F]" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#211B20]">
            Capellanía Ops
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Plataforma logística y gestión operativa
          </p>
        </div>

        {/* Contenedor Principal (Panel Holded / Odoo style) */}
        <div className="bg-white border border-slate-200/80 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="p-6 sm:p-7">
            {errorMessage && (
              <div className="mb-5 p-3 bg-rose-50/80 border border-rose-200/70 rounded-lg text-xs text-rose-700 font-medium leading-relaxed">
                {errorMessage}
              </div>
            )}

            <form className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="nombre"
                  className="block text-[11px] font-bold uppercase tracking-wider text-slate-500"
                >
                  Nombre Completo <span className="font-normal text-slate-400 normal-case">(solo registro)</span>
                </label>
                <input
                  id="nombre"
                  name="nombre"
                  type="text"
                  autoComplete="name"
                  placeholder="Ej. Matías Alcala"
                  className="w-full px-3.5 py-2 bg-slate-50/60 border border-slate-200 rounded-lg text-sm text-[#211B20] placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#07833F]/15 focus:border-[#07833F] transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-[11px] font-bold uppercase tracking-wider text-slate-500"
                >
                  Correo Electrónico
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="usuario@confirma.com"
                  className="w-full px-3.5 py-2 bg-slate-50/60 border border-slate-200 rounded-lg text-sm text-[#211B20] placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#07833F]/15 focus:border-[#07833F] transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="block text-[11px] font-bold uppercase tracking-wider text-slate-500"
                >
                  Contraseña
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 bg-slate-50/60 border border-slate-200 rounded-lg text-sm text-[#211B20] placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#07833F]/15 focus:border-[#07833F] transition-all"
                />
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  formAction={login}
                  className="w-full py-2.5 bg-[#07833F] hover:bg-[#066e35] active:bg-[#055b2c] text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors shadow-xs cursor-pointer"
                >
                  Iniciar Sesión
                </button>
                <button
                  type="submit"
                  formAction={signup}
                  className="w-full py-2.5 bg-white border border-slate-200 hover:bg-slate-50 active:bg-slate-100 text-[#211B20] rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors shadow-2xs cursor-pointer"
                >
                  Crear Cuenta
                </button>
              </div>
            </form>
          </div>

          {/* Footer de seguridad integrado */}
          <div className="bg-slate-50/80 border-t border-slate-100 px-6 py-3 flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-[#07833F]" />
            <span>Acceso autenticado y cifrado</span>
          </div>
        </div>
      </div>
    </div>
  );
}
import { login, signup } from './actions';
import { ShieldCheck, Package } from 'lucide-react';
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/login');
}

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const errorMessage = params?.error;

  return (
    <div className="min-h-screen bg-[#F4F3EF] flex flex-col justify-center items-center px-4 font-sans text-[#211B20]">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        
        {/* Cabecera */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-12 h-12 bg-[#07833F]/10 border border-[#07833F]/20 text-[#07833F] rounded-2xl flex items-center justify-center mb-3">
            <Package className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#211B20]">Capellanía Ops</h1>
          <p className="text-sm text-slate-500 mt-1">Gestión logística y preparación de jornadas</p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
            {errorMessage}
          </div>
        )}

        <form className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="nombre">
              Nombre Completo (solo registro)
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              placeholder="Ej. Matías Alcala"
              className="w-full px-3.5 py-2.5 bg-[#F4F3EF]/60 border border-slate-200 rounded-xl text-[#211B20] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#07833F] text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="email">
              Correo Electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="tu@correo.com"
              className="w-full px-3.5 py-2.5 bg-[#F4F3EF]/60 border border-slate-200 rounded-xl text-[#211B20] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#07833F] text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-[#F4F3EF]/60 border border-slate-200 rounded-xl text-[#211B20] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#07833F] text-sm"
            />
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <button
              formAction={login}
              className="w-full py-2.5 bg-[#07833F] hover:bg-[#066e35] text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-[#07833F]/20 cursor-pointer"
            >
              Iniciar Sesión
            </button>
            <button
              formAction={signup}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-[#211B20] rounded-xl text-sm font-medium transition-colors border border-slate-200 cursor-pointer"
            >
              Registrarse
            </button>
          </div>
        </form>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-[#07833F]" />
          <span>Acceso seguro mediante Supabase Auth</span>
        </div>
      </div>
    </div>
  );
}
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import NavLinks from './nav-links';
import { signOut } from './actions';
import { Package, LogOut } from 'lucide-react';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('nombre, rol')
    .eq('id', user.id)
    .single();

  return (
    <div className="flex h-screen bg-[#F4F3EF] overflow-hidden selection:bg-[#07833F]/15 selection:text-[#07833F]">
      
      {/* 🖥️ Sidebar Desktop (Oculto en móviles) */}
      <aside className="hidden sm:flex w-64 bg-white border-r border-slate-200/80 flex-col z-20">
        {/* Branding ERP */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-100">
          <div className="w-8 h-8 bg-[#211B20] text-white rounded-lg flex items-center justify-center shadow-xs">
            <Package className="w-4 h-4" aria-hidden="true" />
          </div>
          <span className="text-sm font-bold tracking-tight text-[#211B20]">
            Capellanía Ops
          </span>
        </div>

        {/* Navegación Lateral */}
        <nav className="flex-1 px-4 py-6 space-y-1.5" aria-label="Navegación principal">
          <NavLinks />
        </nav>

        {/* Perfil y Salida (Abajo) */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <div className="w-8 h-8 rounded-md bg-[#07833F]/10 text-[#07833F] flex items-center justify-center font-bold text-xs border border-[#07833F]/20">
              {(perfil?.nombre || user.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[#211B20] truncate w-32 leading-none">
                {perfil?.nombre || user.email}
              </span>
              <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 mt-1">
                {perfil?.rol || 'miembro'}
              </span>
            </div>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              <span>Cerrar Sesión</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Área Principal de Contenido */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* 📱 Topbar Mobile (Solo visible en celular) */}
        <header className="sm:hidden h-14 bg-white border-b border-slate-200/80 flex items-center justify-between px-4 z-20">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#211B20]" aria-hidden="true" />
            <span className="text-sm font-bold tracking-tight text-[#211B20]">
              Capellanía Ops
            </span>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              aria-label="Cerrar Sesión"
              className="p-2 text-slate-400 hover:text-rose-600 bg-slate-50 rounded-lg border border-slate-200/80"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
            </button>
          </form>
        </header>

        {/* Contenido Inyectado (Jornadas o Asistencia) */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative pb-16 sm:pb-0">
          {children}
        </main>

        {/* 📱 Bottom Navigation Mobile (PWA) */}
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-md border-t border-slate-200/80 z-30 pb-safe flex justify-around items-center px-2 shadow-[0_-4px_24px_rgba(0,0,0,0.04)]">
          <NavLinks />
        </nav>
      </div>
    </div>
  );
}
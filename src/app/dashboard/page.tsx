import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { signOut, crearJornada } from './actions';
import { Calendar, Package, LogOut, Plus, ChevronRight, User } from 'lucide-react';

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('id, nombre, rol')
    .eq('id', user.id)
    .single();

  const { data: jornadas } = await supabase
    .from('jornadas')
    .select(`
      *,
      tareas_jornada (
        id,
        tipo_caja,
        estado
      )
    `)
    .order('fecha', { ascending: false });

  const esCoordinador = perfil?.rol === 'coordinador';

  return (
    <div className="min-h-screen bg-[#F4F3EF] text-[#211B20] font-sans">
      {/* Barra de Navegación Superior */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-10 px-4 py-3 sm:px-8 flex justify-between items-center shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#07833F]/10 border border-[#07833F]/20 text-[#07833F] rounded-xl flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#211B20]">Confirma!</h1>
            <p className="text-xs text-slate-500">Gestión logística y preparación</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-[#211B20]">{perfil?.nombre || user.email}</p>
            <span className="text-xs uppercase tracking-wider px-2 py-0.5 rounded bg-[#07833F]/10 text-[#07833F] border border-[#07833F]/20 font-semibold">
              {perfil?.rol || 'miembro'}
            </span>
          </div>
          <form action={signOut}>
            <button
              title="Cerrar sesión"
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors border border-slate-200"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </header>

      {/* Contenedor Principal */}
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        
        {/* Formulario Nueva Jornada (Solo Coordinador) */}
        {esCoordinador && (
          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-bold text-[#211B20] flex items-center gap-2 mb-4">
              <Plus className="w-4 h-4 text-[#07833F]" />
              Programar Nueva Jornada
            </h2>

            <form action={crearJornada} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1" htmlFor="fecha">
                  Fecha de la Jornada
                </label>
                <input
                  id="fecha"
                  name="fecha"
                  type="date"
                  required
                  className="w-full px-3.5 py-2.5 bg-[#F4F3EF]/60 border border-slate-200 rounded-xl text-[#211B20] text-sm focus:outline-none focus:ring-2 focus:ring-[#07833F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1" htmlFor="ponente">
                  Charlista / Ponente
                </label>
                <input
                  id="ponente"
                  name="ponente"
                  type="text"
                  required
                  placeholder="Ej. Padre Juan / Expositor"
                  className="w-full px-3.5 py-2.5 bg-[#F4F3EF]/60 border border-slate-200 rounded-xl text-[#211B20] placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#07833F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1" htmlFor="dinamica">
                  Dinámica de Apertura
                </label>
                <input
                  id="dinamica"
                  name="dinamica"
                  type="text"
                  placeholder="Ej. Dinámica de integración"
                  className="w-full px-3.5 py-2.5 bg-[#F4F3EF]/60 border border-slate-200 rounded-xl text-[#211B20] placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#07833F]"
                />
              </div>

              <div className="sm:col-span-3 flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#07833F] hover:bg-[#066e35] text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-[#07833F]/20 cursor-pointer"
                >
                  Crear Jornada y Generar Cajas
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Listado de Jornadas */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-[#211B20] flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-500" />
            Jornadas Registradas
          </h2>

          {jornadas && jornadas.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {jornadas.map((j) => (
                <div
                  key={j.id}
                  className="bg-white border border-slate-200 hover:border-slate-300 p-5 rounded-2xl transition-all shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-[#211B20]">{j.fecha}</span>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize ${
                        j.estado === 'planificacion' ? 'bg-[#E0B84F]/15 text-[#9a761e] border border-[#E0B84F]/30' :
                        j.estado === 'en_curso' ? 'bg-[#07833F]/15 text-[#07833F] border border-[#07833F]/30' :
                        'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {j.estado}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">
                      Ponente: <span className="font-semibold text-[#211B20]">{j.ponente}</span>
                    </p>
                    {j.dinamica_apertura && (
                      <p className="text-xs text-slate-500">Dinámica: {j.dinamica_apertura}</p>
                    )}
                  </div>

                  {/* Estado de las Cajas */}
                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="flex gap-1.5">
                      {j.tareas_jornada?.map((tarea: any) => (
                        <span
                          key={tarea.id}
                          title={`Caja ${tarea.tipo_caja}: ${tarea.estado}`}
                          className={`text-xs px-2.5 py-1 rounded-lg border capitalize font-medium ${
                            tarea.estado === 'completado'
                              ? 'bg-[#07833F]/10 border-[#07833F]/30 text-[#07833F]'
                              : 'bg-[#F4F3EF] border-slate-200 text-slate-600'
                          }`}
                        >
                          {tarea.tipo_caja}
                        </span>
                      ))}
                    </div>

                    <Link
                      href={`/jornada/${j.id}`}
                      className="flex items-center gap-1 text-sm font-semibold text-[#07833F] hover:text-[#066e35] transition-colors"
                    >
                      <span>Gestionar</span>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl text-slate-500 text-sm">
              No hay jornadas registradas aún. Programa la primera arriba.
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
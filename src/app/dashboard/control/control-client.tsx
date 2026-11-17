
'use client';

import { useMemo, useState } from 'react';
import type { MiembroConMetricas, KpisGlobales } from './page';

import {
  Users,
  AlertTriangle,
  Package,
  CheckCircle2,
  Download,
  Search,
  ChevronRight,
  UserCheck,
  Clock,
  X,
} from 'lucide-react';

type FiltroTab = 'todos' | 'riesgo' | 'con_cajas';

interface Props {
  miembrosIniciales: MiembroConMetricas[];
  kpis: KpisGlobales;
}

const TABS: { id: FiltroTab; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'riesgo', label: 'En seguimiento' },
  { id: 'con_cajas', label: 'Con cajas' },
];

// Centralizar la lógica de seguimiento
function esMiembroEnRiesgo(m: MiembroConMetricas) {
  return (
    m.estado_cuenta === 'activo' &&
    (
      m.faltasConsecutivas >= 2 ||
      (m.totalAsistencias > 0 && m.porcentajePuntualidad < 60)
    )
  );
}

// Obtener iniciales
function obtenerIniciales(nombre: string) {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0] || '')
    .join('')
    .toUpperCase();
}

// Exportación CSV segura
function escaparCSV(valor: unknown) {
  let texto = String(valor ?? '');

  if (/^[=+\-@\t\r]/.test(texto)) {
    texto = `'${texto}`;
  }

  return `"${texto.replace(/"/g, '""')}"`;
}

function exportarCSV(miembros: MiembroConMetricas[]) {
  const encabezados = [
    'Nombre',
    'Email',
    'Rol',
    'Estado',
    'Puntuales',
    'Tardanzas',
    'Faltas',
    'Puntualidad %',
    'Cajas asignadas',
  ];

  const filas = miembros.map((m) => [
    m.nombre,
    m.email,
    m.rol,
    m.estado_cuenta,
    m.puntuales,
    m.tardanzas,
    m.faltas,
    `${m.porcentajePuntualidad}%`,
    m.cajasAsignadas,
  ]);

  const contenido = [
    encabezados.map(escaparCSV).join(','),
    ...filas.map((fila) => fila.map(escaparCSV).join(',')),
  ].join('\r\n');

  const blob = new Blob(['\uFEFF' + contenido], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `equipo_capellania_${new Date().toISOString().split('T')[0]}.csv`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

export default function ControlClient({
  miembrosIniciales,
  kpis,
}: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroTab, setFiltroTab] = useState<FiltroTab>('todos');

  // Miembros que requieren seguimiento
  const miembrosEnRiesgo = useMemo(
    () => miembrosIniciales.filter(esMiembroEnRiesgo),
    [miembrosIniciales]
  );

  // Contadores de filtros
  const contadores = useMemo(() => ({
    todos: miembrosIniciales.length,
    riesgo: miembrosEnRiesgo.length,
    con_cajas: miembrosIniciales.filter(
      (m) => m.cajasAsignadas > 0
    ).length,
  }), [miembrosIniciales, miembrosEnRiesgo]);

  // Filtrado reactivo
  const miembrosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return miembrosIniciales.filter((m) => {
      const coincideTexto =
        m.nombre.toLowerCase().includes(texto) ||
        m.email.toLowerCase().includes(texto);

      if (!coincideTexto) return false;

      if (filtroTab === 'riesgo') {
        return esMiembroEnRiesgo(m);
      }

      if (filtroTab === 'con_cajas') {
        return m.cajasAsignadas > 0;
      }

      return true;
    });
  }, [miembrosIniciales, busqueda, filtroTab]);

  // Ir directamente a la ficha mediante el buscador
  const verFicha = (nombre: string) => {
    setBusqueda(nombre);
    setFiltroTab('todos');

    document.getElementById('directorio-miembros')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <div className="space-y-6">

      {/* 1. RESUMEN GENERAL */}

      <section className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">

        <div className="flex flex-wrap items-center gap-2.5">

          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#FAFAF7] border border-slate-200/60 text-xs">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-bold text-[#1F1A17]">
              {kpis.activos}
            </span>
            <span className="text-[#667085]">activos</span>
          </div>

          <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs border ${
            miembrosEnRiesgo.length > 0
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : 'bg-[#DDF4E4]/50 text-[#0B8A43] border-[#0B8A43]/20'
          }`}>
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="font-bold">
              {miembrosEnRiesgo.length}
            </span>
            <span>
              {miembrosEnRiesgo.length === 1
                ? 'en seguimiento'
                : 'en seguimiento'}
            </span>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#FAFAF7] border border-slate-200/60 text-xs">
            <Package className="w-3.5 h-3.5 text-[#D9A321]" />
            <span className="font-bold text-[#1F1A17]">
              {kpis.totalCajasAsignadas}
            </span>
            <span className="text-[#667085]">
              cajas asignadas
            </span>
          </div>

        </div>

        <button
          type="button"
          onClick={() => exportarCSV(miembrosFiltrados)}
          disabled={miembrosFiltrados.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#667085] hover:text-[#1F1A17] hover:bg-slate-50 border border-slate-200/70 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Descargar miembros filtrados en CSV"
        >
          <Download className="w-3.5 h-3.5" />
          Exportar CSV
        </button>

      </section>


      {/* 2. SEGUIMIENTO PRIORITARIO */}

      {miembrosEnRiesgo.length > 0 ? (

        <section className="bg-[#FFF6E5] border border-[#F8E7C6] rounded-2xl p-5 space-y-4">

          <div className="flex items-center justify-between gap-2 flex-wrap">

            <div className="flex items-center gap-2 text-xs font-bold text-[#B98517] uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4" />
              <span>
                Miembros que necesitan seguimiento
              </span>
            </div>

            <span className="text-[11px] font-semibold text-[#B98517] bg-white/70 px-2.5 py-1 rounded-lg">
              {miembrosEnRiesgo.length} miembros
            </span>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

            {miembrosEnRiesgo.map((m) => (

              <div
                key={m.id}
                className="bg-white/95 p-3.5 rounded-xl border border-[#F8E7C6] flex items-center justify-between gap-3 shadow-sm"
              >

                <div className="min-w-0">

                  <h3 className="text-xs font-bold text-[#1F1A17] truncate">
                    {m.nombre}
                  </h3>

                  <p className="text-[11px] text-rose-600 font-medium mt-1">
                    {m.faltasConsecutivas >= 2
                      ? `${m.faltasConsecutivas} inasistencias consecutivas`
                      : `Puntualidad baja (${m.porcentajePuntualidad}%)`}
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() => verFicha(m.nombre)}
                  className="shrink-0 text-[11px] font-semibold text-[#0B8A43] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B8A43]"
                  aria-label={`Ver ficha de ${m.nombre}`}
                >
                  Ver ficha
                </button>

              </div>

            ))}

          </div>

        </section>

      ) : (

        <div className="flex items-center gap-2.5 px-4 py-3 bg-[#DDF4E4]/40 border border-[#0B8A43]/20 rounded-2xl text-xs text-[#0B8A43]">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-medium">
            <strong>Todo el equipo al día.</strong>{' '}
            No hay alertas de seguimiento según los criterios actuales.
          </span>
        </div>

      )}


      {/* 3. DIRECTORIO Y FILTROS */}

      <section id="directorio-miembros" className="space-y-4 scroll-mt-6">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

          <div className="flex flex-wrap items-center gap-2">

            {TABS.map((tab) => {

              const activo = filtroTab === tab.id;

              return (

                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFiltroTab(tab.id)}
                  aria-pressed={activo}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                    activo
                      ? 'bg-[#1F1A17] text-white shadow-sm'
                      : 'bg-white text-[#667085] hover:bg-slate-50 border border-slate-100'
                  }`}
                >

                  {tab.label}

                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                    activo
                      ? 'bg-white/15 text-white'
                      : 'bg-slate-100 text-[#667085]'
                  }`}>
                    {contadores[tab.id]}
                  </span>

                </button>

              );

            })}

          </div>


          {/* BUSCADOR */}

          <div className="relative w-full sm:w-64">

            <Search className="w-3.5 h-3.5 text-[#667085] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />

            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar miembro..."
              aria-label="Buscar miembro por nombre o correo"
              className="w-full pl-8 pr-9 py-2 bg-white border border-slate-200/80 rounded-xl text-xs text-[#1F1A17] placeholder:text-[#667085] focus:ring-2 focus:ring-[#0B8A43]/20 focus:border-[#0B8A43] outline-none transition-colors"
            />

            {busqueda && (

              <button
                type="button"
                onClick={() => setBusqueda('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                aria-label="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>

            )}

          </div>

        </div>


        {/* RESULTADOS */}

        <div className="flex items-center justify-between text-[11px] text-[#667085]">

          {busqueda && (
            <button
              type="button"
              onClick={() => {
                setBusqueda('');
                setFiltroTab('todos');
              }}
              className="font-medium text-[#0B8A43] hover:underline"
            >
              Limpiar filtros
            </button>
          )}

        </div>


        {/* 4. TABLA ESCRITORIO */}

        <div className="hidden md:block bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden">

          <div className="grid grid-cols-12 gap-4 px-6 py-3.5 border-b border-slate-100 text-[10px] font-bold text-[#667085] uppercase tracking-wider">

            <div className="col-span-4">
              Miembro
            </div>

            <div className="col-span-3">
              Estado
            </div>

            <div className="col-span-3">
              Historial presencial
            </div>

            <div className="col-span-2 text-right">
              Cajas a cargo
            </div>

          </div>


          {miembrosFiltrados.length > 0 ? (

            <div className="divide-y divide-slate-100">

              {miembrosFiltrados.map((m) => {

                const enAlerta = esMiembroEnRiesgo(m);
                const iniciales = obtenerIniciales(m.nombre);

                return (

                  <div
                    key={m.id}
                    className="grid grid-cols-12 gap-4 items-center px-6 py-4 hover:bg-slate-50/60 transition-colors"
                  >

                    {/* MIEMBRO */}

                    <div className="col-span-4 flex items-center gap-3 min-w-0">

                      <div className="w-10 h-10 rounded-full bg-[#FAFAF7] border border-slate-200 text-[#1F1A17] flex items-center justify-center font-bold text-xs shrink-0">
                        {iniciales}
                      </div>

                      <div className="min-w-0">

                        <span className="text-sm font-semibold text-[#1F1A17] block truncate">
                          {m.nombre}
                        </span>

                        <span className="text-xs text-[#667085] block truncate">
                          {m.rol === 'coordinador'
                            ? 'Coordinador'
                            : 'Miembro de pastoral'}
                        </span>

                      </div>

                    </div>


                    {/* ESTADO */}

                    <div className="col-span-3 flex items-center">

                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium ${
                        enAlerta
                          ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                          : m.estado_cuenta === 'activo'
                          ? 'bg-[#DDF4E4] text-[#0B8A43]'
                          : 'bg-slate-100 text-slate-500'
                      }`}>

                        <span className={`w-1.5 h-1.5 rounded-full ${
                          enAlerta
                            ? 'bg-rose-600'
                            : m.estado_cuenta === 'activo'
                            ? 'bg-[#0B8A43]'
                            : 'bg-slate-400'
                        }`} />

                        {enAlerta
                          ? 'Requiere seguimiento'
                          : m.estado_cuenta === 'activo'
                          ? 'Activo'
                          : 'Inactivo'}

                      </span>

                    </div>


                    {/* HISTORIAL */}

                    <div className="col-span-3 min-w-0">

                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1F1A17]">

                        <UserCheck className="w-3.5 h-3.5 text-[#0B8A43]" />

                        {m.puntuales + m.tardanzas} asistencias

                      </div>

                      <div className="flex items-center gap-1.5 mt-1">

                        <Clock className="w-3 h-3 text-[#667085]" />

                        <span className="text-[11px] text-[#667085]">
                          {m.porcentajePuntualidad}% puntualidad
                        </span>

                        <span className="text-[11px] text-[#667085]">
                          · {m.faltas} faltas
                        </span>

                      </div>

                    </div>


                    {/* CAJAS */}

                    <div className="col-span-2 flex justify-end">

                      {m.cajasAsignadas > 0 ? (

                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#FFF4D6] text-[#B98517] border border-[#D9A321]/30">

                          <Package className="w-3.5 h-3.5" />

                          {m.cajasAsignadas}{' '}
                          {m.cajasAsignadas === 1 ? 'caja' : 'cajas'}

                        </span>

                      ) : (

                        <span className="text-xs text-[#667085]/60 italic">
                          Sin asignación
                        </span>

                      )}

                    </div>

                  </div>

                );

              })}

            </div>

          ) : (

            <div className="p-12 text-center">

              <Users className="w-8 h-8 text-slate-300 mx-auto mb-3" />

              <p className="text-sm font-semibold text-[#1F1A17]">
                No se encontraron miembros
              </p>

              <p className="text-xs text-[#667085] mt-1">
                Prueba con otro nombre o cambia los filtros.
              </p>

            </div>

          )}

        </div>


        {/* 5. TARJETAS MOVIL */}

        <div className="md:hidden space-y-3">

          {miembrosFiltrados.length > 0 ? (

            miembrosFiltrados.map((m) => {

              const enAlerta = esMiembroEnRiesgo(m);

              return (

                <article
                  key={m.id}
                  className="bg-white border border-slate-100 rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-3"
                >

                  <div className="flex items-center justify-between gap-3">

                    <div className="flex items-center gap-3 min-w-0">

                      <div className="w-10 h-10 rounded-full bg-[#FAFAF7] border border-slate-200 text-[#1F1A17] flex items-center justify-center font-bold text-xs shrink-0">
                        {obtenerIniciales(m.nombre)}
                      </div>

                      <div className="min-w-0">

                        <h3 className="text-sm font-semibold text-[#1F1A17] truncate">
                          {m.nombre}
                        </h3>

                        <p className="text-[11px] text-[#667085]">
                          {m.rol === 'coordinador'
                            ? 'Coordinador'
                            : 'Miembro de pastoral'}
                        </p>

                      </div>

                    </div>

                    <span className={`shrink-0 text-[10px] px-2 py-1 rounded-md font-medium ${
                      enAlerta
                        ? 'bg-rose-50 text-rose-700'
                        : m.estado_cuenta === 'activo'
                        ? 'bg-[#DDF4E4] text-[#0B8A43]'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {enAlerta
                        ? 'Seguimiento'
                        : m.estado_cuenta === 'activo'
                        ? 'Activo'
                        : 'Inactivo'}
                    </span>

                  </div>


                  <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-100">

                    <div>
                      <p className="text-[10px] text-[#667085] mb-1">
                        Asistencias
                      </p>
                      <p className="text-sm font-bold text-[#1F1A17]">
                        {m.puntuales + m.tardanzas}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-[#667085] mb-1">
                        Puntualidad
                      </p>
                      <p className="text-sm font-bold text-[#1F1A17]">
                        {m.porcentajePuntualidad}%
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-[#667085] mb-1">
                        Inasistencias
                      </p>
                      <p className="text-sm font-bold text-[#1F1A17]">
                        {m.faltas}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-[#667085] mb-1">
                        Cajas asignadas
                      </p>
                      <p className="text-sm font-bold text-[#B98517]">
                        {m.cajasAsignadas}
                      </p>
                    </div>

                  </div>

                  {enAlerta && (

                    <div className="flex items-center gap-2 text-[11px] text-rose-600">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      {m.faltasConsecutivas >= 2
                        ? `${m.faltasConsecutivas} inasistencias consecutivas`
                        : 'Revisar puntualidad'}
                    </div>

                  )}

                </article>

              );

            })

          ) : (

            <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center">

              <Search className="w-7 h-7 text-slate-300 mx-auto mb-2" />

              <p className="text-sm font-semibold text-[#1F1A17]">
                No se encontraron miembros
              </p>

              <p className="text-xs text-[#667085] mt-1">
                Intenta modificar los filtros.
              </p>

            </div>

          )}

        </div>

      </section>

    </div>
  );
}

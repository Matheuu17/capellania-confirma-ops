'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/* ==========================================================================
   1. GESTIÓN OPERATIVA DE LA JORNADA
   ========================================================================== */

export async function actualizarDatosJornada(formData: FormData) {
  const supabase = await createClient();

  const jornadaId = formData.get('jornadaId') as string;
  const fecha = formData.get('fecha') as string;
  const ponente = (formData.get('ponente') as string)?.trim();
  const dinamica = (formData.get('dinamica') as string)?.trim() || null;

  // Leer las cajas seleccionadas en los checkboxes
  const cajasSeleccionadas = formData.getAll('cajas') as string[];

  if (!jornadaId) return;

  // 1. Actualizar datos principales de la jornada
  const { error: errJornada } = await supabase
    .from('jornadas')
    .update({
      fecha,
      ponente,
      dinamica_apertura: dinamica,
    })
    .eq('id', jornadaId);

  if (errJornada) {
    throw new Error(`Error al actualizar jornada: ${errJornada.message}`);
  }

  // 2. Sincronizar las cajas activas de esta jornada
  const { data: tareasActuales } = await supabase
    .from('tareas_jornada')
    .select('id, tipo_caja')
    .eq('jornada_id', jornadaId);

  const existentes = tareasActuales || [];
  const tiposActuales = new Set(existentes.map((t) => t.tipo_caja));

  // A) Cajas que el usuario desmarcó -> Eliminarlas
  const aEliminar = existentes.filter((t) => !cajasSeleccionadas.includes(t.tipo_caja));
  if (aEliminar.length > 0) {
    await supabase
      .from('tareas_jornada')
      .delete()
      .in('id', aEliminar.map((t) => t.id));
  }

  // B) Cajas nuevas que el usuario marcó -> Insertarlas
  const aCrear = cajasSeleccionadas.filter((tipo) => !tiposActuales.has(tipo));
  if (aCrear.length > 0) {
    const nuevasTareas = aCrear.map((tipo) => ({
      jornada_id: jornadaId,
      tipo_caja: tipo,
      estado: 'pendiente',
      materiales_verificados: [],
      asignados_a: [],
    }));
    await supabase.from('tareas_jornada').insert(nuevasTareas);
  }

  revalidatePath(`/jornada/${jornadaId}`);
  revalidatePath('/dashboard');
}

export async function cambiarEstadoJornada(
  jornadaId: string,
  nuevoEstado: 'planificacion' | 'en_curso' | 'finalizada'
) {
  const supabase = await createClient();

  if (!jornadaId) return;

  await supabase
    .from('jornadas')
    .update({ estado: nuevoEstado })
    .eq('id', jornadaId);

  revalidatePath(`/jornada/${jornadaId}`);
}

export async function eliminarJornada(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get('jornadaId') as string;

  if (!id) return;

  // 1. Validar autenticación y rol de coordinador
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single();

  if (perfil?.rol !== 'coordinador') {
    throw new Error('Solo los coordinadores pueden cancelar jornadas');
  }

  // 2. Soft Delete: cambiar estado a 'cancelada'
  const { error } = await supabase
    .from('jornadas')
    .update({ estado: 'cancelada' })
    .eq('id', id);

  if (error) {
    console.error('Error al cancelar jornada:', error.message);
    throw new Error(`Error en Supabase: ${error.message}`);
  }

  // 3. Revalidar y redirigir
  revalidatePath('/dashboard');
  redirect('/dashboard');
}

/* ==========================================================================
   2. GESTIÓN DE TAREAS Y CAJAS DE MATERIALES
   ========================================================================== */

export async function cambiarEstadoTarea(
  tareaId: string,
  nuevoEstado: 'pendiente' | 'en_progreso' | 'completado',
  jornadaId: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  await supabase
    .from('tareas_jornada')
    .update({
      estado: nuevoEstado,
      usuario_id: user?.id,
      actualizado_en: new Date().toISOString(),
    })
    .eq('id', tareaId);

  revalidatePath(`/jornada/${jornadaId}`);
}

export async function toggleMaterial(
  tareaId: string,
  materialNombre: string,
  jornadaId: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: tarea } = await supabase
    .from('tareas_jornada')
    .select('materiales_verificados')
    .eq('id', tareaId)
    .single();

  if (!tarea) throw new Error('Tarea no encontrada');

  const listaActual: string[] = tarea.materiales_verificados || [];
  const nuevaLista = listaActual.includes(materialNombre)
    ? listaActual.filter((m) => m !== materialNombre)
    : [...listaActual, materialNombre];

  await supabase
    .from('tareas_jornada')
    .update({
      materiales_verificados: nuevaLista,
      usuario_id: user?.id,
      actualizado_en: new Date().toISOString(),
    })
    .eq('id', tareaId);

  revalidatePath(`/jornada/${jornadaId}`);
}

export async function agregarMaterialExtra(
  tareaId: string,
  nuevoMaterial: string,
  jornadaId: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const nombreLimpio = nuevoMaterial.trim();
  if (!nombreLimpio) return;

  const { data: tarea } = await supabase
    .from('tareas_jornada')
    .select('materiales_verificados')
    .eq('id', tareaId)
    .single();

  if (!tarea) return;

  const listaActual: string[] = tarea.materiales_verificados || [];
  if (!listaActual.includes(nombreLimpio)) {
    const nuevaLista = [...listaActual, nombreLimpio];

    await supabase
      .from('tareas_jornada')
      .update({
        materiales_verificados: nuevaLista,
        usuario_id: user?.id,
        actualizado_en: new Date().toISOString(),
      })
      .eq('id', tareaId);
  }

  revalidatePath(`/jornada/${jornadaId}`);
}

export async function asignarResponsableCaja(
  tareaId: string,
  usuarioId: string,
  jornadaId: string
) {
  const supabase = await createClient();

  const { data: tarea } = await supabase
    .from('tareas_jornada')
    .select('asignados_a')
    .eq('id', tareaId)
    .single();

  if (!tarea) return;

  const listaActual: string[] = tarea.asignados_a || [];
  const nuevaLista = listaActual.includes(usuarioId)
    ? listaActual.filter((id) => id !== usuarioId)
    : [...listaActual, usuarioId];

  await supabase
    .from('tareas_jornada')
    .update({ asignados_a: nuevaLista })
    .eq('id', tareaId);

  revalidatePath(`/jornada/${jornadaId}`);
}

/* ==========================================================================
   3. BITÁCORA DE INCIDENCIAS
   ========================================================================== */

export async function agregarComentarioCierre(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return;

  const jornadaId = formData.get('jornadaId') as string;
  const comentario = (formData.get('comentario') as string)?.trim();

  if (!comentario) return;

  await supabase.from('comentarios_cierre').insert({
    jornada_id: jornadaId,
    usuario_id: user.id,
    comentario,
  });

  revalidatePath(`/jornada/${jornadaId}`);
}

/* ==========================================================================
   4. PERFIL DE USUARIO
   ========================================================================== */

export async function actualizarPerfil(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return;

  const nombre = (formData.get('nombre') as string)?.trim();
  if (!nombre || nombre.length < 2) return;

  await supabase
    .from('perfiles')
    .update({ nombre })
    .eq('id', user.id);

  revalidatePath('/dashboard/perfil');
  revalidatePath('/dashboard');
  revalidatePath('/dashboard', 'layout');
}

// 1. Quitar una caja de la jornada
export async function eliminarCajaDeJornada(tareaId: string, jornadaId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single();

  if (perfil?.rol !== 'coordinador') {
    throw new Error('Solo los coordinadores pueden modificar cajas');
  }

  const { error } = await supabase
    .from('tareas_jornada')
    .delete()
    .eq('id', tareaId)
    .eq('jornada_id', jornadaId);

  if (error) throw new Error(error.message);

  revalidatePath(`/jornada/${jornadaId}`);
  revalidatePath('/dashboard');
}

// 2. Agregar una caja faltante a la jornada
export async function agregarCajaAJornada(tipoCaja: string, jornadaId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single();

  if (perfil?.rol !== 'coordinador') {
    throw new Error('Solo los coordinadores pueden modificar cajas');
  }

  // Verificar que la caja no exista ya en la jornada
  const { data: existente } = await supabase
    .from('tareas_jornada')
    .select('id')
    .eq('jornada_id', jornadaId)
    .eq('tipo_caja', tipoCaja)
    .maybeSingle();

  if (existente) return; // Ya existe

  const { error } = await supabase
    .from('tareas_jornada')
    .insert({
      jornada_id: jornadaId,
      tipo_caja: tipoCaja,
      estado: 'pendiente',
      materiales_verificados: [],
      asignados_a: [],
    });

  if (error) throw new Error(error.message);

  revalidatePath(`/jornada/${jornadaId}`);
  revalidatePath('/dashboard');
}
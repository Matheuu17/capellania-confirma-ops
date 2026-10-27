'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

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

export async function agregarComentarioCierre(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return;

  const jornadaId = formData.get('jornadaId') as string;
  const comentario = formData.get('comentario') as string;

  if (!comentario.trim()) return;

  await supabase.from('comentarios_cierre').insert({
    jornada_id: jornadaId,
    usuario_id: user.id,
    comentario: comentario.trim(),
  });

  revalidatePath(`/jornada/${jornadaId}`);
}

export async function actualizarDatosJornada(formData: FormData) {
  const supabase = await createClient();
  const jornadaId = formData.get('jornadaId') as string;
  const fecha = formData.get('fecha') as string;
  const ponente = formData.get('ponente') as string;
  const dinamica = formData.get('dinamica') as string;

  await supabase
    .from('jornadas')
    .update({
      fecha,
      ponente,
      dinamica_apertura: dinamica,
    })
    .eq('id', jornadaId);

  revalidatePath(`/jornada/${jornadaId}`);
}

export async function cambiarEstadoJornada(
  jornadaId: string,
  nuevoEstado: 'planificacion' | 'en_curso' | 'finalizada'
) {
  const supabase = await createClient();

  await supabase
    .from('jornadas')
    .update({ estado: nuevoEstado })
    .eq('id', jornadaId);

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
  usuarioId: string | null,
  jornadaId: string
) {
  const supabase = await createClient();

  await supabase
    .from('tareas_jornada')
    .update({ asignado_a: usuarioId || null })
    .eq('id', tareaId);

  revalidatePath(`/jornada/${jornadaId}`);
}
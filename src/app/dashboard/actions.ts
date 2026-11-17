'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

/* ==========================================================================
   1. SESIÓN
   ========================================================================== */

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}

/* ==========================================================================
   2. OPERACIONES DE JORNADAS
   ========================================================================== */

export async function crearJornada(formData: FormData) {
  const supabase = await createClient();

  // Validar rol coordinador
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const fecha = formData.get('fecha') as string;
  const ponente = (formData.get('ponente') as string)?.trim();
  const dinamica = (formData.get('dinamica') as string)?.trim() || null;
  
  // Leer las cajas seleccionadas (si no marcó ninguna, asignamos 'interna' por defecto)
  const cajasSeleccionadas = formData.getAll('cajas') as string[];
  const cajasACrear = cajasSeleccionadas.length > 0 ? cajasSeleccionadas : ['interna'];

  // 1. Insertar la jornada
  const { data: jornada, error: errJornada } = await supabase
    .from('jornadas')
    .insert({
      fecha,
      ponente,
      dinamica_apertura: dinamica,
      estado: 'planificacion',
    })
    .select('id')
    .single();

  if (errJornada || !jornada) {
    throw new Error(errJornada?.message || 'Error al crear jornada');
  }

  // 2. Insertar ÚNICAMENTE las tareas de las cajas elegidas
  const tareasInsert = cajasACrear.map((tipo) => ({
    jornada_id: jornada.id,
    tipo_caja: tipo,
    estado: 'pendiente',
    materiales_verificados: [],
    asignados_a: [],
  }));

  const { error: errTareas } = await supabase
    .from('tareas_jornada')
    .insert(tareasInsert);

  if (errTareas) {
    console.error('Error creando cajas:', errTareas.message);
  }

  revalidatePath('/dashboard');
  redirect(`/jornada/${jornada.id}`);
}

/* ==========================================================================
   3. GESTIÓN DE PERFIL
   ========================================================================== */

export async function actualizarPerfil(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const nombre = (formData.get('nombre') as string)?.trim();

  if (!nombre || nombre.length < 2) {
    throw new Error('El nombre debe tener al menos 2 caracteres.');
  }

  const { error } = await supabase
    .from('perfiles')
    .update({ nombre })
    .eq('id', user.id);

  if (error) {
    throw new Error('No se pudo actualizar el nombre del perfil.');
  }

  revalidatePath('/dashboard/perfil');
  revalidatePath('/dashboard');
  revalidatePath('/dashboard', 'layout');
}
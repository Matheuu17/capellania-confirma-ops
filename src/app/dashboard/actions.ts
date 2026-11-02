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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const fecha = formData.get('fecha') as string;
  const ponente = (formData.get('ponente') as string)?.trim();
  const dinamica = (formData.get('dinamica') as string)?.trim() || null;

  if (!fecha || !ponente) {
    throw new Error('Fecha y ponente son campos requeridos.');
  }

  // 1. Crear la jornada operativa
  const { data: jornada, error: errorJornada } = await supabase
    .from('jornadas')
    .insert({
      fecha,
      ponente,
      dinamica_apertura: dinamica,
      estado: 'planificacion',
      creado_por: user.id,
    })
    .select('id')
    .single();

  if (errorJornada || !jornada) {
    throw new Error('Error al registrar la jornada en la base de datos.');
  }

  // 2. Obtener catálogo para asociar materiales obligatorios pre-marcados
  const { data: catalogo } = await supabase
    .from('catalogo_materiales')
    .select('nombre, tipo_caja, es_obligatorio');

  const cajas: Array<'interna' | 'externa' | 'agape'> = ['interna', 'externa', 'agape'];

  const tareasParaInsertar = cajas.map((tipo) => {
    const obligatorios = catalogo
      ? catalogo
          .filter((m) => m.tipo_caja === tipo && m.es_obligatorio)
          .map((m) => m.nombre)
      : [];

    return {
      jornada_id: jornada.id,
      tipo_caja: tipo,
      estado: 'pendiente' as const,
      materiales_verificados: obligatorios,
    };
  });

  const { error: errorTareas } = await supabase
    .from('tareas_jornada')
    .insert(tareasParaInsertar);

  if (errorTareas) {
    throw new Error('Error al inicializar las cajas de la jornada.');
  }

  revalidatePath('/dashboard');
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
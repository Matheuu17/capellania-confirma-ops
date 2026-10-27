'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}

export async function crearJornada(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const fecha = formData.get('fecha') as string;
  const ponente = formData.get('ponente') as string;
  const dinamica = formData.get('dinamica') as string;

  // 1. Insertar la jornada
  const { data: jornada, error: errorJornada } = await supabase
    .from('jornadas')
    .insert({
      fecha,
      ponente,
      dinamica_apertura: dinamica,
      estado: 'planificacion',
      creado_por: user.id,
    })
    .select()
    .single();

  if (errorJornada || !jornada) {
    throw new Error('Error al crear la jornada');
  }

  // 2. Obtener materiales obligatorios del catálogo para pre-marcarlos
  const { data: catalogo } = await supabase
    .from('catalogo_materiales')
    .select('nombre, tipo_caja, es_obligatorio');

  const cajas: Array<'interna' | 'externa' | 'agape'> = ['interna', 'externa', 'agape'];

  const tareasParaInsertar = cajas.map((tipo) => {
    // Filtrar los que sean obligatorios de este tipo de caja
    const obligatorios = catalogo
      ? catalogo
          .filter((m) => m.tipo_caja === tipo && m.es_obligatorio)
          .map((m) => m.nombre)
      : [];

    return {
      jornada_id: jornada.id,
      tipo_caja: tipo,
      estado: 'pendiente' as const,
      materiales_verificados: obligatorios, // Quedan marcados por defecto
    };
  });

  await supabase.from('tareas_jornada').insert(tareasParaInsertar);

  revalidatePath('/dashboard');
}
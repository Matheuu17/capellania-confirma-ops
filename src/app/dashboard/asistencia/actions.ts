'use server';

import { createClient } from '@/lib/supabase/server';
import { sincronizarAsistenciaEnSheet } from '@/lib/google-sheets';
import { revalidatePath } from 'next/cache';

export async function registrarAsistenciaGPS(jornadaId: string, distancia: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Usuario no autenticado.');
  }

  // 1. Obtener perfil para conocer el nombre registrado
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('nombre')
    .eq('id', user.id)
    .single();

  // 2. Obtener fecha de la jornada
  const { data: jornada } = await supabase
    .from('jornadas')
    .select('fecha')
    .eq('id', jornadaId)
    .single();

  if (!jornada) {
    throw new Error('Jornada no encontrada.');
  }

  const ahora = new Date();

  // 3. Registrar asistencia en la base de datos
  const { error } = await supabase.from('asistencias').insert({
    jornada_id: jornadaId,
    usuario_id: user.id,
    distancia_metros: distancia,
    registrado_en: ahora.toISOString(),
  });

  if (error) {
    throw new Error('Error al guardar la asistencia en Supabase.');
  }

  // 4. Sincronizar en segundo plano con Google Sheets
  if (perfil?.nombre) {
    sincronizarAsistenciaEnSheet({
      nombreMiembro: perfil.nombre,
      fechaJornada: jornada.fecha,
      horaRegistro: ahora,
    }).catch((err) => console.error('Error sincronizando Sheet:', err));
  }

  revalidatePath('/dashboard/asistencia');
  revalidatePath(`/jornada/${jornadaId}`);

  return { success: true };
}
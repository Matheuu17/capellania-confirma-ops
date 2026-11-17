'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// Cliente administrativo para operaciones de auth privilegiadas
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  return createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// 1. Cambiar estado rápido (activo, inactivo, suspendido)
export async function actualizarEstadoMiembro(
  miembroId: string,
  nuevoEstado: 'activo' | 'inactivo' | 'suspendido'
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autorizado');

  const { error } = await supabase
    .from('perfiles')
    .update({ estado_cuenta: nuevoEstado })
    .eq('id', miembroId);

  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/control');
}

// 2. Guardar edición de datos institucionales y notas
export async function actualizarFichaMiembro(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autorizado');

  const id = formData.get('id') as string;
  const nombre = formData.get('nombre') as string;
  const rol = formData.get('rol') as string;
  const estado_cuenta = formData.get('estado_cuenta') as string;
  const notas = (formData.get('notas') as string) || '';

  const { error } = await supabase
    .from('perfiles')
    .update({
      nombre: nombre.trim(),
      rol,
      estado_cuenta,
      notas: notas.trim(),
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/control');
}

// 3. Generar enlace de recuperación de un solo uso
export async function generarEnlaceRecuperacion(email: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autorizado');

  if (!email) throw new Error('Correo inválido');

  const adminSupabase = getAdminClient();
  
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://capellania-confirma-ops.vercel.app';
  
  const { data, error } = await adminSupabase.auth.admin.generateLink({
    type: 'recovery',
    email: email.trim(),
    options: {
      redirectTo: `${siteUrl}/dashboard/perfil`,
    },
  });

  if (error) {
    // Si no está configurada la service role key, se usa el fallback de correo estándar
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/dashboard/perfil`,
    });
    if (resetErr) throw new Error(resetErr.message);
    return { tipo: 'email', enlace: null };
  }

  return { tipo: 'link', enlace: data.properties.action_link };
}
interface SincronizarSheetParams {
  nombreMiembro: string;
  fechaJornada: string; // Formato de base de datos: 'YYYY-MM-DD'
  horaRegistro: Date;
}

export async function sincronizarAsistenciaEnSheet({
  nombreMiembro,
  fechaJornada,
  horaRegistro,
}: SincronizarSheetParams) {
  const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('GOOGLE_SHEET_WEBHOOK_URL no configurado.');
    return;
  }

  // 1. Transformar 'YYYY-MM-DD' a 'DD/MM/YYYY' para coincidir con la cabecera
  const [año, mes, dia] = fechaJornada.split('-');
  const fechaFormateada = `${dia}/${mes}/${año}`;

  // 2. Regla horaria de asistencia
  const horas = horaRegistro.getHours();
  const minutos = horaRegistro.getMinutes();
  const tiempoEnMinutos = horas * 60 + minutos;

  // 14:15 = 855 minutos
  // 14:45 = 885 minutos
  let estado: 'P' | 'T' | 'F' = 'P';

  if (tiempoEnMinutos <= 855) {
    estado = 'P'; // Hasta las 2:15 PM
  } else if (tiempoEnMinutos < 885) {
    estado = 'T'; // De 2:16 PM a 2:44 PM
  } else {
    estado = 'F'; // A partir de las 2:45 PM en adelante
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nombre: nombreMiembro,
        fecha: fechaFormateada,
        estado,
      }),
    });
  } catch (error) {
    console.error('Error al sincronizar asistencia con Google Sheets:', error);
  }
}
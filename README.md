# 📦 Capellanía Ops

> Progressive Web App (PWA) móvil y en tiempo real para la gestión logística, verificación de inventario y supervisión operativa de jornadas pastorales.

---

## 📋 Descripción del Proyecto

**Capellanía Ops** resuelve la fricción operativa durante la preparación de jornadas y eventos pastorales. Diseñada bajo un enfoque *mobile-first*, la aplicación coordina el empaque y traslado de materiales divididos en cajas especializadas (**Interna**, **Externa** y **Ágape**), garantizando trazabilidad total desde el inicio de la preparación hasta el cierre del evento.

La plataforma ofrece una experiencia diferenciada según el rol del usuario:
- **Coordinadores:** Supervisión general, asignación de cajas por miembro, configuración de datos de la jornada y auditoría visual en tiempo real vía WebSockets sin recargar la página.
- **Miembros del Equipo:** Vista enfocada únicamente en la(s) caja(s) asignada(s), listas de verificación interactivas (con obligatorios premarcados) y capacidad de registrar materiales imprevistos o incidencias en vivo.

---

## ✨ Características Principales

- **⚡ Supervisión en Tiempo Real:** Canales reactivos con Supabase Realtime que notifican al coordinador sobre cambios de estado, materiales empacados o ítems adicionales agregados al instante.
- **👥 Roles y Permisos (RBAC):** Separación estricta de responsabilidades entre el rol `coordinador` y `miembro`.
- **🎯 Asignación Dirigida de Tareas:** Los miembros visualizan de forma exclusiva las cajas que les fueron designadas, evitando distracciones y errores en el empaque.
- **📦 Checklists Inteligentes:**
  - Carga automática de materiales base según el catálogo maestro.
  - Premarcado por defecto de materiales obligatorios (`es_obligatorio = true`).
  - Posibilidad de incorporar materiales no previstos (*ítems extra*) para una jornada específica sin alterar el catálogo general.
- **📱 PWA Instalable:** Configuración de `manifest.json` y meta-tags para instalación nativa en Android (Chrome) e iOS (Safari), permitiendo ejecución a pantalla completa.
- **📝 Bitácora de Incidencias:** Registro colaborativo de observaciones, faltantes y reportes de cierre de jornada.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
| :--- | :--- |
| **Framework** | [Next.js](https://nextjs.org/) (App Router, Server Actions, Server Components) |
| **Lenguaje** | [TypeScript](https://www.typescriptlang.org/) |
| **Estilos** | [Tailwind CSS v4](https://tailwindcss.com/) |
| **Backend & Base de Datos** | [Supabase](https://supabase.com/) (PostgreSQL, Auth, Row Level Security, Realtime) |
| **Iconografía** | [Lucide React](https://lucide.dev/) |
| **Despliegue** | [Vercel](https://vercel.com/) |

---

## 🎨 Identidad Visual

| Elemento | Token / Valor | Muestra |
| :--- | :--- | :--- |
| **Fondo Principal** | `#F4F3EF` | ![#F4F3EF](https://via.placeholder.com/15/F4F3EF/000000?text=+) |
| **Texto Principal** | `#211B20` | ![#211B20](https://via.placeholder.com/15/211B20/000000?text=+) |
| **Verde Institucional** | `#07833F` | ![#07833F](https://via.placeholder.com/15/07833F/000000?text=+) |
| **Dorado / Acento** | `#E0B84F` | ![#E0B84F](https://via.placeholder.com/15/E0B84F/000000?text=+) |

---

## 🗄️ Modelo de Datos (Esquema Principal)

- **`perfiles`**: Información del usuario vinculada a `auth.users` (`id`, `nombre`, `rol: 'coordinador' | 'miembro'`).
- **`jornadas`**: Eventos programados (`id`, `fecha`, `ponente`, `din

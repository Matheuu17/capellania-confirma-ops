'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Layers, MapPin, UserCircle } from 'lucide-react'; // <-- Importamos UserCircle

export default function NavLinks() {
  const pathname = usePathname();

  const links = [
    { name: 'Jornadas', href: '/dashboard', icon: Layers },
    { name: 'Asistencia GPS', href: '/dashboard/asistencia', icon: MapPin },
    { name: 'Mi Perfil', href: '/dashboard/perfil', icon: UserCircle }, // <-- Nuevo enlace
  ];

  return (
    <>
      {links.map((link) => {
        const Icon = link.icon;
        const isActive = pathname === link.href;

        return (
          <Link
            key={link.name}
            href={link.href}
            aria-current={isActive ? 'page' : undefined}
            className={`flex flex-col sm:flex-row items-center sm:justify-start justify-center gap-1 sm:gap-3 sm:px-3 sm:py-2.5 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#07833F] ${
              isActive
                ? 'text-[#07833F] sm:bg-[#07833F]/10 font-bold'
                : 'text-slate-500 hover:text-[#211B20] hover:bg-slate-100 font-medium'
            }`}
          >
            <Icon className={`w-5 h-5 sm:w-4 sm:h-4 ${isActive ? 'stroke-[2.5]' : ''}`} aria-hidden="true" />
            <span className="text-[10px] sm:text-xs tracking-wide">{link.name}</span>
          </Link>
        );
      })}
    </>
  );
}
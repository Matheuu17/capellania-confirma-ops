'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Layers, MapPin, UserCircle, SlidersHorizontal } from 'lucide-react';

interface NavLinksProps {
  esCoordinador?: boolean;
}

export default function NavLinks({ esCoordinador = false }: NavLinksProps) {
  const pathname = usePathname();

  const links = [
    { name: 'Jornadas', href: '/dashboard', icon: Layers },
    { name: 'Asistencia', href: '/dashboard/asistencia', icon: MapPin },
    ...(esCoordinador
      ? [{ name: 'Equipo', href: '/dashboard/control', icon: SlidersHorizontal }]
      : []),
    { name: 'Mi Perfil', href: '/dashboard/perfil', icon: UserCircle },
  ];

  return (
    <>
      {links.map((link) => {
        const LinkIcon = link.icon;
        const isActive = pathname === link.href;

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wider transition-all ${
              isActive
                ? 'bg-[#07833F] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-[#211B20]'
            }`}
          >
            <LinkIcon className="w-4 h-4 shrink-0" />
            <span>{link.name}</span>
          </Link>
        );
      })}
    </>
  );
}
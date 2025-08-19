"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TopNav() {
  const pathname = usePathname();
  const isAgendar = pathname.startsWith("/agendar");
  const isPerfil  = pathname.startsWith("/perfil");

  const signOut = () => {
    // TODO: lógica real de logout
    window.location.href = "/login";
  };

  return (
    <header className="topbar">
      <nav className="topbar-inner">
        <Link href="/agendar" className={`nav-pill ${isAgendar ? "active" : ""}`}>
          Agendar
        </Link>

        <Link href="/perfil" className={`nav-pill ${isPerfil ? "active" : ""}`}>
          Tu perfil
        </Link>

        <button type="button" className="nav-pill" onClick={signOut}>
          Cerrar sesión
        </button>
      </nav>
    </header>
  );
}

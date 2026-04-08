"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./SiteHeader.module.css";

const NAV_ITEMS = [
  { href: "/", label: "Início" },
  { href: "/scan", label: "Scanner" },
  { href: "/manual", label: "Manual" },
  { href: "/solve", label: "Execução" },
  { href: "/architecture", label: "Arquitetura" },
  { href: "/esp32-architecture", label: "Firmware ESP32" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </span>
          <span className={styles.brandText}>
            <strong>Rubik&apos;s Resolver</strong>
            <small>escaneie, resolva, anime, integre</small>
          </span>
        </Link>

        <nav className={styles.nav} aria-label="Navegação principal">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navLink} ${
                pathname === item.href ? styles.navLinkActive : ""
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

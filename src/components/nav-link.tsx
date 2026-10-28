"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cx } from "./ui";

export function NavLink({ href, children, match = "exact" }: { href: string; children: ReactNode; match?: "exact" | "prefix" }) {
  const path = usePathname();
  const active = match === "exact" ? path === href : path === href || path.startsWith(href + "/");
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cx(
        "flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[14px] transition-colors",
        active ? "bg-surface font-medium text-ink ring-1 ring-line" : "text-ink-2 hover:bg-sunk hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}

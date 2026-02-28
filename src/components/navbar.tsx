"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/projects", label: "Projects" },
  { href: "/research", label: "Research" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    return localStorage.getItem("theme") === "light" ? "light" : "dark";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
  }

  return (
    <nav className="sticky top-0 z-30 border-b border-white/10 bg-black/30 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-6 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight text-white" onClick={() => setOpen(false)}>
            Nazmul
          </Link>

          <div className="hidden items-center gap-3 text-sm text-zinc-300 md:flex md:gap-5">
            {navLinks.map((item) => (
              <Link key={item.href} href={item.href} className="transition hover:text-white">
                {item.label}
              </Link>
            ))}
            <button type="button" onClick={toggleTheme} suppressHydrationWarning className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 transition hover:bg-white/10 hover:text-white">
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <Link href="/admin" className="glow-btn rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 transition hover:bg-white/10 hover:text-white">
              CMS
            </Link>
          </div>

          <button
            type="button"
            className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-zinc-100 transition hover:bg-white/10 md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label="Toggle navigation"
            onClick={() => setOpen((prev) => !prev)}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>

        {open && (
          <div id="mobile-nav" className="mt-3 space-y-2 rounded-xl border border-white/10 bg-white/5 p-3 md:hidden">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-md px-2 py-2 text-sm text-zinc-200 transition hover:bg-white/10 hover:text-white"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <button
              type="button"
              className="block w-full rounded-md border border-white/20 px-2 py-2 text-left text-sm text-zinc-100 transition hover:bg-white/10"
              onClick={toggleTheme}
              suppressHydrationWarning
            >
              Switch to {theme === "dark" ? "light" : "dark"} mode
            </button>
            <Link
              href="/admin"
              className="block rounded-md border border-white/20 px-2 py-2 text-sm text-zinc-100 transition hover:bg-white/10"
              onClick={() => setOpen(false)}
            >
              CMS
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

import React from "react";
import { ThemeToggle } from "./ThemeToggle";
import { ShortcutsModal } from "@/components/beat/ShortcutsModal";

export function Header() {
  return (
    <header className="sticky top-0 z-50 h-14 flex items-center justify-between px-6 bg-canvas/90 backdrop-blur-md border-b border-rim">
      <div className="flex items-center gap-3">
        <span className="text-2xl leading-none" aria-hidden="true">🥁</span>
        <span className="text-sm font-bold tracking-tight">
          Groove<span className="text-indigo-400">Weaver</span>
        </span>
      </div>
      <nav className="flex items-center gap-1">
        <a
          href="https://github.com/joshua-makes/beatmachine"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md px-3 py-1.5 text-xs font-medium text-ink-dim hover:text-ink hover:bg-well transition-colors"
          aria-label="GitHub repository"
        >
          GitHub
        </a>
        <ShortcutsModal />
        <ThemeToggle />
      </nav>
    </header>
  );
}

import React from "react";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  return (
    <header className="flex items-center justify-between px-4 py-3 bg-zinc-950 border-b border-zinc-800">
      <div className="flex items-center gap-2">
        <span className="text-xl font-bold text-indigo-400">🥁</span>
        <span className="text-lg font-bold text-white">BeatMachine</span>
      </div>
      <nav className="flex items-center gap-2">
        <a
          href="https://github.com/bestacles/beatmachine"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          aria-label="GitHub repository"
        >
          GitHub
        </a>
        <ThemeToggle />
      </nav>
    </header>
  );
}

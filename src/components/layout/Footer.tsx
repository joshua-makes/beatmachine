import React from "react";

export function Footer() {
  return (
    <footer className="px-4 py-3 bg-zinc-950 border-t border-zinc-800 text-center text-xs text-zinc-500">
      Built by{" "}
      <a
        href="https://github.com/bestacles"
        target="_blank"
        rel="noopener noreferrer"
        className="text-indigo-400 hover:underline"
      >
        bestacles
      </a>{" "}
      · MIT License
    </footer>
  );
}

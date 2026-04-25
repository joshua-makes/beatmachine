import React from "react";

export function Footer() {
  return (
    <footer className="px-6 py-4 border-t border-rim text-center text-xs text-ink-ghost">
      Built by{" "}
      <a
        href="https://github.com/joshua-makes"
        target="_blank"
        rel="noopener noreferrer"
        className="text-indigo-400 hover:text-indigo-300 transition-colors"
      >
        joshua-makes
      </a>
      {" · "}MIT License
    </footer>
  );
}

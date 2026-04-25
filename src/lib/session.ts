import { type Pattern, serializePattern, deserializePattern } from "./pattern";

const STORAGE_KEY = "bm:sessions";

export interface SavedSession {
  id: string;
  name: string;
  createdAt: number;
  pattern: string;
}

function readSessions(): SavedSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedSession[];
  } catch {
    return [];
  }
}

function writeSessions(sessions: SavedSession[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function saveSession(name: string, pattern: Pattern): SavedSession {
  const sessions = readSessions();
  const session: SavedSession = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name,
    createdAt: Date.now(),
    pattern: serializePattern(pattern),
  };
  sessions.unshift(session);
  writeSessions(sessions.slice(0, 20));
  return session;
}

export function loadSessions(): SavedSession[] {
  return readSessions();
}

export function deleteSession(id: string): void {
  const sessions = readSessions().filter((s) => s.id !== id);
  writeSessions(sessions);
}

export function getSessionPattern(session: SavedSession): Pattern {
  return deserializePattern(session.pattern);
}

export function exportPatternJson(pattern: Pattern): void {
  const json = serializePattern(pattern);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `beatmachine-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

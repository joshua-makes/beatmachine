import { describe, it, expect } from "vitest";
import {
  createDefaultPattern,
  serializePattern,
  deserializePattern,
  encodeShareUrl,
  decodeShareUrl,
} from "@/lib/pattern";

describe("pattern serialization", () => {
  it("serialize then deserialize round-trips a full pattern", () => {
    const original = createDefaultPattern();
    original.bpm = 140;
    original.tracks[0].steps[0] = true;
    original.tracks[0].steps[4] = true;
    const json = serializePattern(original);
    const restored = deserializePattern(json);
    expect(restored.bpm).toBe(140);
    expect(restored.tracks[0].steps[0]).toBe(true);
    expect(restored.tracks[0].steps[4]).toBe(true);
    expect(restored.tracks[0].steps[1]).toBe(false);
  });

  it("share-link encode/decode round-trip via lz-string", () => {
    const original = createDefaultPattern();
    original.bpm = 160;
    original.tracks[2].steps[3] = true;
    const encoded = encodeShareUrl(original);
    const decoded = decodeShareUrl(encoded);
    expect(decoded.bpm).toBe(160);
    expect(decoded.tracks[2].steps[3]).toBe(true);
  });

  it("invalid JSON input returns default empty pattern without throwing", () => {
    const result = deserializePattern("not-json!!!");
    expect(result).toBeDefined();
    expect(result.bpm).toBe(120);
    expect(result.tracks).toHaveLength(8);
  });

  it("invalid share link returns default pattern without throwing", () => {
    const result = decodeShareUrl("totally_invalid_encoded_string_xyz");
    expect(result).toBeDefined();
    expect(result.bpm).toBe(120);
  });
});

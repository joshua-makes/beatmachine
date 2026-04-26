// Minimal type declaration for soundfont-player (no DefinitelyTyped package available)
declare module "soundfont-player" {
  interface PlayOptions {
    gain?: number;
    duration?: number;
    attack?: number;
    decay?: number;
    sustain?: number;
    release?: number;
    loop?: boolean;
    cents?: number;
    adsr?: number[];
  }

  interface InstrumentOptions {
    format?: string;
    soundfont?: string;
    destination?: AudioNode;
    gain?: number;
    notes?: string[] | number[];
    attack?: number;
    loop?: boolean;
    adsr?: number[];
    decay?: number;
    sustain?: number;
    release?: number;
  }

  interface Player {
    play(note: string | number, when?: number, options?: PlayOptions): AudioNode;
    stop(when?: number): Player;
    connect(node: AudioNode): Player;
    disconnect(): Player;
  }

  const Soundfont: {
    instrument(
      context: AudioContext,
      name: string,
      options?: InstrumentOptions,
    ): Promise<Player>;
    nameToUrl(name: string, soundfont?: string, format?: string): string;
  };

  export = Soundfont;
}

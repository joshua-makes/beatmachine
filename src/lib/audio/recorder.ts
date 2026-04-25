export class Recorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private duration: number;
  private onDone: (blob: Blob) => void;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(duration: number, onDone: (blob: Blob) => void) {
    this.duration = duration;
    this.onDone = onDone;
  }

  start(stream: MediaStream): void {
    this.chunks = [];
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";
    this.mediaRecorder = new MediaRecorder(stream, { mimeType });
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.mediaRecorder.onstop = () => {
      const blob = new Blob(this.chunks, { type: mimeType });
      this.onDone(blob);
    };
    this.mediaRecorder.start(100);
    this.timeoutId = setTimeout(() => this.stop(), this.duration * 1000);
  }

  stop(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.mediaRecorder?.state === "recording") {
      this.mediaRecorder.stop();
    }
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === "recording";
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

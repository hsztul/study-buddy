/**
 * Audio Recorder Utility
 * Handles microphone access and audio recording using Web Audio API
 */

export type RecorderState = "idle" | "recording" | "stopped" | "error";

export interface AudioRecorderOptions {
  onStateChange?: (state: RecorderState) => void;
  onError?: (error: Error) => void;
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private state: RecorderState = "idle";
  private options: AudioRecorderOptions;

  constructor(options: AudioRecorderOptions = {}) {
    this.options = options;
  }

  /**
   * Request microphone permission and initialize recorder
   */
  async initialize(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      // Check for supported MIME types
      const mimeType = this.getSupportedMimeType();

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.setState("stopped");
      };

      this.mediaRecorder.onerror = (event: Event) => {
        const error = new Error("MediaRecorder error");
        this.setState("error");
        this.options.onError?.(error);
      };

      this.setState("idle");
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Failed to initialize recorder");
      this.setState("error");
      this.options.onError?.(err);
      throw err;
    }
  }

  /**
   * Get supported MIME type for audio recording
   */
  private getSupportedMimeType(): string {
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/ogg",
      "audio/mp4",
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return ""; // Use default
  }

  /**
   * Start recording
   */
  start(): void {
    if (!this.mediaRecorder) {
      throw new Error("Recorder not initialized");
    }

    if (this.state === "recording") {
      return;
    }

    this.audioChunks = [];
    this.mediaRecorder.start();
    this.setState("recording");
  }

  /**
   * Stop recording and return audio blob
   */
  async stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error("Recorder not initialized"));
        return;
      }

      if (this.state !== "recording") {
        reject(new Error("Not recording"));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || "audio/webm";
        const blob = new Blob(this.audioChunks, { type: mimeType });
        this.audioChunks = [];
        this.setState("stopped");
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.mediaRecorder && this.state === "recording") {
      this.mediaRecorder.stop();
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    this.mediaRecorder = null;
    this.audioChunks = [];
    this.setState("idle");
  }

  /**
   * Get current state
   */
  getState(): RecorderState {
    return this.state;
  }

  /**
   * Check if microphone permission is granted
   * Note: This doesn't request permission, just checks current state
   */
  static async checkPermission(): Promise<PermissionState> {
    try {
      // Try permissions API first (not supported on all browsers)
      const result = await navigator.permissions.query({ name: "microphone" as PermissionName });
      return result.state;
    } catch {
      // Permissions API not supported (e.g., iOS Safari)
      // Return "prompt" to show explainer - we can't check without requesting
      return "prompt";
    }
  }

  private setState(state: RecorderState): void {
    this.state = state;
    this.options.onStateChange?.(state);
  }
}

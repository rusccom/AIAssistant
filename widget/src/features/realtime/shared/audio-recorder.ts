const WORKLET_NAME = 'gemini-audio-recorder';

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';

  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });

  return window.btoa(binary);
};

const createWorkletUrl = () => {
  const source = `
class GeminiAudioRecorderProcessor extends AudioWorkletProcessor {
  buffer = new Int16Array(2048);
  index = 0;
  flush() {
    const chunk = this.buffer.slice(0, this.index);
    this.port.postMessage(chunk.buffer, [chunk.buffer]);
    this.index = 0;
  }
  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input) {
      return true;
    }
    for (let i = 0; i < input.length; i += 1) {
      const sample = Math.max(-1, Math.min(1, input[i]));
      this.buffer[this.index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      this.index += 1;
      if (this.index >= this.buffer.length) {
        this.flush();
      }
    }
    return true;
  }
}
registerProcessor('${WORKLET_NAME}', GeminiAudioRecorderProcessor);
`;

  return URL.createObjectURL(new Blob([source], { type: 'application/javascript' }));
};

export class AudioRecorder {
  private context: AudioContext | null = null;
  private node: AudioWorkletNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;

  async start(onChunk: (chunk: string) => void) {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.context = new AudioContext({ sampleRate: 16000 });
    await this.context.resume();

    const workletUrl = createWorkletUrl();
    await this.context.audioWorklet.addModule(workletUrl);
    URL.revokeObjectURL(workletUrl);

    this.source = this.context.createMediaStreamSource(this.stream);
    this.node = new AudioWorkletNode(this.context, WORKLET_NAME);
    this.node.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
      onChunk(arrayBufferToBase64(event.data));
    };

    this.source.connect(this.node);
  }

  stop() {
    this.source?.disconnect();
    this.node?.disconnect();
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.source = null;
    this.node = null;
    void this.context?.close();
    this.context = null;
  }
}

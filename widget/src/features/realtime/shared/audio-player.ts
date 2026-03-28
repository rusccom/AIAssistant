const decodeBase64Audio = (base64: string) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  const samples = new Float32Array(bytes.length / 2);
  for (let index = 0; index < samples.length; index += 1) {
    const offset = index * 2;
    let value = bytes[offset] | (bytes[offset + 1] << 8);
    if (value >= 32768) {
      value -= 65536;
    }
    samples[index] = value / 32768;
  }

  return samples;
};

export class AudioPlayer {
  private context: AudioContext | null = null;
  private nextStartTime = 0;

  private async ensureContext() {
    if (!this.context || this.context.state === 'closed') {
      this.context = new AudioContext({ sampleRate: 24000 });
      this.nextStartTime = this.context.currentTime;
    }

    if (this.context.state === 'suspended') {
      await this.context.resume();
    }

    return this.context;
  }

  async enqueue(base64: string) {
    const context = await this.ensureContext();
    const audioData = decodeBase64Audio(base64);
    const buffer = context.createBuffer(1, audioData.length, 24000);
    buffer.copyToChannel(audioData, 0);

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);

    if (this.nextStartTime < context.currentTime) {
      this.nextStartTime = context.currentTime;
    }

    source.start(this.nextStartTime);
    this.nextStartTime += buffer.duration;
  }

  reset() {
    this.close();
  }

  close() {
    this.nextStartTime = 0;
    void this.context?.close();
    this.context = null;
  }
}

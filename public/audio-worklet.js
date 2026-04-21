// public/audio-worklet.js
class EmulatorAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Ring buffers for left/right channels
    this.capacity = 48000; // ~1s at 48kHz
    this.left = new Float32Array(this.capacity);
    this.right = new Float32Array(this.capacity);
    this.readIdx = 0;
    this.writeIdx = 0;
    this.size = 0;

    this.port.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === "samples") {
        this.pushSamples(msg.left, msg.right);
      } else if (msg.type === "clear") {
        this.readIdx = 0;
        this.writeIdx = 0;
        this.size = 0;
      }
    };
  }

  pushSamples(left, right) {
    const n = Math.min(left.length, right.length);
    for (let i = 0; i < n; i++) {
      if (this.size >= this.capacity) {
        // Drop oldest sample to avoid unbounded latency
        this.readIdx = (this.readIdx + 1) % this.capacity;
        this.size--;
      }
      this.left[this.writeIdx] = left[i];
      this.right[this.writeIdx] = right[i];
      this.writeIdx = (this.writeIdx + 1) % this.capacity;
      this.size++;
    }
  }

  process(_inputs, outputs) {
    const output = outputs[0];
    const outL = output[0];
    const outR = output[1] ?? output[0];
    const frames = outL.length;

    for (let i = 0; i < frames; i++) {
      if (this.size > 0) {
        outL[i] = this.left[this.readIdx];
        outR[i] = this.right[this.readIdx];
        this.readIdx = (this.readIdx + 1) % this.capacity;
        this.size--;
      } else {
        // Underrun: output silence
        outL[i] = 0;
        outR[i] = 0;
      }
    }

    return true;
  }
}

registerProcessor("emulator-audio", EmulatorAudioProcessor);
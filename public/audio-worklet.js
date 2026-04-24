class EmulatorAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    this.capacity = 48000 * 2; // 2 seconds
    this.left = new Float32Array(this.capacity);
    this.right = new Float32Array(this.capacity);
    this.readIndex = 0;
    this.writeIndex = 0;
    this.available = 0;
    this.underflows = 0;

    this.port.onmessage = (e) => {
      const data = e.data;

      if (data.type === "clear") {
        this.readIndex = 0;
        this.writeIndex = 0;
        this.available = 0;
        return;
      }

      if (data.type === "samples") {
        const inL = data.left;
        const inR = data.right;
        const n = Math.min(inL.length, inR.length);

        for (let i = 0; i < n; i++) {
          if (this.available >= this.capacity) {
            this.readIndex = (this.readIndex + 1) % this.capacity;
            this.available--;
          }

          this.left[this.writeIndex] = inL[i];
          this.right[this.writeIndex] = inR[i];
          this.writeIndex = (this.writeIndex + 1) % this.capacity;
          this.available++;
        }
      }
    };
  }

  process(inputs, outputs) {
    const output = outputs[0];
    const leftOut = output[0];
    const rightOut = output[1];
    const frames = leftOut.length;

    for (let i = 0; i < frames; i++) {
      if (this.available > 0) {
        leftOut[i] = this.left[this.readIndex];
        rightOut[i] = this.right[this.readIndex];
        this.readIndex = (this.readIndex + 1) % this.capacity;
        this.available--;
      } else {
        leftOut[i] = 0;
        rightOut[i] = 0;
        this.underflows++;
      }
    }

    this.port.postMessage({
      type: "status",
      available: this.available,
      underflows: this.underflows,
    });

    return true;
  }
}

registerProcessor("emulator-audio", EmulatorAudioProcessor);
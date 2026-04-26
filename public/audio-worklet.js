class EmulatorAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    this.capacity = Math.max(1024, Math.floor(sampleRate * 0.25));
    this.left = new Float32Array(this.capacity);
    this.right = new Float32Array(this.capacity);
    this.readIndex = 0;
    this.writeIndex = 0;
    this.available = 0;
    this.underflows = 0;
    this.statusCounter = 0;

    this.port.onmessage = (e) => {
      const data = e.data;

      if (!data) {
        return;
      }

      if (data.type === "clear") {
        this.readIndex = 0;
        this.writeIndex = 0;
        this.available = 0;
        this.underflows = 0;
        return;
      }

      if (data.type === "samples") {
        const inL = data.left;
        const inR = data.right;

        if (!inL || !inR) {
          return;
        }

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

    if (!output || output.length === 0) {
      return true;
    }

    const leftOut = output[0];
    const rightOut = output[1] || output[0];
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

    this.statusCounter++;

    if ((this.statusCounter & 15) === 0) {
      this.port.postMessage({
        type: "status",
        available: this.available,
        underflows: this.underflows,
        capacity: this.capacity,
        sampleRate,
      });
    }

    return true;
  }
}

registerProcessor("emulator-audio", EmulatorAudioProcessor);
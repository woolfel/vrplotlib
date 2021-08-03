import * as THREE from './three.js/build/three.module.js';
export class Resnetvis {
  constructor(world) {
    this.loaded = false
    console.log("initing resnetvis")
    this.insz = [1, 3, 224, 224]
    const resnet = new onnx.InferenceSession();
    this.resnet = resnet
    resnet.loadModel("./models/resnet18-v1-7.onnx").then(async () => {
      this.loaded = true
      console.log(resnet)
      const fls = new Float32Array(this.insz.reduce((a, b) => a * b)).fill(1)
      const ot = new onnx.Tensor(fls, 'float32', this.insz)
      const outmap = await resnet.run([ot])
      console.log(outmap)
      const result = outmap.values().next().value
      console.log("RESULT")
      console.log(result.data)
    })

    this.stillRunning = false
  }

  async inferArr(arr) {
    const stime = performance.now()
    const ot = new onnx.Tensor(arr, 'float32', this.insz)
    const outmap = await this.resnet.run([ot])
    const result = outmap.values().next().value
    console.log(`took ${performance.now() - stime}`)
    return result.data
  }

  async update() {
    if (this.loaded && !this.stillRunning) {
      this.stillRunning = true
      await this.inferArr(new Float32Array(this.insz.reduce((a, b) => a * b)).fill(1))
      this.stillRunning = false
    }
  }
}
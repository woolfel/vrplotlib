import * as THREE from './three.js/build/three.module.js';
import { tensorTexture, tensorImagePlane, imgUrlToTensor } from "./common.mjs";
export class Demonetvis {
  constructor(world) {
    this.processing = false

    this.minDelay = 2
    this.lastFrameTime = -1000000000000

    Promise.all(["n01440764_tench.JPEG", "n01443537_goldfish.JPEG", "n01484850_great_white_shark.JPEG", "n01491361_tiger_shark.JPEG", "n01494475_hammerhead.JPEG"].map(url => imgUrlToTensor("./imagenet/" + url))).then(images => {
      this.images = images
      this.imageIndex = 0
      console.log(this.images)
    })

    const input = tf.input({ shape: [3, 224, 224] })
    const convDefaults = { filters: 16, kernelSize: 3, strides: 1, activation: 'relu', dataFormat: 'channelsFirst', kernelInitializer: "glorotUniform" }
    const conv1 = tf.layers.conv2d({ ...convDefaults })
    const conv2 = tf.layers.conv2d({ ...convDefaults })
    const hidden = conv1.apply(input)
    const output = conv2.apply(hidden)
    this.model = tf.model({ inputs: input, outputs: [hidden, output] })
    // this.model.summary()

    this.tensorInput = tf.tensor(new Float32Array(3 * 224 * 224).fill(1), [1, 3, 224, 224])
    this.tensorActivation1 = tf.tensor(new Float32Array(3 * 224 * 224).fill(1), [1, 3, 224, 224])
    this.tensorActivation2 = tf.tensor(new Float32Array(3 * 224 * 224).fill(1), [1, 3, 224, 224])
    Promise.all([tensorImagePlane(this.tensorInput),
    tensorImagePlane(this.tensorActivation1, 0.6),
    tensorImagePlane(this.tensorActivation2, 0.6)]).then(async ([a, b, c]) => {
      this.inputPlane = a
      this.activationPlane1 = b
      this.activationPlane2 = c
      this.group = new THREE.Group()
      this.group.add(this.inputPlane)
      this.group.add(this.activationPlane1)
      this.group.add(this.activationPlane2)
      this.world = world
      this.world.add(this.group)


      this.inputPlane.position.add(new THREE.Vector3(0, 0, -1))
      this.activationPlane1.position.add(new THREE.Vector3(0, 0, -0.5))
    })
  }

  async loadImageInput(url) {
    const img = await imgUrlToTensor(url)
    this.tensorInput = img
  }

  async predict() {
    const [act1, act2] = this.model.predict(this.tensorInput)
    this.tensorActivation1 = act1
    this.tensorActivation2 = act2
  }

  async display() {
    const sstime = performance.now()
    const tensors = [this.tensorInput,
    tf.reshape(tf.slice(this.tensorActivation1, [0, 0, 0, 0], [-1, 3, -1, -1]), [222, 222, 3]),
    tf.slice(this.tensorActivation2, [0, 0, 0, 0], [-1, 3, -1, -1])]
    const [i, a1, a2] = await Promise.all(tensors.map(tensorTexture))
    this.inputPlane.children[0].material.map = i
    this.inputPlane.children[0].material.needsUpdate = true
    this.activationPlane1.children[0].material.map = a1
    this.activationPlane1.children[0].material.needsUpdate = true
    this.activationPlane2.children[0].material.map = a2
    this.activationPlane2.children[0].material.needsUpdate = true
    console.log(`display took ${performance.now() - sstime}`)
  }

  async _update() {
    this.imageIndex = (this.imageIndex + 1) % (this.images.length)
    this.tensorInput = this.images[this.imageIndex]
    await this.predict()
    await this.display()
  }

  update() {
    if (this.images && !this.processing && ((performance.now() - this.lastFrameTime) > this.minDelay * 1000)) {
      this.lastFrameTime = performance.now()
      this.processing = true
      this._update().then(() => {
        this.processing = false
      })
    }
  }
}
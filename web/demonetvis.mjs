import * as THREE from 'three';
import { tensorTexture, tensorImagePlane, imgUrlToTensor, tfMode, threeMode, tensorInternalTexture } from "./common.mjs";
import * as tf from "@tensorflow/tfjs";
export class Demonetvis {
  static async create(world, config) {
    const defaultconfig = { do2d: false }
    const thiss = new Demonetvis()
    thiss.config = { ...defaultconfig, config }
    thiss.processing = false

    thiss.minDelay = 1
    thiss.lastFrameTime = -1000000000000

    const images = await Promise.all(["n01440764_tench.jpeg", "n01443537_goldfish.jpeg", "n01484850_great_white_shark.jpeg", "n01491361_tiger_shark.jpeg", "n01494475_hammerhead.jpeg"].map(url => imgUrlToTensor("./imagenet/" + url)))
    thiss.images = images
    thiss.imageIndex = 0
    console.log(thiss.images)
    console.log(tensorInternalTexture(thiss.images[0]))

    const input = tf.input({ shape: [3, 224, 224] })
    const convDefaults = { filters: 15, kernelSize: 3, strides: 1, activation: 'relu', dataFormat: 'channelsFirst', kernelInitializer: "glorotUniform", padding: "same" }
    const conv1 = tf.layers.conv2d({ ...convDefaults })
    const conv2 = tf.layers.conv2d({ ...convDefaults })
    const hidden = conv1.apply(input)
    const output = conv2.apply(hidden)
    thiss.model = tf.model({ inputs: input, outputs: [hidden, output] })
    // thiss.model.summary()

    thiss.tensorInput = tf.tensor(new Float32Array(3 * 224 * 224).fill(1), [1, 3, 224, 224])
    thiss.tensorActivation1 = tf.tensor(new Float32Array(3 * 224 * 224).fill(1), [1, 3, 224, 224])
    thiss.tensorActivation2 = tf.tensor(new Float32Array(3 * 224 * 224).fill(1), [1, 3, 224, 224])
    const [a, b, c] = await Promise.all([tensorImagePlane(thiss.tensorInput),
    tensorImagePlane(thiss.tensorActivation1, 0.6),
    tensorImagePlane(thiss.tensorActivation2, 0.6)])
    thiss.inputPlane = a
    thiss.activationPlane1 = b
    thiss.activationPlane2 = c
    thiss.group = new THREE.Group()
    thiss.group.add(thiss.inputPlane)
    thiss.group.add(thiss.activationPlane1)
    thiss.group.add(thiss.activationPlane2)
    thiss.world = world
    thiss.world.add(thiss.group)

    thiss.inputPlane.position.add(new THREE.Vector3(0, 0, -1))
    thiss.activationPlane1.position.add(new THREE.Vector3(0, 0, -0.5))

    if (thiss.config.do2d) {
      const canvas2d = document.createElement('canvas')
      canvas2d.width = 224
      canvas2d.height = 224
      document.body.appendChild(canvas2d)
      thiss.ctx2d = canvas2d.getContext('2d')
    }
    return thiss
  }

  async loadImageInput(url) {
    const img = await imgUrlToTensor(url)
    this.tensorInput = img
  }

  async predict() {
    const sstime = performance.now()
    const [act1, act2] = this.model.predict(this.tensorInput)
    this.tensorActivation1 = act1
    this.tensorActivation2 = act2
    console.log(`predict teentsy took ${performance.now() - sstime}`)
  }

  async display2d(tensor) {
    const ntensor = tf.transpose(tf.squeeze(tf.concat([tf.add(tf.mul(tensor, tf.scalar(255)), tf.scalar(128)), tf.fill([1, 1, 224, 224], 225, "float32")], 1)), [1, 2, 0])
    console.log(ntensor)
    const tensordata = await ntensor.data()
    // const arr = new UInt8ClampedArray(224*224*4)
    const arr = new Uint8ClampedArray(tensordata)
    console.log(arr)
    // for (let i = 0; i < tensordata.length; i++) {

    // }
    const imageData = new ImageData(arr, 224, 224)
    this.ctx2d.putImageData(imageData, 0, 0)
  }

  async display() {
    console.log("displaying")
    const sstime = performance.now()
    const tensors = [this.tensorInput,
    // this.tensorActivation1,
    // this.tensorActivation2
    tf.split(this.tensorActivation1, 5, 1)[0],
    tf.split(this.tensorActivation2, 5, 1)[0]
    ]
    if (this.config.do2d) {
      await this.display2d(tensors[2])
    }
    const renderActivation = (activation) => (async () => {
      const texture = tensorTexture(this.tensorInput)
    })
    console.log(tensors)
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
    tfMode()
    await this.predict()
    threeMode()
    await this.display()
  }

  update() {
    console.log("updating")
    if (this.images && !this.processing && ((performance.now() - this.lastFrameTime) > this.minDelay * 1000)) {
      this.lastFrameTime = performance.now()
      this.processing = true
      this._update().then(() => {
        this.processing = false
      })
    }
  }
}
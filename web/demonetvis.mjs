import * as THREE from './three.js/build/three.module.js';
import { tensorTexture, tensorImagePlane, imgUrlToTensor } from "./common.mjs";
export class Demonetvis {
  constructor(world) {

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
    tensorImagePlane(this.tensorActivation1),
    tensorImagePlane(this.tensorActivation2)]).then(async ([a, b, c]) => {
      this.inputPlane = a
      this.activationPlane1 = b
      this.activationPlane2 = c
      console.log(this.activationPlane1)
      this.group = new THREE.Group()
      this.group.add(this.inputPlane)
      this.group.add(this.activationPlane1)
      this.group.add(this.activationPlane2)
      this.world = world
      this.world.add(this.group)

      this.activationPlane1.position.add(new THREE.Vector3(0, 0, 1))
      this.activationPlane2.position.add(new THREE.Vector3(0, 0, 2))
      await this.loadImageInput("./imagenet/n09468604_valley.JPEG")
      this.tensorInput.data().then(x => {
        console.log("INPUT DATA")
        console.log(x)
      })
      await this._update()
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
    this.inputPlane.children[0].material.map = await tensorTexture(this.tensorInput)
    this.inputPlane.children[0].material.needsUpdate = true
    this.activationPlane1.children[0].material.map = await tensorTexture(this.tensorActivation1)
    this.activationPlane1.children[0].material.needsUpdate = true
    this.activationPlane2.children[0].material.map = await tensorTexture(this.tensorActivation2)
    this.activationPlane2.children[0].material.needsUpdate = true
  }

  async _update() {
    await this.predict()
    await this.display()
  }

  update() {
  }
}
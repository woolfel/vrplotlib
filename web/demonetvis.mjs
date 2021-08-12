import * as THREE from 'three';
import { decodedInternalTexture, tensorTextureGl, tensorInternalTexture, decodeTensor, tensorImagePlane, imgUrlToTensor, tfMode, threeMode, glMode, imagePlane, commonCopyTexture, threeInternalTexture, dispose } from "./common.mjs";
import * as tf from "@tensorflow/tfjs";
export class Demonetvis {
  static async create(world, config) {
    const defaultconfig = { do2d: false }
    const thiss = new Demonetvis()
    thiss.config = { ...defaultconfig, config }
    thiss.processing = false

    thiss.minDelay = 0.1
    thiss.lastFrameTime = -1000000000000

    const images = await Promise.all(["n01440764_tench.jpeg", "n01443537_goldfish.jpeg", "n01484850_great_white_shark.jpeg", "n01491361_tiger_shark.jpeg", "n01494475_hammerhead.jpeg"].map(url => imgUrlToTensor("./imagenet/" + url)))
    thiss.images = images
    thiss.imageIndex = 0

    const input = tf.input({ shape: [3, 224, 224] })
    const convDefaults = { filters: 15, kernelSize: 3, strides: 1, activation: 'relu', dataFormat: 'channelsFirst', kernelInitializer: "glorotUniform", padding: "same" }
    const conv1 = tf.layers.conv2d({ ...convDefaults })
    const conv2 = tf.layers.conv2d({ ...convDefaults })
    const hidden = conv1.apply(input)
    const output = conv2.apply(hidden)
    thiss.model = tf.model({ inputs: input, outputs: [hidden, output] })
    // thiss.model.summary()

    thiss.tensorInput = tf.tensor(new Float32Array(3 * 224 * 224).fill(0), [1, 3, 224, 224])
    thiss.tensorActivation1 = tf.tensor(new Float32Array(3 * 224 * 224).fill(0.05), [1, 3, 224, 224])
    thiss.tensorActivation2 = tf.tensor(new Float32Array(3 * 224 * 224).fill(0.1), [1, 3, 224, 224])
    const [a, b, c] = await Promise.all([tensorImagePlane(thiss.tensorInput),
    tensorImagePlane(thiss.tensorActivation1, 0.6),
    tensorImagePlane(thiss.tensorActivation2, 0.6)])
    thiss.group = new THREE.Group()
    // thiss.inputPlane = a
    // thiss.group.add(thiss.inputPlane)
    thiss.activationPlane1 = b
    thiss.activationPlane2 = c
    thiss.group = new THREE.Group()
    thiss.group.add(thiss.activationPlane1)
    thiss.group.add(thiss.activationPlane2)
    thiss.world = world
    thiss.world.add(thiss.group)

    thiss.activationPlane1.position.add(new THREE.Vector3(0, 0, -0.5))

    if (thiss.config.do2d) {
      const canvas2d = document.createElement('canvas')
      canvas2d.width = 224
      canvas2d.height = 224
      document.body.appendChild(canvas2d)
      thiss.ctx2d = canvas2d.getContext('2d')
    }

    await new Promise((resolve) => {
      imagePlane("./imagenet/n01498041_stingray.jpeg", (plane) => {
        thiss.goodplane = plane
        plane.position.x += 1
        thiss.group.add(plane)
        imagePlane("./imagenet/n01534433_junco.jpeg", (plane) => {
          console.log("secondthinggot")
          thiss.inputPlane = plane
          plane.position.x += 1
          thiss.inputPlane.position.add(new THREE.Vector3(-1, 0, -1))
          thiss.group.add(plane)

          resolve()
        })
      })
    })

    return thiss
  }

  async loadImageInput(url) {
    const img = await imgUrlToTensor(url)
    this.tensorInput = img
  }

  predict() {
    if (this.tensorActivation1) this.tensorActivation1.dispose()
    if (this.tensorActivation2) this.tensorActivation2.dispose()
    const sstime = performance.now()
    const [act1, act2] = this.model.predict(this.tensorInput)
    this.tensorActivation1 = act1
    this.tensorActivation2 = act2
    // console.log(`predict teentsy took ${performance.now() - sstime}`)
  }

  async display2d(tensor) {
    const ntensor = tf.transpose(tf.squeeze(tf.concat([tf.add(tf.mul(tensor, tf.scalar(255)), tf.scalar(128)), tf.fill([1, 1, 224, 224], 225, "float32")], 1)), [1, 2, 0])
    const tensordata = await ntensor.data()
    const arr = new Uint8ClampedArray(tensordata)
    const imageData = new ImageData(arr, 224, 224)
    this.ctx2d.putImageData(imageData, 0, 0)
  }

  async display() {
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

    // commonCopyTexture( decodedInternalTexture(tensors[0]), threeInternalTexture(this.inputPlane.children[0].material.map))
    console.log(tensors[1])
    const decodedTensor = decodeTensor(tensors[1])
    console.log("decoded tensor")
    console.log(decodedTensor)
    const tensorTexture = tensorInternalTexture(decodedTensor)
    console.log(tensorTexture)
    const planeTexture = threeInternalTexture(this.activationPlane1.children[0].material.map)
    console.log(planeTexture)
    commonCopyTexture(tensorTexture, planeTexture, 224, 224)
    dispose(decodedTensor)
    tensors[1].dispose()
    tensors[2].dispose()
    // dispose(tensors[1])
    // dispose(tensors[0])
    // commonCopyTexture(decodedInternalTexture(tensors[2]), threeInternalTexture(this.activationPlane2.children[0].material.map))
    // this.inputPlane.children[0].material.needsUpdate = true
    // this.activationPlane1.children[0].material.needsUpdate = true
    // this.activationPlane2.children[0].material.needsUpdate = true
    // this.copyGoodTexture()
    console.log(`display took ${performance.now() - sstime}`)
  }

  async _update() {
    this.imageIndex = (this.imageIndex + 1) % (this.images.length)
    this.tensorInput = this.images[this.imageIndex]
    tfMode()
    this.predict()
    threeMode()
    await this.display()
  }

  copyGoodTexture() {
    const planeITex = threeInternalTexture(this.inputPlane.children[0].material.map)
    console.log(planeITex)
    const goodtexthree = this.goodplane.children[0].material.map
    console.log(goodtexthree)
    const goodTex = threeInternalTexture(goodtexthree)

    console.log(goodTex)
    commonCopyTexture(goodTex, planeITex, 500, 375, false)
    this.inputPlane.children[0].material.needsUpdate = true
  }

  update() {
    const enoughTimeHasPassed = ((performance.now() - this.lastFrameTime) > this.minDelay * 1000);
    if (this.images && !this.processing && enoughTimeHasPassed) {
      this.lastFrameTime = performance.now()
      this.processing = true
      this._update().then(() => {
        this.processing = false
      })
    }
  }
}
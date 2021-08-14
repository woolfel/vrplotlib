import * as THREE from 'three';
import { tensorImagePlane, imgUrlToTensor, tfMode, threeMode, imagePlane, commonCopyTexture, threeInternalTexture, showActivationAcrossPlanes } from "./common.mjs";
import * as common from "./common.mjs";
import * as tf from "@tensorflow/tfjs";
import * as mobilenet from "@tensorflow-models/mobilenet"
export class NetVis {
  static async create(world, config) {
    const thiss = new NetVis()
    thiss.channelsLast = false;
    const model = await tf.loadLayersModel(config.url)
    thiss.world = world
    thiss.group = new THREE.Group()
    world.add(thiss.group)
    console.log(model)
    thiss.outputLayers = []
    for (let layer of model.layers) {
      if (layer.name.match(/conv\d?d?$/)) {
        if (!thiss.channelsLast && layer.dataFormat === "channelsLast") {
          thiss.channelsLast = true
        }
        thiss.outputLayers.push(layer.outboundNodes[0].outputTensors[0])
      }
    }
    const modelspec = { inputs: model.inputs, outputs: thiss.outputLayers }
    console.log(modelspec)
    thiss.model = tf.model(modelspec)
    console.log(thiss.model)
    thiss.activationPlaneGroups = []
    thiss.inputShape = model.feedInputShapes[0]
    thiss.inputShape[0] = 1
    let visDepth = 0
    for (let output of thiss.outputLayers) {
      const actShape = output.shape
      const numPlanes = Math.min(Math.ceil(actShape[3] / 3), 16)
      const planes = []
      const activationGroup = new THREE.Group()
      thiss.group.add(activationGroup)
      const planeShape = thiss.channelsLast ? [actShape[1], actShape[2], 3] : [3, actShape[2], actShape[3]];
      for (let i = 0; i < numPlanes; i++) {
        const plane = await tensorImagePlane(tf.zeros(planeShape), 0.3)
        plane.position.z += visDepth
        plane.scale.x = actShape[1] / 50
        plane.scale.z = actShape[1] / 50
        plane.scale.y = actShape[1] / 50
        activationGroup.add(plane)
        planes.push(plane)
        visDepth += 0.05
      }
      thiss.activationPlaneGroups.push(planes)
      visDepth += 0.25
    }
    thiss.updating = false
    thiss.inputTensor = tf.zeros(thiss.inputShape)
    thiss.activationTensors = []
    thiss.delay = 1
    thiss.lastUpdate = -9999999999

    const images = await Promise.all(["n01440764_tench.jpeg", "n01443537_goldfish.jpeg", "n01484850_great_white_shark.jpeg", "n01491361_tiger_shark.jpeg", "n01494475_hammerhead.jpeg"].map(url => imgUrlToTensor("./imagenet/" + url)))
    thiss.images = images
    thiss.imageIndex = 0
    console.log(images[0].shape)
    console.log(await images[0].data())
    thiss.inputTensor = images[0].resizeBilinear([thiss.inputShape[1], thiss.inputShape[2]])

    return thiss
  }

  cycleImage() {
    this.imageIndex = (this.imageIndex + 1) % this.images.length
    this.inputTensor = this.images[this.imageIndex]
  }

  async display() {
    tf.tidy(() => {
      for (let i = 0; i < this.activationTensors.length; i++) {
        const activation = this.activationTensors[i]
        const planes = this.activationPlaneGroups[i]
        showActivationAcrossPlanes(activation, planes, this.channelsLast)
      }
    })
  }

  async _update() {
    this.cycleImage()
    this.activationTensors.forEach(t => t.dispose())
    const pstime = performance.now()
    this.activationTensors = this.model.predict(this.inputTensor)
    console.log(`predict took ${performance.now() - pstime}`)
    console.log(this.activationTensors)
    await this.display()
  }

  update() {
    if (!this.updating && (this.lastUpdate + this.delay * 1000 < performance.now())) {
      this.updating = true
      this.lastUpdate = performance.now()
      this._update().then(() => {
        this.updating = false
      })
    }
  }
}
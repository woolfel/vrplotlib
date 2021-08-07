import * as THREE from 'three';
import { imagePlane, tensorImagePlane } from "./common.mjs";

export class Mobilenetvis {
  constructor() {

    mobilenet.load().then(async (model) => {
      this.model = model
      console.log(model.model.layers)
      // this.modelHiddenVisible = tf.model({ inputs: model.inputs, outputs: model.layers[2].output })
      console.log(model)
      const tensor = tf.tensor(new Float32Array(3 * 224 * 224).fill(1), [224, 224, 3])
      console.log(tensor)
      const predictions = await this.model.infer(tensor)
      console.log("PREDICTIONS:")
      predictions.data().then(console.log)
    })
  }

  update() {

  }
}
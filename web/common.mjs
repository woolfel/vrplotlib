import * as THREE from 'three';
import * as tf from "@tensorflow/tfjs";

let gl, whichState, tfGlState, threeGlState;

const gpgpu = tf.backend().gpgpu
console.log(gpgpu)

export function setGlContext(ctx) {
  gl = ctx
}

export function tfMode() {
  if (whichState == 'tf') {
    if (gpgpu.vertexAttrsAreBound) {
      // @GLPROBLEM enable scissor
      gl.useProgram(gpgpu.program);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gpgpu.indexBuffer);
      gpgpu_util.bindVertexProgramAttributeStreams(gl, false, gpgpu.program, gpgpu.vertexBuffer);
    }
    whichState = 'three'
  }
}

export function threeMode() {
  if (whichState == 'three') {
    whichState = 'tf'
  }
}


export async function imgUrlToTensor(url) {
  const img = document.createElement("img")
  img.width = 224
  img.height = 224
  img.src = url
  const result = await (new Promise((resolve) => {
    img.onload = () => {
      const tensor = tf.browser.fromPixels(img, 3)
      console.log("IMG TENSOR DIMENSION", tensor.shape)
      const shaped = tensor.transpose([2, 0, 1]).expandDims(0).mul(tf.scalar(1 / 255))
      resolve(shaped)
    }
  }))
  return result
}

export async function toUint8Array(tensor) {
  return new Uint8Array(await tensor.mul(tf.scalar(255)).data())
}

export function tensorInternalTexture(tensor) {
  const texData = tf.backend().texData.get(tensor.dataId)
  const tex = texData.texture
  return tex
}

export async function tensorTexture(tensor) { // @SWITCHY
  if (tensor.shape.length !== 4 && tensor.shape.length !== 3) {
    throw new Error(`image tensor needs 4 or 2 dims`)
  }
  let texture;
  if (tensor.shape.length === 3) {
    const array = await toUint8Array(tf.transpose(tensor, [1, 2, 0]))
    threeMode()
    const hasA = tensor.shape[0] === 4
    texture = new THREE.DataTexture(array, tensor.shape[1], tensor.shape[2], hasA ? THREE.RGBAFormat : THREE.RGBFormat);
    tfMode()
  } else {
    const array = await toUint8Array(tf.transpose(tf.squeeze(tensor), [1, 2, 0]))
    threeMode()
    const hasA = tensor.shape[1] === 4
    texture = new THREE.DataTexture(array, tensor.shape[2], tensor.shape[3], hasA ? THREE.RGBAFormat : THREE.RGBFormat);
    tfMode()
  }
  return texture
}

export function arrayTexture(arr, width, height) {
  return new THREE.DataTexture(array, width, height, RGBAFormat);
}

export async function tensorImagePlane(tensor, opacity = 1) {
  const texture = await tensorTexture(tensor)
  const plane = doubleSidedPlane(texture, opacity)
  return plane
}

export function doubleSidedPlane(texture, opacity = 1) {
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    opacity,
    transparent: opacity !== 1,
  });
  // make one visible from front and one from back
  const object = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material)
  const object2 = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material)
  object2.rotation.z += Math.PI
  object.rotation.z += Math.PI
  object2.scale.x = -1
  const group = new THREE.Group()
  group.add(object)
  group.add(object2)
  object2.rotateY(Math.PI)
  return group
}

export function imagePlane(url, callback) {
  const loader = new THREE.TextureLoader();

  // load a resource
  loader.load(
    // resource URL
    url,

    // onLoad callback
    function (texture) {
      callback(doubleSidedPlane(texture))
    },

    // onProgress callback currently not supported
    undefined,

    // onError callback
    function (err) {
      console.error('An error happened.');
    }
  );
}

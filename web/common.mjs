import * as THREE from 'three';
import * as tf from "@tensorflow/tfjs";
import { copyTexture } from "./gl.mjs";

// import { getDenseTexShape } from "@tensorflow/tfjs-backend-webgl/src/tex_util"
// console.log(getDenseTexShape)
// import { bindVertexProgramAttributeStreams } from "./node_moduls/@tensorflow/tfjs-backend-webgl/src/gpgpu_util";
let gl, renderer, whichState, tfGlState, threeGlState;
let backend, gpgpu;
let playModesSafe = true;

export function threeInternalTexture(threeTex) {
  const props = renderer.properties.get(threeTex)
  return props.__webglTexture
}

export function setRendererAndTf(the_renderer) {
  renderer = the_renderer
  gl = the_renderer.getContext()
  backend = tf.backend()
  gpgpu = backend.gpgpu
  console.log(gpgpu)
}

export function glMode() {
  if (playModesSafe || whichState !== "gl") {
  }
  whichState = "gl"
}

export function commonCopyTexture(from, to) {
  copyTexture(gl, from, to)
}

export function tfMode() {
  if (playModesSafe || whichState !== 'tf') {
    if (gpgpu.framebuffer) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, gpgpu.framebuffer)
    }
    if (gpgpu.vertexAttrsAreBound) {
      // @GLPROBLEM enable scissor
      gl.scissor(0, 0, gl.canvas.width, gl.canvas.height)
      gl.useProgram(gpgpu.program);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gpgpu.indexBuffer);
      bindVertexProgramAttributeStreams(gl, gpgpu.program, gpgpu.vertexBuffer);
    }
  }
  whichState = 'tf'
}

export async function threeMode() {
  if (playModesSafe || whichState !== 'three') {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    renderer.resetState()
  }
  whichState = 'three'
}


export async function imgUrlToTensor(url) {
  const img = document.createElement("img")
  img.width = 224
  img.height = 224
  img.src = url
  const result = await (new Promise((resolve) => {
    img.onload = () => {
      const tensor = tf.browser.fromPixels(img, 3)
      const shaped = tensor.transpose([2, 0, 1]).expandDims(0).mul(tf.scalar(1 / 255))
      resolve(shaped)
    }
  }))
  return result
}

export function forceTexInit() {

}

export async function toUint8Array(tensor) {
  return new Uint8Array(await tensor.mul(tf.scalar(255)).data())
}

export function tensorInternalTexture(tensor) {
  const texData = tf.backend().texData.get(tensor.dataId)
  const tex = texData.texture
  return tex
}

export function decodedInternalTexture(tensor) {
  return tensorInternalTexture(backend.decode(tensor.dataId))
}

export async function tensorTextureGl(tensor, texture) {
  if (texture.uuid) {// if it's a three texture
    texture = threeInternalTexture(texture)
  }
  const decInternalTex = decodedInternalTexture(tensor)
  console.log(decInternalTex)
  const texProps = renderer.properties.get(texture);
  console.log(texProps)
  const threeTexture = texProps.__webglTexture
  copyTexture(gl, decInternalTex, threeTexture)
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


function bindVertexBufferToProgramAttribute(
  gl, program, attribute,
  buffer, arrayEntriesPerItem, itemStrideInBytes,
  itemOffsetInBytes) {
  const loc = gl.getAttribLocation(program, attribute);
  if (loc === -1) {
    // The GPU compiler decided to strip out this attribute because it's unused,
    // thus no need to bind.
    return false;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.vertexAttribPointer(
    loc, arrayEntriesPerItem, gl.FLOAT, false, itemStrideInBytes,
    itemOffsetInBytes);
  gl.enableVertexAttribArray(loc);
  return true;
}

function bindVertexProgramAttributeStreams(
  gl, program, vertexBuffer) {
  const posOffset = 0;               // x is the first buffer element
  const uvOffset = 3 * 4;            // uv comes after [x y z]
  const stride = (3 * 4) + (2 * 4);  // xyz + uv, each entry is 4-byte float.
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
  const success = bindVertexBufferToProgramAttribute(
    gl, program, 'clipSpacePos', vertexBuffer, 3, stride, posOffset);

  return success &&
    bindVertexBufferToProgramAttribute(
      gl, program, 'uv', vertexBuffer, 2, stride, uvOffset);
}
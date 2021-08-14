import * as THREE from 'three';
import * as tf from "@tensorflow/tfjs";
import { copyTexture } from "./gl.mjs";

// import { getDenseTexShape } from "@tensorflow/tfjs-backend-webgl/src/tex_util"
// console.log(getDenseTexShape)
// import { bindVertexProgramAttributeStreams } from "./node_moduls/@tensorflow/tfjs-backend-webgl/src/gpgpu_util";
let gl, renderer, whichState, tfGlState, threeGlState;
let tex_util, webgl_util, gpgpu_util;
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
  if (!backend.tex_util) {
    console.error("NO CUSTOM WEBGL BACKEND")
  }
  tex_util = backend.tex_util
  gpgpu_util = backend.gpgpu_util
  webgl_util = backend.webgl_util
}

export function glMode() {
  if (playModesSafe || whichState !== "gl") {
  }
  whichState = "gl"
}

export function commonCopyTexture(from, to, width, height, alpha) {
  copyTexture(gl, from, to, width, height, alpha)
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
      const shaped = tensor.expandDims(0)
      resolve(shaped)
    }
  }))
  return result
}

export function dispose(tensor) {
  backend.disposeData(tensor.dataId)
}

export async function toUint8Array(tensor) {
  return new Uint8Array(await tensor.mul(tf.scalar(255)).data())
}

export function tensorInternalTexture(tensor) {
  const texData = tf.backend().texData.get(tensor.dataId)
  const tex = texData.texture
  return tex
}

export function decodeTensor(tensor) {
  return backend.decode(tensor.dataId)
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

export function iTexOfPlane(plane) {
  return threeInternalTexture(plane.children[0].material.map)
}

export function showActivationAcrossPlanes(activation, planes, channelsLast = false) {
  if (channelsLast) {
    tf.tidy(() => {
      activation = tf.squeeze(activation)
      const shape = activation.shape
      let activationPadded = activation
      if (activation.shape[2] < planes.length) {
        activationPadded = tf.concat([activation, tf.zeros([activation.shape[0], activation.shape[1], planes.length * 3 - activation.shape[2]])], 2)
      } else if (activation.shape[2] > planes.length) {
        activationPadded = tf.slice(activation, [0, 0, 0], [activation.shape[0], activation.shape[1], planes.length * 3])
      }
      const layers = tf.split(tf.transpose(activationPadded, [2, 0, 1]), planes.length, 0)
      //.map(t => tf.concat([t, tf.ones([shape[0], shape[1], 1])], 2))
      for (let i = 0; i < planes.length; i++) {
        const plane = planes[i]
        const texInternal = iTexOfPlane(plane)
        if (!texInternal) continue;
        const layer = layers[i]
        const tensInternal = tensorInternalTexture(layer)
        commonCopyTexture(tensInternal, texInternal, shape[0], shape[1])
      }
    })
  }
}

export async function tensorTexture(tensor) { // @SWITCHY
  if (tensor.shape.length !== 4 && tensor.shape.length !== 3) {
    throw new Error(`image tensor needs 4 or 2 dims`)
  }
  let texture;
  tfMode()
  if (tensor.shape.length === 3) {
    const array = tf.transpose(tensor, [1, 2, 0]).dataSync()
    threeMode()
    const hasA = tensor.shape[0] === 4
    texture = new THREE.DataTexture(array, tensor.shape[1], tensor.shape[2], hasA ? THREE.RGBAFormat : THREE.RGBFormat, THREE.FloatType);
    texture.generateMipmaps = false;
    tfMode()
  } else {
    const array = tf.transpose(tf.squeeze(tensor), [1, 2, 0]).dataSync()
    threeMode()
    const hasA = tensor.shape[1] === 4
    texture = new THREE.DataTexture(array, tensor.shape[2], tensor.shape[3], hasA ? THREE.RGBAFormat : THREE.RGBFormat, THREE.FloatType);
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
      // texture.generateMipmaps = false;
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
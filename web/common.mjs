import * as THREE from './three.js/build/three.module.js';

export async function imgUrlToTensor(url) {
  const img = document.createElement("img")
  img.width = 224
  img.height = 224
  img.src = url
  const result = await (new Promise((resolve) => {
    img.onload = () => {
      const tensor = tf.browser.fromPixels(img, 3)
      console.log("IMAGE TENSOR")
      tensor.data().then(console.log)
      const shaped = tensor.reshape([1, 3, 224, 224]).mul(tf.scalar(1 / 255))
      resolve(shaped)
    }
  }))
  return result
}

export async function toUint8Array(tensor) {
  return new Uint8Array(await tensor.mul(tf.scalar(255)).data())
}

export async function tensorTexture(tensor) {
  if (tensor.shape.length !== 4 && tensor.shape.length !== 3) {
    throw new Error(`image tensor needs 4 or 2 dims`)
  }
  const array = await toUint8Array(tensor)
  let texture;
  if (tensor.shape.length === 3) {
    const hasA = tensor.shape[0] === 4
    texture = new THREE.DataTexture(array, tensor.shape[1], tensor.shape[2], hasA ? THREE.RGBFormat : THREE.RGBFormat);
  } else {
    const hasA = tensor.shape[1] === 4
    texture = new THREE.DataTexture(array, tensor.shape[2], tensor.shape[3], hasA ? THREE.RGBFormat : THREE.RGBFormat);
  }
  return texture
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

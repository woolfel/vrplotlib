import * as twgl from "twgl.js";

let programInfo, bufferInfo;

export function copyTexture(gl, input, output) {
  const stime = performance.now()
  // console.log(Object.getPrototypeOf(gl))


  const fbi = twgl.createFramebufferInfo(gl, [{ attachment: input, format: gl.RGB }], 500, 375);
  twgl.bindFramebufferInfo(gl, fbi);
  // gl.framebufferTexture2D(
  //   gl.FRAMEBUFFER,
  //   gl.COLOR_ATTACHMENT0, // attach texture as COLOR_ATTACHMENT0
  //   gl.TEXTURE_2D,        // attach a 2D texture
  //   input,                // the texture to attach
  //   0);

  gl.bindTexture(gl.TEXTURE_2D, output)
  gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGB, 0, 0, 500, 375, 0);

  // undo gl state changes
  // gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  console.log(`copytexture took ${performance.now() - stime}`)
}
  // const buf = gl.createBuffer();
  // gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  // gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
  //   -1, -1,
  //   1, -1,
  //   -1, 1,
  //   -1, 1,
  //   1, -1,
  //   1, 1,
  // ]), gl.STATIC_DRAW);

  // function setAttributes(buf, positionLoc) {
  //   gl.enableVertexAttribArray(positionLoc);
  //   gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
  // }

  // const colorPrgPositionLoc = gl.getAttribLocation(colorProgram, "position");
  // setAttributes(buf, colorPrgPositionLoc);
  // const colorLoc = gl.getUniformLocation(colorProgram, "color");
  // const colorProgMatrixLoc = gl.getUniformLocation(colorProgram, "matrix");

  // // draw red rect to first texture through the framebuffer it's attached to
  // gl.useProgram(colorProgram);

  // gl.bindFramebuffer(gl.FRAMEBUFFER, texFbPair1.fb);
  // gl.viewport(0, 0, 64, 64);
  // gl.uniform4fv(colorLoc, [1, 0, 0, 1]);
  // gl.uniformMatrix4fv(colorProgMatrixLoc, false, [
  //   0.5, 0, 0, 0,
  //   0, .25, 0, 0,
  //   0, 0, 1, 0,
  //   .2, .3, 0, 1,
  // ]);

  // gl.drawArrays(gl.TRIANGLES, 0, 6);

  // // Draw a blue rect to the second texture through the framebuffer it's attached to
  // gl.bindFramebuffer(gl.FRAMEBUFFER, texFbPair2.fb);
  // gl.viewport(0, 0, 64, 64);
  // gl.uniform4fv(colorLoc, [0, 0, 1, 1]);
  // gl.uniformMatrix4fv(colorProgMatrixLoc, false, [
  //   0.25, 0, 0, 0,
  //   0, .5, 0, 0,
  //   0, 0, 1, 0,
  //   .2, .3, 0, 1,
  // ]);

  // gl.drawArrays(gl.TRIANGLES, 0, 6);

  // // Draw both textures to the canvas
  // gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  // gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);



  // const mixPrgPositionLoc = gl.getAttribLocation(copyProgram, "position");
  // setAttributes(buf, mixPrgPositionLoc);

  // const mixProgMatrixLoc = gl.getUniformLocation(copyProgram, "matrix");

  // const tex1Loc = gl.getUniformLocation(copyProgram, "tex1");
  // const tex2Loc = gl.getUniformLocation(copyProgram, "tex2");

  // gl.useProgram(copyProgram);

  // gl.uniform1i(tex1Loc, 0);
  // gl.uniform1i(tex2Loc, 1);
  // gl.activeTexture(gl.TEXTURE0 + 0);
  // gl.bindTexture(gl.TEXTURE_2D, texFbPair1.tex);
  // gl.activeTexture(gl.TEXTURE0 + 1);
  // gl.bindTexture(gl.TEXTURE_2D, texFbPair2.tex);
  // gl.uniformMatrix4fv(mixProgMatrixLoc, false, [
  //   1, 0, 0, 0,
  //   0, 1, 0, 0,
  //   0, 0, 1, 0,
  //   0, 0, 0, 1,
  // ]);

  // gl.drawArrays(gl.TRIANGLES, 0, 6);
import * as twgl from "twgl.js";

let programInfo, bufferInfo;

export function copyTexture(gl, input, output) {
  const stime = performance.now()
  // console.log(Object.getPrototypeOf(gl))
  if (true || !programInfo) {
    var vs = `
attribute vec4 position;
uniform mat4 matrix;
varying vec2 v_texcoord;
void main() {
  gl_Position = matrix * position;
  v_texcoord = position.xy * .5 + .5;
}
`;

    var fs = `
precision mediump float;
varying vec2 v_texcoord;
uniform sampler2D texin;
void main() {
  gl_FragColor = texture2D(texin, v_texcoord);
}
`;
    programInfo = twgl.createProgramInfo(gl, [vs, fs]);
    console.log(programInfo)
  }
  const fb = gl.createFramebuffer()
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,  // attach texture as COLOR_ATTACHMENT0
    gl.TEXTURE_2D,         // attach a 2D texture
    output,                // the texture to attach
    0);

  if (true || !bufferInfo) {
    const arrays = {
      position: [
        -1, -1, 0,
        1, -1, 0,
        -1, 1, 0,
        -1, 1, 0,
        1, -1, 0,
        1, 1, 0
      ],
    };
    bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);
  }
  gl.useProgram(programInfo.program)
  const uniforms = { texin: input }
  console.log(input)
  twgl.setUniforms(programInfo, uniforms)
  gl.useProgram(programInfo.program);
  twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
  twgl.drawBufferInfo(gl, bufferInfo);

  // undo gl state changes
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

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
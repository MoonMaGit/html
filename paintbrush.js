
function createShader(gl, type, source) {
  var shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  }

  console.log(gl.getShaderInfoLog(shader));  // eslint-disable-line
  gl.deleteShader(shader);
  return undefined;
}

function createProgram(gl, vertexShader, fragmentShader) {
  var program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  var success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    return program;
  }

  console.log(gl.getProgramInfoLog(program));  // eslint-disable-line
  gl.deleteProgram(program);
  return undefined;
}

class Paintbrush{
shader = {
// point
point_vertex: 
`#version 300 es

// an attribute is an input (in) to a vertex shader.
// It will receive data from a buffer
in vec4 a_position;
uniform vec2 u_position;
uniform float u_deep;
uniform float u_size;

// all shaders have a main function
void main() {

  // gl_Position is a special variable a vertex shader
  // is responsible for setting
  gl_PointSize = u_size;
  gl_Position = a_position + vec4(u_position, u_deep, 0.0);
}
`,
point_frag: 
`#version 300 es

// fragment shaders don't have a default precision so we need
// to pick one. mediump is a good default. It means "medium precision"
precision mediump float;

// we need to declare an output for the fragment shader
uniform float u_r;
uniform float u_g;
uniform float u_b;
uniform float u_a;

out vec4 outColor;

void main() {
  // Just set the output to a constant redish-purple
  outColor = vec4(u_r, u_g, u_b, u_a);
}
`,
// line
line_vertex: 
`#version 300 es

// an attribute is an input (in) to a vertex shader.
// It will receive data from a buffer
in vec4 a_position;
uniform float u_width;
uniform float u_height;

uniform vec2 u_position;
uniform float u_deep0;
uniform float u_r0;
uniform float u_g0;
uniform float u_b0;
uniform float u_a0;

uniform float u_endX;
uniform float u_endY;
uniform float u_deep1;
uniform float u_r1;
uniform float u_g1;
uniform float u_b1;
uniform float u_a1;
out vec4 color;

// all shaders have a main function
void main() {
  //gl_PointSize = 4.0;
  gl_Position = vec4(0.0, 0.0, 0.0, 1);
  
  if(a_position[0] == 0.0){
    gl_Position.x = u_position.x;
    gl_Position.y = u_position.y;
	gl_Position.z = u_deep0;
    color = vec4(u_r0, u_g0, u_b0, u_a0);
  }else{
    gl_Position.x = (u_endX-u_width/2.0) / (u_width/2.0);
    gl_Position.y = (u_endY-u_height/2.0) / -(u_height/2.0);
	gl_Position.z = u_deep1;
	color = vec4(u_r1, u_g1, u_b1, u_a1);
  }
}
`,
line_frag: 
`#version 300 es

// fragment shaders don't have a default precision so we need
// to pick one. mediump is a good default. It means "medium precision"
precision mediump float;

// we need to declare an output for the fragment shader
in vec4 color;
out vec4 outColor;

void main() {
  // Just set the output to a constant redish-purple
  outColor = color;
}
`,
};
	width = 300;
	height = 200;

	brush = {
		point: {
			vs: 'point_vertex',
			fs: 'point_frag',
			program: null,
			data: [0],
			offset: 0,
			count: 1,
			vao: null,
			type: 'POINT'
		},
		line: {
			vs: 'line_vertex',
			fs: 'line_frag',
			program: null,
			data: [0, 1],
			offset: 0,
			count: 2,
			vao: null,
			type: 'LINES'
		}
	}
	
	makeBrushes(){
		var makeBrush = (k, brush, gl)=>{
			var vertexShader = createShader(gl, gl.VERTEX_SHADER, this.shader[brush.vs]),
				fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, this.shader[brush.fs]),
				program = createProgram(gl, vertexShader, fragmentShader);
				
			this.brush[k].program = program;
			
			var {data} = brush,
				positionAttributeLocation = gl.getAttribLocation(program, "a_position"),
				positionBuffer = gl.createBuffer(),
				vao = gl.createVertexArray();
			
			gl.bindVertexArray(vao);
			gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
			
			gl.enableVertexAttribArray(positionAttributeLocation);
			gl.vertexAttribPointer(
				positionAttributeLocation, 1, gl.FLOAT, false, 0, 0);
			
			gl.bindBuffer(gl.ARRAY_BUFFER, null);
			gl.bindVertexArray(null);
			
			this.brush[k].vao = vao;
		}
		
		for(var k in this.brush){
			makeBrush(k, this.brush[k], this.gl);
		}
	}
	
	resize(){
		this.width = this.gl.canvas.width;
		this.height = this.gl.canvas.height;
	}
	
	constructor(gl){
		this.gl = gl;
		this.resize();
		this.makeBrushes();
	}
		
	setUniform(program, position, status){
		var {gl, width, height} = this,
			positionUniformLocation = gl.getUniformLocation(program, "u_position"),
			widthUniformLocation = gl.getUniformLocation(program, "u_width"),
			heightUniformLocation = gl.getUniformLocation(program, "u_height"),
			p = [];
			
		p[0] = (position[0]-width/2) / (width/2);
		p[1] = (position[1]-height/2) / -(height/2);
			
		gl.uniform2fv(positionUniformLocation, p);
		gl.uniform1f(widthUniformLocation, width);
		gl.uniform1f(heightUniformLocation, height);
		
		for(let k in status){		
			var uniformLocation = gl.getUniformLocation(program, "u_"+k),
				value = status[k];
			
			if(uniformLocation !== null){
				gl.uniform1f(uniformLocation, value);	
			}
		}
	}
	
	clear(){
		var {gl} = this;
		
		gl.lineWidth = 1;
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);
	}
	
	setFunction(){
		var {gl, width, height} = this;
		
		gl.viewport(0, 0, width, height);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	}
	
	draw(item){
		var {gl} = this,
			{type, position, status} = item,
			brush = this.brush[type],
			{program, vao, type, offset, count} = brush;
		
		this.setFunction();
		
		gl.useProgram(program);
		this.setUniform(program, position, status);
		
		gl.bindVertexArray(vao);
		gl.drawArrays(gl[type], offset, count);
			
		gl.bindVertexArray(null);
	}
}
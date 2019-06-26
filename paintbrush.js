
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
in vec2 a_position;
in float a_deep;
in float a_size;
in float a_round;
in float a_xshape;
in vec4 a_color;

uniform float u_width;
uniform float u_height;

out vec4 color;
out float round;
out float xshape;

// all shaders have a main function
void main() {

  // gl_Position is a special variable a vertex shader
  // is responsible for setting
  gl_PointSize = a_size;
  gl_Position = vec4((a_position.x-u_width/2.0) / (u_width/2.0), (a_position.y-u_height/2.0) / -(u_height/2.0), a_deep, 1.0);
  color = a_color;
  round = a_round;
  xshape = a_xshape;
}
`,
point_frag: 
`#version 300 es

// fragment shaders don't have a default precision so we need
// to pick one. mediump is a good default. It means "medium precision"
precision mediump float;

// we need to declare an output for the fragment shader
in vec4 color;
in float round;
in float xshape;
out vec4 outColor;

void main() {
  // Just set the output to a constant redish-purple
  outColor = color;
  
  //round
  if(distance(gl_PointCoord, vec2(0.5, 0.5)) > (1.0-round/2.0)){
	  discard;
  }
  
  //X
  float x = abs(gl_PointCoord.x-0.5) * 2.0;
  float y = abs(gl_PointCoord.y-0.5) * 2.0;
  if(x > y*xshape + (1.0-xshape) || y > x*xshape + (1.0-xshape)){
	  discard;
  }
}
`,
// line
line_vertex: 
`#version 300 es

in vec2 a_position;
in float a_deep;
in vec4 a_color;

uniform float u_width;
uniform float u_height;

out vec4 color;

void main() {
  gl_Position = vec4((a_position.x-u_width/2.0) / (u_width/2.0), (a_position.y-u_height/2.0) / -(u_height/2.0), a_deep, 1.0);
  color = a_color;
}
`,
line_frag: 
`#version 300 es
precision mediump float;

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
			data: [],
			offset: 0,
			count: 0,
			stride: 0,
			attribute: {
				position: 2,
				deep: 1,
				size: 1,
				color: 4,
				round: 1,
				xshape: 1,
			},
			repeat: 1,
			attrNameList: [],
			locationList: [],
			
			vao: null,
			buffer: null,
			type: 'POINT'
		},
		line: {
			vs: 'line_vertex',
			fs: 'line_frag',
			program: null,
			data: [],
			offset: 0,
			count: 0,
			stride: 0,
			attribute: {
				position: 2,
				deep: 1,
				color: 4,
			},
			repeat: 2,
			attrNameList: [],
			locationList: [],
			
			vao: null,
			buffer: null,
			type: 'LINES'
		}
	}
	
	makeBrushes(){
		var makeBrush = (k, brush, gl)=>{
			var vertexShader = createShader(gl, gl.VERTEX_SHADER, this.shader[brush.vs]),
				fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, this.shader[brush.fs]),
				program = createProgram(gl, vertexShader, fragmentShader);
				
			this.brush[k].program = program;
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
	
	initBuffer(type, sum){
		var gl = this.gl,
			brush = this.brush[type],
			{data, attribute, repeat, program, attrNameList, locationList} = brush,
			attrOffsetCountMap = {};
			
		var offset = 0;
		for(let k in attribute){
			let count = attribute[k];
			
			attrOffsetCountMap[k] = [];
			attrOffsetCountMap[k][0] = offset;
			attrOffsetCountMap[k][1] = count;
			offset += count;
			
			attrNameList.push(k);
		}
		
		for(let i=0; i<sum; i++){
			function pushZero(data, sum){
				for(let i=0; i<sum; i++){
					data.push(0);
				}
			}
			pushZero(data, offset*repeat);
		}
		
		brush.attribute = attrOffsetCountMap;
		brush.stride = offset;
		brush.buffer = gl.createBuffer();
		brush.vao = gl.createVertexArray();
	}
		
	setUniform(program){
		var {gl, width, height} = this,
			widthUniformLocation = gl.getUniformLocation(program, "u_width"),
			heightUniformLocation = gl.getUniformLocation(program, "u_height");
		
		gl.uniform1f(widthUniformLocation, width);
		gl.uniform1f(heightUniformLocation, height);
	}
	
	clear(){
		var {gl, brush} = this;
		
		gl.lineWidth = 1;
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		
		for(let k in brush){
			brush[k].count = 0;
		}
	}
	
	setFunction(){
		var {gl, width, height} = this;
		
		gl.viewport(0, 0, width, height);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	}
	
	draw(item){
		var {type, position, status} = item,
			brush = this.brush[type],
			{data, attribute, repeat, stride} = brush;
			
		var block = Object.assign({}, status);
		block.position = position;
		for(let k in block){
			if(!block[k].length){
				block[k] = [block[k]]
			}
		}
		
		function setData(data, stride, count, offset, size, list){
			for(let i=0; i<size; i++){
				var index = stride * count + offset + i;
				data[index] = list[i];
			}
		}
		
		for(let i=0; i<repeat; i++){		
			for(let k in attribute){
				let offset = attribute[k][0],
					size = attribute[k][1],
					list = [];
				if(block[k]){
					list = block[k].slice(i*size);
				}else{
					for(let i=0; i<size; i++){
						list.push(0);
					}
				}
				
				setData(data, stride, brush.count, offset, size, list);
			}
			brush.count ++;	
		}
	}
	
	setAttribute(gl, program, data, buffer, vao, attribute, attrNameList, stride){
		var floatArray = new Float32Array(data),
			fsize = floatArray.BYTES_PER_ELEMENT;
		
		gl.bindVertexArray(vao);		
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(gl.ARRAY_BUFFER, floatArray, gl.STATIC_DRAW);
		
		function setPointer(attrName, stride){
			var attributeLocation = gl.getAttribLocation(program, "a_"+attrName),
				offset = attribute[attrName][0],
				count = attribute[attrName][1];
			
			gl.enableVertexAttribArray(attributeLocation);
			gl.vertexAttribPointer(
				attributeLocation, count, gl.FLOAT, false, fsize * stride, fsize * offset);
		}
		for(let i=0; i<attrNameList.length; i++){
			setPointer(attrNameList[i], stride);
		}
	}
	
	show(){
		var {gl, brush} = this;
		
		this.setFunction();
		
		var drawBrush = (brush)=>{
			var {program, type, data, buffer, vao, offset, count, attribute, attrNameList, stride, offset} = brush;
			
			gl.useProgram(program);
			this.setAttribute(gl, program, data, buffer, vao, attribute, attrNameList, stride);
			this.setUniform(program);
			gl.drawArrays(gl[type], offset, count);
				
			gl.bindVertexArray(null);
			gl.bindBuffer(gl.ARRAY_BUFFER, null);
		}
		
		for(let k in brush){
			if(brush[k].vao){
				drawBrush(brush[k]);
			}
		}
	}
}
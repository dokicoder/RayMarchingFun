varying vec3 _uv;
varying vec3 pos; 


void main() {
  _uv = position; 

  //vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
  //pos = projectionMatrix * vec4(position, 1.0);
  gl_Position = vec4(position, 1.0); 
}
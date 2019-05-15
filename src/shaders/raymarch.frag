uniform vec3 colorA; 
uniform vec3 colorB; 
varying vec3 _uv;
varying vec3 pos; 


const int MAX_MARCHING_STEPS = 20;
const float EPSILON = 0.01;

const vec3 eye = vec3(0.0, 0.0, 4.0);

const float radius = 1.0;

float sceneSDF(vec3 pos) {
  return length(pos) - radius;
}

float march(vec3 viewRayDirection, float start, float end) {
  float depth = start;

  for (int i = 0; i < MAX_MARCHING_STEPS; i++) {
    float dist = sceneSDF(eye + depth * viewRayDirection);

    if (dist < EPSILON) {
        // We're inside the scene surface!
        return depth;
    }
    // Move along the view ray
    depth += dist;

    if (depth >= end) {
        // Gone too far; give up
        return end;
    }
  }
  return end;
}


void main() {

  vec3 viewRay = normalize(_uv - eye);

  float res = march(viewRay, 0.0, 100.0);

   gl_FragColor = vec4(0, 0, 0, 1);

  //if(res < 100.0)  gl_FragColor = vec4(res / 6.0, 0, 0, 1);

  //float u = (_uv.x + 1.0) / 2.0 + 0.00001 * pos.x;
  //float v = (_uv.y + 1.0) / 2.0;

  //gl_FragColor = vec4(u, v, 0, 1);
}
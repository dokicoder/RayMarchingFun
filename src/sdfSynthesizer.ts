import { Vector3 } from 'three';

const sh = ({ x, y, z }: Vector3) => `vec3(${x.toFixed(7)}, ${y.toFixed(7)}, ${z.toFixed(7)})`;

export const sphere = (radius: number, position: Vector3) => {
  return `sphere(pos - ${sh(position)}, ${radius.toFixed(7)})`;
};

export const box = (position: Vector3, size: Vector3) => {
  return `box(pos - ${sh(position)}, ${sh(size)})`;
};

export const union = (shape1: string, shape2: string) => {
  return `opUnion( ${shape1}, ${shape2} )`;
};

export const intersection = (shape1: string, shape2: string) => {
  return `opIntersection( ${shape1}, ${shape2} )`;
};

export const difference = (shape1: string, shape2: string) => {
  return `opSubtraction( ${shape1}, ${shape2} )`;
};

export const vertexShader: string = `
varying vec2 _uv;

void main() {
  _uv = uv; 

  gl_Position = vec4(position, 1.0); 
}
`;

export const fragmentShader = (shapes: string[]) => `
uniform vec3 lightPos;
uniform float aspect;

varying vec2 _uv;
varying vec3 pos;

const int MAX_MARCHING_STEPS = 100;
const float EPSILON = 0.002;

const float MARCH_MAX_DISTANCE = 100.0;

vec3 eye = vec3(0.0, 0.0, 40.0);

const float radius = 1.0;

float box( vec3 p, vec3 b )
{
  vec3 d = abs(p) - b;
  return length(max(d,0.0))
         + min(max(d.x,max(d.y,d.z)),0.0); // remove this line for an only partially signed sdf 
}

float sphere( vec3 p, float r )
{
  return length(p) - r;
}

float sceneSDF(vec3 pos) {
  float boxSphere = max( sphere(pos, radius), box(pos, vec3(radius) * 0.8) );
  float hole = box( pos, vec3(radius * 1.5, radius * 10.5, radius * 2.5) );
  return boxSphere;
}

float march(vec3 viewRayDirection, float start, float end) {
  float depth = start;

  for (int i = 0; i < MAX_MARCHING_STEPS; i++) {
    float dist = sceneSDF(vec3(0.0, 0.0, 40.0) + depth * viewRayDirection);

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

float C_NORMALIZATION = 1.0 / 80.0;

vec4 blinn_phong(vec4 diffuse_color, vec4 specular_color,
				 vec3 position, vec3 normal, vec3 lightPos, float shiny, vec3 view )
{
	 //vec3 view = normalize(-position);
	 vec3 light = normalize(lightPos - position);
	 vec4 diffuse = diffuse_color * dot(light, normal);
 	 
	 vec3 halfVec = normalize(light + view);
	 // BRDF normalization term
	 // lighting model takes energy conservation into account (overall brightness of highlight decreases with smoothness)
	 vec4 specular = specular_color * pow( max(dot(halfVec, normal), 0.0), shiny ) * (shiny + 8.0) * C_NORMALIZATION;
	 return diffuse + specular;
}

vec3 estimateNormal(vec3 p) {
    return normalize(
      vec3(
        sceneSDF(vec3(p.x + EPSILON, p.y, p.z))  - sceneSDF(vec3(p.x - EPSILON, p.y, p.z)),
        sceneSDF(vec3(p.x, p.y + EPSILON, p.z))  - sceneSDF(vec3(p.x, p.y - EPSILON, p.z)),
        sceneSDF(vec3(p.x, p.y, p.z  + EPSILON)) - sceneSDF(vec3(p.x, p.y, p.z - EPSILON))
      )
    );
}

void main() {
  
  vec2 transformUV = (2.0 * _uv - vec2(1.0, 1.0)) * vec2(aspect, 1.0);
  vec3 samplingPos = vec3(transformUV, 0); // + vec3(0.0, 0.0, 32.0);

  vec3 viewRay = normalize(samplingPos - eye);

  /*
  mat3 rot = mat3( 0.7220079,  0.2779921,  0.6335810,
   0.2779921,  0.7220079, -0.6335810,
  -0.6335810,  0.6335810,  0.4440158 );

  viewRay = rot * viewRay;
  eye = rot * eye;
  */

  float marchResult = march(viewRay, 0.0, MARCH_MAX_DISTANCE);

  // clear color is applied of marching does not find a hit distance
  gl_FragColor = vec4(1, 1, 0, 1);

  if(marchResult < MARCH_MAX_DISTANCE) {
    vec3 posi = eye + viewRay * marchResult;
    vec3 normal = estimateNormal(posi);

    gl_FragColor = blinn_phong(
      vec4(0.8, 0.3, 0.7, 1.0),
      vec4(1.0, 1.0, 1.0, 1.0),
			posi, normal, lightPos, 30.0, -viewRay );  
  }  
}`;

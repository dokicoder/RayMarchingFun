import { Vector3 } from 'three';

const sh = ({ x, y, z }: Vector3) =>
  `vec3(${x.toFixed(7)}, ${y.toFixed(7)}, ${z.toFixed(7)})`;

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
varying vec3 _uv;

void main() {
  _uv = position; 

  gl_Position = vec4(position, 1.0); 
}
`;

export const fragmentShader = (shapes: string[]) => `uniform vec3 lightPos;
varying vec3 _uv;

const int MAX_MARCHING_STEPS = 100;
const float EPSILON = 0.002;

vec3 eye = vec3(0.0, 0.0, 40.0);

const float radius = 0.1;

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

vec3 repeat = vec3( 0.5, 0.5, 20.0 );

float opUnion( float d1, float d2 ) { return min(d1,d2); }

float opSubtraction( float d1, float d2 ) { return max(-d2,d1); }

float opIntersection( float d1, float d2 ) { return max(d1,d2); }

vec4 col = vec4(0.3, 0.9, 0.8, 1.0);

float sceneSDF(vec3 pos) {
  // create union of all shapes passed
  return ${shapes.reduce((sh1, sh2) => union(sh1, sh2), '1E20')};
}

float rayMarch(vec3 viewRayDirection, float start, float end) {
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
  // this is cool to visualize the approximation of early terminated ray marching
  // try a low value of MAX_MARCHING_STEPS like 20
  //return depth;
}

float C_NORMALIZATION = 1.0 / 80.0;

vec3 estimateNormal(vec3 p) {
  return normalize(
    vec3(
      sceneSDF(vec3(p.x + EPSILON, p.y, p.z)) - sceneSDF(vec3(p.x - EPSILON, p.y, p.z)),
      sceneSDF(vec3(p.x, p.y + EPSILON, p.z)) - sceneSDF(vec3(p.x, p.y - EPSILON, p.z)),
      sceneSDF(vec3(p.x, p.y, p.z  + EPSILON)) - sceneSDF(vec3(p.x, p.y, p.z - EPSILON))
    )
  );
}

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

void main() {

  mat3 rot = mat3( 0.7220079,  0.2779921,  0.6335810,
   0.2779921,  0.7220079, -0.6335810,
  -0.6335810,  0.6335810,  0.4440158 );

  vec3 viewRay = normalize(_uv - eye);
  viewRay = rot * viewRay;
  eye = rot * eye;

  float res = rayMarch(viewRay, 0.0, 100.0);

   gl_FragColor = vec4(1, 1, 0, 1);

  if(res < 100.0) {

    vec3 posi = eye + viewRay * res;
    vec3 normal = estimateNormal(posi);
  
    gl_FragColor = blinn_phong(
      col,
      vec4(1.0, 1.0, 1.0, 1.0),
			posi, normal, lightPos, 30.0, -viewRay );  
  }  
}`;

/*
export const fragmentShader = (shapes: string[]) => `
uniform vec3 lightPos;
varying vec3 _uv;

const int MAX_MARCHING_STEPS = 100;
const float EPSILON = 0.002;

vec3 eye = vec3(0.0, 0.0, 40.0);
const float radius = 0.1;

float opUnion( float d1, float d2 ) { return min(d1,d2); }
float opSubtraction( float d1, float d2 ) { return max(-d2,d1); }
float opIntersection( float d1, float d2 ) { return max(d1,d2); }

float box( vec3 p, vec3 b )
{
  vec3 d = abs(p) - b;
  return length( max(d,0.0) )
       + min( max( d.x, max(d.y, d.z) ), 0.0 ); // remove this line for an only partially signed sdf
}

float sphere( vec3 p, float r )
{
  return length(p) - r;
}

vec4 col = vec4(0.3, 0.9, 0.8, 1.0);

float sceneSDF(vec3 pos) {
  return 5;
}

float rayMarch(vec3 viewRayDirection, float start, float end) {
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
  // this is cool to visualize the approximation of early terminated ray marching
  // try a low value of MAX_MARCHING_STEPS like 20
  //return depth;
}

float C_NORMALIZATION = 1.0 / 80.0;

vec4 blinn_phong(vec4 diffuse_color, vec4 specular_color,
				 vec3 position, vec3 normal, vec3 lightPos, float shiny, vec3 view )

vec3 estimateNormal(vec3 p) {
    return normalize(
      vec3(
        sceneSDF(vec3(p.x + EPSILON, p.y, p.z)) - sceneSDF(vec3(p.x - EPSILON, p.y, p.z)),
        sceneSDF(vec3(p.x, p.y + EPSILON, p.z)) - sceneSDF(vec3(p.x, p.y - EPSILON, p.z)),
        sceneSDF(vec3(p.x, p.y, p.z  + EPSILON)) - sceneSDF(vec3(p.x, p.y, p.z - EPSILON))
      )
    );
}

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

void main() {

  mat3 rot = mat3( 0.7220079,  0.2779921,  0.6335810,
   0.2779921,  0.7220079, -0.6335810,
  -0.6335810,  0.6335810,  0.4440158 );

  vec3 viewRay = normalize(_uv - eye);
  viewRay = rot * viewRay;
  eye = rot * eye;

  float res = rayMarch(viewRay, 0.0, 100.0);

  gl_FragColor = vec4(1, 1, 0, 1);

  if(res < 100.0) {

    vec3 posi = eye + viewRay * res;
    vec3 normal = estimateNormal(posi);

    //gl_FragColor = vec4(normal * 1.5, 1);

    gl_FragColor = blinn_phong(
      col,
      vec4(1.0, 1.0, 1.0, 1.0),
			posi, normal, lightPos, 30.0, -viewRay );
  }
}`;
*/

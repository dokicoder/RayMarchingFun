import React, { useEffect, useReducer, useRef } from 'react';
import * as THREE from 'three';
import { Scene, WebGLRenderer, Camera, Clock, IUniform } from 'three';
import { Slider } from './Slider';


const vertexShader: string = `
precision highp float;

out vec2 _uv;

void main() {
  _uv = uv;

  gl_Position = vec4(position, 1.0); 
}
`;


const fragmentShader = `
precision highp float;

#define PI 3.1415926538

#define NUM_LIGHTS 3

uniform float aspect;
uniform float cameraRotationOffset;

struct Light {
  vec3 color;
  vec3 position;
};

in vec2 _uv;

const int MAX_STEPS = 64;
// allowed distance from surface
const float EPSILON = .01;
const float STEP_SIZE = .999; // TODO: why not use 1 here?
const float OUT_BOUNDS_DISTANCE = 1000.0;


float sphereSdf(in vec3 p, in float r) {
    return length(p) - r;
}

float scene(in vec3 p) {
    return sphereSdf(p, 4.0);
}

vec3 gradientNormal (in vec3 p) {
	float d = scene(p);
  vec3 e = vec3 (.001, .0, .0);
  return normalize (vec3 (scene(p + e.xyy) - d,
                          scene(p + e.yxy) - d,
                          scene(p + e.yyx) - d));
}

float rayMarch(in vec3 ro, in vec3 rd) {
  float t = .0;
  float d = .0;

  for(int i = 0; i < MAX_STEPS; ++i) {
      vec3 p = ro + d * rd;
      
      t = scene(p);
      
      // surface found
      if(t < EPSILON) {
        return d;
      }

      d += t*STEP_SIZE;
  }

  return OUT_BOUNDS_DISTANCE;
}

// #################

// get camera ray for fragment aka uv position
vec3 cameraRay(in vec2 uv, in vec3 rayOrigin, in vec3 cameraTarget, in float zoom) {

    vec3 camForward = normalize(vec3(cameraTarget - rayOrigin));

    vec3 worldUp = vec3(.0, 1., .0);
    
    vec3 camRight = normalize(cross(worldUp, camForward));
    
    vec3 camUp = normalize(cross(camForward, camRight));
    vec3 camCenter = rayOrigin + camForward * zoom;
    
    return normalize(camCenter + uv.x * aspect * camRight + uv.y * camUp - rayOrigin);
}

vec3 diffuse(vec3 lightDir, vec3 normal, vec3 surfaceColor, vec3 lightColor) {
  return max(0.0, dot( lightDir, normal )) * surfaceColor * lightColor;
}

vec4 shade(vec3 surfacePos) {
  vec3 lightPos = vec3(0.0, 3.0, 14.0);

  Light lights[2] = Light[2](
    Light(vec3(1.0, 1.0, 0.0), vec3(0.0, 3.0, 14.0)),
    Light(vec3(0.0, 1.0, 1.0), vec3(0.0, 6.0, -5.0))
  );

  vec3 surfaceColor = vec3(1.0, 0.4, 0.3);

  vec3 color = vec3(0.0);

  for( int i=0; i<2; i++ )
  {
		vec3 lightDir = normalize(lights[i].position - surfacePos);
    vec3 normal = gradientNormal( surfacePos );
    color += diffuse(lightDir, normal, surfaceColor, lights[i].color);
  }

  return vec4( color, 1.0);
}

// performs smoothstep instead of step, calculating the kernel size
// using texture coordinates of screen-space render squad, thereby antialiasing the step
float antiAliasedStep(float threshold, float value) {
  float afwidth = 0.7 * length( vec2(dFdx(value), dFdy(value)) );
 
  return smoothstep(threshold-afwidth, threshold+afwidth, value);
}

void main() {
  // uv, does not need aspect, this is implicit in the camera ray
  // map uv from [0,1] auf [-1,1]
  vec2 uv = (2.0 * _uv - vec2(1., 1.));

  float cameraAngleY = radians(cameraRotationOffset);
  float cameraDistanceFromTarget = 12.25;

  vec3 cameraOrigin = vec3(cameraDistanceFromTarget * cos(cameraAngleY), 0.0, cameraDistanceFromTarget * -sin(cameraAngleY));
  
  // iq calls it focal length
  float zoom = 1.3;
  // target is the origin
  vec3 cameraTarget = vec3(.0);
  
  vec3 currentRayDirection = cameraRay(uv, cameraOrigin, cameraTarget, zoom);

  float d = rayMarch (cameraOrigin, currentRayDirection);

  vec3 surfacePos = cameraOrigin + d * currentRayDirection;

  vec4 shadeColor;

  if(d >= OUT_BOUNDS_DISTANCE) {
    shadeColor = vec4(_uv, 0., 1.);
  } else {
    vec3 p = cameraOrigin + currentRayDirection * d;
    shadeColor = shade(surfacePos);
    // gl_FragColor = shadeColor;
  }

  // this is the 4 color print shader part

  // TODO: let me pick these colors
  vec3 white = vec3(1.0, 1.0, 1.0);
  vec3 black = vec3(0.0, 0.0, 0.0);

  vec2 st = _uv * vec2(aspect, 1.0);
  st = mat2(0.707, -0.707, 0.707, 0.707) * st;

  float afwidth = 0.7 * length( dFdx(st) + dFdy(st) );

  // Distance to nearest point in a grid of
  // (frequency x frequency) points over the unit square
  float frequency = 100.0;

  vec2 nearest = 2.0*fract(frequency * st) - 1.0;
  float dist = length(nearest);
  
  // red chanel looks great as well
  float radius = sqrt(1.0-shadeColor.g);

  vec3 fragcolor = mix(black, white, antiAliasedStep(radius, dist));
  gl_FragColor = vec4(fragcolor, 1.0);

}`;

// this is the state interface for the component(as the uniforms are the sole thing that is updated)
interface MetaballUniforms {
  aspect: IUniform;
  cameraRotationOffset: IUniform;
}

let camera: Camera = undefined;
let scene: THREE.Scene = undefined;
let renderer: WebGLRenderer = undefined;
let frameId: number = undefined;

let aspect = 1;

const uniforms: MetaballUniforms = {
  aspect: { value: aspect },
  cameraRotationOffset: { value: 306 },
};

const material = new THREE.ShaderMaterial({
  uniforms,
  fragmentShader,
  vertexShader,
});

interface Action {
  type: keyof MetaballUniforms;
  value: any;
}

const v0 = [-1.0, -1.0, 1.0];
const uv0 = [0.0, 0.0];
const v1 = [1.0, -1.0, 1.0];
const uv1 = [1.0, 0.0];
const v2 = [1.0, 1.0, 1.0];
const uv2 = [1.0, 1.0];
const v3 = [-1.0, 1.0, 1.0];
const uv3 = [0.0, 1.0];

const Plane = () => {
  const vertices = new Float32Array([v0, v1, v2, v2, v3, v0].flat());
  const uvs = new Float32Array([uv0, uv1, uv2, uv2, uv3, uv0].flat());

  const geometry = new THREE.BufferGeometry()
    .setAttribute('position', new THREE.BufferAttribute(vertices, 3))
    .setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

  return new THREE.Mesh(geometry, material);
};

export const SdfScene: React.FC = () => {
  const renderScene = () => {
    renderer.render(scene, camera);
  };

  const animate = () => {
    Object.entries(uniforms).forEach(([key, { value }]) => {
      material.uniforms[key].value = value;
    });

    renderScene();
    frameId = requestAnimationFrame(animate);
  };

  const startRenderLoop = () => {
    if (!frameId) {
      frameId = requestAnimationFrame(animate);
    }
  };

  const stop = () => {
    cancelAnimationFrame(frameId);
    frameId = undefined;
  };

  const reducer = (state: MetaballUniforms, { type, value }: Action) => {
    // we need to update the uniforms object as well as the state copy to keep animate(bot in react state)
    // and render(in react state) in sync
    // if we try to save everything in react store, THREE.js will still display the initial state because animate() operates on the initial instance of the state object
    uniforms[type].value = value;
    return { ...state, [type]: { value } };
  };

  const [stateUniforms, dispatch] = useReducer(reducer, uniforms);

  const canvasContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!canvasContainerRef.current) {
      return
    }

    const { clientWidth: width, clientHeight: height } = canvasContainerRef.current;

    if (canvasContainerRef.current.children.length) {
      canvasContainerRef.current.removeChild(renderer.domElement);
    }

    uniforms.aspect.value = width / height;

    // add scene
    scene = new Scene();

    // TODO: not needed, or at least make orthographic
    camera = new THREE.PerspectiveCamera(75, uniforms.aspect.value, 0.1, 1000);

    // add renderer
    renderer = new WebGLRenderer({ antialias: false });
    renderer.setClearColor('#880400');
    renderer.setSize(width, height);
    canvasContainerRef.current.appendChild(renderer.domElement);

    scene.add(Plane());
    startRenderLoop();

    return () => {
      stop();
      if (canvasContainerRef.current) canvasContainerRef.current.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <>
      <div style={{ width: '1300px', height: '800px' }} ref={canvasContainerRef} />
      {/* TODO: debounce */}
      <div style={{ width: '1300px' }}>
        <Slider
          id="cameraRotation"
          value={stateUniforms.cameraRotationOffset.value}
          range={[0, 360]}
          update={value => {
            dispatch({ type: 'cameraRotationOffset', value });
          }}
          label="Camera rotation offset"
        />
      </div>
    </>
  );
};
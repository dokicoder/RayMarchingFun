import React, { useEffect, useReducer } from 'react';
import * as THREE from 'three';
import { Scene, WebGLRenderer, Camera, Clock, IUniform } from 'three';
import { Slider } from './Slider';

const vertexShader: string = `
varying vec2 _uv;

void main() {
  _uv = uv;

  gl_Position = vec4(position, 1.0); 
}
`;

const fragmentShader = `
uniform float aspect;
uniform float metaBallBlendValue;
uniform float cameraRotationOffset;

varying vec2 _uv;

const int MAX_STEPS = 64;
// allowed distance from surface
const float EPSILON = .0001;
const float STEP_SIZE = .999; // TODO: why not use 1 here?
const float PI = 3.14159265359;
const float OUT_BOUNDS_DISTANCE = 1000.0;

float sphereSdf(in vec3 p, in float r) {
    return length(p) - r;
}

float opCombine(in float d1, in float d2, in float r) {
    float h = clamp(.5 + .5 *(d2 - d1) / r, .0, 1.);
    return mix(d2, d1, h) - r * h *(1. - h);
}

float metaBallsScene(in vec3 p) {
    // TODO: from uniforms
    float r1 = 0.2;
    float r2 = 0.3;

    vec3 spherePos1 = vec3(0.);
    vec3 spherePos2 = vec3(-1., 0., 0.);

    float ball1 = sphereSdf(p + spherePos1, r1);
    float ball2 = sphereSdf(p + spherePos2, r2);
  
    float metaBalls = opCombine(ball1, ball2, metaBallBlendValue);

    return metaBalls;
}

float rayMarch(in vec3 ro, in vec3 rd) {
  float t = .0;
  float d = .0;
  for(int i = 0; i < MAX_STEPS; ++i) {
      vec3 p = ro + d * rd;
      t = metaBallsScene(p);
      if(t < EPSILON) {
        return d;
      }
      d += t*STEP_SIZE;
  }
  return OUT_BOUNDS_DISTANCE;
}

// get camera ray for uv position
vec3 cameraRay(in vec2 uv, in vec3 rayOrigin, in vec3 cameraTarget, in float zoom) {
    vec3 camForward = normalize(vec3(cameraTarget - rayOrigin));
    vec3 worldUp = vec3(.0, 1., .0);
    vec3 camRight = normalize(cross(worldUp, camForward));
    vec3 camUp = normalize(cross(camForward, camRight));
    vec3 camCenter = rayOrigin + camForward * zoom;
    
    return normalize(camCenter + uv.x * aspect * camRight + uv.y * camUp - rayOrigin);
}

void main() {
  // uv with aspect
  vec2 uv = (2.0 * _uv - vec2(1., 1.));

  float cameraAngleY = radians(cameraRotationOffset);
  float cameraDistanceFromTarget = 2.25;

  vec3 cameraOrigin = vec3(cameraDistanceFromTarget * cos(cameraAngleY), 0.0, cameraDistanceFromTarget * -sin(cameraAngleY));
  
  float zoom = 1.3;
  vec3 cameraTarget = vec3(.0);

  
  vec3 currentRayDirection = cameraRay(uv, cameraOrigin, cameraTarget, zoom);
  float d = rayMarch (cameraOrigin, currentRayDirection);

  if(d >= OUT_BOUNDS_DISTANCE) {
    gl_FragColor = vec4(0., 0., 0., 1.);
  } else {
    gl_FragColor = vec4(_uv, 0., 1.);
  }

}`;

// this is the state interface for the component(as the uniforms are the sole thing that is updated)
interface MetaballUniforms {
  aspect: IUniform;
  metaBallBlendValue: IUniform;
  cameraRotationOffset: IUniform;
}

let mount: HTMLDivElement = undefined;
let camera: Camera = undefined;
let scene: THREE.Scene = undefined;
let renderer: WebGLRenderer | undefined = undefined;
let frameId: number = undefined;

let aspect = 1;

const uniforms: MetaballUniforms = {
  aspect: { value: aspect },
  metaBallBlendValue: { value: 0.5 },
  cameraRotationOffset: { value: 0 },
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

const MetaballScene: React.FC = () => {
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

  const start = () => {
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

  useEffect(() => {
    const { clientWidth: width, clientHeight: height } = mount;

    uniforms.aspect.value = width / height;

    if (mount.children.length) {
      mount.innerHTML = '';
    }

    // add scene
    scene = new Scene();

    // TODO: not needed, or at least make orthographic
    camera = new THREE.PerspectiveCamera(75, uniforms.aspect.value, 0.1, 1000);

    // add renderer
    renderer = new WebGLRenderer({ antialias: false });
    renderer.setClearColor('#880400');
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    scene.add(Plane());

    start();

    return () => {
      stop();
      if (mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <>
      <div style={{ width: '1300px', height: '800px' }} ref={m => (mount = m)} />
      {/* TODO: debounce */}
      <div style={{ width: '1300px' }}>
        <Slider
          value={stateUniforms.metaBallBlendValue.value}
          update={value => {
            dispatch({ type: 'metaBallBlendValue', value });
          }}
          label="Metaball blend factor"
        />
        <Slider
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

export default MetaballScene;

import React, { useEffect, useReducer } from 'react';
import * as THREE from 'three';
import { Scene, WebGLRenderer, Camera, Clock } from 'three';
import { Slider } from './Slider';

import fragmentShader from '../shaders/cubeScene.frag?raw';
import { IUniform } from 'three/src/renderers/shaders/UniformsLib';

const vertexShader: string = `
varying vec2 _uv;

void main() {
  _uv = uv; 

  gl_Position = vec4(position, 1.0); 
}
`;

console.log('// the shader:\n' + fragmentShader);

// this is the state interface for the component (as the uniforms are the sole thing that is updated)
interface MetaballUniforms {
  aspect: IUniform;
  iTime: IUniform;
  metaBallBlendValue: IUniform;
  cameraRotationOffset: IUniform;
}

let mount: HTMLDivElement;
let camera: Camera;
let scene: THREE.Scene;
let renderer: WebGLRenderer | undefined;
let frameId: number;

let aspect = 1;

const clock = new Clock();

const uniforms: { [uniform: string]: IUniform } = {
  iTime: { value: clock.elapsedTime },
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
    // we need to update the uniforms object as well as the state copy to keep animate (bot in react state)
    // and render (in react state) in sync
    // if we try to save everything in react store, THREE.js will still display the initial state because animate() operates on the initial instance of the state object
    uniforms[type].value = value;
    return { ...state, [type]: { value } };
  };

  const [stateUniforms, dispatch] = useReducer(reducer, uniforms);

  useEffect(() => {
    const { clientWidth: width, clientHeight: height } = mount;

    clock.start();
    console.log('clock started');

    uniforms.aspect.value = width / height;

    // add scene
    scene = new Scene();

    camera = new THREE.PerspectiveCamera(75, uniforms.aspect.value, 0.1, 1000);

    // add renderer
    renderer = new WebGLRenderer({ antialias: true });
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

  console.log('rerender');

  return (
    <>
      <div style={{ width: '1300px', height: '800px' }} ref={(m) => (mount = m)} />
      {/* TODO: debounce */}
      <div style={{ width: '1300px' }}>
        <Slider
          value={stateUniforms.metaBallBlendValue.value}
          update={(value) => {
            dispatch({ type: 'metaBallBlendValue', value });
          }}
          label="Metaball blend factor"
        />
        <Slider
          value={stateUniforms.cameraRotationOffset.value}
          range={[0, 360]}
          update={(value) => {
            dispatch({ type: 'cameraRotationOffset', value });
          }}
          label="Camera rotation offset"
        />
      </div>
    </>
  );
};

export default MetaballScene;

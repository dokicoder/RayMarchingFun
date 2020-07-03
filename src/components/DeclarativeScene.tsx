import React, { Component } from 'react';
import * as THREE from 'three';
import { Scene, WebGLRenderer, Camera, Vector3 } from 'three';

import { fragmentShader, vertexShader, box } from '../sdfSynthesizer';

let mount: HTMLDivElement = undefined;
let camera: Camera = undefined;
let scene: THREE.Scene = undefined;
let renderer: WebGLRenderer | undefined = undefined;
let frameId: number = undefined;

let aspect = 1;

const sceneDef = fragmentShader([box(new THREE.Vector3(0, 0, -100), new THREE.Vector3(0.0001, 0.0001, 0.0001))]);

console.log(sceneDef);

const material = new THREE.ShaderMaterial({
  uniforms: {
    lightPos: { type: 'vec3', value: new THREE.Vector3(8, 7, -6) },
  },
  fragmentShader: sceneDef,
  vertexShader,
});

const v0 = [-1.0, -1.0, 1.0];
const uv0 = [0.0, 0.0];
const v1 = [1.0, -1.0, 1.0];
const uv1 = [1.0, 0.0];
const v2 = [1.0, 1.0, 1.0];
const uv2 = [1.0, 1.0];
const v3 = [-1.0, 1.0, 1.0];
const uv3 = [0.0, 1.0];

const Plane = () => {
  const vertices = new Float32Array(
    [...v0, ...v1, ...v2, ...v2, ...v3, ...v0].map((x, idx) => x * 0.9) // + (idx % 3 === 0 ? 0.2 : 0))
  );

  const uvs = new Float32Array([...uv0, ...uv1, ...uv2, ...uv2, ...uv3, ...uv0]);

  const geometry = new THREE.BufferGeometry()
    .setAttribute('position', new THREE.BufferAttribute(vertices, 3))
    .setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  //const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });

  return new THREE.Mesh(geometry, material);
};

let arc = 0;
let lP = new THREE.Vector3(8, 7, -6);
const playerTransform = new THREE.Vector3(8, 7, -6);

class ThreeScene extends Component<{}, {}> {
  constructor(props: {}) {
    super(props);
  }

  handleKeyDown = ({ key }: KeyboardEvent) => {
    const offsetMap: { [key: string]: THREE.Vector3 } = {
      w: new Vector3(0, 0, 1),
      a: new Vector3(-1, 0, 0),
      s: new Vector3(0, 0, -1),
      d: new Vector3(1, 0, 0),
      q: new Vector3(0, 1, 0),
      e: new Vector3(0, -1, 0),
    };

    const offset = offsetMap[key];

    if (offset) {
      playerTransform.add(offset.multiplyScalar(0.5));
      console.log('offset applied');
    }
  };

  componentDidMount() {
    document.addEventListener('keydown', this.handleKeyDown);

    const { clientWidth: width, clientHeight: height } = mount;

    aspect = width / height;

    //ADD SCENE
    scene = new Scene();

    camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);

    //ADD RENDERER
    renderer = new WebGLRenderer({ antialias: true });
    renderer.setClearColor('#880400');
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    scene.add(Plane());

    this.start();
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleKeyDown);

    this.stop();
    mount.removeChild(renderer.domElement);
  }
  start = () => {
    if (!frameId) {
      frameId = window.requestAnimationFrame(this.animate);
    }
  };
  stop = () => {
    cancelAnimationFrame(frameId);
    frameId = undefined;
  };
  // THREE.Vector3(Math.cos(arc) * 6, 7, Math.sin(arc) * -6)
  animate = () => {
    arc += 0.03;
    lP.x = Math.cos(arc) * 26;
    lP.y = 50;
    lP.z = Math.sin(arc) * -26;
    material.setValues({
      uniforms: {
        lightPos: { type: 'vec3', value: lP },
        aspect: { type: 'float', value: aspect },
        playerTransform: { type: 'vec3', value: playerTransform },
      },
    });
    this.renderScene();
    frameId = window.requestAnimationFrame(this.animate);
  };
  renderScene = () => {
    renderer.render(scene, camera);
  };
  render() {
    return <div style={{ width: '2000px', height: '1200px' }} ref={(m) => (mount = m)} />;
  }
}

export default ThreeScene;

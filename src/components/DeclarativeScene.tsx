import React, { Component } from 'react';
import * as THREE from 'three';
import { Scene, WebGLRenderer, Camera } from 'three';

import { fragmentShader, vertexShader, box, sphere } from '../sdfSynthesizer';

let mount: HTMLDivElement = undefined;
let camera: Camera = undefined;
let scene: any = undefined;
let renderer: any = undefined;
let cube: any = undefined;
let frameId: any = undefined;

const sceneDef = fragmentShader([
  //sphere(0.4, new THREE.Vector3(0, 0, 0)),
  box(new THREE.Vector3(0, 0, -100), new THREE.Vector3(0.0001, 0.0001, 0.0001)),
]);

console.log(sceneDef);

const material = new THREE.ShaderMaterial({
  uniforms: {
    lightPos: { type: 'vec3', value: new THREE.Vector3(8, 7, -6) },
  },
  fragmentShader: sceneDef,
  vertexShader,
});

const Plane = () => {
  const vertices = new Float32Array([
    -1.0,
    -1.0,
    1.0,
    1.0,
    -1.0,
    1.0,
    1.0,
    1.0,
    1.0,

    1.0,
    1.0,
    1.0,
    -1.0,
    1.0,
    1.0,
    -1.0,
    -1.0,
    1.0,
  ]);

  const geometry = new THREE.BufferGeometry().addAttribute('position', new THREE.BufferAttribute(vertices, 3));
  //const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });

  return new THREE.Mesh(geometry, material);
};

let arc = 0;
let lP = new THREE.Vector3(8, 7, -6);

class ThreeScene extends Component<{}, {}> {
  constructor(props: {}) {
    super(props);
  }

  componentDidMount() {
    const { clientWidth: width, clientHeight: height } = mount;
    //ADD SCENE
    scene = new Scene();

    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 40;

    //ADD RENDERER
    renderer = new WebGLRenderer({ antialias: true });
    renderer.setClearColor('#000000');
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    scene.add(Plane());

    this.start();
  }
  componentWillUnmount() {
    this.stop();
    mount.removeChild(renderer.domElement);
  }
  start = () => {
    if (!frameId) {
      frameId = requestAnimationFrame(this.animate);
    }
  };
  stop = () => {
    cancelAnimationFrame(frameId);
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
      },
    });
    this.renderScene();
    frameId = window.requestAnimationFrame(this.animate);
  };
  renderScene = () => {
    renderer.render(scene, camera);
  };
  render() {
    return (
      <div
        style={{ width: '600px', height: '600px' }}
        ref={m => {
          mount = m;
        }}
      />
    );
  }
}

export default ThreeScene;

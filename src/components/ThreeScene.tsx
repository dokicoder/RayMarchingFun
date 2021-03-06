import React, { Component } from 'react';
import * as THREE from 'three';
import { PerspectiveCamera, Scene, WebGLRenderer, BoxGeometry, Mesh, MeshPhongMaterial, Camera, Matrix4 } from 'three';

import fragmentShader from '../shaders/raymarch.frag';
import vertexShader from '../shaders/raymarch.vert';

let mount: HTMLDivElement = undefined;
let camera: Camera = undefined;
let scene: any = undefined;
let renderer: any = undefined;
let cube: any = undefined;
let frameId: any = undefined;

//const sphereSDF = (radius: number) => (pos: THREE.Vector3) => pos.length() - radius;

class IdentityCamera extends Camera {
  /**
   * This constructor sets following properties to the correct type: matrixWorldInverse, projectionMatrix and projectionMatrixInverse.
   */
  constructor() {
    super();

    this.matrixWorldInverse = new Matrix4();
    this.projectionMatrix = new Matrix4(); //.scale(new THREE.Vector3(0.99, 0.99, 0.99));
  }
}

console.log(fragmentShader);

const material = new THREE.ShaderMaterial({
  uniforms: {
    lightPos: { type: 'vec3', value: new THREE.Vector3(8, 7, -6) },
  },
  fragmentShader,
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
    //ADD CAMERA
    //camera = new IdentityCamera();

    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 40;

    //ADD RENDERER
    renderer = new WebGLRenderer({ antialias: true });
    renderer.setClearColor('#000000');
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    scene.add(Plane());

    const pointLight = new THREE.PointLight(0xffffff);

    // set its position
    pointLight.position.x = 10;
    pointLight.position.y = 50;
    pointLight.position.z = 120;

    // add to the scene
    scene.add(pointLight);

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
    arc += 0.01;
    //lP.x = 5;
    //lP.y = 30;
    //lP.z = arc;
    lP.x = Math.cos(arc) * 6;
    lP.y = 4;
    lP.z = Math.sin(arc) * -6;
    material.setValues({
      uniforms: {
        lightPos: { type: 'vec3', value: lP },
        //lightPos: { type: 'vec3', value: new THREE.Vector3(8, 3 + arc, -6) },
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

import React, { Component } from 'react';
import * as THREE from 'three';
import { PerspectiveCamera, Scene, WebGLRenderer, BoxGeometry, Mesh, MeshPhongMaterial, Camera, Matrix4 } from 'three';

let mount: HTMLDivElement = undefined;
let camera: Camera = undefined;
let scene: any = undefined;
let renderer: any = undefined;
let cube: any = undefined;
let frameId: any = undefined;

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

const vertexShader = `
    varying vec3 _uv; 

    void main() {
      _uv = position; 

      vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * modelViewPosition; 
    }
  `;

const fragmentShader = `
uniform vec3 colorA; 
uniform vec3 colorB; 
varying vec3 _uv;

void main() {
  float u = (_uv.x + 1.0) / 2.0;
  float v = (_uv.y + 1.0) / 2.0;

  gl_FragColor = vec4(1, v, 0, 1);
}
`;

const material = new THREE.ShaderMaterial({
  uniforms: {
    colorB: { type: 'vec3', value: new THREE.Color(0xacb6e5) },
    colorA: { type: 'vec3', value: new THREE.Color(0x74ebd5) }
  },
  fragmentShader,
  vertexShader
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
    1.0
  ]);

  const geometry = new THREE.BufferGeometry().addAttribute('position', new THREE.BufferAttribute(vertices, 3));
  //const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });

  return new THREE.Mesh(geometry, material);
};

class ThreeScene extends Component<{}, {}> {
  constructor(props: {}) {
    super(props);
  }

  componentDidMount() {
    const { clientWidth: width, clientHeight: height } = mount;
    //ADD SCENE
    scene = new Scene();
    //ADD CAMERA
    camera = new IdentityCamera();
    //camera.position.z = 4;
    //ADD RENDERER
    renderer = new WebGLRenderer({ antialias: true });
    renderer.setClearColor('#000000');
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);
    //ADD CUBE
    const geometry = new BoxGeometry(1, 1, 1);
    const material = new MeshPhongMaterial({ color: '#ff9900', shininess: 20, specular: '#ffffff' });
    cube = new Mesh(geometry, material);
    scene.add(Plane());

    const pointLight = new THREE.PointLight(0xffffff);

    // set its position
    pointLight.position.x = 10;
    pointLight.position.y = 50;
    pointLight.position.z = 130;

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
  animate = () => {
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    this.renderScene();
    frameId = window.requestAnimationFrame(this.animate);
  };
  renderScene = () => {
    renderer.render(scene, camera);
  };
  render() {
    return (
      <div
        style={{ width: '400px', height: '400px' }}
        ref={m => {
          mount = m;
        }}
      />
    );
  }
}

export default ThreeScene;

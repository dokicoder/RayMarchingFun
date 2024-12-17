import React, { useEffect, useReducer } from 'react';
import * as THREE from 'three';
import { Scene, WebGLRenderer, Camera, Clock, IUniform } from 'three';
import { Slider } from './Slider';

const vertexShader: string = `
out vec2 _uv;

void main() {
  _uv = uv;

  gl_Position = vec4(position, 1.0); 
}
`;

const fragmentShader = `
#define PI 3.1415926538

uniform float aspect;
uniform float metaBallBlendValue;
uniform float cameraRotationOffset;
uniform vec3 metaBallPositions[ 10 ];

in vec2 _uv;

const int MAX_STEPS = 64;
// allowed distance from surface
const float EPSILON = .01;
const float STEP_SIZE = .999; // TODO: why not use 1 here?
const float OUT_BOUNDS_DISTANCE = 1000.0;


float sphereSdf(in vec3 p, in float r) {
    return length(p) - r;
}

float opCombine(in float d1, in float d2, in float r) {
    float h = clamp(.5 + .5 *(d2 - d1) / r, .0, 1.);
    return mix(d2, d1, h) - r * h *(1. - h);
}

float scene(in vec3 p) {
    // TODO: from uniforms
    float rCenter = 0.9;
    float rOther = 0.9;

    vec3 spherePosCenter = vec3(0.);
    float ballCenter = sphereSdf(p + spherePosCenter, rCenter);

    float metaBalls = ballCenter;
    
    for(int i=0;i<10;++i)
    {
      float angle = float(i) * 0.2 * PI;
      //vec3 spherePosOuter = vec3(cos(angle), -sin(angle), 0.0) * 3.4;
      float outerBall = sphereSdf(p + metaBallPositions[i], rOther);
      
      metaBalls = opCombine(metaBalls, outerBall, metaBallBlendValue);
    }

    return metaBalls;
}

vec3 normal (in vec3 p) {
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
      if(t < EPSILON) {
        return d;
      }
      d += t*STEP_SIZE;
  }
  return OUT_BOUNDS_DISTANCE;
}

// TODO: get rid of this #################

float distriGGX (in vec3 N, in vec3 H, in float roughness) {
    float a2     = roughness * roughness;
    float NdotH  = max (dot (N, H), .0);
    float NdotH2 = NdotH * NdotH;

    float nom    = a2;
    float denom  = (NdotH2 * (a2 - 1.) + 1.);
    denom        = PI * denom * denom;

    return nom / denom;
}

float geomSchlickGGX (in float NdotV, in float roughness) {
    float nom   = NdotV;
    float denom = NdotV * (1. - roughness) + roughness;

    return nom / denom;
}

vec3 fresnelSchlick (in float cosTheta, in vec3 F0, float roughness) {
	return F0 + (max (F0, vec3(1. - roughness)) - F0) * pow (1. - cosTheta, 5.);
}

float geomSmith (in vec3 N, in vec3 V, in vec3 L, in float roughness) {
    float NdotV = max (dot (N, V), .0);
    float NdotL = max (dot (N, L), .0);
    float ggx1 = geomSchlickGGX (NdotV, roughness);
    float ggx2 = geomSchlickGGX (NdotL, roughness);

    return ggx1 * ggx2;
}

vec3 shade (in vec3 ro, in vec3 p, in vec3 albedo) {
    vec3 nor = normal (p);

    // "material" hard-coded for the moment 
    float mask = smoothstep (1., .05, 30.*cos (50.*p.y)+sin (50.*p.x)+ cos (50.*p.z));
    //vec3 albedo = vec3(0.4,1.0,0.0);
    float metallic = .5;
    float roughness = .45;
    float ao = 1.;

    // lights hard-coded as well atm
    vec3 lightColors[2];
    lightColors[0] = vec3 (.7, .8, .9)*2.;
    lightColors[1] = vec3 (.9, .8, .7)*2.;

    vec3 lightPositions[2];
    lightPositions[0] = vec3 (-1.5, 1.0, -3.);
    lightPositions[1] = vec3 (2., -.5, 3.);

	  vec3 N = normalize (nor);
    vec3 V = normalize (ro - p);

    vec3 F0 = vec3 (0.04); 
    F0 = mix (F0, albedo, metallic);
    vec3 kD = vec3(.0);
	           
    // reflectance equation
    vec3 Lo = vec3 (.0);
    for(int i = 0; i < 2; ++i) 
    {
        // calculate per-light radiance
        vec3 L = normalize(lightPositions[i] - p);
        vec3 H = normalize(V + L);
        float distance    = length(lightPositions[i] - p);
        float attenuation = 20. / (distance * distance);
        vec3 radiance     = lightColors[i] * attenuation;
        
        // cook-torrance brdf
        float aDirect = pow (roughness + 1., 2.);
        float aIBL =  roughness * roughness;
        float NDF = distriGGX(N, H, roughness);        
        float G   = geomSmith(N, V, L, roughness);      
        vec3 F    = fresnelSchlick(max(dot(H, V), 0.0), F0, roughness);       
        
        vec3 kS = F;
        kD = vec3(1.) - kS;
        kD *= 1. - metallic;	  
        
        vec3 nominator    = NDF * G * F;
        float denominator = 4. * max(dot(N, V), 0.0) * max(dot(N, L), 0.0);
        vec3 specular     = nominator / max(denominator, .001);  

        // add to outgoing radiance Lo
        float NdotL = max(dot(N, L), 0.0);                
        Lo += (kD * albedo / PI + specular) * radiance * NdotL; 
	    //Lo *= shadow (p+.01*N, L);
    }

    vec3 irradiance = vec3 (1.);
    vec3 diffuse    = irradiance * albedo;
    vec3 ambient    = (kD * diffuse) * ao;

    return ambient + Lo;
}

// #################

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
  float cameraDistanceFromTarget = 12.25;

  vec3 cameraOrigin = vec3(cameraDistanceFromTarget * cos(cameraAngleY), 0.0, cameraDistanceFromTarget * -sin(cameraAngleY));
  
  float zoom = 1.3;
  vec3 cameraTarget = vec3(.0);
  
  vec3 currentRayDirection = cameraRay(uv, cameraOrigin, cameraTarget, zoom);
  float d = rayMarch (cameraOrigin, currentRayDirection);

  if(d >= OUT_BOUNDS_DISTANCE) {
    gl_FragColor = vec4(_uv, 0., 1.);
  } else {
    vec3 p = cameraOrigin + currentRayDirection * d;
    gl_FragColor = true ? vec4(shade(cameraOrigin, p, vec3(0.,0., 1.)), 1.0) : vec4(1.0, 0.0, 1.0, 0.0);
  }

}`;

// this is the state interface for the component(as the uniforms are the sole thing that is updated)
interface MetaballUniforms {
  aspect: IUniform;
  metaBallBlendValue: IUniform;
  cameraRotationOffset: IUniform;
  metaBallPositions: IUniform;
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
  cameraRotationOffset: { value: 90 },
  metaBallPositions: {
    value: [...Array(10).keys()].map(idx => {
      const angle = idx * 0.2 * Math.PI;

      return new THREE.Vector3(Math.cos(angle), -Math.sin(angle), 0.0).multiplyScalar(3.4);
    }),
  },
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

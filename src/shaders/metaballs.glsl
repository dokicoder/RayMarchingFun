EDIT: my altered version from https://www.shadertoy.com/view/XlBBDR

////////////////////////////////////////////////////////////////////////////////
//
// SDF isolines of metaball-cluster - visualizing distance-field iso-lines
//
// Copyright 2018 Mirco Müller
//
// Author(s):
//   Mirco "MacSlow" Müller <macslow@gmail.com>
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU General Public License version 3, as published
// by the Free Software Foundation.
//
// This program is distributed in the hope that it will be useful, but
// WITHOUT ANY WARRANTY; without even the implied warranties of
// MERCHANTABILITY, SATISFACTORY QUALITY, or FITNESS FOR A PARTICULAR
// PURPOSE.  See the GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License along
// with this program.  If not, see <http://www.gnu.org/licenses/>.
//
////////////////////////////////////////////////////////////////////////////////

// Mouse y-coordinate moves ground-plane up and down

const int MAX_STEPS = 64;
const float EPSILON = .0001;
const float STEP_SIZE = .975;
const float PI = 3.14159265359;

float saturate (in float v) { return clamp (v, .0, 1.); }

// ray-marching, SDF stuff /////////////////////////////////////////////////////
float sdSphere (in vec3 p, in float r) {
    return length (p) - r;
}

float opCombine (in float d1, in float d2, in float r) {
    float h = clamp (.5 + .5 * (d2 - d1) / r, .0, 1.);
    return mix (d2, d1, h) - r * h * (1. - h);
}

float metaBalls (in vec3 p) {
    float time = 0.4 + iTime * 0.02;
    
    float r1 = .1 + .3 * (.5 + .5 * sin (2. * time));
    float r2 = .15 + .2 * (.5 + .5 * sin (3. * time));
    float r3 = .2 + .2 * (.5 + .5 * sin (4. * time));
    float r4 = .25 + .1 * (.5 + .5 * sin (5. * time));

    float t = 2. * time;
    vec3 offset1 = vec3 (-.4*cos(t), .1, -.3*sin(t));
    vec3 offset2 = vec3 (.2, .2*cos(t), .3*sin(t));
    vec3 offset3 = vec3 (-.2*cos(t), -.2*sin(t), .3);
    vec3 offset4 = vec3 (.1, -.4*cos(t), .4*sin(t));
    vec3 offset5 = vec3 (.4*cos(t), -.2, .3*sin(t));
    vec3 offset6 = vec3 (-.2*cos(t), -.4, -.4*sin(t));
    vec3 offset7 = vec3 (.3*sin(t), -.6*cos(t), .6);
    vec3 offset8 = vec3 (-.3, .5*sin(t), -.4*cos(t));

    float ball1 = sdSphere (p + offset1, r4);
    float ball2 = sdSphere (p + offset2, r2);
	float metaBalls = opCombine (ball1, ball2, r1);

    /*
    ball1 = sdSphere (p + offset3, r1);
    ball2 = sdSphere (p + offset4, r3);
	metaBalls = opCombine (metaBalls, opCombine (ball1, ball2, .2), r2);

    ball1 = sdSphere (p + offset5, r3);
    ball2 = sdSphere (p + offset6, r2);
	metaBalls = opCombine (metaBalls, opCombine (ball1, ball2, .2), r3);

    ball1 = sdSphere (p + offset7, r3);
    ball2 = sdSphere (p + offset8, r4);
	metaBalls = opCombine (metaBalls, opCombine (ball1, ball2, .2), r4);
	*/

    return metaBalls;
}

float map (in vec3 p) {
    //return min (metaBalls (p), p.y + 2. * (2. * (1. - iMouse.y / iResolution.y) - 1.) );
    return metaBalls (p);
}

float march (in vec3 ro, in vec3 rd) {
    float t = .0;
    float d = .0;
    for (int i = 0; i < MAX_STEPS; ++i) {
        vec3 p = ro + d * rd;
        t = map (p);
        if (t < EPSILON) break;
        d += t*STEP_SIZE;
    }

    return d;
}

// pbr, shading, shadows ///////////////////////////////////////////////////////
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

float geomSmith (in vec3 N, in vec3 V, in vec3 L, in float roughness) {
    float NdotV = max (dot (N, V), .0);
    float NdotL = max (dot (N, L), .0);
    float ggx1 = geomSchlickGGX (NdotV, roughness);
    float ggx2 = geomSchlickGGX (NdotL, roughness);

    return ggx1 * ggx2;
}

vec3 fresnelSchlick (in float cosTheta, in vec3 F0, float roughness) {
	return F0 + (max (F0, vec3(1. - roughness)) - F0) * pow (1. - cosTheta, 5.);
}

vec3 normal (in vec3 p) {
	float d = map (p);
    vec3 e = vec3 (.001, .0, .0);
    return normalize (vec3 (map (p + e.xyy) - d,
                            map (p + e.yxy) - d,
                            map (p + e.yyx) - d));
}

float shadow (in vec3 p, in vec3 lPos) {
    float lDist = distance (p, lPos);
    vec3 lDir = normalize (lPos - p);
    float dist = march (p, lDir);
    return dist < lDist ? .1 : 1.;
}

vec3 shade (in vec3 ro, in vec3 rd, in float d) {
    vec3 p = ro + d * rd;
    vec3 nor = normal (p);

    // "material" hard-coded for the moment 
    float mask = smoothstep (1., .05, 30.*cos (50.*p.y)+sin (50.*p.x)+ cos (50.*p.z));
    vec3 albedo = vec3(0.4,1.0,0.0);
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

// create view-ray /////////////////////////////////////////////////////////////
vec3 camera (in vec2 uv, in vec3 ro, in vec3 aim, in float zoom) {
    vec3 camForward = normalize (vec3 (aim - ro));
    vec3 worldUp = vec3 (.0, 1., .0);
    vec3 camRight = normalize (cross (worldUp, camForward));
    vec3 camUp = normalize (cross (camForward, camRight));
    vec3 camCenter = ro + camForward * zoom;
    
    return normalize (camCenter + uv.x * camRight + uv.y * camUp - ro);
}


// bringing it all together ////////////////////////////////////////////////////
void mainImage (out vec4 fragColor, in vec2 fragCoord) {
	vec2 uv = fragCoord.xy / iResolution.xy;
    vec2 uvRaw = uv;
    uv = uv * 2. - 1.;
    uv.x *= iResolution.x / iResolution.y;

    // set up "camera", view origin (ro) and view direction (rd)
    float t = 0.1 * iTime + 5.;
    float angle = radians (t * 100.0);
    float dist = 1.25;
    vec3 ro = vec3 (dist * cos (angle), 0.5, dist * -sin (angle));
    vec3 aim = vec3 (.0);
    float zoom = 1.3;
    vec3 rd = camera (uv, ro, aim, zoom);

    float d = march (ro, rd);
    vec3 p = ro + d * rd;
    
    vec3 n = normal (p);
    vec3 col = shade (ro, rd, d);
    col = mix (col, vec3 (.0), pow (1. - 1. / d, 5.));

    col = col / (2. + col);
    //col = sqrt (col);

	fragColor = vec4 (col, 1.);
}
import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { gsap } from 'gsap';
import { HalfFloatType, Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, Vector2, WebGLRenderTarget } from 'three';

/** 0: rewind only (low quality), 1: grain, warmth and vignette (medium), 2: plus colour bleed and inked edges (high). */
export type Paint = 0 | 1 | 2;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform float uTime;
  uniform float uRewind;
  uniform float uSwirl;
  uniform int uMode;
  uniform vec2 uResolution;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec2 c = vUv - 0.5;
    float r = length(c);
    // Rewind: a swirl, strongest at the centre of the screen.
    float a = uRewind * uSwirl * 3.0 * (1.0 - smoothstep(0.0, 0.75, r));
    c = mat2(cos(a), -sin(a), sin(a), cos(a)) * c;
    vec2 uv = c + 0.5;
    float split = uRewind * 0.01;
    vec3 col = vec3(
      texture2D(tDiffuse, uv + vec2(split, 0.0)).r,
      texture2D(tDiffuse, uv).g,
      texture2D(tDiffuse, uv - vec2(split, 0.0)).b
    );
    if (uMode == 2) {
      // Colour bleed: lean toward a small blur, and darken where it differs so edges read as ink.
      vec2 px = 1.5 / uResolution;
      vec3 blur = 0.25 * (
        texture2D(tDiffuse, uv + vec2(px.x, 0.0)).rgb + texture2D(tDiffuse, uv - vec2(px.x, 0.0)).rgb +
        texture2D(tDiffuse, uv + vec2(0.0, px.y)).rgb + texture2D(tDiffuse, uv - vec2(0.0, px.y)).rgb
      );
      float edge = clamp(length(col - blur) * 2.0, 0.0, 1.0);
      col = mix(col, blur, 0.35) * (1.0 - edge * 0.25);
    }
    if (uMode >= 1) {
      col *= vec3(1.04, 1.0, 0.93);
      col *= mix(1.0, smoothstep(0.9, 0.3, r), 0.3);
    }
    float grey = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, vec3(grey), uRewind * 0.85);
    // Paper grain, re-rolled 24 times a second; it flickers harder during a rewind.
    float grain = hash(floor(vUv * uResolution) + floor(uTime * 24.0)) - 0.5;
    col *= 1.0 + grain * ((uMode >= 1 ? 0.06 : 0.0) + uRewind * 0.25);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/**
 * Renders the scene into a texture, then draws it through one full-screen
 * shader: the painterly finish, and the rewind swirl whenever `rewind` ticks.
 */
export function Post({ paint, rewind, still }: { paint: Paint; rewind: number; still: boolean }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const dpr = useThree((s) => s.viewport.dpr);

  // Multisampling keeps edges smooth on high, where the bleed would show jaggies.
  const target = useMemo(() => new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: paint === 2 ? 4 : 0 }), [paint]);
  useEffect(() => {
    target.setSize(Math.round(width * dpr), Math.round(height * dpr));
  }, [target, width, height, dpr]);
  useEffect(() => () => target.dispose(), [target]);

  const pass = useMemo(() => {
    const material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uRewind: { value: 0 },
        uSwirl: { value: 1 },
        uMode: { value: 1 },
        uResolution: { value: new Vector2() },
      },
      depthTest: false,
      depthWrite: false,
    });
    const quad = new Mesh(new PlaneGeometry(2, 2), material);
    quad.frustumCulled = false;
    return { material, quad, scene: new Scene().add(quad), camera: new OrthographicCamera() };
  }, []);
  useEffect(
    () => () => {
      pass.material.dispose();
      pass.quad.geometry.dispose();
    },
    [pass],
  );

  // In fast, then out slower: about 0.7 s in all.
  useEffect(() => {
    const u = pass.material.uniforms['uRewind']!;
    if (!rewind) return;
    const tween = gsap.timeline().to(u, { value: 1, duration: 0.25, ease: 'power2.in' }).to(u, { value: 0, duration: 0.45, ease: 'power2.out' });
    return () => {
      tween.kill();
      u.value = 0;
    };
  }, [rewind, pass]);

  // Two renders a frame: count both, so draw-call stats stay honest.
  useEffect(() => {
    gl.info.autoReset = false;
    return () => {
      gl.info.autoReset = true;
    };
  }, [gl]);

  useFrame(({ clock }) => {
    gl.info.reset();
    const u = pass.material.uniforms;
    u['tDiffuse']!.value = target.texture;
    u['uTime']!.value = clock.elapsedTime;
    u['uMode']!.value = paint;
    u['uSwirl']!.value = still ? 0 : 1;
    (u['uResolution']!.value as Vector2).set(target.width, target.height);
    gl.setRenderTarget(target);
    gl.render(scene, camera);
    gl.setRenderTarget(null);
    gl.render(pass.scene, pass.camera);
  }, 1);
  return null;
}

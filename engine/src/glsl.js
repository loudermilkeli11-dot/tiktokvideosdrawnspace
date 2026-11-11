// Shared GLSL snippets
export const NOISE = `
float h13(vec3 p3){ p3 = fract(p3*0.1031); p3 += dot(p3, p3.zyx+31.32); return fract((p3.x+p3.y)*p3.z); }
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float vn3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(mix(h13(i),h13(i+vec3(1,0,0)),f.x), mix(h13(i+vec3(0,1,0)),h13(i+vec3(1,1,0)),f.x), f.y),
             mix(mix(h13(i+vec3(0,0,1)),h13(i+vec3(1,0,1)),f.x), mix(h13(i+vec3(0,1,1)),h13(i+vec3(1,1,1)),f.x), f.y), f.z); }
float fbm3(vec3 p){ float s=0., a=0.5; for(int i=0;i<5;i++){ s += a*vn3(p); p = p*2.03+vec3(1.7,9.2,3.1); a *= 0.5; } return s; }
float vn2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(h12(i),h12(i+vec2(1,0)),f.x), mix(h12(i+vec2(0,1)),h12(i+vec2(1,1)),f.x), f.y); }
float fbm2(vec2 p){ float s=0., a=0.5; for(int i=0;i<5;i++){ s += a*vn2(p); p = p*2.03+vec2(1.7,9.2); a *= 0.5; } return s; }
`;

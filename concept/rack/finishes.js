import * as THREE from './vendor/three.module.js';

const SURFACES = {
  metal: { asset: 'Metal032', tile: 2, metalness: 0.85, normal: 0.16, realistic: [0.38, 0.55], simple: [0.50, 0.58], environment: 0.9 },
  painted: { asset: 'Metal029', tile: 1, metalness: 0.04, normal: 0.12, realistic: [0.56, 0.73], simple: [0.66, 0.74], environment: 0.65 },
  floor: { asset: 'Concrete048', tile: 6, metalness: 0, normal: 0.075, realistic: [0.80, 0.94], simple: [0.86, 0.94], environment: 0.22 },
};

// A separate metric UV channel leaves authored nameplates and lid lettering intact.
export function setFinishUVs(geometry) {
  const { position, normal } = geometry.attributes;
  const uv = new Float32Array(position.count * 2);
  for (let i = 0; i < position.count; i++) {
    const nx = Math.abs(normal.getX(i));
    const ny = Math.abs(normal.getY(i));
    const nz = Math.abs(normal.getZ(i));
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
    const pair = nx > ny && nx > nz ? [z, y] : ny > nz ? [x, z] : [x, y];
    uv[i * 2] = pair[0];
    uv[i * 2 + 1] = pair[1];
  }
  geometry.setAttribute('uv1', new THREE.BufferAttribute(uv, 2));
}

function remapRoughness(texture, range) {
  const canvas = document.createElement('canvas');
  canvas.width = texture.image.width;
  canvas.height = texture.image.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(texture.image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  // JPEG samples are linear data here. Keep a rough floor and a dielectric paint coat.
  for (let i = 0; i < pixels.data.length; i += 4) {
    const value = Math.round(255 * range[0] + pixels.data[i] * (range[1] - range[0]));
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value;
  }
  context.putImageData(pixels, 0, 0);
  texture.image = canvas;
  texture.needsUpdate = true;
}

export async function loadSurfaceFinishes(renderer, mode = 'realistic', metalRoughness = 0.5) {
  const finish = mode === 'simple' ? 'simple' : 'realistic';
  const loader = new THREE.TextureLoader();
  const textures = [];
  const maps = {};
  const jobs = Object.entries(SURFACES).flatMap(([kind, surface]) => {
    maps[kind] = {};
    return (finish === 'realistic' ? ['Roughness', 'NormalGL'] : ['Roughness']).map(async role => {
      const url = new URL(`./textures/${surface.asset}_1K-JPG_${role}.jpg`, import.meta.url);
      const texture = await loader.loadAsync(url.href);
      textures.push(texture);
      texture.name = `${surface.asset} ${role}`;
      texture.colorSpace = THREE.NoColorSpace;
      texture.channel = 1;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.setScalar(1 / surface.tile);
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      if (role === 'Roughness') {
        const range = kind === 'metal'
          ? surface[finish].map(value => THREE.MathUtils.clamp(value * metalRoughness / 0.5, 0, 1))
          : surface[finish];
        remapRoughness(texture, range);
      }
      maps[kind][role === 'Roughness' ? 'roughnessMap' : 'normalMap'] = texture;
    });
  });
  const loaded = await Promise.allSettled(jobs);
  const failure = loaded.find(result => result.status === 'rejected');
  if (failure) {
    textures.forEach(texture => texture.dispose());
    throw failure.reason;
  }
  let disposed = false;
  return {
    finish,
    settings(kind) {
      if (kind === 'plastic') return { metalness: 0, roughness: 0.92, envMapIntensity: 0.25 };
      const surface = SURFACES[kind];
      return {
        ...maps[kind], roughness: 1, metalness: surface.metalness,
        normalScale: new THREE.Vector2(surface.normal, surface.normal),
        envMapIntensity: surface.environment,
        ...(kind === 'painted' ? { clearcoat: finish === 'realistic' ? 0.12 : 0, clearcoatRoughness: 0.6 } : {}),
      };
    },
    getState: () => ({ finish, textures: textures.length, estimatedTextureMiB: textures.length * 16 / 3, maps: textures.map(texture => ({ name: texture.name, width: texture.image.width, height: texture.image.height, colorSpace: texture.colorSpace, channel: texture.channel })), disposed }),
    dispose() {
      if (disposed) return;
      disposed = true;
      textures.forEach(texture => texture.dispose());
    },
  };
}

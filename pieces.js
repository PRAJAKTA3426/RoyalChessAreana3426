import * as THREE from "../libraries/three.module.js";

const shapeProfiles = {
  p: [[0,.06],[.27,.06],[.29,.1],[.22,.14],[.16,.22],[.11,.34],[.14,.42],[.17,.48],[.15,.53],[.08,.56],[0,.56]],
  r: [[0,.06],[.29,.06],[.3,.12],[.23,.17],[.2,.51],[.27,.53],[.28,.6],[.21,.62],[.21,.71],[.14,.71],[.14,.62],[.07,.62],[.07,.71],[0,.71]],
  b: [[0,.06],[.29,.06],[.3,.12],[.22,.17],[.17,.36],[.12,.47],[.2,.49],[.14,.56],[.1,.69],[.06,.76],[0,.78]],
  q: [[0,.06],[.31,.06],[.32,.13],[.23,.17],[.18,.44],[.15,.56],[.22,.58],[.18,.64],[.13,.65],[.1,.61],[.06,.64],[.02,.61],[0,.64]],
  k: [[0,.06],[.31,.06],[.32,.13],[.23,.17],[.18,.45],[.14,.57],[.21,.6],[.16,.65],[.08,.65],[.08,.73],[.15,.73],[.15,.78],[.05,.78],[.05,.86],[0,.86]],
  n: [[0,.06],[.29,.06],[.3,.13],[.22,.17],[.16,.3],[.21,.39],[.19,.47],[.13,.5],[.17,.55],[.1,.58],[.03,.54],[0,.59]]
};

function makeMesh(geometry, material, group, x, y, z) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

export function disposeObject(root) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  root.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    if (object.material) {
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        materials.add(material);
        for (const value of Object.values(material)) {
          if (value?.isTexture) textures.add(value);
        }
      }
    }
  });
  for (const texture of textures) texture.dispose();
  for (const material of materials) material.dispose();
  for (const geometry of geometries) geometry.dispose();
}

export function createPiece(type, color) {
  const group = new THREE.Group();
  const isWhite = color === "w";
  const pieceColor = isWhite ? 0xe9e1cc : 0x3e4a58;
  const material = new THREE.MeshStandardMaterial({
    color: pieceColor,
    roughness: isWhite ? .29 : .25,
    metalness: isWhite ? .12 : .42,
    emissive: isWhite ? 0x17140d : 0x121923,
    emissiveIntensity: .22
  });
  const trim = new THREE.MeshStandardMaterial({ color: isWhite ? 0xc49b50 : 0x987842, metalness: .75, roughness: .24 });
  const base = new THREE.CylinderGeometry(.3,.34,.075,32);
  makeMesh(base, trim, group, 0, .04, 0);
  const profile = shapeProfiles[type];
  const points = profile.map(([radius, height]) => new THREE.Vector2(radius, height));
  const body = new THREE.LatheGeometry(points, 32);
  body.computeVertexNormals();
  makeMesh(body, material, group, 0, 0, 0);
  if (type === "n") {
    const neck = makeMesh(new THREE.CapsuleGeometry(.085,.18,4,8), material, group, 0, .53, 0);
    neck.rotation.z = -.32;
    const head = makeMesh(new THREE.SphereGeometry(.14,16,12), material, group, .035, .66, 0);
    head.scale.set(1.05,.8,.82);
    const muzzle = makeMesh(new THREE.ConeGeometry(.085,.2,8), material, group, -.08, .68, 0);
    muzzle.rotation.z = -Math.PI / 2;
    const ear = makeMesh(new THREE.ConeGeometry(.045,.15,6), material, group, .05,.79,.035);
    ear.rotation.z = -.28;
    const eye = new THREE.Mesh(new THREE.SphereGeometry(.018,8,8), trim);
    eye.position.set(-.04,.7,.12);
    group.add(eye);
  } else if (type === "b") {
    makeMesh(new THREE.SphereGeometry(.065,12,10), trim, group, 0, .76, 0);
    const groove = makeMesh(new THREE.TorusGeometry(.105,.012,6,24), trim, group, 0,.49,0);
    groove.rotation.x = Math.PI / 2;
  } else if (type === "q") {
    makeMesh(new THREE.SphereGeometry(.045,12,10), trim, group, 0,.68,0);
    for (let i=0;i<5;i++) {
      const a=i*Math.PI*2/5;
      makeMesh(new THREE.SphereGeometry(.04,8,8), trim, group, Math.cos(a)*.12,.64,Math.sin(a)*.12);
    }
  } else if (type === "k") {
    makeMesh(new THREE.BoxGeometry(.045,.22,.045), trim, group, 0,.85,0);
    makeMesh(new THREE.BoxGeometry(.15,.045,.045), trim, group, 0,.88,0);
  } else if (type === "r") {
    const crenel = new THREE.BoxGeometry(.09,.1,.09);
    for(let i=0;i<4;i++){const a=i*Math.PI/2;makeMesh(crenel,material,group,Math.cos(a)*.16,.75,Math.sin(a)*.16);}
  } else {
    makeMesh(new THREE.SphereGeometry(.13,18,14), material, group, 0,.65,0);
  }
  group.userData = { type, color };
  return group;
}

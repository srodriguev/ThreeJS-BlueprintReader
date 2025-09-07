import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import GUI from 'lil-gui';

const gui = new GUI();
const palette = [
  0x88ccff, // light blue
  0xcc3333, // red
  0x33cc33, // green
  0xffcc00, // yellow
  0xff66cc, // pink
  0x999966, // olive
  0x9966ff, // purple
];

// Helper to pick random color from the palette
function randomColor() {
  return palette[Math.floor(Math.random() * palette.length)];
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1020);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate2);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
// scene.add(cube);

camera.position.z = 5;

// resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---

// lights
const hemi = new THREE.HemisphereLight(0xffffff, 0x444466, 0.8);
hemi.position.set(0, 5, 0);
scene.add(hemi);

const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(5, 8, 5);
scene.add(dir);

// controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// optional grid
const grid = new THREE.GridHelper(20, 20, 0x334455, 0x223344);
grid.material.opacity = 0.3; grid.material.transparent = true;
scene.add(grid);


// Build Geometry V_01

// load JSON and build geometry
async function loadHouse() {
  const res = await fetch('./house01.json');
  const data = await res.json();

  // expand triangle faces into a non-indexed position buffer
  const positions = [];
  for (const face of data.faces) {
    for (const idx of face) {
      const v = data.vertices[idx];
      positions.push(v[0], v[1], v[2]);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    color: 0x88ccff, metalness: 0.05, roughness: 0.9
  });

  const mesh = new THREE.Mesh(geom, mat);
  scene.add(mesh);

  // subtle outline
  const edges = new THREE.EdgesGeometry(geom);
  const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.3, transparent: true }));
  scene.add(line);
}
//loadHouse();

// Build Geometry_02

async function loadHouseWithNames() {
  const response = await fetch("house.json");
  const data = await response.json();

  const vertices = data.vertices;

  const group = new THREE.Group();

  // Loop over parts (walls, roof, floor, etc.)
  for (const [partName, meshes] of Object.entries(data.parts)) {
    const subgroup = new THREE.Group();
    subgroup.name = partName;

    // 🔹 Assign ONE random color for this entire group
    const groupColor = randomColor();

    // Add a folder for this part group
    const folder = gui.addFolder(partName);

    // 🔹 Master toggle for the whole subgroup
    folder.add(subgroup, 'visible').name(`Show ${partName}`);

    meshes.forEach((meshData) => {
      const geometry = new THREE.BufferGeometry();

      // Flatten vertices used by this mesh’s faces
      const positionArray = [];
      const indexArray = [];
      let idx = 0;
      const vertexMap = {}; // map from letter to index

      meshData.faces.forEach((face) => {
        face.forEach((vName) => {
          if (!(vName in vertexMap)) {
            const coords = vertices[vName];
            positionArray.push(...coords);
            vertexMap[vName] = idx++;
          }
        });

        // push indices for this face
        indexArray.push(
          vertexMap[face[0]],
          vertexMap[face[1]],
          vertexMap[face[2]]
        );
      });

      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positionArray, 3)
      );
      geometry.setIndex(indexArray);
      geometry.computeVertexNormals();

      // Material with random color + low opacity
      const material = new THREE.MeshStandardMaterial({
        color: groupColor,
        metalness: 0.05,
        roughness: 0.9,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = meshData.name; // so you can target e.g. "front wall"

      // Subtle outline (edges)
      const edges = new THREE.EdgesGeometry(geometry);
      const line = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({
          color: 0xffffff,
          opacity: 0.3,
          transparent: true,
        })
      );

      // Group both mesh and outline together
      const sectionGroup = new THREE.Group();
      sectionGroup.name = meshData.name;
      sectionGroup.add(mesh);
      sectionGroup.add(line);

      subgroup.add(sectionGroup);

      // 🔹 Toggle for this section
      folder.add(sectionGroup, 'visible').name(meshData.name);
      
    });

    group.add(subgroup);

  }

  scene.add(group);
}
loadHouseWithNames();

// loop
function animate2() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}


function animate() {

  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;

  renderer.render(scene, camera);

}
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { PLYLoader } from "./ply.js";
import GUI from "./lilgui.js";

/**************************************************
 * DOM CONTAINERS (FIXED)
 **************************************************/
const canvasContainer = document.getElementById("canvas");
const controlsContainer = document.getElementById("controls");

if (!canvasContainer || !controlsContainer) {
    throw new Error("Missing #canvas or #controls in HTML");
}

/**************************************************
 * SCENE + CAMERA + RENDERER
 **************************************************/
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

const width = canvasContainer.clientWidth;
const height = canvasContainer.clientHeight;

const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
camera.position.set(0, -5, 2);
camera.up.set(0, 0, 1);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(width, height);
canvasContainer.appendChild(renderer.domElement);

/**************************************************
 * CONTROLS
 **************************************************/
const controls = new OrbitControls(camera, renderer.domElement);
controls.update();

/**************************************************
 * LIGHTING
 **************************************************/
scene.add(new THREE.DirectionalLight(0xffffff, 0.8));
scene.add(new THREE.AmbientLight(0x404040));

/**************************************************
 * PLY LOADER
 **************************************************/
const plyLoader = new PLYLoader();

/**************************************************
 * SCENE DEFINITIONS
 **************************************************/
const sceneObjects = {
    "garden": ["table", "vase"],
    "kitchen": ["lego"],
    "fern": ["fern"],
    "horns": ["dinasour"]
};

const sceneNames = Object.keys(sceneObjects);

/**************************************************
 * LOAD SCENE (SAFE)
 **************************************************/
function loadScene(root, objects, visible) {

    const sceneGroup = new THREE.Group();
    sceneGroup.visible = visible;

    // ---------- SCENE INPUT ----------
    const sceneInput = new THREE.Group();
    plyLoader.load(root + "/scene.pts.input.ply", geo => {
        geo.computeVertexNormals();
        const mat = new THREE.PointsMaterial({ vertexColors: true, size: 0.01 });
        sceneInput.add(new THREE.Points(geo, mat));
        renderer.render(scene, camera);
    });

    // ---------- SCENE SEG ----------
    const sceneSeg = new THREE.Group();
    plyLoader.load(root + "/scene.pts.instance_pred.ply", geo => {
        const mat = new THREE.PointsMaterial({ vertexColors: true, size: 0.01 });
        sceneSeg.add(new THREE.Points(geo, mat));
        renderer.render(scene, camera);
    });

    // ---------- OBJECTS ----------
    const objectsGroup = new THREE.Group();
    const objectWrappers = [];

    objects.forEach(name => {
        const wrapper = new THREE.Group();
        wrapper.visible = false;

        // INPUT
        plyLoader.load(`${root}/objects/${name}.pts.input.ply`, geo => {
            const mat = new THREE.PointsMaterial({ color: 0x303030, size: 0.01 });
            const pts = new THREE.Points(geo, mat);
            pts.visible = false;
            wrapper.add(pts);
        });

        // SEG
        plyLoader.load(`${root}/objects/${name}.pts.instance_pred.ply`, geo => {
            const mat = new THREE.PointsMaterial({ vertexColors: true, size: 0.01 });
            const pts = new THREE.Points(geo, mat);
            pts.visible = true;
            wrapper.add(pts);
        });

        objectsGroup.add(wrapper);
        objectWrappers.push(wrapper);
    });

    sceneGroup.add(sceneInput);
    sceneGroup.add(sceneSeg);
    sceneGroup.add(objectsGroup);

    scene.add(sceneGroup);

    return {
        sceneGroup,
        sceneInput,
        sceneSeg,
        objectsGroup,
        objects: objectWrappers,
        objectNames: objects
    };
}

/**************************************************
 * LOAD ALL SCENES
 **************************************************/
const scenesData = sceneNames.map((name, idx) => {
    return loadScene(`resources/${name}`, sceneObjects[name], idx === 0);
});

/**************************************************
 * GUI STATE
 **************************************************/
const guiState = {
    currentScene: sceneNames[0],
    sceneMode: "seg",
    showObject: false,
    selectedObjectName: "",
    objectMode: "seg",
    pointSize: 0.01
};

let objectDropdown;

/**************************************************
 * GUI
 **************************************************/
const gui = new GUI({ container: controlsContainer });

gui.add(guiState, "currentScene", sceneNames).name("Scene");
gui.add(guiState, "sceneMode", ["input", "seg"]).name("Scene Mode");
gui.add(guiState, "showObject").name("Show Object");
gui.add(guiState, "pointSize", 0.005, 0.05).name("Point Size");

/**************************************************
 * REBUILD DROPDOWN
 **************************************************/
function rebuildObjectDropdown() {
    if (objectDropdown) objectDropdown.destroy();

    const sd = scenesData[sceneNames.indexOf(guiState.currentScene)];

    if (sd.objectNames.length === 0) return;

    guiState.selectedObjectName = sd.objectNames[0];

    objectDropdown = gui.add(
        guiState,
        "selectedObjectName",
        sd.objectNames
    ).name("Object");
}

rebuildObjectDropdown();

/**************************************************
 * GUI UPDATE
 **************************************************/
let lastScene = guiState.currentScene;

gui.onChange(() => {

    if (guiState.currentScene !== lastScene) {
        lastScene = guiState.currentScene;
        rebuildObjectDropdown();
    }

    const currIdx = sceneNames.indexOf(guiState.currentScene);

    scenesData.forEach((sd, idx) => {

        sd.sceneGroup.visible = (idx === currIdx);
        if (idx !== currIdx) return;

        const showScene = !guiState.showObject;

        sd.sceneInput.visible = showScene && guiState.sceneMode === "input";
        sd.sceneSeg.visible   = showScene && guiState.sceneMode === "seg";

        sd.objects.forEach((obj, oid) => {
            const name = sd.objectNames[oid];

            obj.visible = guiState.showObject && (name === guiState.selectedObjectName);

            if (obj.children.length === 2) {
                obj.children[0].visible = guiState.objectMode === "input";
                obj.children[1].visible = guiState.objectMode === "seg";
            }
        });

        const applySize = n => {
            if (n.material) n.material.size = guiState.pointSize;
        };

        sd.sceneInput.traverse(applySize);
        sd.sceneSeg.traverse(applySize);
        sd.objects.forEach(obj => obj.traverse(applySize));
    });

    renderer.render(scene, camera);
});

/**************************************************
 * ANIMATION LOOP (IMPORTANT)
 **************************************************/
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

/**************************************************
 * RESIZE HANDLING
 **************************************************/
window.addEventListener("resize", () => {
    const w = canvasContainer.clientWidth;
    const h = canvasContainer.clientHeight;

    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
});
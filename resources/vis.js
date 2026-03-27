import * as THREE from "three";
import { OrbitControls } from "./OrbitControls.js";
import { PLYLoader } from "./ply.js";
import GUI from "./lilgui.js";

/**************************************************
 * SCENE + CAMERA + RENDERER
 **************************************************/
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

const width = 1000 - 4;
const height = 800;

const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
camera.up = new THREE.Vector3(0, 0, 1);
camera.position.set(0, -5, 1);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(width, height);
document.getElementById("canvas").appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement, scene);
controls.addEventListener("change", () => renderer.render(scene, camera));
controls.update();

scene.add(new THREE.DirectionalLight(0xffffff, 0.5));
scene.add(new THREE.AmbientLight(0x404040));

const plyLoader = new PLYLoader();

/**************************************************
 * DEFINE OBJECTS PER SCENE
 **************************************************/
const sceneObjects = {
    "garden": ["table", "vase"],
    // "kitchen": ["lego"],
};

const sceneNames = Object.keys(sceneObjects);

/**************************************************
 * LOAD ONE SCENE
 **************************************************/
function loadScene(root, objects, visible) {

    const sceneGroup = new THREE.Group();
    sceneGroup.visible = visible;

    /******************** SCENE INPUT ********************/
    const sceneInput = new THREE.Group();
    plyLoader.load(root + "/scene.pts.input.ply", geo => {
        const mat = new THREE.PointsMaterial({ vertexColors: true, size: 0.01 });
        sceneInput.add(new THREE.Points(geo, mat));
        renderer.render(scene, camera);
    });

    /******************** SCENE SEG **********************/
    const sceneSeg = new THREE.Group();
    plyLoader.load(root + "/scene.pts.instance_pred.ply", geo => {
        const mat = new THREE.PointsMaterial({ vertexColors: true, size: 0.01 });
        sceneSeg.add(new THREE.Points(geo, mat));
        renderer.render(scene, camera);
    });

    /******************** OBJECTS *************************/
    const objectsGroup = new THREE.Group();
    const objectWrappers = [];

    objects.forEach(name => {
        const wrapper = new THREE.Group();
        wrapper.visible = false;

        // load INPUT
        plyLoader.load(`${root}/objects/${name}.pts.input.ply`, geo => {
            const mat = new THREE.PointsMaterial({ color: 0x303030, size: 0.01 });
            const pts = new THREE.Points(geo, mat);
            pts.visible = false;
            wrapper.add(pts);
        });

        // load SEGMENTATION
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
    sceneMode: "seg",        // "input", "seg"

    showObject: false,
    selectedObjectName: "",
    objectMode: "seg",       // "input", "seg"

    pointSize: 0.01
};

let objectDropdown;

/**************************************************
 * REBUILD OBJECT DROPDOWN WHEN SCENE CHANGES
 **************************************************/
function rebuildObjectDropdown() {
    // DESTROY OLD DROPDOWN
    if (objectDropdown) objectDropdown.destroy();

    const sd = scenesData[ sceneNames.indexOf(guiState.currentScene) ];

    if (sd.objectNames.length === 0) {
        guiState.selectedObjectName = "";
        objectDropdown = gui.add({ none: "--- none ---" }, "none");
        return;
    }

    guiState.selectedObjectName = sd.objectNames[0];

    objectDropdown = gui.add(
        guiState,
        "selectedObjectName",
        sd.objectNames
    ).name("Object");
}

/**************************************************
 * GUI
 **************************************************/
const gui = new GUI({ container: document.getElementById("controls") });

gui.add(guiState, "currentScene", sceneNames).name("Scene");

gui.add(guiState, "sceneMode", ["input", "seg"]).name("Scene Mode");

gui.add(guiState, "showObject").name("Show Object");

rebuildObjectDropdown();

// gui.add(guiState, "objectMode", ["input", "seg"]).name("Object Mode");

gui.add(guiState, "pointSize", 0.005, 0.05).name("Point Size");

/**************************************************
 * GUI UPDATE HANDLER
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

            if (!guiState.showObject) {
                obj.visible = false;
            } else {
                obj.visible = (name === guiState.selectedObjectName);
            }

            if (obj.children.length === 2) {
                obj.children[0].visible = guiState.objectMode === "input";
                obj.children[1].visible = guiState.objectMode === "seg";
            }
        });

        const applySize = n => { if (n.material) n.material.size = guiState.pointSize; };

        sd.sceneInput.traverse(applySize);
        sd.sceneSeg.traverse(applySize);
        sd.objects.forEach(obj => obj.traverse(applySize));
    });

    renderer.render(scene, camera);
});

/**************************************************/
renderer.render(scene, camera);

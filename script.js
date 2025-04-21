// FILE: script.js

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// *** REMOVED EXRLoader and RGBELoader ***

// Post-processing imports
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// --- DOM Elements ---
let canvasContainer, infoPanel, infoTitle, infoDescription, infoTechnologies, infoLinks, closePanelBtn, loadingIndicator, backButton;

// --- Scene Variables ---
let scene, camera, renderer, controls, raycaster, pointer, composer;
const clock = new THREE.Clock();

// --- State Management ---
let currentState = 'nexus';
let isTransitioning = false;
let nexusGroup = new THREE.Group();
let currentUniverseGroup = null;
const universeGroupsCache = {}; // Cache created groups { 'AI_ML': group, ... }
const loadedModelsCache = {};   // Cache loaded model scenes { 'path': scene, ... }

// --- Interactive Objects (Structure to hold lists per state) ---
// Stores the actual Object3D instances (clones) that are interactive
const interactiveObjects = {
    nexus: [],
    universe_AI_ML: [],
    universe_WEB_API: [],
    universe_DOT_NET: [],
    universe_GAME_DEV: [],
};
let INTERSECTED = null; // Currently hovered interactive object
let SELECTED = null;    // Currently selected interactive object

// --- Loaders ---
// Use a single LoadingManager primarily for feedback during async operations
const loadingManager = new THREE.LoadingManager();
const gltfLoader = new GLTFLoader(loadingManager); // Can associate with manager for global progress

// --- DATA Configuration ---
const nodeSpreadFactor = 1.5;
const baseNodeScale = 0.6;
const baseProjectScale = 0.4;

// *** REMOVED ENVIRONMENT_MAP_PATH and UNIVERSE_DATA ***

const SKILL_NODES_DATA = { /* ... Your SKILL_NODES_DATA ... */
    'AI_ML': { title: 'AI / Machine Learning', position: new THREE.Vector3(-4 * nodeSpreadFactor, 0.5, 0), color: 0x9400D3, modelPath: 'models/aibrain.glb', scale: baseNodeScale * 1.5 },
    'WEB_API': { title: 'Web Dev / API', position: new THREE.Vector3(0, 1 * nodeSpreadFactor, -3 * nodeSpreadFactor), color: 0x00BFFF, modelPath: 'models/fullstack.glb', scale: baseNodeScale * 0.9 },
    'DOT_NET': { title: '.NET Development', position: new THREE.Vector3(4 * nodeSpreadFactor, 0, 0), color: 0xff4500, modelPath: 'models/fullstack.glb', scale: baseNodeScale * 0.9 },
    'GAME_DEV': { title: 'Game Development', position: new THREE.Vector3(0, -1.5 * nodeSpreadFactor, 2 * nodeSpreadFactor), color: 0x39FF14, modelPath: 'models/gamepad.glb', scale: baseNodeScale },
};
const PROJECT_DATA = { /* ... Your PROJECT_DATA, including descriptions/tech/links ... */
     'LaughDetection': { skillNode: 'AI_ML', title: 'Laugh Detection', description: 'Converted audio files into mel spectrograms using Librosa; applied data augmentation and built a CNN (ResNet-34 via fastai) to detect laughter (~86.7% validation accuracy). Deployed via Gradio.', technologies: ['Python', 'Librosa', 'fastai', 'PyTorch', 'Gradio', 'HuggingFace Hub', 'Audio Processing', 'Machine Learning'], links: [{ name: 'GitHub', url: 'https://github.com/muhammedatakas/Laugh_Detection' }, { name: 'Demo', url: 'https://huggingface.co/spaces/piroplasmata/Laugh_Detection' }], modelPath: 'models/laughdetection.glb', scale: baseProjectScale * 1.2, position: new THREE.Vector3(-1.5, 1, -1) },
    'RAG_QnA': { skillNode: 'AI_ML', title: 'Web Traffic Log Q&A System', description: 'Developed a RAG-based Q&A system processing web traffic logs with FAISS for vector storage; leveraged LLaMA 3 & Google T5 for context-aware responses. Optimized for GPU acceleration and integrated with Streamlit.', technologies: ['Python', 'PyTorch', 'Transformers', 'FAISS', 'Langchain', 'Ollama', 'HuggingFace', 'Streamlit', 'RAG'], links: [{ name: 'GitHub', url: 'https://github.com/muhammedatakas/Q-A-BOT' }], modelPath: 'models/ragmodel.glb', scale: baseProjectScale * 1.1, position: new THREE.Vector3(1, 0.5, -1.5) },
     'EntityExtraction': { skillNode: 'AI_ML', title: 'Entity Extraction & Classification', description: 'Built a pipeline to standardize food descriptions and extract key entities using Llama-3.3-70B-Instruct-Turbo via Together AI. Employed Python (Pandas, Regex) for preprocessing and batch processing.', technologies: ['Python', 'Pandas', 'Regex', 'LLM', 'Together AI API', 'Llama-3.3-70B'], links: [{ name: 'GitHub', url: 'https://github.com/muhammedatakas/Entity_extraction_llm' }], modelPath: 'models/foodmodel.glb', scale: baseProjectScale * 1.2, position: new THREE.Vector3(0, -1, -1) },
    'DeepFakeResearch': { skillNode: 'AI_ML', title: 'DeepFake Research Group', description: 'Gained experience in synthetic data generation, computer vision, and deepfake detection. Created a blink detection project using Mediapipe and OpenCV.', technologies: ['Python', 'OpenCV', 'Mediapipe', 'Computer Vision', 'DeepFake Detection'], links: [{ name: 'Github', url: 'https://github.com/muhammedatakas/Blink-Detection'}], modelPath: 'models/compvision.glb', scale: baseProjectScale * 1.3, position: new THREE.Vector3(1.5, 1.5, -0.5) },
    'BTKHackathonApp': { skillNode: 'WEB_API', title: 'BTK Hackathon Question App', description: 'Developed a web app that generates interactive questions from PDFs for self-learning, integrating the Gemini API.', technologies: ['Python', 'Streamlit', 'Gemini API', 'MySQL', 'Langchain', 'API Integration'], links: [{ name: 'GitHub', url: 'https://github.com/muhammedatakas/BTK_Hackathon_2024' }], modelPath: 'models/book.glb', scale: baseProjectScale, position: new THREE.Vector3(0, 0, -1) },
    'FlightInfoSystem': { skillNode: 'DOT_NET', title: 'Flight Information System (.NET)', description: 'Developed a .NET project focusing on creating a Flight Information System. Applied SDLC stages and worked with SQL databases for data management.', technologies: ['C#', '.NET Framework', 'ASP.NET', 'Entity Framework', 'T-SQL', 'SQL Server'], links: [{ name: 'GitHub', url: 'https://github.com/muhammedatakas/FlightInfoSystem' }], modelPath: 'models/flyingdog.glb', scale: baseProjectScale * 0.9, position: new THREE.Vector3(0, 0, -1) },
    'GameFactoryClub': { skillNode: 'GAME_DEV', title: 'Game Factory Club Projects', description: 'Developed mini-games using Unity and participated in a game jam, co-creating a platformer game in 48 hours.', technologies: ['Unity', 'C#', 'Game Development'], links: [{name: 'GitHub', url: 'https://github.com/muhammedatakas/BodJam2023Future'}], modelPath: 'models/finn.glb', scale: baseProjectScale * 1.1, position: new THREE.Vector3(0, 0, -1) },
};

// --- Initialization ---
function init() {
    // Assign DOM Elements
    canvasContainer = document.getElementById('canvas-container');
    infoPanel = document.getElementById('info-panel');
    infoTitle = document.getElementById('info-title');
    infoDescription = document.getElementById('info-description');
    infoTechnologies = document.getElementById('info-technologies');
    infoLinks = document.getElementById('info-links');
    closePanelBtn = document.getElementById('close-panel-btn');
    loadingIndicator = document.getElementById('loading-indicator');
    backButton = document.getElementById('back-button');

    if (!canvasContainer || !infoPanel || !closePanelBtn || !loadingIndicator || !backButton) {
        console.error("CRITICAL: UI elements missing!"); return;
    }

    // Scene
    scene = new THREE.Scene();
    scene.background = null; // Transparent background
    scene.fog = new THREE.FogExp2(0x050508, 0.05);

    // Camera
    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 150);
    camera.position.set(0, 2, 10);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // Keep alpha
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0; // Reset exposure, adjust lighting instead
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    canvasContainer.appendChild(renderer.domElement);

    // *** Simplified Lighting ***
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Slightly stronger ambient
    scene.add(ambientLight);
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.5); // Main light
    dirLight1.position.set(5, 10, 7.5);
    scene.add(dirLight1);
    const dirLight2 = new THREE.DirectionalLight(0xaaaaff, 0.5); // Fill light from opposite
    dirLight2.position.set(-5, -5, -5);
    scene.add(dirLight2);
    // *** No HDR Environment Map Loading ***
    console.log("Using standard lighting setup.");


    // Post-processing Composer
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.4, 0.7, 0.9);
    composer.addPass(bloomPass);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false; // Keep damping OFF
    controls.screenSpacePanning = false;
    controls.minDistance = 1;
    controls.maxDistance = 30;
    controls.target.set(0, 0.5, 0);

    // Raycaster
    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();

    // Create Background Particles
    createBackgroundParticles();

    // Create Nexus Group (Starts model loading)
    createNexusGroup();
    scene.add(nexusGroup); // Add immediately
    currentState = 'nexus';

    // Hide loading indicator (can hide sooner now)
    if (loadingIndicator) loadingIndicator.classList.add('hidden');

    // Event Listeners
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('pointermove', onPointerMove);
    canvasContainer.addEventListener('click', onClick);
    closePanelBtn.addEventListener('click', hideInfoPanel);
    backButton.addEventListener('click', handleBackButtonClick);

    // Start Animation Loop
    animate();
}

// --- Asset Loading ---
async function loadGltfModel(path) {
    if (loadedModelsCache[path]) {
        return loadedModelsCache[path].clone(); // Return clone from cache
    }
    try {
        const gltf = await gltfLoader.loadAsync(path);
        loadedModelsCache[path] = gltf.scene; // Cache original
        return gltf.scene.clone(); // Return clone
    } catch (error) {
        console.error(`Failed to load model: ${path}`, error);
        return null;
    }
}

// --- Scene Setup & Management ---

function createNexusGroup() {
    nexusGroup = new THREE.Group();
    nexusGroup.name = 'NexusGroup';
    interactiveObjects.nexus = []; // Reset

    Object.entries(SKILL_NODES_DATA).forEach(([key, data]) => {
        loadGltfModel(data.modelPath).then(modelScene => {
            if (!modelScene) return;
            modelScene.scale.setScalar(data.scale);
            modelScene.position.copy(data.position);
            modelScene.name = key; // Use skill key as name for identification
            modelScene.userData = { type: 'skillNode', skillKey: key, title: data.title };
            storeOriginalMaterials(modelScene);
            nexusGroup.add(modelScene);
            interactiveObjects.nexus.push(modelScene); // Add the CLONE
        }).catch(e => console.error(`Error adding Nexus node ${key}: ${e}`));
    });
}

async function ensureUniverseGroupCreated(skillKey) {
    const universeStateKey = `universe_${skillKey}`;
    if (universeGroupsCache[skillKey]) {
        console.log(`Returning cached Universe Group for: ${skillKey}`);
        return universeGroupsCache[skillKey];
    }

    console.log(`Creating Universe Group for: ${skillKey} (On Demand)`);
    const group = new THREE.Group();
    group.name = `UniverseGroup_${skillKey}`;
    const universeInteractives = [];
    interactiveObjects[universeStateKey] = universeInteractives; // Assign array ref

    const loadPromises = Object.entries(PROJECT_DATA)
        .filter(([_, data]) => data.skillNode === skillKey)
        .map(([projectKey, data]) =>
            loadGltfModel(data.modelPath).then(modelScene => {
                if (!modelScene) return;
                modelScene.scale.setScalar(data.scale);
                modelScene.position.copy(data.position || new THREE.Vector3());
                modelScene.name = projectKey; // Use project key as name
                modelScene.userData = { type: 'project', projectKey: projectKey, title: data.title };
                storeOriginalMaterials(modelScene);
                group.add(modelScene);
                universeInteractives.push(modelScene); // Add the CLONE
            }).catch(e => console.error(`Error adding project ${projectKey} to universe ${skillKey}: ${e}`))
        );

    try {
        await Promise.all(loadPromises);
        universeGroupsCache[skillKey] = group;
        console.log(`Finished creating Universe Group for ${skillKey}, ${interactiveObjects[universeStateKey].length} objects ready.`);
        return group;
    } catch (error) {
        console.error(`Error awaiting universe ${skillKey} models:`, error);
        // Maybe return group even if partially populated?
        universeGroupsCache[skillKey] = group; // Cache potentially incomplete group
        return group;
    }
}

// --- Background Particles ---
function createBackgroundParticles() {
    const particleCount = 4000; // Adjusted count
    const positions = new Float32Array(particleCount * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const radius = 50; // Wider spread
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const u = Math.random(); const v = Math.random();
        const theta = u * Math.PI * 2; const phi = Math.acos(2 * v - 1);
        const r = Math.cbrt(Math.random()) * radius;
        positions[i3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = r * Math.cos(phi);
    }

    const material = new THREE.PointsMaterial({
        size: 0.07, // Adjusted size
        color: 0xbbbbdd, // Star color
        blending: THREE.AdditiveBlending,
        transparent: true, opacity: 0.5, depthWrite: false
    });
    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
}

// --- State Transitions ---
async function transitionToUniverse(skillKey) {
    if (isTransitioning) return;
    console.log(`Transitioning to Universe: ${skillKey}`);
    isTransitioning = true;
    hideInfoPanel(); // Close panel if open
    controls.enabled = false; // Disable controls during animation
    backButton.classList.add('visible'); // Show back button

    // Optional: Show loading indicator while ensuring group is ready
    // if (loadingIndicator) loadingIndicator.classList.remove('hidden');
    const targetGroup = await ensureUniverseGroupCreated(skillKey);
    // if (loadingIndicator) loadingIndicator.classList.add('hidden');

    if (!targetGroup) { console.error("Failed transition: Target group not created."); isTransitioning = false; controls.enabled = true; backButton.classList.remove('visible'); return; }

    const targetStateName = `universe_${skillKey}`;

    // Prepare target group (add to scene, make invisible, scale down)
    if (!scene.children.includes(targetGroup)) scene.add(targetGroup);
    targetGroup.visible = true; // Make sure it's visible for animation
    targetGroup.children.forEach(child => {
        child.scale.setScalar(0.01); // Start scaled down
        // Set initial opacity if materials support it (optional)
        // applyMaterialProperty(child, mat => { if(mat.transparent) mat.opacity = 0; });
    });
    currentUniverseGroup = targetGroup; // Set as current

    const tl = gsap.timeline({
        onComplete: () => {
            currentState = targetStateName;
            isTransitioning = false;
            controls.enabled = true; // Re-enable controls
            scene.remove(nexusGroup); // Clean up nexus group after transition
            console.log("Transition complete. State:", currentState);
        }
    });

    // 1. Animate Nexus nodes scaling down
    tl.to(nexusGroup.children.map(c => c.scale), {
        x: 0.01, y: 0.01, z: 0.01,
        duration: 0.6,
        stagger: 0.05,
        ease: 'power2.in',
        onComplete: () => { nexusGroup.visible = false; } // Hide after shrinking
    }, 0);

    // 2. Animate Camera Move
    const targetCamPos = new THREE.Vector3(0, 1, 5); // Target position in universe
    const targetLookAt = new THREE.Vector3(0, 0, 0); // Target lookAt in universe
    tl.to(camera.position, {
        x: targetCamPos.x, y: targetCamPos.y, z: targetCamPos.z,
        duration: 1.5, ease: 'power3.inOut'
    }, 0.1); // Start camera move slightly after shrinking begins
    tl.to(controls.target, {
        x: targetLookAt.x, y: targetLookAt.y, z: targetLookAt.z,
        duration: 1.5, ease: 'power3.inOut',
        onUpdate: () => controls.update() // Update controls target during tween
    }, 0.1);

    // 3. Animate Universe projects scaling up (staggered)
    tl.to(targetGroup.children.map(c => c.scale), {
        x: (_, target) => PROJECT_DATA[target.name]?.scale || baseProjectScale, // Get original scale
        y: (_, target) => PROJECT_DATA[target.name]?.scale || baseProjectScale,
        z: (_, target) => PROJECT_DATA[target.name]?.scale || baseProjectScale,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power2.out',
        // Also animate opacity if materials were prepared
        // onStart: () => { applyMaterialProperty(targetGroup, mat => { if(mat.transparent) gsap.to(mat, {opacity: 1, duration: 0.8}); });}
    }, ">-0.6"); // Start scaling up before camera finishes moving
}

async function transitionToNexus() {
    if (isTransitioning) return;
    console.log("Transitioning to Nexus");
    isTransitioning = true;
    hideInfoPanel();
    controls.enabled = false;
    backButton.classList.remove('visible');

    const targetStateName = 'nexus';

    // Prepare Nexus group (add if needed, make invisible, scale down)
    if (!scene.children.includes(nexusGroup)) scene.add(nexusGroup);
    nexusGroup.visible = true;
    nexusGroup.children.forEach(child => {
         child.scale.setScalar(0.01); // Start scaled down
         // applyMaterialProperty(child, mat => { if(mat.transparent) mat.opacity = 0; });
    });

    const tl = gsap.timeline({
        onComplete: () => {
            currentState = targetStateName;
            isTransitioning = false;
            controls.enabled = true;
            if (currentUniverseGroup) scene.remove(currentUniverseGroup); // Clean up old group
            currentUniverseGroup = null;
            console.log("Transition complete. State:", currentState);
        }
    });

    // 1. Animate Universe projects scaling down
    if (currentUniverseGroup) {
        tl.to(currentUniverseGroup.children.map(c => c.scale), {
            x: 0.01, y: 0.01, z: 0.01,
            duration: 0.6,
            stagger: 0.05,
            ease: 'power2.in',
            onComplete: () => { if(currentUniverseGroup) currentUniverseGroup.visible = false; } // Hide after shrinking
        }, 0);
    }

    // 2. Animate Camera Move back to Nexus view
    const targetCamPos = new THREE.Vector3(0, 2, 10);
    const targetLookAt = new THREE.Vector3(0, 0.5, 0);
    tl.to(camera.position, {
        x: targetCamPos.x, y: targetCamPos.y, z: targetCamPos.z,
        duration: 1.5, ease: 'power3.inOut'
    }, 0.1);
    tl.to(controls.target, {
        x: targetLookAt.x, y: targetLookAt.y, z: targetLookAt.z,
        duration: 1.5, ease: 'power3.inOut',
        onUpdate: () => controls.update()
    }, 0.1);

    // 3. Animate Nexus nodes scaling up
     tl.to(nexusGroup.children.map(c => c.scale), {
         x: (_, target) => SKILL_NODES_DATA[target.name]?.scale || baseNodeScale, // Get original scale
         y: (_, target) => SKILL_NODES_DATA[target.name]?.scale || baseNodeScale,
         z: (_, target) => SKILL_NODES_DATA[target.name]?.scale || baseNodeScale,
         duration: 0.8,
         stagger: 0.1,
         ease: 'power2.out',
         // onStart: () => { applyMaterialProperty(nexusGroup, mat => { if(mat.transparent) gsap.to(mat, {opacity: 1, duration: 0.8}); }); }
     }, ">-0.6"); // Start scaling up before camera finishes
}

// --- Event Handlers ---
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

function onPointerMove(event) {
    // Simplified hover check - only run if not transitioning
    if (isTransitioning) return;

    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);

    const objectsToCheck = interactiveObjects[currentState] || [];
    const validObjectsToCheck = objectsToCheck.filter(obj => obj instanceof THREE.Object3D && obj.parent); // Ensure valid and added

    if (validObjectsToCheck.length === 0) { // Reset if no valid objects for state
        if (INTERSECTED && INTERSECTED !== SELECTED) resetMaterial(INTERSECTED);
        INTERSECTED = null; document.body.style.cursor = 'default'; return;
    }

    const intersects = raycaster.intersectObjects(validObjectsToCheck, true);

    let hoverTarget = null;
    if (intersects.length > 0) {
        let rawIntersected = intersects[0].object;
        // Traverse up to find the object root in our interactive list
        while (rawIntersected.parent !== null && !validObjectsToCheck.includes(rawIntersected)) {
            rawIntersected = rawIntersected.parent;
        }
        // Only count if the root object found is in our list for the *current state*
        if (validObjectsToCheck.includes(rawIntersected)) {
            hoverTarget = rawIntersected;
        }
    }

    // Update hover state and cursor
    if (INTERSECTED !== hoverTarget) {
        if (INTERSECTED && INTERSECTED !== SELECTED) resetMaterial(INTERSECTED);
        INTERSECTED = hoverTarget;
        if (INTERSECTED && INTERSECTED !== SELECTED) applyHoverMaterial(INTERSECTED);
    }
    document.body.style.cursor = hoverTarget ? 'pointer' : 'default';
}

function onClick(event) {
    if (isTransitioning) return; // Ignore clicks during transitions

    // Rely on INTERSECTED object from onPointerMove
    const clickTarget = INTERSECTED;

    if (clickTarget) {
        console.log(`Processing click on ${clickTarget.name} in state ${currentState}`);

        // Check if this object *actually* belongs to the current interactive set
        const currentInteractiveSet = interactiveObjects[currentState] || [];
        if (!currentInteractiveSet.includes(clickTarget)) {
            console.warn(`Click target ${clickTarget.name} not found in interactive set for state ${currentState}. Ignoring click.`);
            return; // Ignore click if object doesn't belong to current state
        }

        // Proceed with click logic
        if (SELECTED && SELECTED !== clickTarget) {
             resetMaterial(SELECTED); // Deselect previous if different
        }
        SELECTED = clickTarget;
        applySelectedMaterial(SELECTED);

        // Perform action based on object type
        if (SELECTED.userData.type === 'skillNode') {
            transitionToUniverse(SELECTED.userData.skillKey);
        } else if (SELECTED.userData.type === 'project') {
            showInfoPanel(SELECTED.userData.projectKey);
            // Keep camera control with user, maybe subtle focus animation later if needed
            // animateCameraToObject(SELECTED, 1.8); // Remove automatic zoom on project click
        }
    } else { // Clicked empty space
        console.log(`Clicked empty space in state: ${currentState}`);
        if (SELECTED) { // If something was selected, deselect it
            resetMaterial(SELECTED);
            SELECTED = null;
        }
        hideInfoPanel(); // Always hide panel on empty click
        // No automatic transition back on empty click - use back button
    }
}

function handleBackButtonClick() {
    console.log(`Back button clicked. Current state: ${currentState}, Transitioning: ${isTransitioning}`);
    if (currentState !== 'nexus' && !isTransitioning) {
        transitionToNexus();
    }
}

// --- UI Functions ---
function showInfoPanel(projectKey) {
    const data = PROJECT_DATA[projectKey];
    if (!data || !infoPanel || !infoTitle || !infoDescription || !infoTechnologies || !infoLinks) {
        console.error(`Cannot show info panel. Missing data or DOM elements for ${projectKey}`);
        return;
    }
    console.log(`Showing info panel for: ${projectKey}`);
    try {
        infoTitle.textContent = data.title;
        infoDescription.textContent = data.description;
        infoTechnologies.innerHTML = '';
        data.technologies.forEach(tech => { const span = document.createElement('span'); span.textContent = tech; infoTechnologies.appendChild(span); });
        infoLinks.innerHTML = '';
        data.links.forEach(link => { const a = document.createElement('a'); a.href = link.url; a.textContent = link.name; a.target = '_blank'; a.rel = 'noopener noreferrer'; infoLinks.appendChild(a); });
        infoPanel.classList.add('visible'); // Add class LAST
    } catch (error) {
         console.error(`Error populating info panel for ${projectKey}:`, error);
    }
}

function hideInfoPanel() {
    if (!infoPanel) return;
    infoPanel.classList.remove('visible');
    console.log("Info panel hidden.");
    // Deselect project when panel hides
    if (SELECTED && SELECTED.userData.type === 'project') {
        resetMaterial(SELECTED);
        SELECTED = null;
    }
}

// --- Material/Highlighting Functions ---
// (Keep storeOriginalMaterials, applyMaterialProperty, applyHoverMaterial, applySelectedMaterial, resetMaterial as they were - they seem okay)
function storeOriginalMaterials(object) { object.traverse((child) => { if (child.isMesh && child.material) { child.userData.originalEmissive = child.material.emissive.getHex(); } }); }
function applyMaterialProperty(object, propertySetter) { if (!object) return; object.traverse((child) => { if (child.isMesh && child.material) propertySetter(child.material, child); }); }
function applyHoverMaterial(object) { applyMaterialProperty(object, (material, child) => { if (child.userData.originalEmissive === undefined) child.userData.originalEmissive = material.emissive.getHex(); gsap.to(material.emissive, { r: 0.6, g: 0.6, b: 0.6, duration: 0.3 }); gsap.to(material, { emissiveIntensity: 0.7, duration: 0.3 }); }); }
function applySelectedMaterial(object) { applyMaterialProperty(object, (material, child) => { if (child.userData.originalEmissive === undefined) child.userData.originalEmissive = material.emissive.getHex(); const c = new THREE.Color(0xffaa00); gsap.to(material.emissive, { r: c.r, g: c.g, b: c.b, duration: 0.4 }); gsap.to(material, { emissiveIntensity: 1.0, duration: 0.4 }); }); }
function resetMaterial(object) { applyMaterialProperty(object, (material, child) => { if (child.userData.originalEmissive !== undefined) { const c = new THREE.Color(child.userData.originalEmissive); gsap.to(material.emissive, { r: c.r, g: c.g, b: c.b, duration: 0.5 }); gsap.to(material, { emissiveIntensity: 0.0, duration: 0.5 }); } }); }

// --- Camera Animation Functions ---
// Keep these, but they are now optional for project clicks
function animateCameraToObject(targetObject, distanceFactor = 2.0) { /* ... same ... */ }
function animateCameraToPosition(targetCamPos, targetLookAt) { /* ... same ... */ }

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    // *** Update Controls - MANDATORY for OrbitControls ***
    controls.update();

    // Rotate objects based on current state
    const groupToAnimate = (currentState === 'nexus') ? nexusGroup : currentUniverseGroup;
    if (groupToAnimate?.children.length) { // Check if group exists and has children
       groupToAnimate.children.forEach(obj => {
            if (!obj.userData) return; // Skip if userData is missing (model maybe not fully processed?)
            if (obj.userData.type === 'skillNode') obj.rotation.y += delta * 0.05;
            else if (obj.userData.type === 'project') { obj.rotation.y += delta * 0.1; obj.rotation.x += delta * 0.08; }
       });
    }

    // Rotate particles
    const particles = scene.getObjectByProperty('type', 'Points'); if (particles) particles.rotation.y += delta * 0.015; // Slightly faster maybe

    // Use EffectComposer to render
    composer.render(delta);
}

// --- Start ---
init(); // Call init to start everything
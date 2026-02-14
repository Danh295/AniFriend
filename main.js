// ========================================
// 3D Model Setup and Animation
// ========================================

let scene, camera, renderer, model, mixer, clock;
let mouthOpenAction, idleAction;
let isModelLoaded = false;
let voiceEnabled = true;
let conversationHistory = [];

// Initialize 3D scene
function init3DScene() {
    const canvas = document.getElementById('canvas3d');
    const container = document.querySelector('.model-container');

    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    // Create camera
    camera = new THREE.PerspectiveCamera(
        45,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );
    camera.position.set(0, 1.6, 2);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, 0, -5);
    scene.add(fillLight);

    // Add orbit controls
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1;
    controls.maxDistance = 5;
    controls.target.set(0, 1.6, 0);
    controls.update();

    // Clock for animations
    clock = new THREE.Clock();

    // Load 3D model
    load3DModel();

    // Handle window resize
    window.addEventListener('resize', onWindowResize);

    // Start animation loop
    animate();
}

// Load 3D model (GLTF/GLB)
function load3DModel() {
    const loader = new THREE.GLTFLoader();
    
    loader.load(
        CONFIG.MODEL_URL,
        (gltf) => {
            model = gltf.scene;
            scene.add(model);

            // Setup animations if available
            if (gltf.animations && gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(model);
                
                // Look for mouth/talking animation
                gltf.animations.forEach((clip) => {
                    if (clip.name.toLowerCase().includes('mouth') || 
                        clip.name.toLowerCase().includes('talk')) {
                        mouthOpenAction = mixer.clipAction(clip);
                    }
                    if (clip.name.toLowerCase().includes('idle')) {
                        idleAction = mixer.clipAction(clip);
                        idleAction.play();
                    }
                });
            }

            // Position model
            model.position.set(0, 0, 0);
            
            isModelLoaded = true;
            document.getElementById('loading').style.display = 'none';
            updateStatus('Ready');
            console.log('Model loaded successfully');
        },
        (progress) => {
            const percent = (progress.loaded / progress.total) * 100;
            document.getElementById('loading').textContent = `Loading model... ${Math.round(percent)}%`;
        },
        (error) => {
            console.error('Error loading model:', error);
            document.getElementById('loading').textContent = 'Error loading model. Check console.';
            // Create a fallback cube
            createFallbackModel();
        }
    );
}

// Create a simple fallback model if loading fails
function createFallbackModel() {
    const geometry = new THREE.BoxGeometry(1, 1.5, 0.8);
    const material = new THREE.MeshStandardMaterial({ color: 0x667eea });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(0, 1, 0);
    scene.add(cube);
    model = cube;
    isModelLoaded = true;
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    
    if (mixer) {
        mixer.update(delta);
    }

    renderer.render(scene, camera);
}

// Handle window resize
function onWindowResize() {
    const container = document.querySelector('.model-container');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

// ========================================
// Lip Sync / Mouth Animation
// ========================================

let audioContext, analyser;
let currentAudio = null;

function initAudioAnalyzer() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
}

function animateMouthFromAudio(audioElement) {
    if (!audioContext) initAudioAnalyzer();

    const source = audioContext.createMediaElementSource(audioElement);
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function updateMouth() {
        if (audioElement.paused || audioElement.ended) {
            stopMouthAnimation();
            return;
        }

        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
        }
        const average = sum / bufferLength;
        
        // Map volume to mouth opening (0-1)
        const mouthOpen = Math.min(average / 128, 1);
        
        // Apply mouth animation based on audio
        if (mouthOpenAction && mouthOpen > 0.1) {
            mouthOpenAction.setEffectiveWeight(mouthOpen);
            if (!mouthOpenAction.isRunning()) {
                mouthOpenAction.play();
            }
        }

        requestAnimationFrame(updateMouth);
    }

    updateMouth();
}

function stopMouthAnimation() {
    if (mouthOpenAction && mouthOpenAction.isRunning()) {
        mouthOpenAction.stop();
    }
}

// ========================================
// Gemini API Integration
// ========================================

async function sendToGemini(userMessage) {
    try {
        updateStatus('Thinking...');

        // Add user message to history
        conversationHistory.push({
            role: 'user',
            parts: [{ text: userMessage }]
        });

        const response = await fetch(`${CONFIG.GEMINI_API_URL}?key=${CONFIG.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: `${CONFIG.CHARACTER_PERSONALITY}\n\nUser: ${userMessage}` }]
                    }
                ],
                generationConfig: {
                    temperature: 0.9,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 200,
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        const aiResponse = data.candidates[0].content.parts[0].text;

        // Add AI response to history
        conversationHistory.push({
            role: 'model',
            parts: [{ text: aiResponse }]
        });

        return aiResponse;
    } catch (error) {
        console.error('Gemini API Error:', error);
        updateStatus('Error - Check API key');
        return "I'm having trouble thinking right now. Could you try again?";
    }
}

// ========================================
// ElevenLabs API Integration
// ========================================

async function textToSpeech(text) {
    if (!voiceEnabled) return null;

    try {
        updateStatus('Generating voice...');

        const response = await fetch(
            `${CONFIG.ELEVENLABS_API_URL}/${CONFIG.ELEVENLABS_VOICE_ID}`,
            {
                method: 'POST',
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': CONFIG.ELEVENLABS_API_KEY
                },
                body: JSON.stringify({
                    text: text,
                    model_id: 'eleven_monolingual_v1',
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75
                    }
                })
            }
        );

        if (!response.ok) {
            throw new Error(`ElevenLabs API error: ${response.status}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        return audioUrl;
    } catch (error) {
        console.error('ElevenLabs API Error:', error);
        updateStatus('Voice generation failed');
        return null;
    }
}

async function playAudio(audioUrl) {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }

    currentAudio = new Audio(audioUrl);
    
    currentAudio.onplay = () => {
        updateStatus('Speaking...');
        animateMouthFromAudio(currentAudio);
    };

    currentAudio.onended = () => {
        stopMouthAnimation();
        updateStatus('Ready');
        currentAudio = null;
    };

    try {
        await currentAudio.play();
    } catch (error) {
        console.error('Audio playback error:', error);
        updateStatus('Ready');
    }
}

// ========================================
// UI Handlers
// ========================================

function addMessageToChat(text, isUser = false) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
    
    const p = document.createElement('p');
    p.textContent = text;
    messageDiv.appendChild(p);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function updateStatus(status) {
    document.getElementById('status').textContent = status;
}

async function handleUserMessage() {
    const input = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const userMessage = input.value.trim();

    if (!userMessage) return;

    // Disable input
    input.disabled = true;
    sendButton.disabled = true;
    input.value = '';

    // Add user message to chat
    addMessageToChat(userMessage, true);

    try {
        // Get AI response from Gemini
        const aiResponse = await sendToGemini(userMessage);
        
        // Add AI response to chat
        addMessageToChat(aiResponse, false);

        // Generate and play voice
        if (voiceEnabled) {
            const audioUrl = await textToSpeech(aiResponse);
            if (audioUrl) {
                await playAudio(audioUrl);
            }
        } else {
            updateStatus('Ready');
        }
    } catch (error) {
        console.error('Error handling message:', error);
        addMessageToChat('Sorry, something went wrong. Please try again.', false);
        updateStatus('Error');
    } finally {
        // Re-enable input
        input.disabled = false;
        sendButton.disabled = false;
        input.focus();
    }
}

// ========================================
// Event Listeners
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize 3D scene
    init3DScene();

    // Send button
    document.getElementById('sendButton').addEventListener('click', handleUserMessage);

    // Enter key to send
    document.getElementById('userInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleUserMessage();
        }
    });

    // Voice toggle
    document.getElementById('voiceToggle').addEventListener('click', () => {
        voiceEnabled = !voiceEnabled;
        const voiceIcon = document.getElementById('voiceIcon');
        const voiceToggle = document.getElementById('voiceToggle');
        
        if (voiceEnabled) {
            voiceIcon.textContent = '🔊';
            voiceToggle.innerHTML = '<span id="voiceIcon">🔊</span> Voice: ON';
        } else {
            voiceIcon.textContent = '🔇';
            voiceToggle.innerHTML = '<span id="voiceIcon">🔇</span> Voice: OFF';
        }
    });

    console.log('Dating Simulator initialized!');
});

// API Configuration
const CONFIG = {
    // Gemini API Configuration
    GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY_HERE',
    GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',

    // ElevenLabs API Configuration
    ELEVENLABS_API_KEY: 'YOUR_ELEVENLABS_API_KEY_HERE',
    ELEVENLABS_VOICE_ID: 'YOUR_VOICE_ID_HERE', // You can get this from ElevenLabs dashboard
    ELEVENLABS_API_URL: 'https://api.elevenlabs.io/v1/text-to-speech',

    // 3D Model Configuration
    // You can use a Ready Player Me avatar or any GLB/GLTF model
    MODEL_URL: 'https://models.readyplayer.me/YOUR_MODEL_ID.glb',
    // Alternative: Use a local model file
    // MODEL_URL: './models/character.glb',

    // Character Configuration
    CHARACTER_NAME: 'Alex',
    CHARACTER_PERSONALITY: 'You are a friendly, charming person on a date. Be flirty, engaging, and ask questions to get to know the user better.',
};

// Export for use in main.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

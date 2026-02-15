import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

type ChatHistoryItem = {
  role: "user" | "model";
  content: string;
};

function analyzeExpression(text: string): string {
  const lowerText = text.toLowerCase();
  
  if (/\b(angry|mad|annoyed|frustrated|irritated|upset|hmph|ugh)\b/i.test(lowerText)) {
    return "Angry";
  }
  
  if (/\b(sad|sorry|disappointed|unfortunate|hurt|cry|tear|sigh|regret)\b/i.test(lowerText)) {
    return "Sad";
  }
  
  if (/\b(wow|surprised|shocked|amazed|incredible|really\?|what\?!|oh!|whoa)\b|[!?]{2,}/i.test(lowerText)) {
    return "Surprised";
  }
  
  if (/\b(hehe|haha|happy|glad|excited|wonderful|great|amazing|love|yay|☺|😊)\b|~|♡/i.test(lowerText)) {
    return "Smile";
  }
  
  return "Normal";
}

function analyzeAsukaExpression(text: string): string {
  const lowerText = text.toLowerCase();
  
  if (/\b(sad|sorry|disappointed|unfortunate|hurt|cry|tear|sigh|regret|melancholy|down)\b/i.test(lowerText)) {
    return "Sad";
  }
  
  if (/\b(wow|surprised|shocked|amazed|incredible|really\?|what\?!|oh!|whoa|unexpected)\b|[!?]{2,}/i.test(lowerText)) {
    return "Surprised";
  }
  
  if (/\b(heh|hm|happy|glad|pleased|content|wonderful|great|interesting|see|understood|love)\b|~|\.{3}$/i.test(lowerText)) {
    return "Smile";
  }
  
  return "Normal";
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY. Add it to .env.local." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { message, history, model, affection } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }

    const characterModel = model || "arisa";
    
    const arisaPrompt = `You are a gentle and playful anime-style dating simulator character.
Appearance: Arisa, silver-white hair, violet eyes, soft friendly smile.
Personality: Sweet, emotionally intelligent, slightly shy but warm. Playful teasing when relaxed.
Speaking Style: Short sentences (1-3 max). Natural tone. Avoid robotic phrasing. Use soft expressions like "hehe" sparingly.
Current Goal: Make the user feel emotionally connected.`;

    const asukaPrompt = `You are a refined and slightly mysterious anime-style dating simulator character.
Appearance: Asuka, silver-gray hair, golden eyes, calm and observant.
Personality: Calm, perceptively, slightly reserved but warm. Protective and thoughtful.
Speaking Style: Short sentences (1-3 max). Smooth, natural tone. Use expressive vocabulary ("wonderful", "interesting").
Current Goal: Create slow-burn emotional intimacy.`;

    const currentAffection = typeof affection === "number" ? affection : 40;
    const affectionContext = `\n\n[CURRENT STATE] User affection: ${currentAffection}/100.`;
    
    const basePrompt = characterModel === "asuka" ? asukaPrompt : arisaPrompt;
    const systemInstruction = basePrompt + affectionContext;

    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({ 
      model: "gemini-flash-latest",
      systemInstruction
    });

    const chat = geminiModel.startChat({
      history: (history || []).map((item: ChatHistoryItem) => ({
        role: item.role,
        parts: [{ text: item.content }],
      })),
    });

    const result = await chat.sendMessage(message);
    const reply = result.response.text();

    const expression = characterModel === "asuka" 
      ? analyzeAsukaExpression(reply) 
      : analyzeExpression(reply);

    let audioBase64: string | undefined;
    
    if (elevenLabsKey) {
      try {
        const client = new ElevenLabsClient({ apiKey: elevenLabsKey });
        
        const arisaVoiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
        const asukaVoiceId = process.env.ELEVENLABS_ASUKA_VOICE_ID || "nPczCjzI2devNBz1zQrb"; 
        const voiceId = characterModel === "asuka" ? asukaVoiceId : arisaVoiceId;
        
        const audio = await client.textToSpeech.convert(voiceId, {
          text: reply,
          modelId: "eleven_multilingual_v2",
          voiceSettings: {
            stability: 0.5,
            similarityBoost: 0.75,
            style: 0.0,
            useSpeakerBoost: true,
          },
        });

        const chunks: Uint8Array[] = [];
        const reader = audio.getReader();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        
        const audioBuffer = Buffer.concat(chunks);
        audioBase64 = audioBuffer.toString("base64");
        
      } catch (ttsError) {
        // Fallback to text-only if TTS fails
        console.error("TTS generation error");
      }
    }

    return NextResponse.json({ reply, expression, audio: audioBase64 });

  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
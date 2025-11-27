// Text-to-Speech utility using Web Speech API

export interface TTSOptions {
    rate?: number;
    pitch?: number;
    volume?: number;
    voiceName?: string;
}

export const speak = (text: string, options: TTSOptions = {}): void => {
    if (!('speechSynthesis' in window)) {
        console.warn('Text-to-Speech not supported in this browser');
        return;
    }

    // Stop any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate || 1.0;
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 1.0;

    // Set voice if specified
    if (options.voiceName) {
        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(v => v.name === options.voiceName);
        if (voice) utterance.voice = voice;
    } else {
        utterance.voice = getPreferredVoice();
    }

    window.speechSynthesis.speak(utterance);
};

export const stopSpeaking = (): void => {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
};

export const isSpeaking = (): boolean => {
    if ('speechSynthesis' in window) {
        return window.speechSynthesis.speaking;
    }
    return false;
};

export const getAvailableVoices = (): SpeechSynthesisVoice[] => {
    if (!('speechSynthesis' in window)) {
        return [];
    }
    return window.speechSynthesis.getVoices();
};

const getPreferredVoice = (): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices();

    // Prefer natural-sounding US English voices
    const preferred = voices.find(v =>
        v.lang.startsWith('en') &&
        (v.name.includes('Natural') || v.name.includes('Premium') || v.name.includes('Enhanced'))
    );

    if (preferred) return preferred;

    // Fallback to any English voice
    const english = voices.find(v => v.lang.startsWith('en'));
    if (english) return english;

    // Last resort: first available voice
    return voices[0] || null;
};

// Initialize voices (some browsers require this)
export const initializeTTS = (): Promise<void> => {
    return new Promise((resolve) => {
        if (!('speechSynthesis' in window)) {
            resolve();
            return;
        }

        // Voices are loaded asynchronously in some browsers
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            resolve();
        } else {
            window.speechSynthesis.onvoiceschanged = () => {
                resolve();
            };
        }
    });
};

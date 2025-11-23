import { useState, useEffect, useCallback, useRef } from 'react';

interface UseSpeechSynthesisProps {
  onEnd?: () => void;
}

const useSpeechSynthesis = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (!synth) return;

    const updateVoices = () => {
      setVoices(synth.getVoices());
    };

    updateVoices();
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = updateVoices;
    }
  }, [synth]);

  const speak = useCallback((text: string, rate: number = 1.0, onEndCallback?: () => void, isMuted: boolean = false) => {
    if (!synth || isMuted) {
        if(onEndCallback) onEndCallback();
        return;
    }

    if (synth.speaking) {
      synth.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance; // Keep reference to prevent GC

    // Try to find a Google Korean voice for better quality
    const koreanVoice = voices.find(v => v.lang === 'ko-KR' && v.name.includes('Google')) || 
                        voices.find(v => v.lang === 'ko-KR');
    
    if (koreanVoice) {
      utterance.voice = koreanVoice;
    }
    
    // Adjust rate/pitch
    utterance.rate = rate; 
    utterance.pitch = 1.0; 

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
        setIsSpeaking(false);
        utteranceRef.current = null;
        if (onEndCallback) onEndCallback();
    };
    
    utterance.onerror = (event) => {
        // Ignore errors caused by cancelling/interrupting speech (e.g. user clicking stop or next)
        if (event.error === 'interrupted' || event.error === 'canceled') {
            setIsSpeaking(false);
            utteranceRef.current = null;
            if (onEndCallback) onEndCallback();
            return;
        }
        
        console.error("Speech synthesis error code:", event.error);
        setIsSpeaking(false);
        utteranceRef.current = null;
        if (onEndCallback) onEndCallback();
    };

    try {
        synth.speak(utterance);
    } catch (e) {
        console.error("Exception calling synth.speak:", e);
        setIsSpeaking(false);
        if (onEndCallback) onEndCallback();
    }
  }, [synth, voices]);

  const cancel = useCallback(() => {
    if (synth) {
      synth.cancel();
      setIsSpeaking(false);
    }
  }, [synth]);

  useEffect(() => {
    return () => {
      if (synth) {
        synth.cancel();
      }
    };
  }, [synth]);

  return { isSpeaking, speak, cancel };
};

export default useSpeechSynthesis;
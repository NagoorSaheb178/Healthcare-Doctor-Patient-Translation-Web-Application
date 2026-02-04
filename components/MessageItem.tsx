
import React, { useState, useRef } from 'react';
import { Message, Role } from '../types';
import { Play, Pause, User, Stethoscope, Globe, Check, Clock } from 'lucide-react';

interface Props {
  message: Message;
  currentUserRole: Role;
  searchQuery?: string;
}

const MessageItem: React.FC<Props> = ({ message, currentUserRole, searchQuery = '' }) => {
  const isMine = message.senderRole === currentUserRole;
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggleAudio = async () => {
    if (!message.audioUrl) return;

    try {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        if (!audioRef.current) {
          audioRef.current = new Audio(message.audioUrl);
          audioRef.current.onended = () => setIsPlaying(false);
          audioRef.current.onerror = () => {
            setIsPlaying(false);
            alert("Audio format error.");
          };
        }
        setIsPlaying(true);
        await audioRef.current.play();
      }
    } catch (error) {
      setIsPlaying(false);
    }
  };

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase()
            ? <mark key={i} className="bg-yellow-200 text-slate-900 rounded-sm px-0.5 animate-pulse">{part}</mark>
            : part
        )}
      </span>
    );
  };

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} group animate-slide-up px-2 mb-8 last:mb-0`}>
      <div className={`flex gap-3 sm:gap-6 max-w-[98%] sm:max-w-[85%] ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-[1.25rem] sm:rounded-[1.5rem] flex items-center justify-center flex-shrink-0 mt-1 shadow-lg transition-all group-hover:scale-110 group-hover:rotate-3 ${message.senderRole === 'doctor' ? 'bg-[#534df2] text-white' : 'bg-emerald-600 text-white'
          }`}>
          {message.senderRole === 'doctor' ? <Stethoscope className="w-5 h-5 sm:w-7 sm:h-7" /> : <User className="w-5 h-5 sm:w-7 sm:h-7" />}
        </div>

        <div className="flex flex-col space-y-2">
          {/* Main Bubble */}
          <div className={`rounded-[2rem] sm:rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] relative overflow-hidden transition-all border group-hover:shadow-[0_30px_70px_rgba(0,0,0,0.08)] ${isMine
              ? 'bg-[#534df2] text-white border-indigo-400/20 rounded-tr-none'
              : 'bg-white text-slate-800 border-slate-100 rounded-tl-none'
            }`}>
            {/* Header / Meta */}
            <div className={`px-6 pt-5 pb-3 flex items-center gap-3 border-b ${isMine ? 'border-white/10' : 'border-slate-50'}`}>
              <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isMine ? 'text-white/60' : 'text-slate-400'}`}>
                {message.sourceLang.toUpperCase()} INPUT
              </span>
              <div className={`w-1 h-1 rounded-full ${isMine ? 'bg-white/20' : 'bg-slate-200'}`}></div>
              <span className={`text-[9px] font-bold flex items-center gap-1 ${isMine ? 'text-white/60' : 'text-slate-400'}`}>
                <Clock className="w-2.5 h-2.5" />
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {isMine && <Check className="w-3 h-3 text-white/50 ml-auto" />}
            </div>

            {/* Original Text Content */}
            <div className="px-6 sm:px-8 py-5 sm:py-7">
              <p className="text-base sm:text-xl font-semibold leading-[1.4] tracking-tight">
                {highlightText(message.originalText, searchQuery)}
              </p>

              {message.audioUrl && (
                <div className={`mt-5 flex items-center gap-4 p-4 rounded-3xl transition-all border ${isMine ? 'bg-white/10 border-white/10 hover:bg-white/15' : 'bg-slate-50 border-slate-100 hover:bg-slate-100/50'
                  }`}>
                  <button
                    onClick={toggleAudio}
                    className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all shadow-md active:scale-95 ${isMine ? 'bg-white text-[#534df2]' : 'bg-[#534df2] text-white'
                      }`}
                  >
                    {isPlaying ? <Pause className="w-6 h-6" fill="currentColor" /> : <Play className="w-6 h-6" fill="currentColor" />}
                  </button>
                  <div className="flex-1">
                    <div className={`h-1 rounded-full w-full relative overflow-hidden mb-1.5 ${isMine ? 'bg-white/20' : 'bg-slate-200'}`}>
                      <div className={`h-full rounded-full transition-all duration-300 ${isMine ? 'bg-white/80' : 'bg-[#534df2]'} ${isPlaying ? 'w-full' : 'w-0'}`}></div>
                    </div>
                    <span className={`text-[8px] font-black uppercase tracking-[0.15em] block ${isMine ? 'text-white/70' : 'text-slate-400'}`}>
                      Clinical Audio Recording
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Integrated Translation - ONLY if translation exists */}
            {message.translatedText && (
              <div className={`px-6 sm:px-8 py-6 sm:py-8 border-t ${isMine
                  ? 'bg-black/5 border-white/10'
                  : 'bg-indigo-50/30 border-slate-50'
                }`}>
                <div className="flex items-start gap-4">
                  <Globe className={`w-4 h-4 flex-shrink-0 mt-1 ${isMine ? 'text-white/40' : 'text-indigo-400'}`} />
                  <div className="space-y-2">
                    <span className={`text-[9px] font-black uppercase tracking-[0.2em] block ${isMine ? 'text-white/50' : 'text-indigo-600/60'}`}>
                      Neural Output ({message.targetLang.toUpperCase()})
                    </span>
                    <p className={`text-base sm:text-xl font-bold leading-[1.4] tracking-tight italic ${isMine ? 'text-white/90' : 'text-indigo-900'}`}>
                      {highlightText(message.translatedText, searchQuery)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageItem;


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
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} group animate-slide-up px-1 sm:px-2 mb-6 sm:mb-8 last:mb-0`}>
      <div className={`flex gap-2 sm:gap-4 max-w-[95%] sm:max-w-[85%] ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-[1rem] sm:rounded-[1.25rem] flex items-center justify-center flex-shrink-0 mt-1 shadow-md transition-all group-hover:scale-105 ${message.senderRole === 'doctor' ? 'bg-[#534df2] text-white' : 'bg-emerald-600 text-white'
          }`}>
          {message.senderRole === 'doctor' ? <Stethoscope className="w-4 h-4 sm:w-6 sm:h-6" /> : <User className="w-4 h-4 sm:w-6 sm:h-6" />}
        </div>


        <div className="flex flex-col space-y-1.5">
          {/* Main Bubble */}
          <div className={`rounded-[1.5rem] sm:rounded-[2rem] shadow-sm relative overflow-hidden transition-all border backdrop-blur-md ${isMine
            ? 'bg-[#534df2]/95 text-white border-indigo-400/20 rounded-tr-none'
            : 'bg-white/90 text-slate-800 border-slate-200/50 shadow-[0_10px_30px_rgba(0,0,0,0.03)] rounded-tl-none'
            }`}>
            {/* Header / Meta */}
            <div className={`px-4 sm:px-6 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3 border-b ${isMine ? 'border-white/10' : 'border-slate-100'}`}>
              <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest ${isMine ? 'text-white/60' : 'text-slate-400'}`}>
                {message.sourceLang.toUpperCase()} INPUT
              </span>
              <div className={`w-1 h-1 rounded-full ${isMine ? 'bg-white/20' : 'bg-slate-200'}`}></div>
              <span className={`text-[8px] sm:text-[9px] font-bold flex items-center gap-1 ${isMine ? 'text-white/60' : 'text-slate-400'}`}>
                <Clock className="w-2.5 h-2.5" />
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {isMine && <Check className="w-3 h-3 text-white/50 ml-auto" />}
            </div>


            {/* Original Text Content */}
            <div className="px-4 sm:px-7 py-4 sm:py-6">
              <p className="text-[15px] sm:text-lg font-medium leading-relaxed tracking-tight">
                {highlightText(message.originalText, searchQuery)}
              </p>

              {message.audioUrl && (
                <div className={`mt-4 flex items-center gap-3 p-3 sm:p-4 rounded-2xl transition-all border ${isMine ? 'bg-white/10 border-white/10' : 'bg-slate-50 border-slate-100'
                  }`}>
                  <button
                    onClick={toggleAudio}
                    className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl sm:rounded-2xl transition-all shadow-sm active:scale-95 ${isMine ? 'bg-white text-[#534df2]' : 'bg-[#534df2] text-white'
                      }`}
                  >
                    {isPlaying ? <Pause className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" /> : <Play className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" />}
                  </button>
                  <div className="flex-1">
                    <div className={`h-1 rounded-full w-full relative overflow-hidden mb-1 ${isMine ? 'bg-white/20' : 'bg-indigo-100'}`}>
                      <div className={`h-full rounded-full transition-all duration-300 ${isMine ? 'bg-white/80' : 'bg-[#534df2]'} ${isPlaying ? 'w-full' : 'w-0'}`}></div>
                    </div>
                    <span className={`text-[7px] sm:text-[8px] font-black uppercase tracking-widest block opacity-60 ${isMine ? 'text-white' : 'text-slate-400'}`}>
                      Voice Transcript
                    </span>
                  </div>
                </div>
              )}
            </div>


            {/* Integrated Translation - ONLY if translation exists */}
            {message.translatedText && (
              <div className={`px-4 sm:px-7 py-4 sm:py-6 border-t ${isMine
                ? 'bg-black/10 border-white/10'
                : 'bg-indigo-50/50 border-slate-100'
                }`}>
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl shrink-0 ${isMine ? 'bg-white/10' : 'bg-indigo-100'}`}>
                    <Globe className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isMine ? 'text-white' : 'text-indigo-600'}`} />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest block ${isMine ? 'text-white/50' : 'text-indigo-600/60'}`}>
                      Translation • {message.targetLang.toUpperCase()}
                    </span>
                    <p className={`text-[15px] sm:text-xl font-bold leading-relaxed tracking-tight ${isMine ? 'text-white/95' : 'text-indigo-950'}`}>
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

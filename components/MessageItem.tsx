
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
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} group animate-slide-up px-2`}>
      <div className={`flex gap-4 sm:gap-8 max-w-[96%] sm:max-w-[88%] ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-[1.75rem] sm:rounded-[2rem] flex items-center justify-center flex-shrink-0 mt-2 shadow-2xl transition-transform group-hover:scale-110 ${
          message.senderRole === 'doctor' ? 'bg-[#534df2] text-white' : 'bg-emerald-600 text-white'
        }`}>
          {message.senderRole === 'doctor' ? <Stethoscope className="w-6 h-6 sm:w-8 sm:h-8" /> : <User className="w-6 h-6 sm:w-8 sm:h-8" />}
        </div>

        <div className="space-y-4">
          {/* Main Bubble */}
          <div className={`p-6 sm:p-9 rounded-[2.5rem] sm:rounded-[3rem] shadow-xl relative overflow-hidden transition-all group-hover:shadow-2xl ${
            isMine 
              ? 'bg-[#534df2] text-white rounded-tr-none' 
              : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
          }`}>
            <div className="flex items-center gap-3 mb-4 opacity-60">
              <span className="text-[10px] font-black uppercase tracking-[0.25em]">
                {message.sourceLang.toUpperCase()} INPUT
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-current opacity-30"></div>
              <span className="text-[10px] font-bold flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {isMine && <Check className="w-3.5 h-3.5 text-white/70 ml-auto" />}
            </div>

            <p className="text-lg sm:text-2xl font-bold leading-[1.3] tracking-tight mb-4">
              {highlightText(message.originalText, searchQuery)}
            </p>

            {message.audioUrl && (
              <div className={`mt-6 flex items-center gap-5 p-5 rounded-[2rem] transition-all bg-white/10 border border-white/10 hover:bg-white/20`}>
                <button 
                  onClick={toggleAudio}
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-[1.5rem] sm:rounded-[1.75rem] flex items-center justify-center transition-all transform active:scale-95 shadow-2xl bg-white text-[#534df2]`}
                >
                  {isPlaying ? <Pause className="w-8 h-8 sm:w-10 sm:h-10" fill="currentColor" /> : <Play className="w-8 h-8 sm:w-10 sm:h-10" fill="currentColor" />}
                </button>
                <div className="flex-1 space-y-2">
                   <div className="h-1.5 rounded-full w-full bg-white/20 relative overflow-hidden">
                     <div className={`h-full rounded-full transition-all duration-300 bg-white/80 ${isPlaying ? 'w-full translate-x-0' : 'w-0 -translate-x-full'}`}></div>
                   </div>
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] block text-white/90">
                     Clinical Audio Clip
                   </span>
                </div>
              </div>
            )}
          </div>

          {/* Translation Bubble */}
          {message.translatedText && (
            <div className={`p-7 sm:p-10 rounded-[2.5rem] sm:rounded-[3rem] border flex gap-5 transform transition-all shadow-xl hover:-translate-y-1 ${
              isMine 
                ? 'bg-slate-50/80 border-slate-200 text-slate-500 ml-10 sm:ml-16' 
                : 'bg-indigo-50/50 border-indigo-100/60 text-indigo-900 mr-10 sm:mr-16'
            }`}>
              <Globe className={`w-6 h-6 flex-shrink-0 mt-1.5 ${isMine ? 'text-slate-300' : 'text-indigo-400'}`} />
              <div className="space-y-3">
                <span className={`text-[10px] font-black uppercase tracking-[0.3em] block opacity-40`}>
                  Neural Bridge Output ({message.targetLang.toUpperCase()})
                </span>
                <p className="text-lg sm:text-2xl italic font-bold leading-[1.4] tracking-tight">
                  {highlightText(message.translatedText, searchQuery)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageItem;


import React, { useState, useRef } from 'react';
import { Message, Role } from '../types';
import { Play, Pause, User, Stethoscope, Globe, Check, Clock, Languages, FileText } from 'lucide-react';

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
            ? <mark key={i} className="bg-yellow-300 text-slate-900 rounded-sm px-1 shadow-sm font-bold">{part}</mark>
            : part
        )}
      </span>
    );
  };

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} group animate-slide-up px-2 sm:px-4 mb-6 sm:mb-8`}>
      <div className={`flex gap-3 sm:gap-4 max-w-[95%] sm:max-w-[80%] ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 mt-2 shadow-lg transition-transform duration-300 group-hover:scale-110 border-2 ${
          message.senderRole === 'doctor' 
            ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-white' 
            : 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white border-white'
        }`}>
          {message.senderRole === 'doctor' ? <Stethoscope className="w-4 h-4 sm:w-5 sm:h-5" /> : <User className="w-4 h-4 sm:w-5 sm:h-5" />}
        </div>

        <div className="flex flex-col space-y-2 w-full">
          {/* Sender Label for Received Messages */}
          {!isMine && (
             <div className="flex items-center gap-2 pl-2">
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                 {message.senderRole}
               </span>
               <span className="text-[10px] text-slate-300 font-medium flex items-center gap-1">
                 <Clock className="w-3 h-3" />
                 {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
               </span>
             </div>
          )}

          {/* Main Bubble */}
          {message.type === 'document-summary' ? (
            currentUserRole === 'doctor' ? (
              <div className="bg-white border-2 border-indigo-100 rounded-3xl p-5 sm:p-6 shadow-md max-w-lg w-full relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-400 to-purple-500"></div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2">
                      Document Analysis
                      <span className="bg-amber-100 text-amber-700 text-[8px] px-2 py-0.5 rounded-full uppercase tracking-widest font-black">Private</span>
                    </h4>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{message.fileName || "Uploaded File"}</p>
                  </div>
                </div>
                <div className="bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-100 text-[13px] sm:text-sm font-medium text-slate-700 leading-relaxed break-words">
                  {message.translatedText ? highlightText(message.translatedText, searchQuery) : (
                    <span className="flex items-center gap-2 text-indigo-500"><div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div> Summarizing...</span>
                  )}
                </div>
              </div>
            ) : (
              <div className={`rounded-3xl shadow-sm relative transition-all duration-300 px-5 py-4 ${
                isMine
                  ? 'bg-gradient-to-br from-indigo-500 to-[#534df2] text-white rounded-br-sm'
                  : 'bg-white text-slate-800 border border-slate-100 rounded-bl-sm'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${isMine ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold tracking-tight">Uploaded Document</p>
                    <p className={`text-[10px] font-medium opacity-80 uppercase tracking-wider`}>{message.fileName}</p>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className={`rounded-3xl shadow-sm relative transition-all duration-300 group-hover:shadow-md ${
              isMine
                ? 'bg-gradient-to-br from-indigo-500 to-[#534df2] text-white rounded-br-sm'
                : 'bg-white text-slate-800 border border-slate-100 rounded-bl-sm'
            }`}>
              
              {/* Input Header (Mine Only) */}
              {isMine && (
                <div className="px-5 py-2.5 flex items-center gap-2 border-b border-white/10 bg-white/5 rounded-t-3xl">
                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-100/70">
                    {message.sourceLang}
                  </span>
                  <div className="w-1 h-1 rounded-full bg-white/20"></div>
                  <span className="text-[9px] font-bold text-indigo-100/70 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <Check className="w-3.5 h-3.5 text-indigo-200 ml-auto" />
                </div>
              )}
  
              {/* Main Text */}
              <div className={`px-4 sm:px-5 py-3 sm:py-4 break-words ${!isMine && !message.translatedText ? 'pt-4' : ''}`}>
                <p className={`text-[15px] sm:text-[17px] leading-relaxed font-medium ${isMine ? 'text-white' : 'text-slate-700'}`}>
                  {isMine || !message.translatedText
                    ? highlightText(message.originalText, searchQuery)
                    : highlightText(message.translatedText, searchQuery)}
                </p>
  
                {/* Audio Player */}
                {message.audioUrl && (
                  <div className={`mt-4 flex items-center gap-3 p-2 sm:p-3 rounded-2xl transition-all border ${
                    isMine ? 'bg-white/10 border-white/10 hover:bg-white/20' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                  }`}>
                    <button
                      onClick={toggleAudio}
                      className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all shadow-sm active:scale-95 ${
                        isMine ? 'bg-white text-indigo-600' : 'bg-indigo-50 text-indigo-600'
                      }`}
                    >
                      {isPlaying ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5" fill="currentColor" />}
                    </button>
                    <div className="flex-1 pr-2">
                      <div className={`h-1.5 rounded-full w-full relative overflow-hidden mb-1.5 ${isMine ? 'bg-indigo-300/30' : 'bg-slate-200'}`}>
                        <div className={`h-full rounded-full transition-all duration-300 ease-linear ${isMine ? 'bg-white' : 'bg-indigo-500'} ${isPlaying ? 'w-full' : 'w-0'}`}></div>
                      </div>
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${isMine ? 'text-indigo-100' : 'text-slate-400'}`}>
                        {isPlaying ? 'Playing...' : 'Voice Note'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageItem;


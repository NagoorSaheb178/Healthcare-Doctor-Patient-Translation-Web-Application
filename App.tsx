
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Mic, 
  Send, 
  Search, 
  User, 
  Stethoscope, 
  Globe, 
  FileText, 
  Trash2,
  Loader2,
  X,
  Languages,
  ArrowRightLeft,
  ChevronRight,
  ShieldCheck,
  Zap,
  RefreshCcw,
  Menu,
  MessageSquare,
  Clock
} from 'lucide-react';
import { Role, Message, Language, ConversationSummary } from './types';
import { puterService } from './puterService';
import MessageItem from './components/MessageItem';
import SummaryModal from './components/SummaryModal';

const LANGUAGES: Language[] = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'de', name: 'German' },
  { code: 'pt', name: 'Portuguese' },
];

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [doctorLang, setDoctorLang] = useState('en');
  const [patientLang, setPatientLang] = useState('es');
  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<ConversationSummary | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');

  // Refs to avoid stale closures and manage hardware
  const roleRef = useRef<Role | null>(null);
  const doctorLangRef = useRef('en');
  const patientLangRef = useRef('es');
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const isActuallyRecording = useRef(false);
  const transcriptRef = useRef('');

  useEffect(() => {
    roleRef.current = currentRole;
    doctorLangRef.current = doctorLang;
    patientLangRef.current = patientLang;
  }, [currentRole, doctorLang, patientLang]);

  // STT Initialization
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalSegment = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalSegment += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        if (finalSegment) {
          transcriptRef.current += finalSegment;
          setInputValue(transcriptRef.current);
        }
        setLiveTranscript(interimTranscript);
      };

      recognitionRef.current.onend = () => {
        if (isActuallyRecording.current) {
          try { recognitionRef.current.start(); } catch (e) {}
        }
      };
    }
  }, []);

  // History Sync (Conversation Logging)
  useEffect(() => {
    const saved = localStorage.getItem('medbridge_history');
    if (saved) {
      try { setMessages(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('medbridge_history', JSON.stringify(messages));
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (text: string, audioData?: string) => {
    const trimmedText = text.trim();
    if (!trimmedText && !audioData) return;

    const dLang = doctorLangRef.current;
    const pLang = patientLangRef.current;
    const sLangCode = roleRef.current === 'doctor' ? dLang : pLang;
    const tLangCode = roleRef.current === 'doctor' ? pLang : dLang;

    const sLangName = LANGUAGES.find(l => l.code === sLangCode)?.name || sLangCode;
    const tLangName = LANGUAGES.find(l => l.code === tLangCode)?.name || tLangCode;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderRole: roleRef.current || 'patient',
      originalText: trimmedText || (audioData ? "[Voice Message]" : ""),
      audioUrl: audioData,
      timestamp: Date.now(),
      sourceLang: sLangCode,
      targetLang: tLangCode
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue('');
    setIsTranslating(true);

    try {
      if (trimmedText && sLangCode !== tLangCode) {
        const translated = await puterService.translate(trimmedText, sLangCode, tLangCode, sLangName, tLangName);
        setMessages(prev => prev.map(m => 
          m.id === newMessage.id ? { ...m, translatedText: translated } : m
        ));
      }
    } finally {
      setIsTranslating(false);
    }
  };

  const startRecording = async () => {
    if (isActuallyRecording.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      mediaRecorder.current = new MediaRecorder(stream, { mimeType });
      audioChunks.current = [];
      mediaRecorder.current.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.current.push(e.data); };
      mediaRecorder.current.start();

      transcriptRef.current = '';
      if (recognitionRef.current) {
        recognitionRef.current.lang = roleRef.current === 'doctor' ? doctorLangRef.current : patientLangRef.current;
        try { recognitionRef.current.start(); } catch (e) {}
      }
      isActuallyRecording.current = true;
      setIsRecording(true);
      setLiveTranscript('Neural Bridge Active...');
    } catch (err) {
      alert("Please allow microphone access for real-time translation.");
    }
  };

  const stopRecording = () => {
    if (!isActuallyRecording.current) return;
    isActuallyRecording.current = false;
    setIsRecording(false);
    
    if (mediaRecorder.current?.state !== 'inactive') mediaRecorder.current?.stop();
    if (recognitionRef.current) try { recognitionRef.current.stop(); } catch (e) {}
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    const capturedText = transcriptRef.current || liveTranscript;

    setTimeout(async () => {
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const audioBlob = audioChunks.current.length > 0 ? new Blob(audioChunks.current, { type: mimeType }) : null;
      const audioData = audioBlob ? await blobToBase64(audioBlob) : undefined;
      
      if (capturedText.trim() || audioData) {
        handleSendMessage(capturedText, audioData);
      }
      transcriptRef.current = '';
      setLiveTranscript('');
      setInputValue('');
    }, 400);
  };

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    return messages.filter(m => 
      m.originalText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.translatedText && m.translatedText.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [messages, searchQuery]);

  const generateSummary = async () => {
    if (messages.length === 0) return;
    setIsSummarizing(true);
    try {
      const res = await puterService.summarize(messages);
      setSummary(res);
    } catch (e) {
      alert("Error generating summary. Please check your internet connection.");
    } finally {
      setIsSummarizing(false);
    }
  };

  // Fix: Added missing handleSwitchRole function to allow role switching.
  const handleSwitchRole = () => {
    setCurrentRole(null);
  };

  if (!currentRole) {
    return (
      <div className="h-screen bg-slate-50 flex items-center justify-center p-6 font-sans relative overflow-hidden">
        {/* Abstract Background Decoration */}
        <div className="absolute top-[-20%] right-[-10%] w-[70%] h-[70%] bg-indigo-50 rounded-full blur-[150px] opacity-60"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-50 rounded-full blur-[120px] opacity-40"></div>

        <div className="max-w-md w-full bg-white rounded-[4rem] shadow-[0_50px_100px_rgba(15,23,42,0.08)] p-12 text-center animate-zoom-in relative z-10 border border-white/80">
          <div className="bg-[#534df2] w-28 h-28 rounded-[3rem] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-indigo-200 ring-8 ring-indigo-50 animate-pulse-soft">
            <Stethoscope className="w-14 h-14 text-white" />
          </div>
          <h1 className="text-5xl font-black text-slate-900 mb-4 tracking-tighter">MedBridge AI</h1>
          <p className="text-slate-500 mb-14 text-sm font-medium leading-relaxed max-w-[280px] mx-auto">
            Professional medical translation bridge. Select your role to begin.
          </p>
          
          <div className="space-y-5">
            <button onClick={() => setCurrentRole('doctor')} className="w-full group flex items-center justify-between p-7 bg-slate-50/50 hover:bg-white rounded-[2.75rem] border-2 border-transparent hover:border-indigo-600/10 transition-all text-left shadow-sm hover:shadow-2xl transform hover:scale-[1.03] active:scale-[0.98]">
              <div className="flex items-center gap-6">
                <div className="bg-[#534df2] p-4 rounded-3xl text-white shadow-xl">
                  <Stethoscope className="w-9 h-9" />
                </div>
                <div>
                  <span className="block font-black text-slate-900 text-2xl">Doctor</span>
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Provider Portal</span>
                </div>
              </div>
              <ChevronRight className="w-7 h-7 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
            </button>

            <button onClick={() => setCurrentRole('patient')} className="w-full group flex items-center justify-between p-7 bg-slate-50/50 hover:bg-white rounded-[2.75rem] border-2 border-transparent hover:border-emerald-600/10 transition-all text-left shadow-sm hover:shadow-2xl transform hover:scale-[1.03] active:scale-[0.98]">
              <div className="flex items-center gap-6">
                <div className="bg-emerald-600 p-4 rounded-3xl text-white shadow-xl">
                  <User className="w-9 h-9" />
                </div>
                <div>
                  <span className="block font-black text-slate-900 text-2xl">Patient</span>
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Patient Bridge</span>
                </div>
              </div>
              <ChevronRight className="w-7 h-7 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
            </button>
          </div>

          <div className="mt-14 flex items-center justify-center gap-2.5 text-[10px] text-slate-300 font-black uppercase tracking-[0.3em]">
            <ShieldCheck className="w-4 h-4 text-emerald-500" /> HIPAA SECURE CHANNEL
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900 animate-fade-in">
      {isSidebarOpen && <div className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40" onClick={() => setIsSidebarOpen(false)} />}
      
      <aside className={`
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0 fixed lg:static inset-y-0 left-0 w-[85vw] sm:w-80 bg-white border-r border-slate-100 z-50 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-2xl lg:shadow-none
      `}>
        <div className="p-8 h-full flex flex-col">
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-4">
              <div className="bg-[#534df2] p-3 rounded-2xl shadow-xl">
                <Stethoscope className="text-white w-6 h-6" />
              </div>
              <h1 className="text-2xl font-black tracking-tighter">MedBridge</h1>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-3 hover:bg-slate-50 rounded-full">
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>

          <div className="space-y-12 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {/* SEARCH LOGS */}
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Search Records</label>
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                <input type="text" placeholder="Search keywords..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-sm font-semibold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 focus:bg-white transition-all outline-none" />
              </div>
            </div>

            {/* SETTINGS */}
            <div className="space-y-6">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Language Matrix</label>
              <div className="space-y-6 bg-slate-50/50 p-6 rounded-[2.5rem] border border-slate-100">
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Provider</span>
                    <Languages className="w-3 h-3 text-indigo-400" />
                  </div>
                  <select value={doctorLang} onChange={(e) => setDoctorLang(e.target.value)} className="w-full p-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold shadow-sm outline-none cursor-pointer hover:border-indigo-500 transition-colors">
                    {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                  </select>
                </div>
                <div className="flex justify-center"><ArrowRightLeft className="w-4 h-4 text-slate-300" /></div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Receiver</span>
                    <Globe className="w-3 h-3 text-emerald-400" />
                  </div>
                  <select value={patientLang} onChange={(e) => setPatientLang(e.target.value)} className="w-full p-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold shadow-sm outline-none cursor-pointer hover:border-emerald-500 transition-colors">
                    {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <button onClick={generateSummary} disabled={messages.length === 0 || isSummarizing} className="w-full flex items-center justify-center gap-3 py-5 px-4 bg-[#534df2] hover:bg-indigo-700 disabled:bg-slate-200 text-white rounded-[2rem] font-black uppercase tracking-widest text-[11px] transition-all shadow-2xl shadow-indigo-100 active:scale-[0.98]">
              {isSummarizing ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
              Generate Clinical Summary
            </button>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-50 space-y-2">
            <button onClick={handleSwitchRole} className="w-full flex items-center gap-3 text-indigo-600 hover:bg-indigo-50 text-[11px] font-black py-4 px-5 rounded-2xl transition-all uppercase tracking-[0.2em]">
              <RefreshCcw className="w-4 h-4" /> Switch Professional Role
            </button>
            <button onClick={() => { if(confirm("Clear conversation logs?")) { setMessages([]); localStorage.removeItem('medbridge_history'); setSearchQuery(''); }}} className="w-full flex items-center gap-3 text-slate-400 hover:text-red-600 hover:bg-red-50 text-[11px] font-black py-4 px-5 rounded-2xl transition-all uppercase tracking-[0.2em]">
              <Trash2 className="w-4 h-4" /> Purge Chat History
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-white lg:rounded-l-[4.5rem] lg:shadow-2xl transition-all">
        <header className="px-6 sm:px-12 py-6 sm:py-9 flex items-center justify-between border-b border-slate-50 bg-white/95 backdrop-blur-xl z-30 shadow-sm">
          <div className="flex items-center gap-4 sm:gap-8">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl">
              <Menu className="w-6 h-6 text-slate-600" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Active Consultation</h2>
                <div className="hidden sm:flex items-center gap-2 bg-emerald-50 text-emerald-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-100/50">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  Neural Ready
                </div>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-bold uppercase tracking-[0.15em] mt-0.5 flex items-center gap-2">
                <ShieldCheck className="w-3 h-3 text-indigo-400" /> Secure Clinical Bridge • Role: <span className="text-indigo-600 font-black">{currentRole?.toUpperCase()}</span>
              </p>
            </div>
          </div>

          <div className={`hidden sm:flex items-center gap-3 px-8 py-4 rounded-full border shadow-sm transition-all duration-700 ${currentRole === 'doctor' ? 'bg-[#534df2] text-white border-indigo-600 shadow-indigo-100' : 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-100'}`}>
            {currentRole === 'doctor' ? <Stethoscope className="w-5 h-5" /> : <User className="w-5 h-5" />}
            <span className="text-xs font-black uppercase tracking-[0.2em]">{currentRole}</span>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 sm:p-12 lg:p-16 space-y-12 scroll-smooth custom-scrollbar bg-slate-50/10">
          {filteredMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 animate-slide-up">
              <div className="bg-indigo-50/60 p-12 rounded-[4rem] mb-8 animate-pulse-soft shadow-sm border border-indigo-100/50">
                {searchQuery ? <Search className="w-24 h-24 text-indigo-300" /> : <MessageSquare className="w-24 h-24 text-indigo-300" />}
              </div>
              <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">
                {searchQuery ? "No Matches Found" : "Bridge Initialized"}
              </h3>
              <p className="text-slate-400 max-w-sm text-base font-medium leading-relaxed">
                {searchQuery ? `No logs found for "${searchQuery}". Try a different term.` : `Begin speaking or typing. Messages are instantly translated and logged with HIPAA-level privacy.`}
              </p>
            </div>
          ) : (
            filteredMessages.map((msg) => (
              <MessageItem key={msg.id} message={msg} currentUserRole={currentRole} searchQuery={searchQuery} />
            ))
          )}
          {isTranslating && (
            <div className="flex justify-start animate-fade-in pl-2">
              <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 flex items-center gap-5 shadow-xl">
                <div className="flex gap-2">
                  <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.25em]">Neural Path Active...</span>
              </div>
            </div>
          )}
        </div>

        <footer className="px-6 py-6 sm:py-12 sm:px-12 bg-white/70 border-t border-slate-50 relative z-10 backdrop-blur-xl">
          <div className="max-w-4xl mx-auto">
            {isRecording && (
              <div className="mb-8 bg-[#534df2] text-white p-6 sm:p-7 rounded-[2.75rem] flex items-center gap-6 animate-slide-up shadow-[0_25px_60px_-15px_rgba(79,70,229,0.3)] ring-8 ring-indigo-50/50">
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center animate-pulse shrink-0"><Zap className="text-white w-7 h-7" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black uppercase text-indigo-100 tracking-[0.25em] mb-1">Live Voice Stream</p>
                  <p className="text-base sm:text-xl font-bold truncate italic text-white/95">{liveTranscript || "Listening for speech..."}</p>
                </div>
                <button onClick={stopRecording} className="px-8 py-4 bg-white text-indigo-600 text-[11px] font-black uppercase rounded-[1.5rem] hover:bg-slate-50 transition-all shadow-xl active:scale-95 shrink-0">Stop & Send</button>
              </div>
            )}
            
            <div className="flex items-center gap-5 sm:gap-10">
              <div className="flex-1 relative flex items-center">
                <div className="w-full bg-slate-100/40 border border-indigo-500/10 rounded-[3rem] flex items-center transition-all focus-within:border-indigo-500/30 focus-within:bg-white focus-within:shadow-[0_15px_50px_rgba(79,70,229,0.06)] px-3">
                  <textarea 
                    rows={1} 
                    value={inputValue} 
                    onChange={(e) => setInputValue(e.target.value)} 
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(inputValue); }}} 
                    className="flex-1 bg-transparent py-6 sm:py-8 px-8 text-slate-800 font-bold text-base sm:text-xl outline-none resize-none max-h-40 custom-scrollbar" 
                    placeholder={`Clinical input in ${LANGUAGES.find(l => l.code === (currentRole === 'doctor' ? doctorLang : patientLang))?.name}...`} 
                  />
                  <div className="flex-shrink-0 px-2">
                    <button 
                      onClick={() => handleSendMessage(inputValue)} 
                      disabled={!inputValue.trim()} 
                      className="p-5 sm:p-6 bg-[#534df2] text-white rounded-3xl shadow-2xl disabled:bg-slate-200 disabled:shadow-none transition-all transform hover:scale-105 active:scale-95 hover:bg-indigo-700"
                    >
                      <Send className="w-6 h-6 sm:w-7 sm:h-7" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="shrink-0">
                <button 
                  onMouseDown={startRecording} onMouseUp={stopRecording} onMouseLeave={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording} 
                  className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center transition-all transform active:scale-90 shadow-[0_15px_60px_rgba(0,0,0,0.06)] bg-white border border-slate-50 relative group ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-[#534df2]'}`}
                >
                  <Mic className={`w-11 h-11 sm:w-13 sm:h-13 transition-transform ${isRecording ? 'scale-110' : 'group-hover:scale-110'}`} />
                  {isRecording && (
                    <span className="absolute -top-1 -right-1 w-7 h-7 bg-red-500 border-4 border-white rounded-full"></span>
                  )}
                </button>
              </div>
            </div>
            
            <div className="mt-8 flex items-center justify-center gap-6 opacity-30 text-[10px] font-black uppercase tracking-widest pointer-events-none">
              <span className="flex items-center gap-2"><Clock className="w-3 h-3" /> Auto-Logging</span>
              <span className="flex items-center gap-2"><ShieldCheck className="w-3 h-3" /> HIPAA Ready</span>
              <span className="flex items-center gap-2"><Zap className="w-3 h-3" /> Neural Bridge</span>
            </div>
          </div>
        </footer>
        {summary && <SummaryModal summary={summary} onClose={() => setSummary(null)} />}
      </main>
    </div>
  );
}

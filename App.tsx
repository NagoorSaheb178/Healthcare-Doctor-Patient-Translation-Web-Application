
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
  Clock,
  Check,
  Paperclip
} from 'lucide-react';
import { Role, Message, Language, ConversationSummary } from './types';
import { puterService } from './puterService';
import MessageItem from './components/MessageItem';
import SummaryModal from './components/SummaryModal';
import doctorImg from './doctor.jpg';
import patientImg from './patient.jpg';

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
  const [user, setUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    roleRef.current = currentRole;
    doctorLangRef.current = doctorLang;
    patientLangRef.current = patientLang;
  }, [currentRole, doctorLang, patientLang]);

  // STT Initialization
  // Auth & History Sync
  useEffect(() => {
    const initAuth = async () => {
      try {
        const signedIn = await puterService.isSignedIn();
        if (signedIn) {
          const u = await puterService.getUser();
          setUser(u);
          const history = await puterService.loadConversations();
          setMessages(history);
        }
      } catch (e) {
        console.error("Auth init error:", e);
      } finally {
        setIsAuthLoading(false);
      }
    };
    initAuth();
  }, []);

  useEffect(() => {
    if (user) {
      puterService.saveConversations(messages);
    }
  }, [messages, user]);

  // STT Initialization (Previous logic kept)
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
          try { recognitionRef.current.start(); } catch (e) { }
        }
      };
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
        try { recognitionRef.current.start(); } catch (e) { }
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
    if (recognitionRef.current) try { recognitionRef.current.stop(); } catch (e) { }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    const capturedText = transcriptRef.current || liveTranscript;

    setTimeout(async () => {
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const audioBlob = audioChunks.current.length > 0 ? new Blob(audioChunks.current, { type: mimeType }) : null;
      const audioData = audioBlob ? await blobToBase64(audioBlob) : undefined;

      let finalCapturedText = capturedText;

      if (audioBlob) {
        setIsTranslating(true);
        try {
          const file = new File([audioBlob], 'audio.webm', { type: mimeType });
          const sttResult = await puterService.speech2txt(file);
          if (sttResult && sttResult.trim()) {
            finalCapturedText = sttResult.trim();
          }
        } catch (e) {
          console.error("STT error:", e);
          setIsTranslating(false);
        }
      } else {
        handleSendMessage(finalCapturedText);
      }
    }, 300);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';

    const dLang = doctorLangRef.current;
    const pLang = patientLangRef.current;
    const sLangCode = roleRef.current === 'doctor' ? dLang : pLang;
    const tLangCode = roleRef.current === 'doctor' ? pLang : dLang;

    // Read basic text if possible, else just mock
    let fileContent = "";
    if (file.type.includes('pdf') || file.name.endsWith('.pdf')) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        // @ts-ignore
        const pdfjsLib = window['pdfjs-dist/build/pdf'] || window.pdfjsLib;
        if (pdfjsLib) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const numPages = pdf.numPages;
          let fullText = "";
          for (let i = 1; i <= Math.min(numPages, 10); i++) { // Extract up to 10 pages to avoid overload
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += pageText + "\n";
          }
          fileContent = fullText || "PDF parsed but found no text.";
        } else {
          fileContent = "Error: PDF parser not loaded.";
        }
      } catch (err) {
        fileContent = "Failed to parse PDF.";
      }
    } else if (file.type.includes('text')) {
      fileContent = await file.text();
    } else {
      fileContent = "Non-text file. Needs advanced OCR which is not available in basic demo.";
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      senderRole: roleRef.current || 'patient',
      type: 'document-summary',
      fileName: file.name,
      originalText: `Analyzing document: ${file.name}...`,
      timestamp: Date.now(),
      sourceLang: sLangCode,
      targetLang: tLangCode
    };

    setMessages(prev => [...prev, newMessage]);
    setIsTranslating(true);

    try {
      const summaryResult = await puterService.summarizeDocument(file.name, fileContent);
      setMessages(prev => prev.map(m =>
        m.id === newMessage.id ? { ...m, translatedText: summaryResult, originalText: `Document: ${file.name}` } : m
      ));
    } finally {
      setIsTranslating(false);
    }
  };

  const filteredMessages = useMemo(() => {
    let result = messages;

    if (!searchQuery.trim()) return result;
    
    return result.filter(m =>
      m.originalText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.translatedText && m.translatedText.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.fileName && m.fileName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [messages, searchQuery, currentRole]);

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

  const handleSignIn = async () => {
    try {
      const u = await puterService.signIn();
      setUser(u);
      const history = await puterService.loadConversations();
      setMessages(history);
    } catch (e) {
      alert("Failed to sign in. Please try again.");
    }
  };

  const handleSignOut = async () => {
    await puterService.signOut();
    setUser(null);
    setMessages([]);
    setCurrentRole(null);
  };

  if (isAuthLoading) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start sm:justify-center p-4 sm:p-6 font-sans relative overflow-y-auto scroll-smooth custom-scrollbar">
        <div className="w-full max-w-2xl py-8 sm:py-12 flex items-center justify-center">
          <div className="absolute top-[-20%] right-[-10%] w-[70%] h-[70%] bg-indigo-50 rounded-full blur-[150px] opacity-60"></div>
          <div className="w-full bg-white rounded-[2.5rem] sm:rounded-[4rem] shadow-[0_50px_100px_rgba(15,23,42,0.08)] p-6 sm:p-10 md:p-20 text-center animate-zoom-in relative z-10 border border-white/80">
            <div className="bg-[#534df2] w-20 h-20 sm:w-28 sm:h-28 rounded-[2rem] sm:rounded-[3rem] flex items-center justify-center mx-auto mb-6 sm:mb-10 shadow-2xl shadow-indigo-200 ring-4 sm:ring-8 ring-indigo-50 animate-pulse-soft">
              <Stethoscope className="w-10 h-10 sm:w-14 sm:h-14 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-slate-900 mb-3 sm:mb-4 tracking-tighter">MedBridge AI</h1>
            <p className="text-slate-500 mb-10 sm:mb-14 text-xs sm:text-sm font-medium leading-relaxed max-w-[280px] mx-auto">
              Secure HIPAA-ready medical translation bridge.
            </p>
            <button onClick={handleSignIn} className="w-full py-6 px-12 bg-[#534df2] text-white rounded-[2rem] font-black uppercase tracking-widest text-sm hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-200 flex items-center justify-center gap-4 group">
              <ShieldCheck className="w-6 h-6 group-hover:scale-110 transition-transform" />
              Secure Connect with Puter
            </button>
            <div className="mt-12 text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] flex flex-col items-center gap-3">
              <div className="flex items-center gap-3 opacity-60">
                <Check className="w-3 h-3 text-emerald-500" /> AES-256 ENCRYPTION
                <Check className="w-3 h-3 text-emerald-500" /> CLOUD PERSISTENCE
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentRole) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start sm:justify-center p-4 sm:p-6 font-sans relative overflow-y-auto scroll-smooth custom-scrollbar">
        <div className="w-full max-w-2xl py-8 sm:py-12 flex items-center justify-center">
          {/* Abstract Background Decoration */}
          <div className="absolute top-[-20%] right-[-10%] w-[70%] h-[70%] bg-indigo-50 rounded-full blur-[150px] opacity-60"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-50 rounded-full blur-[120px] opacity-40"></div>

          <div className="w-full bg-white rounded-[2.5rem] sm:rounded-[4rem] shadow-[0_50px_100px_rgba(15,23,42,0.08)] p-6 sm:p-10 md:p-20 text-center animate-zoom-in relative z-10 border border-white/80">
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-indigo-100 italic flex items-center justify-center bg-indigo-50 text-indigo-600 font-bold text-xs uppercase">
                {user?.username?.substring(0, 2) || "U"}
              </div>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Welcome, {user?.username}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-black text-slate-900 mb-3 sm:mb-4 tracking-tighter">MedBridge AI</h1>
            <p className="text-slate-500 mb-10 sm:mb-14 text-xs sm:text-sm font-medium leading-relaxed max-w-[280px] mx-auto">
              Select your active session role to continue.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-lg mx-auto">
              <button onClick={() => setCurrentRole('doctor')} className="relative group overflow-hidden flex flex-col items-center justify-center p-6 sm:p-8 bg-white rounded-[2rem] sm:rounded-[3rem] border-2 border-slate-100 hover:border-[#534df2]/30 transition-all duration-300 text-center shadow-sm hover:shadow-2xl transform hover:-translate-y-2">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10 w-24 h-24 sm:w-32 sm:h-32 mb-4 sm:mb-6 rounded-full p-2 bg-indigo-50/50 group-hover:bg-white transition-colors duration-300 shadow-inner group-hover:shadow-xl">
                  <img src={doctorImg} alt="Doctor" className="w-full h-full object-cover rounded-full transform group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute -bottom-2 -right-2 bg-[#534df2] p-2 rounded-full text-white shadow-lg border-4 border-white">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                </div>
                <div className="relative z-10 space-y-1">
                  <span className="block font-black text-slate-900 text-xl sm:text-2xl tracking-tight">Doctor</span>
                  <span className="text-[8px] sm:text-[10px] text-indigo-500 font-black uppercase tracking-[0.2em] sm:tracking-[0.25em]">Provider Portal</span>
                </div>
              </button>

              <button onClick={() => setCurrentRole('patient')} className="relative group overflow-hidden flex flex-col items-center justify-center p-6 sm:p-8 bg-white rounded-[2rem] sm:rounded-[3rem] border-2 border-slate-100 hover:border-emerald-500/30 transition-all duration-300 text-center shadow-sm hover:shadow-2xl transform hover:-translate-y-2">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10 w-24 h-24 sm:w-32 sm:h-32 mb-4 sm:mb-6 rounded-full p-2 bg-emerald-50/50 group-hover:bg-white transition-colors duration-300 shadow-inner group-hover:shadow-xl">
                  <img src={patientImg} alt="Patient" className="w-full h-full object-cover rounded-full transform group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute -bottom-2 -right-2 bg-emerald-500 p-2 rounded-full text-white shadow-lg border-4 border-white">
                    <User className="w-4 h-4" />
                  </div>
                </div>
                <div className="relative z-10 space-y-1">
                  <span className="block font-black text-slate-900 text-xl sm:text-2xl tracking-tight">Patient</span>
                  <span className="text-[8px] sm:text-[10px] text-emerald-600 font-black uppercase tracking-[0.2em] sm:tracking-[0.25em]">Patient Bridge</span>
                </div>
              </button>
            </div>

            <button onClick={handleSignOut} className="mt-12 text-[10px] text-red-400 hover:text-red-600 font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2 mx-auto">
              Sign Out Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] bg-gradient-to-br from-slate-50 to-indigo-50/30 overflow-hidden font-sans text-slate-900 animate-fade-in touch-none">
      {isSidebarOpen && <div className="lg:hidden fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40" onClick={() => setIsSidebarOpen(false)} />}

      <aside className={`
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0 fixed lg:static inset-y-0 left-0 w-[280px] bg-white/90 backdrop-blur-3xl border-r border-slate-100/50 z-50 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-[20px_0_40px_-15px_rgba(0,0,0,0.05)] lg:shadow-none flex flex-col
      `}>
        <div className="p-6 flex-shrink-0">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3 group cursor-pointer">
              <div className="bg-gradient-to-br from-[#534df2] to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-200 transition-transform group-hover:scale-105">
                <Stethoscope className="text-white w-5 h-5" />
              </div>
              <h1 className="text-xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">MedBridge</h1>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-slate-100/80 rounded-full transition-colors">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-8 custom-scrollbar">
          {/* SEARCH LOGS */}
          <div className="space-y-3">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Search Records</label>
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input type="text" placeholder="Search keywords..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 focus:bg-white transition-all outline-none shadow-sm" />
            </div>
          </div>

          {/* SETTINGS - Compact Language Matrix */}
          <div className="space-y-3">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Language Setup</label>
            <div className="bg-slate-50/80 rounded-2xl border border-slate-100 p-3 shadow-inner">
              <div className="flex items-center gap-3">
                <div className="flex-1 space-y-1.5">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Your Language</span>
                  <select 
                    value={currentRole === 'doctor' ? doctorLang : patientLang} 
                    onChange={(e) => {
                      if (currentRole === 'doctor') {
                        setDoctorLang(e.target.value);
                      } else {
                        setPatientLang(e.target.value);
                      }
                    }} 
                    className="w-full bg-white border border-slate-100 rounded-lg text-xs font-bold p-2 outline-none cursor-pointer hover:border-indigo-300 transition-colors shadow-sm text-center"
                  >
                    {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 flex-shrink-0 border-t border-slate-100/50 bg-white/50 backdrop-blur-xl space-y-4">
          {currentRole === 'doctor' && (
            <button onClick={generateSummary} disabled={messages.length === 0 || isSummarizing} className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-indigo-500 to-[#534df2] hover:from-indigo-600 hover:to-indigo-700 disabled:from-slate-200 disabled:to-slate-200 text-white rounded-xl font-black uppercase tracking-widest text-[9px] transition-all shadow-md active:scale-[0.98]">
              {isSummarizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              Generate Summary
            </button>
          )}
          <div className="flex gap-2">
            <button onClick={handleSwitchRole} className="flex-1 flex flex-col items-center justify-center gap-1.5 text-indigo-500 bg-indigo-50/50 hover:bg-indigo-100 text-[8px] font-black py-2.5 rounded-lg transition-colors uppercase tracking-[0.1em]">
              <RefreshCcw className="w-3 h-3" /> Switch Role
            </button>
            <button onClick={handleSignOut} className="flex-1 flex flex-col items-center justify-center gap-1.5 text-red-400 bg-red-50/50 hover:bg-red-100 hover:text-red-600 text-[8px] font-black py-2.5 rounded-lg transition-colors uppercase tracking-[0.1em]">
              <Trash2 className="w-3 h-3" /> Purge Session
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-transparent lg:rounded-l-[3rem] transition-all touch-auto z-10 shadow-[-20px_0_40px_-15px_rgba(0,0,0,0.03)]">
        <header className="px-5 sm:px-10 py-4 sm:py-5 flex items-center justify-between border-b border-white/50 bg-white/60 backdrop-blur-2xl z-30 shadow-[0_2px_10px_rgba(0,0,0,0.02)] sticky top-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 bg-white/50 hover:bg-white border border-slate-100 rounded-xl shadow-sm transition-all">
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Consultation</h2>
                <div className="flex items-center gap-1.5 bg-emerald-50/80 text-emerald-600 text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest border border-emerald-200/50">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  Neural Ready
                </div>
              </div>
              <p className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> <span className="hidden sm:inline">Secure Bridge •</span> Role: <span className="text-indigo-600 font-black px-1.5 py-0.5 bg-indigo-50 rounded-md">{currentRole?.toUpperCase()}</span>
              </p>
            </div>
          </div>

          <div className={`hidden sm:flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl border shadow-sm transition-all duration-500 ${currentRole === 'doctor' ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-indigo-400' : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-emerald-400'}`}>
            {currentRole === 'doctor' ? <Stethoscope className="w-4 h-4" /> : <User className="w-4 h-4" />}
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest">{currentRole}</span>
          </div>
        </header>


        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-10 lg:p-14 space-y-6 sm:space-y-10 scroll-smooth custom-scrollbar bg-slate-50/50 overscroll-contain touch-pan-y relative z-0">
          {filteredMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 animate-slide-up">
              <div className="bg-white p-10 rounded-full mb-6 shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-slate-100">
                {searchQuery ? <Search className="w-16 h-16 text-indigo-300" /> : <MessageSquare className="w-16 h-16 text-indigo-400" />}
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">
                {searchQuery ? "No Matches Found" : "Bridge Initialized"}
              </h3>
              <p className="text-slate-500 max-w-sm text-sm font-medium leading-relaxed">
                {searchQuery ? `No logs found for "${searchQuery}". Try a different term.` : `Begin speaking or typing. Messages are instantly translated and logged with HIPAA-level privacy.`}
              </p>
            </div>
          ) : (
            filteredMessages.map((msg) => (
              <MessageItem key={msg.id} message={msg} currentUserRole={currentRole} searchQuery={searchQuery} />
            ))
          )}
          {isTranslating && (
            <div className="flex justify-start animate-fade-in pl-4">
              <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl border border-slate-100 flex items-center gap-4 shadow-sm">
                <div className="flex gap-1.5">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Translating...</span>
              </div>
            </div>
          )}
        </div>

        <footer className="px-4 py-3 sm:px-6 bg-[#f0f2f5] border-t border-slate-200 relative z-30 flex-shrink-0">
          <div className="w-full mx-auto">
            {isRecording && (
              <div className="mb-3 bg-gradient-to-r from-red-500 to-rose-600 text-white p-3 sm:p-4 rounded-xl flex items-center gap-4 shadow-md animate-slide-up">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center animate-pulse shrink-0"><Mic className="text-white w-4 h-4" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5 text-red-100">Recording Audio...</p>
                  <p className="text-sm font-semibold truncate italic text-white">{liveTranscript || "Listening..."}</p>
                </div>
                <button onClick={stopRecording} className="px-4 py-2 bg-white text-red-600 text-xs font-black uppercase rounded-lg hover:bg-slate-50 transition-colors shadow-sm shrink-0">Done</button>
              </div>
            )}

            <div className="flex items-end gap-2 sm:gap-3">
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,.pdf,.txt,.doc,.docx" />
              <button onClick={() => fileInputRef.current?.click()} className="p-2 sm:p-3 text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 rounded-full transition-colors flex-shrink-0 mb-1">
                <Paperclip className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              
              <div className="flex-1 bg-white border border-slate-200 rounded-2xl flex items-center shadow-sm focus-within:shadow-md transition-shadow py-1 px-2">
                <textarea
                  rows={1}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(inputValue); } }}
                  className="flex-1 bg-transparent py-2.5 sm:py-3 px-3 text-slate-800 font-medium text-[15px] outline-none resize-none max-h-32 custom-scrollbar placeholder:text-slate-400 leading-relaxed"
                  placeholder={`Type a message...`}
                />
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-shrink-0">
                {!inputValue.trim() ? (
                  <button
                    onMouseDown={startRecording} onMouseUp={stopRecording} onMouseLeave={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording}
                    className={`p-3 sm:p-3.5 rounded-full flex items-center justify-center transition-transform active:scale-90 ${isRecording ? 'bg-red-500 text-white shadow-md animate-pulse' : 'bg-transparent text-slate-500 hover:bg-slate-200/50 hover:text-slate-700'}`}
                  >
                    <Mic className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleSendMessage(inputValue)}
                    className="p-3 sm:p-3.5 bg-[#00a884] text-white rounded-full shadow-md hover:bg-[#008f6f] active:scale-90 transition-all flex items-center justify-center"
                  >
                    <Send className="w-5 h-5 sm:w-5 sm:h-5 ml-0.5" />
                  </button>
                )}
              </div>
            </div>
            
            <div className="mt-2 flex items-center justify-center gap-4 opacity-40 text-[9px] font-bold uppercase tracking-widest pointer-events-none">
              <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> End-to-end Encrypted Log</span>
            </div>
          </div>
        </footer>

        {summary && <SummaryModal summary={summary} onClose={() => setSummary(null)} />}
      </main>
    </div>
  );
}

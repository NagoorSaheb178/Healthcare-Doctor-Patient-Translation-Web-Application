
import React from 'react';
import { ConversationSummary } from '../types';
import { X, FileText, Pill, Activity, Calendar, Info } from 'lucide-react';

interface Props {
  summary: ConversationSummary;
  onClose: () => void;
}

const SummaryModal: React.FC<Props> = ({ summary, onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl text-white">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Clinical Consultation Summary</h3>
              <p className="text-xs text-slate-500">AI-Generated Medical Insights</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
          <section>
            <div className="flex items-center gap-2 mb-3 text-blue-600">
              <Info className="w-4 h-4" />
              <h4 className="text-sm font-bold uppercase tracking-wider">Overview</h4>
            </div>
            <p className="text-slate-700 leading-relaxed bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
              {summary.overallSummary}
            </p>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2 mb-3 text-orange-600">
                <Activity className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider">Symptoms Observed</h4>
              </div>
              <ul className="space-y-2">
                {summary.symptoms.map((s, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                    {s}
                  </li>
                ))}
              </ul>
            </section>

            <section className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2 mb-3 text-red-600">
                <FileText className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider">Possible Diagnoses</h4>
              </div>
              <ul className="space-y-2">
                {summary.diagnoses.map((d, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                    {d}
                  </li>
                ))}
              </ul>
            </section>

            <section className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2 mb-3 text-emerald-600">
                <Pill className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider">Medications</h4>
              </div>
              <ul className="space-y-2">
                {summary.medications.map((m, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    {m}
                  </li>
                ))}
              </ul>
            </section>

            <section className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2 mb-3 text-purple-600">
                <Calendar className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider">Follow-Up Plan</h4>
              </div>
              <ul className="space-y-2">
                {summary.followUp.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                    {f}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
            Note: This summary is AI-generated for clinician review only.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SummaryModal;

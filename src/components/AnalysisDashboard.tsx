import React, { useEffect } from "react";
import { ScamAnalysisResult } from "../services/geminiService";
import { AlertTriangle, CheckCircle2, AlertCircle, RefreshCw, Send, ShieldCheck, Share2, Image as ImageIcon } from "lucide-react";
import { motion } from "motion/react";

interface AnalysisDashboardProps {
  result: ScamAnalysisResult;
  onReset: () => void;
  onReport: (result: ScamAnalysisResult) => void;
  inputType: "image" | "text" | "url" | "camera" | "email";
  previewUrl?: string;
}

export const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ result, onReset, onReport, inputType, previewUrl }) => {
  React.useEffect(() => {
    window.speechSynthesis.cancel();
    if (result.isScam && result.riskScore > 70) {
      const utterance = new SpeechSynthesisUtterance("Warning! High risk detected. Proceed with extreme caution.");
      utterance.pitch = 0.8;
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    } else if (result.isScam) {
      const utterance = new SpeechSynthesisUtterance("Caution. Potential threat signatures identified.");
      window.speechSynthesis.speak(utterance);
    } else {
      const utterance = new SpeechSynthesisUtterance("Security audit complete. No threats identified.");
      window.speechSynthesis.speak(utterance);
    }
  }, [result.explanation, result.isScam, result.riskScore]); // Changed result.id to result.explanation

  useEffect(() => {
    // Neural Voice Alert for High Risk
    if (result.isScam && result.riskScore > 75) {
      const speak = () => {
        const msg = new SpeechSynthesisUtterance();
        msg.text = `Warning! High risk threat detected. Category: ${result.threatCategory}. Technical risk score at ${result.riskScore} percent.`;
        msg.rate = 0.9;
        msg.pitch = 0.8;
        window.speechSynthesis.speak(msg);
      };
      
      // Delay slightly for dramatic effect
      const timer = setTimeout(speak, 1000);
      return () => clearTimeout(timer);
    }
  }, [result]);

  const getRiskColor = (score: number, isScam?: boolean) => {
    if (isScam) return "text-red-500";
    if (score < 30) return "text-emerald-500";
    if (score < 70) return "text-amber-500";
    return "text-red-500";
  };

  const getRiskBorder = (score: number, isScam?: boolean) => {
    if (isScam) return "border-red-500/20";
    if (score < 30) return "border-emerald-500/20";
    if (score < 70) return "border-amber-500/20";
    return "border-red-500/20";
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 max-w-6xl mx-auto pb-12"
    >
      <div className={`p-6 rounded-2xl border-2 flex items-center justify-between transition-all ${
        result.riskScore >= 70 
          ? "bg-red-500/10 border-red-500/30 text-red-500" 
          : result.riskScore >= 30 
            ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
      }`}>
        <div className="flex items-center gap-6">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
            result.riskScore >= 70 || (result.isScam && result.riskScore > 1) 
              ? "bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]" 
              : result.riskScore >= 30 || result.isScam
                ? "bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                : "bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]"
          }`}>
            {(result.riskScore >= 70 || (result.isScam && result.riskScore > 1)) ? <AlertCircle className="w-8 h-8" /> : (result.riskScore >= 30 || result.isScam) ? <AlertTriangle className="w-8 h-8" /> : <ShieldCheck className="w-8 h-8" />}
          </div>
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tight leading-none mb-1">
              {(result.riskScore >= 70 || (result.isScam && result.riskScore > 1)) ? "THREAT DETECTED" : (result.riskScore >= 30 || result.isScam) ? "POTENTIAL RISK" : "SECURE ACTIVITY"}
            </h2>
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">
              Risk Identification: {
                (result.riskScore >= 70 || (result.isScam && result.riskScore > 1))
                  ? "CRITICAL STUDENT TRAP - STOP IMMEDIATELY" 
                  : (result.riskScore >= 30 || result.isScam)
                    ? "SUSPICIOUS PATTERN - XAI AUDIT REQUIRED"
                    : "VERIFIED SAFE - ACADEMIC BASELINE"
              }
            </p>
          </div>
        </div>
        <div className="hidden md:flex flex-col items-end">
           <span className="text-[10px] font-mono opacity-50 uppercase mb-1">Audit Protocol</span>
           <span className="text-xs font-black font-mono">SG-ALPHA-9</span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Risk Score Widget */}
        <div className="col-span-12 lg:col-span-4 bg-[#0B1120] p-8 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center relative overflow-hidden group">
            <motion.div 
              animate={{ 
                y: [0, -10, 0],
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              className="relative w-48 h-48 flex items-center justify-center mb-6"
            >
              <div className={`absolute inset-0 rounded-full blur-3xl opacity-20 transition-all duration-1000 ${result.riskScore > 70 ? 'bg-red-500' : result.riskScore > 30 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              
              {/* Pulsing Scanner Ring */}
              <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                className={`absolute inset-4 border-2 rounded-full z-0 ${result.riskScore > 70 ? 'border-red-500/30' : 'border-indigo-500/30'}`}
              />

              <svg className="w-full h-full transform -rotate-90 relative z-10">
                <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-800" />
                <motion.circle 
                  cx="96" cy="96" r="88" 
                  stroke="currentColor" strokeWidth="8" fill="transparent" 
                  strokeDasharray="552.92" 
                  initial={{ strokeDashoffset: 552.92 }}
                  animate={{ strokeDashoffset: 552.92 - (552.92 * result.riskScore) / 100 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`${getRiskColor(result.riskScore, result.isScam)} transition-colors duration-500`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                <motion.span 
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5, type: "spring" }}
                  className={`text-6xl font-black ${getRiskColor(result.riskScore, result.isScam)}`}
                >
                  {result.riskScore}<span className="text-2xl">%</span>
                </motion.span>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Threat Index</span>
              </div>
            </motion.div>
            <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-slate-900 z-10 transition-all ${
              result.riskScore >= 70 || result.isScam
                ? "border-red-500/30 text-red-500" 
                : result.riskScore >= 30 
                  ? "border-amber-500/30 text-amber-500"
                  : "border-emerald-500/30 text-emerald-500"
            }`}>
              {result.riskScore >= 70 || result.isScam ? "CRITICAL THREAT DETECTED" : result.riskScore >= 30 ? "MODERATE RISK IDENTIFIED" : "NO THREATS DETECTED"}
            </div>
        </div>

        {/* Threat Details Widget */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="bg-[#0B1120] border border-slate-800 rounded-2xl p-8 flex flex-col justify-between h-full">
            <div className="space-y-6">
               <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Risk Classification Vector</p>
                    <h3 className="text-3xl font-bold text-white tracking-tight">{result.threatCategory}</h3>
                  </div>
                  <div className="flex gap-2">
                     <button onClick={onReset} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors">
                       <RefreshCw className="w-4 h-4" />
                     </button>
                     <button onClick={() => onReport(result)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase rounded shadow-lg shadow-indigo-900/20">
                       Propagate Forensic Intel
                     </button>
                  </div>
               </div>
               
               <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                    <ShieldCheck className="w-3.5 h-3.5" /> Explainable Risk Reasoning
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed font-medium">
                    {result.explanation}
                  </p>
               </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-slate-800">
             <div className="space-y-1">
                <p className="text-[9px] font-bold text-slate-500 uppercase">Detection Engine</p>
                <p className="text-xs text-slate-300 font-mono italic">
                  {inputType === "image" ? "Contextual OCR & NLP" : inputType === "url" ? "Lexical URL Payload Audit" : inputType === "email" ? "Offer Forensic Audit" : "NLP Heuristic Analysis"}
                </p>
             </div>
             <div className="space-y-1">
                <p className="text-[9px] font-bold text-slate-500 uppercase">AI Confidence</p>
                <div className="flex items-center gap-2">
                   <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden max-w-[60px]">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${result.confidence}%` }}
                        className="h-full bg-indigo-500"
                      />
                   </div>
                   <p className="text-xs text-indigo-400 font-mono font-bold">{result.confidence}%</p>
                </div>
             </div>
             <div className="space-y-1">
                <p className="text-[9px] font-bold text-slate-500 uppercase">Audit Timestamp</p>
                <p className="text-xs text-slate-300 font-mono">{new Date().toLocaleTimeString()}</p>
             </div>
          </div>
          
          <div className="mt-4 p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10 flex items-center justify-between">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white">
                   <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Global Safety Score</p>
                   <p className="text-[11px] text-slate-300 font-bold uppercase tracking-tight">Your Profile: High Resilience</p>
                </div>
             </div>
             <div className="flex items-center gap-2">
                <div className="text-right">
                   <p className="text-xs font-black text-indigo-400">88/100</p>
                   <div className="w-20 h-1 bg-slate-800 rounded-full mt-0.5">
                      <div className="w-[88%] h-full bg-indigo-500 rounded-full" />
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
      
      {/* Detailed Breakdown Grid */}
        <div className="col-span-12 lg:col-span-7 space-y-6">
           {previewUrl && (
             <div className="bg-[#0B1120] border border-slate-800 rounded-2xl overflow-hidden p-6">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-indigo-500" />
                    Inspected Evidence
                  </h4>
                  <div className="px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-[9px] font-mono text-slate-500">
                    OBJ_TYPE: {inputType === "camera" ? "LIVE_CAPTURE" : "STATIC_UI"}
                  </div>
                </div>
                <div className="relative group rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
                   <img 
                    src={previewUrl} 
                    alt="Inspected Evidence" 
                    className="w-full object-contain max-h-[500px]" 
                   />
                   <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                      <div className="flex items-center gap-2 text-[10px] font-mono text-white/60">
                        <ShieldCheck className="w-3 h-3 text-emerald-500" />
                        Authenticated Forensic Capture
                      </div>
                   </div>
                </div>
             </div>
           )}

            <div className="bg-[#0B1120] border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
               <div className="flex items-center justify-between mb-6">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-indigo-500" />
                    Risk Factor Breakdown (XAI)
                  </h4>
                  <div className="px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-[9px] font-mono text-slate-500">
                    DECODER: SHAP-HEURISTIC
                  </div>
               </div>
              
              <div className="overflow-hidden border border-slate-800 rounded-xl mb-10">
                <table className="w-full text-[10px] text-left">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800">
                      <th className="px-4 py-3 font-black uppercase tracking-widest text-slate-500">Analysis Factor</th>
                      <th className="px-4 py-3 font-black uppercase tracking-widest text-slate-500 text-right">Risk Contribution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {result.xaiBreakdown?.map((item, i) => (
                      <tr key={i} className="hover:bg-slate-950/40 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-300 uppercase tracking-tight">{item.factor}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${item.impact}%` }}
                                className={`h-full ${item.impact > 30 ? 'bg-red-500' : 'bg-amber-500'}`}
                              />
                            </div>
                            <span className={`font-mono font-bold ${item.impact > 30 ? 'text-red-400' : 'text-amber-400'}`}>
                              +{item.impact}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between mb-6">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin-slow" />
                  Contextual Forensic Audit
                </h4>
                <div className="px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-[9px] font-mono text-slate-500">
                  KERNEL: SG-AUDIT-X2
                </div>
              </div>
              
              <div className="space-y-3">
                {result.suspiciousLines.map((item, i) => (
                  <div key={i} className={`p-4 rounded-xl bg-slate-900 border border-slate-800 flex gap-4 transition-all hover:border-slate-600`}>
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                      <span className="text-xs font-black text-orange-500">#{i + 1}</span>
                    </div>
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <p className="text-xs font-mono font-bold text-slate-400 line-through decoration-red-500/50 decoration-2 break-all">
                        "{item.line}"
                      </p>
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                        <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mb-1 flex items-center gap-1.5">
                           <ShieldCheck className="w-3 h-3" /> Guardian Analysis
                        </p>
                        <p className="text-xs text-slate-400 font-medium leading-relaxed">
                          {item.reason}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        </div>

        {/* Safety Directives */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
           <div className="bg-indigo-600 rounded-2xl p-6 shadow-2xl shadow-indigo-900/30">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                   <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-lg font-bold text-white tracking-tight">Mitigation Protocols</h4>
              </div>
              <ul className="space-y-3">
                {result.recommendations.map((step, i) => (
                  <li key={i} className="flex gap-4 p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10 text-xs font-bold text-indigo-50 leading-snug">
                    <span className="shrink-0 w-5 h-5 bg-white text-indigo-600 rounded-full flex items-center justify-center text-[10px]">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ul>
           </div>

           <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Guardian Core Wisdom</div>
              <p className="text-xs text-slate-400 leading-[1.6] font-medium italic">
                "{result.guardianWisdom}"
              </p>
           </div>

           <div className="bg-[#0B1120] border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                 <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-500" />
                    Technical Perimeter Audit
                 </h4>
              </div>
              <div className="space-y-2">
                 {result.technicalFlags?.map((flag, i) => (
                    <div key={i} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${flag.active ? "bg-red-500/5 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.05)]" : "bg-slate-900 border-slate-800 opacity-30 grayscale"}`}>
                       <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${flag.active ? "bg-red-500 animate-pulse" : "bg-slate-700"}`} />
                          <div>
                             <p className={`text-[9px] font-black uppercase tracking-widest ${flag.active ? "text-red-400" : "text-slate-500"}`}>{flag.label.replace(/_/g, ' ')}</p>
                             <p className="text-[8px] text-slate-500 font-medium">{flag.description}</p>
                          </div>
                       </div>
                       {flag.active && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
                    </div>
                 ))}
                 {(!result.technicalFlags || result.technicalFlags.length === 0) && (
                    <div className="text-center py-4 text-[9px] text-slate-600 font-mono italic">
                       No specific technical anomalies detected in baseline audit.
                    </div>
                 )}
              </div>
           </div>
        </div>
      </div>
    </motion.div>
  );
};

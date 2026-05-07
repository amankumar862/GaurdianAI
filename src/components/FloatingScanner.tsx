import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Scan, MousePointer2, X, ShieldCheck, AlertCircle, Zap, ShieldAlert, Volume2 } from "lucide-react";
import { ScamAnalysisResult } from "../services/geminiService";

interface FloatingScannerProps {
  result: ScamAnalysisResult | null;
  loading: boolean;
  currentInput?: string;
  inputType?: "text" | "image" | "url" | "camera" | "email";
}

export const FloatingScanner: React.FC<FloatingScannerProps> = ({ result, loading, currentInput = "", inputType = "text" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasDismissedCurrent, setHasDismissedCurrent] = useState(false);
  const [lastAnalyzedInput, setLastAnalyzedInput] = useState("");
  const [liveHighlights, setLiveHighlights] = useState<string[]>([]);
  const [liveRisk, setLiveRisk] = useState(0);
  const audioTriggeredRef = useRef(false);

  // Voice Alert Logic
  useEffect(() => {
    if (liveRisk >= 70 && !audioTriggeredRef.current) {
      const msg = new SpeechSynthesisUtterance("Warning! High risk detected.");
      window.speechSynthesis.speak(msg);
      audioTriggeredRef.current = true;
    } else if (liveRisk < 70) {
      audioTriggeredRef.current = false;
    }
  }, [liveRisk]);

  // Reset dismissal when input is cleared or changes significantly
  useEffect(() => {
    if (currentInput.length === 0) {
      setHasDismissedCurrent(false);
      setLastAnalyzedInput("");
    }
    // If input changed significantly, allow auto-open again
    if (Math.abs(currentInput.length - lastAnalyzedInput.length) > 10) {
      setHasDismissedCurrent(false);
    }
  }, [currentInput, lastAnalyzedInput]);

  // Local Heuristic Analysis for Real-Time feedback
  useEffect(() => {
    if (loading) {
      setLiveRisk(45);
      return;
    }

    if (result) {
      setLiveRisk(result.riskScore);
      setLiveHighlights(result.suspiciousLines.map(l => l.reason).slice(0, 3));
      return;
    }

    // Live Local Analysis when no result yet
    if (currentInput.length > 3) {
      const highlights: string[] = [];
      let score = 0;

      const patterns = [
        { regex: /immediate|urgent|action required|deadline|now|strictly|limited/i, label: "Urgency Detected", weight: 20 },
        { regex: /payment|upi|gpay|phonepe|transfer|deposit|fee|charge|money|pay/i, label: "Payment Request", weight: 25 },
        { regex: /otp|password|login|credential|verify account|pin/i, label: "Sensitive Data Request", weight: 35 },
        { regex: /winzo|dream11|mpl|bet|rummy|casino|lotto|poker/i, label: "Gambling Pattern", weight: 40 },
        { regex: /internship|offer letter|placement|stipend|recruitment/i, label: "Offer Pattern Found", weight: 10 },
        { regex: /security deposit|processing fee|laptop fee|refundable deposit|offer letter fee/i, label: "Employment Scam Sig.", weight: 45 },
        { regex: /scholarship|grant|financial aid|award/i, label: "Scholarship Context", weight: 10 },
        { regex: /application fee|processing fees|bank verification|account detail/i, label: "Scholarship Risk Sig.", weight: 35 },
        { regex: /exam help|leaked paper|proxy exam|assignment help|paper leak/i, label: "Academic Fraud Sig.", weight: 40 },
        { regex: /http:\/\//i, label: "Unsecured HTTP Link", weight: 20 },
        { regex: /bit\.ly|tinyurl\.com|t\.co|goo\.gl|shorturl/i, label: "Link Shortener", weight: 15 },
        { regex: /guaranteed|100%|sure|paisa|earning|pocket money/i, label: "Hyperbolic Promise", weight: 15 },
        { regex: /crypto|mining|investment|return/i, label: "Crypto Scheme Found", weight: 35 },
      ];

      patterns.forEach(p => {
        if (p.regex.test(currentInput)) {
          if (!highlights.includes(p.label)) {
            highlights.push(p.label);
            score += p.weight;
          }
        }
      });

      const finalScore = Math.min(score, 98) || 8;
      setLiveRisk(finalScore);
      setLiveHighlights(highlights.slice(0, 3));
      
      // Proactive Auto-Open on moderate/high risk
      if (score >= 40 && !isOpen && !hasDismissedCurrent) {
        setIsOpen(true);
        setLastAnalyzedInput(currentInput);
      }
    } else {
      setLiveRisk(0);
      setLiveHighlights([]);
    }
  }, [currentInput, result, loading, isOpen, hasDismissedCurrent]);

  const handleClose = () => {
    setIsOpen(false);
    setHasDismissedCurrent(true);
    setLastAnalyzedInput(currentInput);
  };

  const getStatusColor = (score: number) => {
    if (loading) return "text-indigo-400";
    if (score >= 70) return "text-red-500";
    if (score >= 30) return "text-amber-500";
    return "text-emerald-500";
  };

  const getStatusBg = (score: number) => {
    if (loading) return "bg-indigo-500/10 border-indigo-500/30";
    if (score >= 70) return "bg-red-500/10 border-red-500/30";
    if (score >= 30) return "bg-amber-500/10 border-amber-500/30";
    return "bg-emerald-500/10 border-emerald-500/30";
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[1000]"
          />
        )}
      </AnimatePresence>

      <div className="fixed bottom-8 right-8 z-[1100] pointer-events-none">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20, x: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20, x: 20 }}
              className="absolute bottom-20 right-0 bg-slate-950/95 backdrop-blur-2xl text-white p-6 rounded-3xl w-[calc(100vw-4rem)] sm:w-80 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-800 overflow-hidden pointer-events-auto"
            >
              {/* Scanline Effect */}
              <div className="absolute inset-x-0 h-[2px] bg-indigo-500/20 top-0 animate-[scan_3s_linear_infinite]" />
              
              <button 
                onClick={handleClose}
                className="absolute top-5 right-5 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner ${getStatusBg(liveRisk)}`}>
                    {loading ? <Zap className="w-5 h-5 animate-pulse" /> : <ShieldCheck className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-black tracking-tighter text-xs uppercase mb-0.5">Risk Assistant v2.0</h3>
                    <div className="flex items-center gap-1.5 leading-none">
                      <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${getStatusColor(liveRisk).replace('text-', 'bg-')}`} />
                      <span className={`text-[9px] font-black uppercase tracking-widest ${getStatusColor(liveRisk)}`}>
                        {loading ? "Analyzing Intent..." : liveRisk > 0 ? "Live Monitoring" : "System Standby"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* High-Contrast Risk Meter */}
                <div className="bg-slate-900/50 rounded-2xl p-5 border border-white/5 mb-6">
                  <div className="flex flex-col items-center">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-800" strokeDasharray="364.42" />
                        <motion.circle 
                          cx="64" cy="64" r="58" 
                          stroke="currentColor" strokeWidth="10" fill="transparent" 
                          strokeDasharray="364.42" 
                          initial={{ strokeDashoffset: 364.42 }}
                          animate={{ strokeDashoffset: 364.42 - (364.42 * liveRisk) / 100 }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                          strokeLinecap="round"
                          className={`${getStatusColor(liveRisk)} transition-colors duration-500`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <motion.span 
                          key={liveRisk}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className={`text-4xl font-black ${getStatusColor(liveRisk)} tabular-nums`}
                        >
                          {liveRisk}%
                        </motion.span>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest -mt-1">
                          {liveRisk >= 70 ? "Danger" : liveRisk >= 30 ? "Risk" : "Safe"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Real-time Insights */}
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Live Intelligence Hub</p>
                  
                  {liveHighlights.length > 0 ? (
                    <div className="space-y-1.5">
                      {liveHighlights.map((highlight, idx) => (
                        <motion.div 
                          key={highlight}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${getStatusBg(liveRisk)}`}
                        >
                          <Zap className={`w-3.5 h-3.5 shrink-0 ${getStatusColor(liveRisk)}`} />
                          <span className="text-[10px] font-bold text-slate-300">{highlight}</span>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-900/50 rounded-2xl border border-dashed border-slate-800 text-center">
                      <p className="text-[10px] text-slate-600 font-medium">Start typing or scanning for live risk analysis</p>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-slate-900 pt-4 px-1">
                   <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                      <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Assistant Online</span>
                   </div>
                   <div className="text-[8px] font-mono text-slate-700 uppercase">Input: {inputType}</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            if (isOpen) {
              handleClose();
            } else {
              setIsOpen(true);
              setHasDismissedCurrent(false);
            }
          }}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.3)] text-white border-2 transition-all duration-300 relative pointer-events-auto ${getStatusBg(liveRisk)} ${isOpen ? "rotate-90 shadow-[0_0_20px_rgba(99,102,241,0.4)] border-indigo-500/50" : ""}`}
        >
          {loading ? (
            <Zap className="w-6 h-6 animate-pulse" />
          ) : liveRisk >= 70 ? (
            <ShieldAlert className="w-6 h-6 text-red-500" />
          ) : liveRisk >= 30 ? (
            <AlertCircle className="w-6 h-6 text-amber-500" />
          ) : (
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
          )}
          
          {/* Pulsing indicator */}
          {liveRisk > 0 && (
            <div className={`absolute inset-0 rounded-2xl animate-ping opacity-20 scale-75 ${getStatusBg(liveRisk)}`} />
          )}
          
          {/* Real-time small score badge */}
          {!loading && (
             <div className={`absolute -top-2 -right-2 px-1.5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black border-2 border-slate-950 ${getStatusBg(liveRisk)} ${getStatusColor(liveRisk)}`}>
               {liveRisk}%
             </div>
          )}
        </motion.button>
      </div>
    </>
  );
};

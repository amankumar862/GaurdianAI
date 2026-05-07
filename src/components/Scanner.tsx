import React, { useState, useRef, useCallback } from "react";
import { Upload, Image as ImageIcon, ShieldAlert, CheckCircle, Loader2, Type, Link as LinkIcon, Send, Camera, X, ShieldCheck } from "lucide-react";
import { analyzeScam, ScamAnalysisResult } from "../services/geminiService";
import { motion, AnimatePresence } from "motion/react";
import Webcam from "react-webcam";

interface ScannerProps {
  onResult: (result: ScamAnalysisResult, type: "image" | "text" | "url" | "camera" | "email", previewUrl?: string) => void;
  onLoading: (isLoading: boolean) => void;
  onInputChange?: (val: string) => void;
  activeTab?: "image" | "text" | "url" | "camera" | "email";
  onTypeChange?: (type: "image" | "text" | "url" | "camera" | "email") => void;
  isCoolingDown?: boolean;
  onRateLimit?: () => void;
}

export const Scanner: React.FC<ScannerProps> = ({ onResult, onLoading, onInputChange, activeTab, onTypeChange, isCoolingDown, onRateLimit }) => {
  const [loading, setLoadingState] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setLoading = (val: boolean) => {
    setLoadingState(val);
    onLoading(val);
  };
  const [dragActive, setDragActive] = useState(false);
  const [inputType, setInputType] = useState<"image" | "text" | "url" | "camera" | "email">(activeTab || "image");

  React.useEffect(() => {
    if (activeTab && activeTab !== inputType) {
      setInputType(activeTab);
    }
  }, [activeTab]);

  const handleTypeChange = (type: "image" | "text" | "url" | "camera" | "email") => {
    setInputType(type);
    onTypeChange?.(type);
    onInputChange?.(""); 
    setTextInput("");
  };
  const [textInput, setTextInput] = useState("");
  
  const handleTextChange = (val: string) => {
    setTextInput(val);
    onInputChange?.(val);
  };
  const [previewInfo, setPreviewInfo] = useState<{ url: string; type: "image" | "camera" } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const webcamRef = useRef<Webcam>(null);

  const handleFiles = async (files: FileList) => {
    if (files && files[0]) {
      const file = files[0];
      setLoading(true);
      setError(null);
      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const base64Data = e.target?.result as string;
            setPreviewInfo({ url: base64Data, type: "image" });
            const [_, data] = base64Data.split(",");
            const result = await analyzeScam(
              { mimeType: file.type, data: data },
              "image"
            );

            onResult(result, "image", base64Data);
          } catch (err: any) {
            console.error("Analysis failed", err);
            const isRateLimit = err.message?.includes("limit") || err.message?.includes("429");
            if (isRateLimit) onRateLimit?.();
            setError(err.message || "Threat database connection error.");
            setLoading(false);
          }
        };
        reader.readAsDataURL(file);
      } catch (err) {
        console.error("File reading failed", err);
        setError("Incompatible file format.");
        setLoading(false);
      }
    }
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;
    setLoading(true);
    setError(null);
    setPreviewInfo(null);
    try {
      const result = await analyzeScam(textInput, (inputType === "url" ? "url" : "text"));
      onResult(result, inputType as any);
    } catch (err: any) {
      console.error("Analysis failed", err);
      const isRateLimit = err.message?.includes("limit") || err.message?.includes("429");
      if (isRateLimit) onRateLimit?.();
      setError(err.message || "Linguistic audit failed.");
      setLoading(false);
    }
  };

  const captureCamera = useCallback(async () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setLoading(true);
        setError(null);
        setPreviewInfo({ url: imageSrc, type: "camera" });
        try {
          const [_, data] = imageSrc.split(",");
          const result = await analyzeScam(
            { mimeType: "image/jpeg", data: data },
            "image"
          );

          onResult(result, "camera", imageSrc);
        } catch (err: any) {
          console.error("Capture failed", err);
          const isRateLimit = err.message?.includes("limit") || err.message?.includes("429");
          if (isRateLimit) onRateLimit?.();
          setError(err.message || "Optical feed analysis error.");
          setLoading(false);
        }
      }
    }
  }, [webcamRef, onResult]);

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (inputType === "image" && e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="grid grid-cols-5 gap-2 bg-[#0B1120] p-2 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden group/nav">
        {[
          { id: "image", icon: ImageIcon, label: "Visual Audit", sub: "SCREENSHOTS" },
          { id: "text", icon: Type, label: "Message Audit", sub: "CHATS / SMS" },
          { id: "url", icon: LinkIcon, label: "URL Audit", sub: "LINKS" },
          { id: "email", icon: Send, label: "Email Audit", sub: "OFFER LETTERS" },
          { id: "camera", icon: Camera, label: "Live Flow", sub: "OPTICAL SCAN" }
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => handleTypeChange(tab.id as any)}
            className={`relative z-10 flex flex-col items-center gap-2 py-4 rounded-xl transition-all ${inputType === tab.id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/40" : "text-slate-500 hover:bg-slate-800/50"}`}
          >
            <tab.icon className="w-5 h-5" />
            <div className="flex flex-col items-center px-1 text-center">
              <span className="text-[9px] font-black uppercase tracking-widest leading-none">{tab.label}</span>
              <span className="text-[7px] text-white/50 font-bold hidden sm:block mt-1">{tab.sub}</span>
            </div>
            {inputType === tab.id && <motion.div layoutId="tab-indicator" className="absolute -bottom-1 left-3 right-3 h-0.5 bg-white/50 rounded-full" />}
          </button>
        ))}
      </div>

      <div
        id="drop-zone"
        className={`relative border border-dashed rounded-2xl transition-all h-[450px] flex flex-col items-center justify-center bg-[#0B1120] overflow-hidden
          ${dragActive ? "border-indigo-500 bg-indigo-500/5 scale-[1.01]" : "border-slate-800"}
          ${inputType === "image" ? "cursor-pointer hover:border-slate-600 hover:bg-slate-800/30" : ""}
        `}
        onDragEnter={onDrag}
        onDragLeave={onDrag}
        onDragOver={onDrag}
        onDrop={onDrop}
        onClick={() => inputType === "image" && !loading && !error && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />

        <AnimatePresence mode="wait">
          {error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 bg-red-950/90 backdrop-blur-md rounded-xl flex flex-col items-center justify-center p-8 text-center z-[60]"
            >
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-red-500/20">
                <ShieldAlert className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-tight">Audit Interrupt Detected</h3>
              <p className="text-red-300/80 text-sm mb-8 font-mono">{error}</p>
              <button 
                onClick={(e) => { e.stopPropagation(); setError(null); }}
                className="px-6 py-2.5 bg-red-500 hover:bg-red-400 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-lg shadow-lg shadow-red-900/40"
              >
                Reset Audit Context
              </button>
            </motion.div>
          ) : (
            <div className="w-full h-full flex flex-col relative">
              <div className="flex-1 overflow-auto relative">
                {inputType === "image" ? (
                  <div className="h-full relative group">
                    {previewInfo?.url ? (
                      <div className={`absolute inset-0 flex flex-col items-center justify-center transition-colors duration-500 group ${loading ? 'bg-transparent' : 'bg-black/60'}`}>
                         <img src={previewInfo.url} className={`w-full h-full object-contain transition-all duration-700 ${loading ? 'opacity-100 scale-100' : 'opacity-70 group-hover:opacity-40'}`} alt="Evidence Preview" />
                         {!loading && (
                           <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewInfo(null);
                                  if (fileInputRef.current) fileInputRef.current.value = "";
                                }}
                                className="bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 text-red-500 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                              >
                                <X className="w-3 h-3" /> Remove Evidence
                              </button>
                           </div>
                         )}
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                        <div className="w-20 h-20 bg-indigo-500/10 rounded-[2rem] border border-indigo-500/20 flex items-center justify-center mb-8 text-indigo-400">
                          <Upload className="w-10 h-10" />
                        </div>
                        <h3 className="text-3xl font-bold mb-3 text-white tracking-tight">Drop Evidence</h3>
                        <p className="text-slate-500 text-sm mb-6 max-w-lg mx-auto">Analyze screenshots for hidden threats.</p>
                        <div className="flex flex-wrap justify-center gap-3">
                           <span className="text-[10px] font-bold text-white/20 bg-white/5 border border-white/10 px-3 py-1 rounded-full uppercase">Job Offers</span>
                           <span className="text-[10px] font-bold text-white/20 bg-white/5 border border-white/10 px-3 py-1 rounded-full uppercase">WhatsApp Chats</span>
                           <span className="text-[10px] font-bold text-white/20 bg-white/5 border border-white/10 px-3 py-1 rounded-full uppercase">ERP Login Clones</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : inputType === "camera" ? (
                  <div className="w-full h-full relative">
                    <Webcam ref={webcamRef} audio={false} className="w-full h-full object-cover" screenshotFormat="image/jpeg" />
                    <div className="absolute inset-0 border-[40px] border-[#0B1120]/80 pointer-events-none">
                      <motion.div animate={{ top: ["0%", "100%", "0%"] }} transition={{ duration: 2.0, repeat: Infinity }} className="absolute left-0 right-0 h-0.5 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)] z-10" />
                    </div>
                    {!loading && (
                      <div className="absolute bottom-6 left-6 right-6">
                        <button 
                          onClick={captureCamera} 
                          disabled={isCoolingDown}
                          className={`w-full py-4 font-black text-xs uppercase tracking-[0.3em] rounded-xl shadow-2xl transition-all ${isCoolingDown ? "bg-amber-600/50 text-white cursor-not-allowed" : "bg-white text-black hover:scale-[1.02] active:scale-95"}`}
                        >
                          {isCoolingDown ? "Cooldown in Progress" : "Confirm Capture"}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full p-8 flex flex-col">
                    <textarea
                      value={textInput}
                      onChange={(e) => handleTextChange(e.target.value)}
                      placeholder={`Enter ${inputType === 'url' ? 'URL' : inputType === 'email' ? 'email' : 'text'} for audit...`}
                      className="flex-1 bg-[#0F172A] border border-slate-800 rounded-2xl p-6 text-slate-300 text-sm outline-none resize-none focus:border-indigo-500/50 transition-all font-mono"
                    />
                    {!loading && (
                      <button 
                        onClick={handleTextSubmit} 
                        disabled={!textInput.trim() || isCoolingDown} 
                        className={`mt-6 w-full py-5 text-white font-black text-[10px] uppercase tracking-[0.4em] rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg active:scale-[0.98] ${isCoolingDown ? "bg-amber-600/50 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/20"}`}
                      >
                        {isCoolingDown ? (
                          <>
                             <Loader2 className="w-4 h-4 animate-spin" /> Neural Cooldown
                          </>
                        ) : (
                          <>
                             <Send className="w-4 h-4" /> Initialize Audit
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Enhanced Loading Overlay */}
              <AnimatePresence>
                {loading && (
                   <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-transparent flex flex-col items-center justify-center z-50 overflow-hidden pointer-events-none"
                  >
                    <div className="absolute inset-0 z-0">
                      <motion.div 
                        animate={{ top: ["0%", "100%", "0%"] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="absolute left-0 right-0 h-1 bg-indigo-400 shadow-[0_0_25px_rgba(99,102,241,1),0_0_5px_rgba(255,255,255,1)] z-10"
                      />
                    </div>
                    
                    {previewInfo ? (
                      <motion.div 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="absolute bottom-8 right-8 z-10 flex items-center gap-4 bg-black/80 p-5 rounded-2xl border border-white/20 shadow-2xl backdrop-blur-xl scale-90"
                      >
                        <div className="relative w-10 h-10">
                          <div className="absolute inset-0 border-4 border-slate-800 rounded-full" />
                          <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-black text-white tracking-widest uppercase italic">Forensic Analysis</p>
                          <div className="flex items-center gap-2 mt-0.5">
                             <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping" />
                             <span className="text-[10px] font-mono text-indigo-300 font-black uppercase tracking-[0.2em]">Live Stream Active</span>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="relative z-10 flex flex-col items-center bg-black/80 p-10 rounded-[3rem] border border-white/20 scale-110 shadow-2xl">
                        <div className="relative w-24 h-24 mb-6">
                          <div className="absolute inset-0 border-8 border-slate-800 rounded-full" />
                          <div className="absolute inset-0 border-8 border-indigo-500 rounded-full border-t-transparent animate-spin shadow-[inset_0_0_15px_rgba(99,102,241,0.5)]" />
                        </div>
                        <p className="text-2xl font-black text-white tracking-widest mb-3 uppercase italic">Forensic Analysis</p>
                        <div className="flex items-center gap-2 px-4 py-1.5 bg-indigo-500/20 border border-indigo-500/50 rounded-full">
                           <div className="w-2 h-2 bg-indigo-400 rounded-full animate-ping" />
                           <span className="text-[10px] font-mono text-indigo-300 font-black uppercase tracking-[0.2em]">Neural Interlock 0x4F2</span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Crosshair, ShieldAlert, ShieldCheck, Zap, X, Search, Fingerprint, Loader2, Maximize, RefreshCw, AlertCircle } from "lucide-react";
import { analyzeScam, ScamAnalysisResult } from "../services/geminiService";

interface OverlayScannerProps {
  enabled: boolean;
  onResult: (result: ScamAnalysisResult, previewUrl?: string) => void;
  onLoading: (loading: boolean) => void;
  onDisable: () => void;
  isCoolingDown?: boolean;
  onRateLimit?: () => void;
}

export const OverlayScanner: React.FC<OverlayScannerProps> = ({ enabled, onResult, onLoading, onDisable, isCoolingDown, onRateLimit }) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isStartingCapture, setIsStartingCapture] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionFinalized, setSelectionFinalized] = useState(false);
  const [selection, setSelection] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showGuidance, setShowGuidance] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [localResult, setLocalResult] = useState<ScamAnalysisResult | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [floatingPos, setFloatingPos] = useState(() => ({
    x: typeof window !== 'undefined' ? window.innerWidth - 100 : 0,
    y: typeof window !== 'undefined' ? (window.innerHeight / 2) - 40 : 0
  }));

  useEffect(() => {
    if (enabled) {
      console.log("Lens HUD Mode enabled. Forensic Target ready.");
    } else {
      stopCapture();
    }
  }, [enabled]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      if (isFrozen) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(e => console.error("Video play failed:", e));
      }
    }
  }, [stream, isFrozen, isCapturing]);

  const startCapture = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      const msg = new SpeechSynthesisUtterance("Browser sensors do not support Forensic Mirroring. Please use a desktop version of Chrome or Edge.");
      window.speechSynthesis.speak(msg);
      return;
    }

    setShowGuidance(false);
    setIsFrozen(false);
    setIsStartingCapture(true);
    try {
      // @ts-ignore
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
          cursor: "always" 
        } as any,
        audio: false
      });
      setStream(mediaStream);
      setIsCapturing(true);
      setSelectionFinalized(false);
      
      const msg = new SpeechSynthesisUtterance("Lens active. Drag over text in the viewer to analyze.");
      window.speechSynthesis.speak(msg);

      mediaStream.getVideoTracks()[0].onended = () => stopCapture();
    } catch (err: any) {
      console.error("Screen capture failed:", err);
      const isDenied = err.name === "NotAllowedError" || err.message?.includes("denied");
      
      const msgText = isDenied 
        ? "Permission denied. Please allow screen sharing to use the Forensic Mirror." 
        : "Failed to start mirror. Please grant screen recording permissions.";
        
      const msg = new SpeechSynthesisUtterance(msgText);
      window.speechSynthesis.speak(msg);
      
      if (isDenied) {
        setIsCapturing(false);
        setIsStartingCapture(false);
      }
    } finally {
      setIsStartingCapture(false);
    }
  };

  const stopCapture = () => {
    if (stream) stream.getTracks().forEach(track => track.stop());
    setStream(null);
    setIsCapturing(false);
    setIsSelecting(false);
    setSelectionFinalized(false);
    setIsAnalyzing(false);
    setLocalResult(null);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isCapturing) return;
    setIsSelecting(true);
    setSelectionFinalized(false);
    setLocalResult(null);
    setSelection({ x: e.clientX, y: e.clientY, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting) return;
    setSelection(prev => ({
      ...prev,
      width: e.clientX - prev.x,
      height: e.clientY - prev.y
    }));
  };

  const handleMouseUp = () => {
    if (!isSelecting) return;
    setIsSelecting(false);
    
    if (Math.abs(selection.width) > 20 && Math.abs(selection.height) > 20) {
      setSelectionFinalized(true);
      // Auto-analyze on release for seamless HUD experience
      captureAndAnalyze();
    }
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent default browser context menu
    onDisable();
    stopCapture();
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !stream) return;

    // Total UI Reset at start of analysis
    setLocalResult(null);
    setIsAnalyzing(true);
    onLoading(true);
    
    // Feedback to user
    const utterance = new SpeechSynthesisUtterance("Sector locked. Initiating forensic deep scan.");
    utterance.volume = 0.5;
    window.speechSynthesis.speak(utterance);
    
    const startTime = Date.now();

    try {
      const canvas = document.createElement("canvas");
      const video = videoRef.current;
      const rect = video.getBoundingClientRect();
      
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) throw new Error("Could not initialize GPU context.");

      // High-fidelity coordinate mapping
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      
      if (vw === 0 || vh === 0) {
        throw new Error("Lens sensors not reporting dimensions. Check feed status.");
      }

      const videoRatio = vw / vh;
      const containerRatio = rect.width / rect.height;
      
      let actualWidth, actualHeight, offsetX = 0, offsetY = 0;
      if (containerRatio > videoRatio) {
        actualHeight = rect.height;
        actualWidth = rect.height * videoRatio;
        offsetX = (rect.width - actualWidth) / 2;
      } else {
        actualWidth = rect.width;
        actualHeight = rect.width / videoRatio;
        offsetY = (rect.height - actualHeight) / 2;
      }

      // Map selection to video buffer coordinates
      const scaleX = vw / actualWidth;
      const scaleY = vh / actualHeight;
      
      const rawX = (selection.x - rect.left - offsetX) * scaleX;
      const rawY = (selection.y - rect.top - offsetY) * scaleY;
      const rawW = selection.width * scaleX;
      const rawH = selection.height * scaleY;
      
      const paddingW = Math.abs(rawW) * 0.15;
      const paddingH = Math.abs(rawH) * 0.15;

      const sourceX = Math.max(0, Math.min((rawW > 0 ? rawX : rawX + rawW) - paddingW, vw));
      const sourceY = Math.max(0, Math.min((rawH > 0 ? rawY : rawY + rawH) - paddingH, vh));
      const sourceW = Math.min(Math.abs(rawW) + (paddingW * 2), vw - sourceX);
      const sourceH = Math.min(Math.abs(rawH) + (paddingH * 2), vh - sourceY);

      if (sourceW < 2 || sourceH < 2) {
        console.warn("Target too small:", { sourceW, sourceH, rawW, rawH });
        throw new Error("Selection area is too small or invalid. Please select a larger area of text.");
      }

      // Resolution boost for OCR
      canvas.width = Math.max(sourceW * 2.5, 400); 
      canvas.height = Math.max(sourceH * 2.5, 400);
      
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      ctx.drawImage(
        video,
        sourceX, sourceY, sourceW, sourceH,
        0, 0, canvas.width, canvas.height
      );

      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      const base64Data = dataUrl.split(",")[1];
      
      console.log(`Analyzing forensic snapshot: ${sourceW}x${sourceH} at ${sourceX},${sourceY}`);
      
      const result = await analyzeScam({ mimeType: "image/jpeg", data: base64Data }, "image");
      
      // Push results to dashboard (App.tsx)
      onResult(result, dataUrl);
      // Keep local result for HUD overlay
      setLocalResult(result);

      // Forensic Voice Alert for High Risk
      if (result.isScam && result.riskScore >= 75) {
        const warning = new SpeechSynthesisUtterance("Warning! High risk detected.");
        warning.pitch = 0.8;
        warning.rate = 0.9;
        window.speechSynthesis.speak(warning);
      }
    } catch (err: any) {
      console.error("Forensic analysis failed:", err);
      
      const errorMsg = err.message || "Logic stream interrupted by neural noise.";
      const isRateLimit = errorMsg.includes("limit") || errorMsg.includes("429") || errorMsg.includes("critical limit");
      
      if (isRateLimit) onRateLimit?.();

      const errorResult: ScamAnalysisResult = {
        riskScore: 0,
        confidence: 0,
        threatCategory: "NEURAL_LINK_ERROR",
        explanation: `HUD ANALYSIS FAILED: ${errorMsg}`,
        suspiciousLines: [{ line: "N/A", reason: "Communication line corrupted" }],
        recommendations: [isRateLimit ? "Wait 30 seconds for neural processors to cool down." : "Check your connection and try again."],
        isScam: false,
        technicalFlags: [{ label: "Neural Crash", active: true, description: "Analysis pipeline failed" }],
        xaiBreakdown: [{ factor: "System Error", impact: 100 }],
        metrics: {
          detectionSync: 0,
          signatures: "FAIL",
          latency: `${Date.now() - startTime}ms`,
          alertIntensity: "LOW"
        },
        guardianWisdom: "Even the most advanced systems face interference. Try isolating the target again."
      };

      onResult(errorResult);
      setLocalResult(errorResult);
    } finally {
      setIsAnalyzing(false);
      onLoading(false);
    }
  };

  if (!enabled) return null;

  const left = selection.width > 0 ? selection.x : selection.x + selection.width;
  const top = selection.height > 0 ? selection.y : selection.y + selection.height;
  const width = Math.abs(selection.width);
  const height = Math.abs(selection.height);

  return (
    <>
      <AnimatePresence>
        {showGuidance && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[6000] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md"
          >
            <div className="bg-slate-900 border-2 border-indigo-500/50 p-6 md:p-8 rounded-[32px] md:rounded-[40px] max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-[0_0_100px_rgba(99,102,241,0.2)] text-center relative custom-scrollbar">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-pulse" />
               
               <div className="w-24 h-24 bg-indigo-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-indigo-500/20">
                 <Search className="w-12 h-12 text-indigo-400" />
               </div>

               <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-4 font-sans">Lens HUD: Permission Protocol</h3>
               
               <div className="text-slate-400 text-sm font-medium leading-relaxed mb-8 text-left space-y-6">
                 <div className="bg-slate-950/50 p-6 rounded-3xl border-2 border-slate-800">
                   <p className="text-white font-bold leading-relaxed">
                     The Lens HUD Mode uses your browser's screen-sharing capabilities to "see" outside of this tab. 
                   </p>
                   <p className="mt-4 text-emerald-400 font-medium">
                     It creates a <span className="font-bold underline text-emerald-300">Virtual Mirror</span> of your screen inside this window.
                   </p>
                 </div>

                 <div className="bg-indigo-950/20 p-5 rounded-3xl border border-indigo-500/20">
                   <p className="text-[11px] uppercase tracking-widest font-black text-indigo-400 mb-3">Critical Setup Steps:</p>
                   <ol className="text-xs space-y-2 list-decimal pl-4">
                     <li>When the browser popup appears, click the <span className="text-white font-bold">"Entire Screen"</span> tab.</li>
                     <li>Select your screen and click <span className="text-white font-bold">"Share"</span>.</li>
                     <li>Switch to <span className="text-emerald-400 font-bold">WhatsApp/Mail</span> on your computer.</li>
                     <li>Return to <span className="text-white font-bold">this tab</span> – your WhatsApp will be mirrored in our viewfinder.</li>
                     <li>Select and scan the text right here in the HUD!</li>
                   </ol>
                 </div>
               </div>

               <div className="space-y-4">
                 <button 
                   onClick={startCapture}
                   className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-900/40 transition-all active:scale-95 text-sm uppercase tracking-widest"
                 >
                   I Understand, Proceed
                 </button>
                 <button 
                   onClick={() => { setShowGuidance(false); onDisable(); }}
                   className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-4 rounded-2xl transition-all active:scale-95 text-[10px] uppercase tracking-widest"
                 >
                   Abort Capture
                 </button>
               </div>
            </div>
          </motion.div>
        )}

        {isCapturing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-black/60 cursor-crosshair overflow-hidden backdrop-blur-sm"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted
              className="absolute inset-0 w-full h-full object-contain bg-slate-950" 
            />

            {/* High Threat Alert Pulse */}
            <AnimatePresence>
              {localResult && localResult.isScam && localResult.riskScore > 75 && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.4, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="absolute inset-0 z-[2005] bg-red-600 pointer-events-none mix-blend-overlay"
                />
              )}
            </AnimatePresence>

            {/* Scanning Grid Layer */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
               <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
            </div>

            {/* Movable Hint Overlay */}
            <motion.div 
              drag
              dragMomentum={false}
              initial={{ x: "-50%", y: "0%" }}
              className="absolute bottom-10 left-1/2 cursor-move bg-slate-900/95 text-white px-6 py-3 rounded-2xl border border-indigo-500/50 flex flex-col items-center gap-1 backdrop-blur-2xl shadow-[0_0_50px_rgba(99,102,241,0.3)] z-[2100]"
            >
              <div className="flex items-center gap-2 pointer-events-none">
                <Zap className="w-4 h-4 text-indigo-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-100">
                  {selectionFinalized ? "Selection Ready" : "Lens Active"}
                </span>
              </div>
              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter text-center max-w-[280px] pointer-events-none">
                {selectionFinalized 
                  ? "Click 'Analyze' below" 
                  : "Scroll in WhatsApp natively, then drag over the mirror here to select."}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsFrozen(!isFrozen); }}
                  className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border transition-colors ${isFrozen ? "bg-cyan-500 text-white border-cyan-400" : "text-cyan-400 border-cyan-400 hover:bg-cyan-400/10"}`}
                >
                  {isFrozen ? "Unfreeze Feed" : "Freeze View"}
                </button>
                <div className="w-1 h-1 rounded-full bg-slate-700" />
                <button 
                  onClick={(e) => { e.stopPropagation(); stopCapture(); }}
                  className="text-[8px] font-black uppercase text-red-400 hover:text-red-300 transition-colors"
                >
                  Stop Lens
                </button>
              </div>
              <div className="mt-1 text-[7px] uppercase text-slate-500 font-bold pointer-events-none">Hold & Drag to move box</div>
            </motion.div>

            {/* Selection Box */}
            {(isSelecting || selectionFinalized) && (
              <div 
                className={`absolute border-[3px] transition-colors duration-300 ${isAnalyzing ? "border-indigo-500 shadow-[0_0_150px_rgba(99,102,241,0.5)]" : "border-emerald-400 shadow-[0_0_100px_rgba(16,185,129,0.3)]"} bg-emerald-500/5 pointer-events-auto ring-[200vw] ring-slate-950/80`}
                style={{ left, top, width, height }}
              >
                 {/* Visual Grid Lines inside selection */}
                 <div className="absolute inset-0 pointer-events-none opacity-20">
                    <div className="absolute top-1/3 w-full h-px bg-emerald-500" />
                    <div className="absolute top-2/3 w-full h-px bg-emerald-500" />
                    <div className="absolute left-1/3 h-full w-px bg-emerald-500" />
                    <div className="absolute left-2/3 h-full w-px bg-emerald-500" />
                 </div>

                 {/* Scanning Laser Animation */}
                 {isAnalyzing && (
                   <>
                     <motion.div 
                      initial={{ top: 0 }}
                      animate={{ top: "100%" }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-x-0 h-1 bg-emerald-400 shadow-[0_0_25px_#10b981] z-20 flex items-center justify-center"
                     >
                       <div className="bg-emerald-600 text-[10px] text-white px-2 py-0.5 font-black uppercase tracking-widest rounded-full shadow-lg border border-emerald-400/50">
                         Scanning...
                       </div>
                     </motion.div>
                     
                     {/* Secondary Scanning Wave */}
                     <motion.div 
                      initial={{ top: 0, opacity: 0 }}
                      animate={{ top: ["0%", "100%"], opacity: [0, 0.4, 0] }}
                      transition={{ duration: 2.0, repeat: Infinity, delay: 0.3 }}
                      className="absolute inset-x-0 h-40 bg-gradient-to-b from-emerald-500/40 via-emerald-500/10 to-transparent z-10"
                     />

                     {/* Grid Pulse */}
                     <motion.div 
                      animate={{ opacity: [0.1, 0.4, 0.1] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                      className="absolute inset-0 bg-emerald-500/5 z-0"
                     />
                   </>
                 )}
                 
                 <div className="absolute inset-0 bg-white/5" />
                 <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-white" />
                 <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-white" />
                 <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-white" />
                 <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-white" />

                 {/* Auto-analysis status indicator */}
                 {selectionFinalized && !isAnalyzing && !localResult && (
                   <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex gap-2">
                     <div className="bg-emerald-600/80 text-white px-3 py-1.5 rounded-lg font-black text-[8px] uppercase tracking-widest shadow-xl flex items-center gap-2 whitespace-nowrap">
                        Analysis Triggered
                     </div>
                   </div>
                 )}
              </div>
            )}

            {/* Local Result Overlay */}
            <AnimatePresence>
              {localResult && (
                <motion.div
                  initial={{ opacity: 0, y: 20, x: "-50%" }}
                  animate={{ opacity: 1, y: 0, x: "-50%" }}
                  exit={{ opacity: 0, y: 20, x: "-50%" }}
                  className="absolute top-1/2 left-1/2 z-[2500] w-full max-w-sm"
                >
                  <div className={`p-6 rounded-3xl border-2 backdrop-blur-xl shadow-2xl ${localResult.isScam ? "bg-red-950/90 border-red-500/50" : "bg-emerald-950/90 border-emerald-500/50"}`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`p-3 rounded-2xl ${localResult.isScam ? "bg-red-500/20" : "bg-emerald-500/20"}`}>
                        {localResult.isScam ? <ShieldAlert className="w-6 h-6 text-red-400" /> : <ShieldCheck className="w-6 h-6 text-emerald-400" />}
                      </div>
                      <div>
                        <h4 className="text-white font-black uppercase tracking-widest text-sm">{localResult.threatCategory}</h4>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${localResult.isScam ? "bg-red-500" : "bg-emerald-500"}`}
                              style={{ width: `${localResult.riskScore}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono font-bold text-slate-400">{localResult.riskScore}% RISK</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => setLocalResult(null)}
                        className="ml-auto text-slate-500 hover:text-white p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-white/90 text-xs font-medium leading-relaxed mb-4 italic">
                      "{localResult.explanation}"
                    </p>
                    
                    {/* XAI Factors inline */}
                    <div className="mb-4 space-y-2">
                      <p className="text-[8px] font-black uppercase text-white/50 tracking-widest mb-1.5 flex items-center gap-2">
                        <AlertCircle className="w-3 h-3" />
                        Risk Vector Breakdown
                      </p>
                      {localResult.xaiBreakdown?.slice(0, 3).map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-[10px]">
                           <span className="text-white/70 font-bold uppercase truncate max-w-[180px]">{item.factor}</span>
                           <span className={`font-mono font-black ${item.impact > 30 ? 'text-red-400' : 'text-amber-400'}`}>+{item.impact}%</span>
                        </div>
                      ))}
                    </div>

                    {/* Recommendations Snippet */}
                    <div className="mb-6 space-y-2">
                      <p className="text-[8px] font-black uppercase text-white/50 tracking-widest mb-1.5">Action Directives</p>
                      {localResult.recommendations.slice(0, 2).map((rec, i) => (
                        <div key={i} className="flex gap-2 items-start text-[10px] text-slate-300 font-bold">
                          <div className={`w-1 h-1 rounded-full mt-1.5 shrink-0 ${localResult.isScam ? 'bg-red-500' : 'bg-emerald-500'}`} />
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>

                    {/* Detailed Result Actions */}
                    <div className="flex gap-2">
                       <button 
                         onClick={() => {
                           onDisable();
                           stopCapture();
                         }}
                         className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-indigo-900/40"
                       >
                         View Full Report
                       </button>
                       <button 
                         onClick={() => setLocalResult(null)}
                         className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest"
                       >
                         Dismiss
                       </button>
                    </div>
                    <div className="mt-5 pt-4 border-t border-white/10 flex justify-between items-center text-[8px] font-black uppercase text-indigo-400 tracking-tighter">
                      <span>Forensic ID: {Math.random().toString(36).substring(7).toUpperCase()}</span>
                      <span>Verified by GuardianAI Neural Core</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        drag
        dragMomentum={false}
        animate={{ x: floatingPos.x, y: floatingPos.y }}
        onDragEnd={(_, info) => setFloatingPos({ x: info.point.x, y: info.point.y })}
        className="fixed top-0 left-0 z-[5000] cursor-grab active:cursor-grabbing"
      >
        <button
          onClick={() => isCapturing ? stopCapture() : setShowGuidance(true)}
          onContextMenu={handleRightClick}
          disabled={isStartingCapture}
          title="Right-click to stop capture / close"
          className={`group relative w-20 h-20 rounded-3xl flex items-center justify-center transition-all duration-500 ${isCapturing ? "bg-red-500 rotate-45 shadow-red-500/50 shadow-2xl" : "bg-slate-950 shadow-emerald-500/40 shadow-2xl border-2 border-emerald-500/30 hover:border-emerald-500"} ${isStartingCapture ? "opacity-50 cursor-wait" : ""}`}
        >
          {isStartingCapture ? (
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          ) : isCapturing ? (
            <X className="w-8 h-8 text-white" />
          ) : (
            <div className="relative">
              <Crosshair className="w-10 h-10 text-emerald-400 group-hover:scale-110 transition-transform" />
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 p-1 rounded-full border-2 border-slate-950 shadow-lg">
                <Search className="w-3 h-3 text-white" />
              </div>
            </div>
          )}


          {/* Radar effect */}
          {!isCapturing && (
            <motion.div 
              animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute inset-0 rounded-3xl bg-emerald-500/20"
            />
          )}

          {/* Prompt Label with Right Click Hint */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all transform group-hover:-translate-y-2 flex flex-col items-center pointer-events-none">
            <div className="bg-emerald-600 text-white px-5 py-3 rounded-2xl whitespace-nowrap shadow-[0_15px_40px_rgba(5,150,105,0.4)] border border-emerald-400/30">
              <span className="text-[12px] font-black uppercase tracking-widest block leading-none mb-1.5">
                {isCapturing ? "HUD Mirroring: ON" : "Initialize Lens HUD"}
              </span>
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-emerald-100/80 uppercase font-black tracking-widest block leading-none text-center">
                  {isCapturing ? "Right-click to stop capture" : "Click to start mirror"}
                </span>
                {!isCapturing && (
                  <span className="text-[8px] text-white/60 uppercase font-bold tracking-tighter block leading-none text-center">
                    Drag this button to reposition
                  </span>
                )}
              </div>
            </div>
             <div className="w-3 h-3 bg-emerald-600 rotate-45 -mt-1.5 border-r border-b border-emerald-400/30" />
          </div>
        </button>
      </motion.div>
    </>
  );
};


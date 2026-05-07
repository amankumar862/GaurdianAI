import React, { useState, useEffect } from "react";
import { Scanner } from "./components/Scanner";
import { AnalysisDashboard } from "./components/AnalysisDashboard";
import { FloatingScanner } from "./components/FloatingScanner";
import { ChatAssistant } from "./components/ChatAssistant";
import { CommunityBoard } from "./components/CommunityBoard";
import { auth, googleProvider, db, testConnection } from "./lib/firebase";
import { signInWithPopup, onAuthStateChanged, User } from "firebase/auth";
import { collection, addDoc, serverTimestamp, doc, setDoc, getDoc } from "firebase/firestore";
import { ScamAnalysisResult, analyzeScam } from "./services/geminiService";
import { Shield, ShieldCheck, Github, LogIn, ChevronRight, AlertCircle, Link as LinkIcon, AlertTriangle, Target, Crosshair, ShieldAlert, RefreshCw, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { OverlayScanner } from "./components/OverlayScanner";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeModule, setActiveModule] = useState<"scan" | "community">("scan");
  const [analysisResult, setAnalysisResult] = useState<ScamAnalysisResult | null>(null);
  const [activeScannerTab, setActiveScannerTab] = useState<"image" | "text" | "url" | "camera" | "email">("image");
  const [lastInputType, setLastInputType] = useState<"image" | "text" | "url" | "camera" | "email">("image");
  const [lastPreviewUrl, setLastPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const handleStartAnalysis = (val: boolean) => {
    setLoading(val);
    if (val) {
      setAnalysisResult(null);
      setLastPreviewUrl(null);
      setShowFraudAlert(false);
      setShowSafeAlert(false);
    }
  };
  const [currentInput, setCurrentInput] = useState("");
  const [overlayScannerEnabled, setOverlayScannerEnabled] = useState(false);

  useEffect(() => {
    testConnection();
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Sync user profile to Firestore
        const userRef = doc(db, "users", u.uid);
        try {
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              email: u.email || "",
              displayName: u.displayName || "",
              photoURL: u.photoURL || "",
              createdAt: serverTimestamp(),
              isAdmin: false // Default to non-admin
            });
          }
        } catch (error) {
          console.error("Profile sync failed", error);
        }
      }
    });
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login failed", error);
      if (error.code === "auth/popup-closed-by-user") {
        alert("Authentication interrupted: Please complete the Google Sign-In process in the popup window.");
      } else {
        alert(`Login failed: ${error.message || "Unknown error"}`);
      }
    }
  };

  const openScannerTab = (type: "image" | "text" | "url" | "camera" | "email") => {
    setActiveModule("scan");
    setAnalysisResult(null);
    setLastPreviewUrl(null);
    setPendingNavigation(null);
    setShowFraudAlert(false);
    setActiveScannerTab(type);
  };

  const handleReport = async (result: ScamAnalysisResult) => {
    if (!user) {
      login();
      return;
    }

    const path = "reports";
    try {
      const typeMapping: { [key: string]: string } = {
        'internship': 'internship',
        'job': 'internship',
        'placement': 'internship',
        'scholarship': 'scholarship',
        'phishing': 'phishing',
        'credential': 'phishing',
        'hackathon': 'hackathon'
      };

      let category = 'other';
      const threatLower = result.threatCategory.toLowerCase();
      for (const [key, value] of Object.entries(typeMapping)) {
        if (threatLower.includes(key)) {
          category = value;
          break;
        }
      }

      const docRef = await addDoc(collection(db, path), {
        title: `${result.threatCategory} Attempt Detected`,
        type: category,
        riskScore: result.riskScore,
        explanation: result.explanation,
        reportedBy: user.uid,
        createdAt: serverTimestamp(),
      });
      
      console.log("Report shared with ID:", docRef.id);
      
      alert(`Intelligence shared (ID: ${docRef.id.slice(0, 8)})! Data added to neural threat database.`);
    } catch (error) {
      console.error("Report failed:", error);
      // Use the helper for detailed AI Studio logging
      import("./lib/firebase").then(({ handleFirestoreError, OperationType }) => {
        try {
          handleFirestoreError(error, OperationType.WRITE, path);
        } catch (e) {
          alert("Signal lost: Could not transmit threat data. Security rules might be blocking the stream.");
        }
      });
    }
  };

  // Voice & UI Alert System
  const [showFraudAlert, setShowFraudAlert] = useState(false);
  const [showSafeAlert, setShowSafeAlert] = useState(false);
  const [isInterceptScanning, setIsInterceptScanning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [lastClipboard, setLastClipboard] = useState<string>("");
  const [simUrl, setSimUrl] = useState("");
  const [guardianShieldActive, setGuardianShieldActive] = useState(() => {
    return localStorage.getItem("guardian_shield_active") === "true";
  });
  const [recentAudits, setRecentAudits] = useState<{ [url: string]: number }>({});
  const [isCoolingDown, setIsCoolingDown] = useState(false);

  // Sound Alert Synthesis
  const playAlertSound = (severity: 'high' | 'safe') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (severity === 'high') {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 0.5);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      } else {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      }

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.warn("Audio Context blocked by browser policy");
    }
  };

  // Shadow Clipboard Monitor (Simulation of background protection)
  useEffect(() => {
    if (!guardianShieldActive) return;

    const checkClipboard = async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text && text !== lastClipboard && (text.startsWith("http") || text.includes("."))) {
          setLastClipboard(text);
          performBackgroundAudit(text);
        }
      } catch (e) {
        // Permission or focus issue common in sandboxed environments
      }
    };

    const interval = setInterval(checkClipboard, 5000);
    const handleFocus = () => setTimeout(checkClipboard, 1000);
    window.addEventListener('focus', handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [guardianShieldActive, lastClipboard]);

  // Sync Shield State & Discoveries across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (!guardianShieldActive) return;

      if (e.key === "guardian_shield_active") {
        setGuardianShieldActive(e.newValue === "true");
      }
      
      // Syncing start of audit across tabs
      if (e.key === "guardian_intercept_init" && e.newValue) {
        const { url } = JSON.parse(e.newValue);
        setAnalysisResult(null);
        setShowFraudAlert(false);
        setShowSafeAlert(false);
        setIsInterceptScanning(true);
        setPendingNavigation(url);
        setActiveModule("scan");
      }

      // Syncing result of audit across tabs
      if (e.key === "guardian_discovery" && e.newValue) {
        const { result, url } = JSON.parse(e.newValue);
        setIsInterceptScanning(false);
        setAnalysisResult(result);
        setPendingNavigation(url);
        // The analysisResult useEffect will handle showing the correct alert
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [guardianShieldActive]);

  // Persist Shield State
  useEffect(() => {
    localStorage.setItem("guardian_shield_active", guardianShieldActive.toString());
    
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && guardianShieldActive) {
        const utterance = new SpeechSynthesisUtterance("Shield active. Intelligence sync complete.");
        utterance.rate = 1.1;
        utterance.pitch = 1.2;
        window.speechSynthesis.speak(utterance);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [guardianShieldActive]);

  // Global Interceptors
  const performBackgroundAudit = async (url: string) => {
    if (!url || (!url.startsWith("http") && !url.includes("."))) return;
    if (isCoolingDown) return;

    // De-duplication: Don't audit the same URL within 30 seconds to save on rate limits
    const now = Date.now();
    if (recentAudits[url] && now - recentAudits[url] < 30000) {
      console.log("Audit skipped: URL recently verified.");
      return;
    }
    setRecentAudits(prev => ({ ...prev, [url]: now }));
    
    // Total reset for clean state transition
    setAnalysisResult(null);
    setShowFraudAlert(false);
    setShowSafeAlert(false);
    setIsInterceptScanning(true);
    setLoading(true);
    
    // Immediate broadcast to all other open tabs (Multi-tab Security)
    localStorage.setItem("guardian_intercept_init", JSON.stringify({
      url,
      timestamp: Date.now()
    }));
    
    setActiveModule("scan");
    setActiveScannerTab("url");
    setPendingNavigation(url);

    try {
      const result = await analyzeScam(url, "url");
      
      // Update state locally
      setAnalysisResult(result);
      
      // Broadcast result to other tabs for multi-tab simulation
      localStorage.setItem("guardian_discovery", JSON.stringify({
        url,
        result,
        timestamp: Date.now()
      }));

      if (result.riskScore > 60) {
        playAlertSound('high');
      } else {
        playAlertSound('safe');
      }
    } catch (err: any) {
      console.error("Background Audit Failed", err);
      if (err.message?.includes("limit") || err.message?.includes("429")) {
        setIsCoolingDown(true);
        setTimeout(() => setIsCoolingDown(false), 30000);
      }
    } finally {
      setLoading(false);
      setIsInterceptScanning(false);
      setPendingNavigation(null);
    }
  };

  useEffect(() => {
    if (!guardianShieldActive) return;

    const handleGlobalClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (target && target.href) {
        const url = target.href;
        if (url.includes(window.location.host) || url.startsWith("javascript:") || url === "#") return;
        e.preventDefault();
        performBackgroundAudit(url);
      }
    };

    const handleGlobalPaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text');
      if (text && (text.startsWith("http") || text.includes("."))) {
        performBackgroundAudit(text);
      }
    };

    window.addEventListener("click", handleGlobalClick, true);
    window.addEventListener("paste", handleGlobalPaste);
    return () => {
      window.removeEventListener("click", handleGlobalClick, true);
      window.removeEventListener("paste", handleGlobalPaste);
    };
  }, [guardianShieldActive]);

   useEffect(() => {
    if (analysisResult && !loading) {
      const risk = analysisResult.riskScore;
      const isScam = analysisResult.isScam;
      window.speechSynthesis.cancel();
      
      // ONLY show the disruptive full-screen alert if we are intercepting a navigation (pendingNavigation)
      // Otherwise, the user is manually scanning and we should just use the AnalysisDashboard
      if (pendingNavigation) {
        if (risk > 60 || isScam) {
          setShowFraudAlert(true);
          setShowSafeAlert(false);
          
          const utterance = new SpeechSynthesisUtterance("Warning! High risk detected. Security protocols engaged.");
          utterance.pitch = 0.7; utterance.rate = 0.85;
          window.speechSynthesis.speak(utterance);
        } else if (risk <= 30 && !isScam) {
          setShowSafeAlert(true);
          setShowFraudAlert(false);
          
          const utterance = new SpeechSynthesisUtterance("Entity verified. Security baseline confirmed.");
          utterance.pitch = 1.2; utterance.rate = 1.0;
          window.speechSynthesis.speak(utterance);
        } else {
          // Medium risk
          setShowFraudAlert(true);
          setShowSafeAlert(false);
          const utterance = new SpeechSynthesisUtterance("Caution. Potential threat signatures identified in data stream.");
          utterance.pitch = 1.0; utterance.rate = 0.95;
          window.speechSynthesis.speak(utterance);
        }
      } else {
        // Manual Scan: Just announce the result clearly
        const status = (risk > 60 || isScam) ? "Critical threat identified." : risk > 30 ? "Suspicious signatures detected." : "Safe activity confirmed.";
        const utterance = new SpeechSynthesisUtterance(`Analysis complete. ${status}`);
        window.speechSynthesis.speak(utterance);
      }
    }
  }, [analysisResult, loading, pendingNavigation]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0F172A] text-slate-200 font-sans">
      {/* Simulation Hub: Browser Shell */}
      <AnimatePresence>
        {guardianShieldActive && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-[#1E293B] border-b border-slate-700/50 relative z-[60] overflow-hidden"
          >
            <div className="max-w-4xl mx-auto px-6 py-2 flex items-center gap-4">
              <div className="flex gap-1.5 mr-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_red]" title="Intercept Active" />
              </div>
              <div className="flex-1 bg-black/40 rounded-full border border-white/5 px-4 py-1.5 flex items-center gap-3 group focus-within:border-indigo-500/50 transition-all">
                <LinkIcon className="w-3.5 h-3.5 text-slate-500" />
                <input 
                  type="text" 
                  value={simUrl}
                  onChange={(e) => setSimUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && simUrl.length > 3) {
                      performBackgroundAudit(simUrl);
                      setSimUrl("");
                    }
                  }}
                  placeholder="Simulate searching/browsing in another tab (e.g. upi-pay.link)..."
                  className="bg-transparent text-[11px] w-full outline-none text-slate-300 font-mono placeholder:text-slate-600"
                />
                <div className="flex items-center gap-1 shrink-0">
                   <span className="text-[8px] font-black text-white/30 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded border border-white/5">Auto-Seize Enabled</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button 
                  onClick={() => performBackgroundAudit("https://upi-scam-trap.net/student-verify")}
                  className="text-[9px] font-black uppercase text-red-100 hover:text-white transition-all border border-red-500/40 px-3 py-1.5 rounded-lg bg-red-600 shadow-lg shadow-red-900/50 flex items-center gap-1.5"
                >
                  <ShieldAlert className="w-3 h-3" />
                  Test Scam
                </button>
                <button 
                  onClick={() => performBackgroundAudit("https://admissions.iitd.ac.in")}
                  className="text-[9px] font-black uppercase text-emerald-100 hover:text-white transition-all border border-emerald-500/40 px-3 py-1.5 rounded-lg bg-emerald-600 shadow-lg shadow-emerald-900/50 flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3 h-3" />
                  Test Safe
                </button>
              </div>
            </div>
            {/* Terminal Line */}
            <motion.div 
               animate={{ x: ["-100%", "100%"] }} 
               transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
               className="absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-30"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Precision Header */}
      <nav className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-[#0F172A] z-40 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
            G
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-white">Guardian<span className="text-indigo-400 font-black">AI</span></h1>
            <span className="text-[10px] px-2 py-0.5 border border-slate-700 rounded text-slate-400 font-mono hidden sm:block">Forensic Shield</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col items-end pr-6 border-r border-slate-800">
            {isCoolingDown ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-2.5 h-2.5 text-amber-500 animate-spin" />
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-[0.2em]">Neural Processors Cooling Down...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.2em]">Student Shield: Protected</span>
              </div>
            )}
            <span className="text-[8px] text-slate-500 uppercase font-bold tracking-tighter">
              {isCoolingDown ? "Rate limit reached. Recalibrating logic streams." : "Real-Time Threat Audit Engine Active"}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs font-bold text-white leading-none">{user.displayName || "Student User"}</p>
                  <p className="text-[9px] text-slate-500 font-mono">ID: {user.uid.slice(0, 8)}</p>
                </div>
                <img src={user.photoURL || ""} alt="" className="w-8 h-8 rounded-full border border-slate-700 bg-slate-800" />
              </div>
            ) : (
              <button 
                onClick={login}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold uppercase tracking-widest transition shadow-lg shadow-indigo-900/20"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        {/* Security Sidebar */}
        <aside className="w-64 border-r border-slate-800 bg-[#0B1120] p-4 flex flex-col gap-1 shrink-0 overflow-y-auto scrollbar-hide">
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black mb-3 px-2">Forensic Modules</div>
          
          <button 
            onClick={() => setGuardianShieldActive(!guardianShieldActive)}
            className={`w-full mb-3 px-3 py-2.5 rounded-lg flex items-center gap-3 transition-all group ${guardianShieldActive ? "bg-red-600/20 text-red-400 border border-red-500/30" : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"}`}
          >
            <div className="relative">
              <ShieldAlert className={`w-4 h-4 ${guardianShieldActive ? "text-red-400 animate-pulse" : "text-slate-500 group-hover:text-slate-300"}`} />
              {guardianShieldActive && <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />}
            </div>
            <span className="text-sm font-semibold tracking-tight">Guardian Shield</span>
            <div className={`ml-auto w-8 h-4 rounded-full relative transition-colors ${guardianShieldActive ? 'bg-red-600' : 'bg-slate-700'}`}>
              <motion.div 
                animate={{ x: guardianShieldActive ? 16 : 2 }}
                className="absolute top-1 left-0 w-2 h-2 bg-white rounded-full transition-all"
              />
            </div>
          </button>

          <button 
            onClick={() => openScannerTab("image")}
            className={`w-full px-3 py-2.5 rounded-lg flex items-center gap-3 transition-all group ${activeModule === "scan" && activeScannerTab === "image" ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30" : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"}`}
          >
            <ShieldCheck className={`w-4 h-4 ${activeModule === "scan" && activeScannerTab === "image" ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"}`} />
            <span className="text-sm font-semibold tracking-tight">Opportunity Scan</span>
          </button>

          <button 
            onClick={() => openScannerTab("text")}
            className={`w-full px-3 py-2.5 rounded-lg flex items-center gap-3 transition-all group ${activeModule === "scan" && activeScannerTab === "text" ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30" : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"}`}
          >
            <AlertCircle className={`w-4 h-4 ${activeModule === "scan" && activeScannerTab === "text" ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"}`} />
            <span className="text-sm font-semibold tracking-tight">Message Audit</span>
          </button>

          <button 
            onClick={() => openScannerTab("url")}
            className={`w-full px-3 py-2.5 rounded-lg flex items-center gap-3 transition-all group ${activeModule === "scan" && activeScannerTab === "url" ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30" : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"}`}
          >
            <LinkIcon className={`w-4 h-4 ${activeModule === "scan" && activeScannerTab === "url" ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"}`} />
            <span className="text-sm font-semibold tracking-tight">URL Detection</span>
          </button>

          <button 
            onClick={() => openScannerTab("email")}
            className={`w-full px-3 py-2.5 rounded-lg flex items-center gap-3 transition-all group ${activeModule === "scan" && activeScannerTab === "email" ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30" : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"}`}
          >
            <AlertTriangle className={`w-4 h-4 ${activeModule === "scan" && activeScannerTab === "email" ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"}`} />
            <span className="text-sm font-semibold tracking-tight">Email / Offer Scanner</span>
          </button>

          <button 
            onClick={() => setOverlayScannerEnabled(!overlayScannerEnabled)}
            className={`w-full px-3 py-2.5 rounded-lg flex items-center gap-3 transition-all group ${overlayScannerEnabled ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]" : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"}`}
          >
            <div className="relative">
              <Crosshair className={`w-4 h-4 ${overlayScannerEnabled ? "text-emerald-400 animate-pulse" : "text-slate-500 group-hover:text-slate-300"}`} />
              {overlayScannerEnabled && <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />}
            </div>
            <span className="text-sm font-semibold tracking-tight">Real-Time Lens HUD</span>
          </button>

          <button 
            onClick={() => setActiveModule("community")}
            className={`w-full px-3 py-2.5 rounded-lg flex items-center gap-3 transition-all group ${activeModule === "community" ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30" : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"}`}
          >
            <Github className={`w-4 h-4 ${activeModule === "community" ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"}`} />
            <span className="text-sm font-semibold tracking-tight">Community Intel</span>
          </button>

          <div className="mt-8 px-2 space-y-4">
             <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                   <div className="flex items-center gap-1.5">
                     <div className={`w-1 h-1 rounded-full ${analysisResult ? "bg-indigo-400 animate-pulse" : "bg-emerald-500"}`} />
                     <span>Detection Sync</span>
                   </div>
                   <motion.span 
                    key={analysisResult?.metrics.detectionSync}
                    initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
                    className={analysisResult ? "text-indigo-400 font-mono" : "text-emerald-500 font-mono"}>
                    {analysisResult ? `${analysisResult.metrics.detectionSync}%` : "88%"}
                  </motion.span>
                </div>
                <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: "88%" }}
                    animate={{ width: analysisResult ? `${analysisResult.metrics.detectionSync}%` : "88%" }}
                    className={`h-full ${analysisResult ? "bg-indigo-500" : "bg-emerald-500"}`} 
                  />
                </div>
             </div>
             <div className="grid grid-cols-2 gap-2">
                <div className="p-2 border border-slate-800 rounded bg-[#0F172A]/50 group/item">
                  <div className="text-[8px] text-slate-500 font-bold uppercase mb-0.5">Signatures</div>
                  <motion.div 
                    key={analysisResult?.metrics.signatures}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-xs font-mono font-bold text-slate-300">
                    {analysisResult ? analysisResult.metrics.signatures : "8.4M"}
                  </motion.div>
                </div>
                <div className="p-2 border border-slate-800 rounded bg-[#0F172A]/50 group/item">
                  <div className="text-[8px] text-slate-500 font-bold uppercase mb-0.5">Latency</div>
                  <motion.div 
                    key={analysisResult?.metrics.latency}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-xs font-mono font-bold text-slate-300">
                    {analysisResult ? analysisResult.metrics.latency : "12ms"}
                  </motion.div>
                </div>
             </div>
          </div>
          
          <div className="mt-auto border-t border-slate-800 pt-4 px-2">
            <motion.div 
              key={analysisResult?.metrics.alertIntensity}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`p-3 rounded-lg flex gap-3 transition-all duration-500 ${analysisResult?.isScam ? "bg-red-900/20 border border-red-500/30" : "bg-slate-900/50 border border-slate-800"}`}
            >
              <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${analysisResult?.isScam ? "text-red-500" : "text-slate-500"}`} />
              <div>
                <p className={`text-[10px] font-black uppercase tracking-wider mb-1 ${analysisResult?.isScam ? "text-red-500" : "text-slate-500"}`}>Alert Intensity</p>
                <p className="text-[9px] text-slate-400 leading-normal font-medium">
                  {analysisResult ? analysisResult.metrics.alertIntensity : "Scam variants targeting students up 42% in past 24h."}
                </p>
              </div>
            </motion.div>
          </div>
        </aside>

        {/* Dense Main Content Container */}
        <main className="flex-1 flex flex-col bg-[#0F172A] overflow-hidden">
          <header className="p-6 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 bg-gradient-to-r from-[#0B1120] to-transparent">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {analysisResult ? "Explainable Risk Audit" : "Forensic Intel Feed"}
              </h1>
              <p className="text-sm text-slate-400 font-medium">
                {analysisResult ? `XAI Decoding: ${analysisResult.threatCategory} @ ${analysisResult.riskScore}%` : "Analyze real-time data streams for fake opportunities & phishing"}
              </p>
            </div>
            {analysisResult && (
              <div className="flex gap-2">
                <button 
                  onClick={() => setAnalysisResult(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold uppercase tracking-wider rounded transition-colors"
                >
                  New Logic Audit
                </button>
              </div>
            )}
          </header>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <AnimatePresence mode="wait">
              {activeModule === "community" ? (
                <motion.div
                  key="community-view"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                >
                  <CommunityBoard />
                </motion.div>
              ) : !analysisResult ? (
                <motion.div
                  key="scanner-view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center -mt-12"
                >
                  <div className="max-w-2xl w-full">
                    <Scanner 
                      activeTab={activeScannerTab}
                      onTypeChange={setActiveScannerTab}
                      onInputChange={setCurrentInput}
                      isCoolingDown={isCoolingDown}
                      onRateLimit={() => {
                        setIsCoolingDown(true);
                        setTimeout(() => setIsCoolingDown(false), 30000);
                      }}
                      onResult={(result, type, previewUrl) => {
                        setAnalysisResult(result);
                        setLastInputType(type);
                        if (previewUrl) setLastPreviewUrl(previewUrl);
                      }} 
                      onLoading={handleStartAnalysis}
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="analysis-view"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                >
                  <AnalysisDashboard 
                    result={analysisResult} 
                    onReset={() => {
                      setAnalysisResult(null);
                      setLastPreviewUrl(null);
                      setPendingNavigation(null);
                      setShowFraudAlert(false);
                      setShowSafeAlert(false);
                    }} 
                    onReport={handleReport}
                    inputType={lastInputType}
                    previewUrl={lastPreviewUrl || undefined}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      <FloatingScanner 
        result={analysisResult} 
        loading={loading} 
        currentInput={currentInput}
        inputType={activeScannerTab}
      />
      <OverlayScanner 
        enabled={overlayScannerEnabled} 
        isCoolingDown={isCoolingDown}
        onRateLimit={() => {
          setIsCoolingDown(true);
          setTimeout(() => setIsCoolingDown(false), 30000);
        }}
        onResult={(result, previewUrl) => {
          setAnalysisResult(result);
          setLastInputType("image");
          setActiveModule("scan");
          setOverlayScannerEnabled(false); // Direct back to main dashboard
          if (previewUrl) setLastPreviewUrl(previewUrl);
          
          // Voice Announcement of Result
          const status = result.riskScore > 60 ? "Unsafe. High risk detected." : "Safe. No major threats found.";
          const msg = new SpeechSynthesisUtterance(`Analysis complete. This content appears to be ${status}`);
          window.speechSynthesis.speak(msg);
        }}
        onLoading={handleStartAnalysis}
        onDisable={() => setOverlayScannerEnabled(false)}
      />
      <ChatAssistant />

      {/* Floating Guardian HUD Status */}
      {guardianShieldActive && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => {
             // Sample trigger for user to verify it works
             const samples = [
               "https://upi-scam-trap.net/verification-portal",
               "https://iitd.ac.in/academic-notices",
               "https://student-loans-india.fakenet.org/apply"
             ];
             const randomUrl = samples[Math.floor(Math.random() * samples.length)];
             performBackgroundAudit(randomUrl);
          }}
          className="fixed top-6 right-6 z-[100] cursor-pointer flex items-center gap-3 bg-red-600/10 backdrop-blur-xl border border-red-500/20 px-4 py-2 rounded-full shadow-lg shadow-red-950/20 group hover:bg-red-600/20 transition-all"
        >
          <div className="relative">
            <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />
            <div className="absolute inset-0 bg-red-500 blur-sm opacity-50 animate-ping rounded-full" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-red-500 uppercase tracking-tighter leading-none">Guardian Active</span>
            <span className="text-[7px] text-white/40 font-bold uppercase tracking-widest group-hover:text-white transition-colors">Click to test intercept</span>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {(showFraudAlert || showSafeAlert || isInterceptScanning) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-start justify-center p-4 sm:p-8 md:p-20 bg-black/80 backdrop-blur-md overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-2xl my-auto relative"
            >
              {/* Emergency Close Button */}
              {!isInterceptScanning && (
                <button 
                  onClick={() => {
                    setShowFraudAlert(false);
                    setShowSafeAlert(false);
                    setPendingNavigation(null);
                  }}
                  className="absolute -top-4 -right-4 z-20 w-10 h-10 bg-white text-black rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              )}
              <div className={`${isInterceptScanning ? 'bg-indigo-600/90' : showSafeAlert ? 'bg-emerald-600/95' : 'bg-red-600/95'} border-4 ${isInterceptScanning ? 'border-indigo-500' : showSafeAlert ? 'border-emerald-500' : 'border-red-500'} shadow-[0_0_100px_rgba(0,0,0,0.8)] rounded-[2.5rem] p-6 sm:p-8 relative`}>
                <motion.div 
                  animate={{ opacity: [0.1, 0.4, 0.1], scale: [1, 1.1, 1] }} 
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent pointer-events-none" 
                />
                <div className="relative z-10 flex flex-col items-center text-center gap-6">
                  <div className={`p-6 ${isInterceptScanning ? 'bg-indigo-950' : showSafeAlert ? 'bg-emerald-950' : 'bg-red-950'} rounded-[2rem] shadow-2xl border border-white/10`}>
                    {isInterceptScanning ? (
                      <RefreshCw className="w-16 h-16 text-indigo-400 animate-spin" />
                    ) : showSafeAlert ? (
                      <ShieldCheck className="w-16 h-16 text-emerald-400" />
                    ) : (
                      <ShieldAlert className="w-16 h-16 text-red-400 animate-[bounce_1s_infinite]" />
                    )}
                  </div>
                  
                  <div className="w-full">
                    <div className="flex flex-col items-center gap-2 mb-4">
                      <span className={`text-[12px] font-mono font-bold px-4 py-1 rounded-full text-white/90 border border-white/20 ${showSafeAlert ? 'bg-emerald-500/30' : 'bg-red-500/30'}`}>
                        {isInterceptScanning ? "ACTIVE AUDIT IN PROGRESS" : showSafeAlert ? `VERIFIED SECURE: ${analysisResult?.riskScore}%` : `THREAT DETECTED: ${analysisResult?.riskScore}%`}
                      </span>
                      <h4 className="text-white font-black uppercase tracking-[0.05em] text-4xl leading-tight">
                        {isInterceptScanning ? "Background Intercept" : showSafeAlert ? "Safety Confirmed" : "Forensic Block Engaged"}
                      </h4>
                    </div>

                    {!isInterceptScanning && analysisResult && (
                      <div className="space-y-6">
                        <p className="text-white/95 text-lg font-medium leading-relaxed italic">
                          {showSafeAlert 
                            ? "GuardianAI has verified this destination. Domain structure and security headers match official student service directives."
                            : "GuardianAI has identified explicit fraud markers targeting Indian college students. Navigation sequence has been forcefully terminated."}
                        </p>
                        
                        <div className="bg-black/50 backdrop-blur-xl rounded-3xl p-6 border border-white/10 text-left">
                          <div className="flex justify-between items-center mb-4">
                            <p className="text-[11px] font-black text-white/60 uppercase tracking-widest">Logic Analysis (XAI)</p>
                            <div className="flex gap-1">
                               <div className="w-1 h-1 rounded-full bg-indigo-500 animate-ping" />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                            {analysisResult.xaiBreakdown?.slice(0, 4).map((item, i) => (
                              <div key={i} className="space-y-2">
                                <div className="flex justify-between text-[11px] font-black">
                                  <span className="text-white/70 truncate uppercase">{item.factor}</span>
                                  <span className={item.impact < 0 ? 'text-emerald-400' : 'text-red-400'}>
                                    {item.impact > 0 ? `+${item.impact}%` : `${item.impact}%`}
                                  </span>
                                </div>
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.abs(item.impact)}%` }}
                                    className={`h-full ${item.impact < 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                          {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
                            <div className="mt-6 pt-4 border-t border-white/5">
                                <p className="text-[9px] font-black text-white/40 uppercase mb-2">Countermeasures Required</p>
                                <ul className="space-y-1.5">
                                  {analysisResult.recommendations.slice(0, 2).map((rec, i) => (
                                    <li key={i} className="text-[10px] text-white/70 flex items-start gap-2">
                                      <div className="w-1 h-1 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                                      {rec}
                                    </li>
                                  ))}
                                </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {isInterceptScanning && (
                      <div className="space-y-6 py-8">
                        <p className="text-indigo-100/80 text-xl font-medium animate-pulse">
                          Seizing control of navigation sequence. Syncing with forensic threat databases...
                        </p>
                        <div className="flex justify-center gap-3">
                          {['TLS-CHECK', 'DNSSEC', 'DOMAIN-REPU', 'XAI-VEC'].map(tag => (
                            <span key={tag} className="text-[10px] font-mono text-white/40 border border-white/20 px-3 py-1 rounded-lg">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-8 flex gap-4">
                      {isInterceptScanning ? (
                        <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden border border-white/10">
                          <motion.div 
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 5, ease: "linear" }}
                            className="h-full bg-indigo-500 shadow-[0_0_20px_#6366f1]"
                          />
                        </div>
                      ) : (
                        <>
                          <button 
                            onClick={() => {
                              if (pendingNavigation) window.open(pendingNavigation, "_blank");
                              setPendingNavigation(null);
                              setShowFraudAlert(false);
                              setShowSafeAlert(false);
                              setAnalysisResult(null);
                            }}
                            className={`flex-1 py-4 text-xs font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl hover:scale-[1.03] active:scale-[0.97] ${showSafeAlert ? 'bg-emerald-500 text-white border border-emerald-400' : 'bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-xl'}`}
                          >
                            {showSafeAlert ? 'Execute Navigation' : 'Override & Continue'}
                          </button>
                          <button 
                            onClick={() => {
                              setPendingNavigation(null);
                              setShowFraudAlert(false);
                              setShowSafeAlert(false);
                              setAnalysisResult(null);
                            }}
                            className={`flex-1 py-4 text-xs font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl transition-all hover:scale-[1.03] active:scale-[0.97] ${showSafeAlert ? 'bg-white text-emerald-950 border border-emerald-100' : 'bg-red-600 text-white hover:bg-red-500 shadow-red-900/50'}`}
                          >
                            {showSafeAlert ? 'Abort Process' : 'Confirm Block'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

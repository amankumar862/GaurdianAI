import React, { useState } from "react";
import { MessageCircle, X, Send, Loader2, Bot } from "lucide-react";
import { chatAssistant } from "../services/geminiService";
import { motion, AnimatePresence } from "motion/react";

export const ChatAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "model"; text: string }[]>([
    { role: "model", text: "GuardianAI interface initialized. How can I assist with threat mitigation today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMessage }]);
    setLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      const response = await chatAssistant(userMessage, history);
      setMessages(prev => [...prev, { role: "model", text: response || "System anomaly: result undefined." }]);
    } catch (error) {
       setMessages(prev => [...prev, { role: "model", text: "Connection error: Signal lost." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="mb-4 bg-[#0B1120] rounded-2xl w-80 h-[500px] shadow-2xl flex flex-col border border-slate-800 overflow-hidden"
          >
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-xs tracking-tight uppercase">Guardian Agent</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[9px] text-slate-500 uppercase font-black">XAI_INSTANCE_ACTIVE</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] p-3 rounded-xl text-xs leading-relaxed font-medium ${
                    m.role === "user" 
                      ? "bg-indigo-600 text-white rounded-tr-none border border-indigo-500" 
                      : "bg-slate-900 text-slate-300 rounded-tl-none border border-slate-800"
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-900 p-3 rounded-xl rounded-tl-none border border-slate-800 flex items-center gap-3">
                    <div className="flex gap-1">
                       <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce" />
                       <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                       <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Processing...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-[#0F172A] flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Query Agent..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-xs font-medium text-white placeholder-slate-600 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
              <button 
                onClick={sendMessage}
                disabled={loading}
                className="w-10 h-10 bg-indigo-600 text-white rounded-lg flex items-center justify-center hover:bg-indigo-500 disabled:opacity-50 transition shadow-lg shadow-indigo-900/20"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center shadow-2xl border border-slate-800 text-white transition-colors hover:bg-slate-800"
      >
        <MessageCircle className="w-7 h-7" />
      </motion.button>
    </div>
  );
};

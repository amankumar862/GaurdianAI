import React from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { ShieldAlert, Users, Calendar, ArrowRight, RefreshCw } from "lucide-react";
import { motion } from "motion/react";

export interface ScamReport {
  id: string;
  title: string;
  type: string;
  riskScore: number;
  explanation: string;
  reportedBy: string;
  createdAt: any;
}

export const CommunityBoard: React.FC = () => {
  const [reports, setReports] = React.useState<ScamReport[]>([]);
  const [stats, setStats] = React.useState({ total: 0, critical: 0, activeThreats: 0 });
  const [error, setError] = React.useState<string | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let isSubscribed = true;
    setIsLoading(true);
    
    // Fallback query to maximize getting results even if indices are missing
    const q = query(collection(db, "reports"), limit(50));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!isSubscribed) return;
      
      setError(null);
      setIsLoading(false);
      console.log(`Neural snapshot received. Reports: ${snapshot.size}`);

      const data = snapshot.docs.map(doc => {
        const docData = doc.data();
        let timestamp = docData.createdAt;
        
        // Handle all timestamp formats (Firestore Timestamp, Date, or Number)
        if (!timestamp) {
          timestamp = { seconds: Date.now() / 1000 };
        } else if (typeof timestamp.toDate === 'function') {
          const date = timestamp.toDate();
          timestamp = { seconds: Math.floor(date.getTime() / 1000) };
        } else if (timestamp instanceof Date) {
          timestamp = { seconds: Math.floor(timestamp.getTime() / 1000) };
        } else if (typeof timestamp === 'number') {
           timestamp = { seconds: Math.floor(timestamp / 1000) };
        }

        return {
          id: doc.id,
          ...docData,
          createdAt: timestamp
        };
      }) as ScamReport[];

      // In-memory sort by newest first (descending)
      data.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      
      setReports(data);
      
      const critical = data.filter(r => r.riskScore > 80).length;
      setStats({
        total: snapshot.size,
        critical,
        activeThreats: data.length
      });
    }, (err) => {
      if (!isSubscribed) return;
      console.error("Board sync failed", err);
      setIsLoading(false);
      try {
        handleFirestoreError(err, OperationType.LIST, "reports");
      } catch (formattedError: any) {
        setError(`Neural disruption detected: ${formattedError.message}`);
      }
    });

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [refreshKey]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#0B1120] p-4 rounded-xl border border-slate-800"
        >
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Intelligence</p>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-black text-white">{stats.total}</span>
            <span className="text-[10px] text-indigo-400 font-bold mb-1">Reports</span>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-[#0B1120] p-4 rounded-xl border border-slate-800"
        >
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Critical Vectors</p>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-black text-red-500">{stats.critical}</span>
            <span className="text-[10px] text-red-400/50 font-bold mb-1">High Risk</span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-[#0B1120] p-4 rounded-xl border border-slate-800"
        >
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Global Confidence</p>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-black text-emerald-500">92%</span>
            <span className="text-[10px] text-emerald-400/50 font-bold mb-1">Neural</span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-[#0B1120] p-4 rounded-xl border border-slate-800"
        >
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Network Nodes</p>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-black text-indigo-400">3.8k</span>
            <span className="text-[10px] text-indigo-400/50 font-bold mb-1">Active</span>
          </div>
        </motion.div>
      </div>

      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Active Scam Repository</h2>
          <p className="text-xs text-slate-500 font-mono uppercase tracking-widest mt-1">Live Crowd-sourced Intel</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setRefreshKey(prev => prev + 1)}
            className="px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 rounded text-indigo-400 font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95"
          >
            Force Neural Sync
          </button>
        </div>
      </div>

      {/* Knowledge Base Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="bg-indigo-600/10 border border-indigo-500/30 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <ShieldAlert className="w-24 h-24 text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
               <ShieldAlert className="w-5 h-5 text-indigo-400" />
               Scam Pattern: The Fake MNC Internship
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
               Detected widely on LinkedIn/WhatsApp. Attackers impersonate Amazon/Google HR and ask for 'Internal Server Access Fees' or 'Laptop Security Deposit'.
            </p>
            <div className="flex flex-wrap gap-2">
               <span className="px-2 py-1 bg-red-500/20 text-red-400 text-[10px] font-black rounded uppercase">Advance Fee</span>
               <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-[10px] font-black rounded uppercase">Urgent Hire</span>
               <span className="px-2 py-1 bg-indigo-500/20 text-indigo-400 text-[10px] font-black rounded uppercase">Gmail HR</span>
            </div>
         </div>
         <div className="bg-emerald-600/10 border border-emerald-500/30 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <Users className="w-24 h-24 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
               <Users className="w-5 h-5 text-emerald-400" />
               Latest: 'Part-Time Tasks' Scam
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
               Users are paid ₹100 to like YouTube videos, then asked to invest ₹5000 for 'premium tasks' which results in total loss of funds.
            </p>
            <div className="flex flex-wrap gap-2">
               <span className="px-2 py-1 bg-red-500/20 text-red-400 text-[10px] font-black rounded uppercase">Investment Fraud</span>
               <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-[10px] font-black rounded uppercase">Telegram Based</span>
               <span className="px-2 py-1 bg-indigo-500/20 text-indigo-400 text-[10px] font-black rounded uppercase">High ROI</span>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {error && (
          <div className="col-span-full p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 text-xs font-bold text-center animate-pulse">
            {error}
          </div>
        )}
        {isLoading ? (
          <div className="col-span-full py-20 text-center">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.2em]">Synchronizing neural link...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-[#0B1120] rounded-2xl border border-dashed border-slate-800">
             <ShieldAlert className="w-12 h-12 text-slate-700 mx-auto mb-4" />
             <p className="text-slate-500 font-bold text-sm tracking-tight uppercase mb-2">No threats logged in current sector.</p>
             <button 
              onClick={() => setRefreshKey(prev => prev + 1)}
              className="px-6 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 rounded-lg text-indigo-400 font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"
             >
                Manually Probe Signal
             </button>
             <p className="text-[10px] text-slate-600 mt-4 max-w-xs mx-auto">
               Intelligence is shared community-wide. If you just shared a report, try probing the signal above.
             </p>
          </div>
        ) : (
          reports.map((report) => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#0B1120] p-5 rounded-xl border border-slate-800 hover:border-slate-600 transition-all group relative overflow-hidden"
            >
              <div className="bg-slate-900/50 absolute top-0 right-0 px-2 py-1 text-[8px] font-mono text-slate-600 uppercase border-l border-b border-slate-800">
                REF: {report.id.slice(0, 8)}
              </div>
              
              <div className="flex justify-between items-start mb-4">
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border
                  ${report.riskScore > 70 
                    ? "bg-red-500/10 text-red-500 border-red-500/20" 
                    : "bg-amber-500/10 text-amber-500 border-amber-500/20"}
                `}>
                  {report.type}
                </span>
                <span className="text-[9px] font-bold text-slate-600 flex items-center gap-1 font-mono uppercase">
                  <Calendar className="w-2.5 h-2.5" />
                  {new Date(report.createdAt?.seconds * 1000).toLocaleDateString()}
                </span>
              </div>
              
              <h3 className="text-sm font-bold text-white mb-2 leading-snug">
                {report.title}
              </h3>
              
              <p className="text-[11px] text-slate-500 line-clamp-2 mb-4 leading-relaxed font-medium italic">
                "{report.explanation}"
              </p>
              
              <div className="flex items-center justify-between pt-3 border-t border-slate-800/50">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center text-[8px] font-black text-slate-500 border border-slate-700">
                    S
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">Node_{report.reportedBy.slice(0, 4)}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black text-white px-2 py-1 bg-slate-900 border border-slate-800 rounded">
                   <ShieldAlert className="w-3 h-3 text-red-500" />
                   {report.riskScore}%
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

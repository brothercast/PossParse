import React, { useState } from 'react';
import { Flask, CheckCircle, ArrowRight, Layout, RefreshCw } from 'lucide-react';

// 1. THE PHASE COLORS (From your Root Vars)
const COLORS = {
  discovery: '#e91e63',  // Pink
  engagement: '#00bcd4', // Cyan
  action: '#9c27b0',     // Purple
  completion: '#ffc107', // Amber
  legacy: '#66bd0e',     // Green
};

export default function SpeculationInterface() {
  const [viewMode, setViewMode] = useState('input'); // 'input' (Vivid) or 'outcome' (Subdued)

  return (
    <div className="relative min-h-screen w-full overflow-hidden font-sans selection:bg-cyan-200 text-slate-800 transition-all duration-1000">
      
      {/* ==========================================
          THE LIVING BACKGROUND (Aurora Mesh)
          This layer sits behind everything (-z-10)
         ========================================== */}
      <div className={`fixed inset-0 z-0 transition-all duration-[2000ms] ease-in-out
        ${viewMode === 'input' ? 'opacity-100 scale-100' : 'opacity-20 scale-110 grayscale-[30%]'}`}
      >
        {/* Grain Overlay for Texture */}
        <div className="absolute inset-0 z-10 opacity-20" 
             style={{backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`}}>
        </div>

        {/* Blob 1: Discovery (Pink) */}
        <div className="absolute top-[-10%] left-[-10%] w-[70vw] h-[70vw] rounded-full mix-blend-multiply filter blur-[80px] animate-blob1"
             style={{ backgroundColor: COLORS.discovery, opacity: 0.6 }}></div>
        
        {/* Blob 2: Engagement (Cyan) */}
        <div className="absolute top-[-10%] right-[-10%] w-[70vw] h-[70vw] rounded-full mix-blend-multiply filter blur-[80px] animate-blob2"
             style={{ backgroundColor: COLORS.engagement, opacity: 0.6 }}></div>

        {/* Blob 3: Action (Purple) */}
        <div className="absolute -bottom-8 left-[20%] w-[70vw] h-[70vw] rounded-full mix-blend-multiply filter blur-[80px] animate-blob3"
             style={{ backgroundColor: COLORS.action, opacity: 0.6 }}></div>

        {/* Blob 4: Completion (Amber) - Accent */}
        <div className="absolute top-[40%] right-[40%] w-[40vw] h-[40vw] rounded-full mix-blend-overlay filter blur-[60px] animate-blob4"
             style={{ backgroundColor: COLORS.completion, opacity: 0.4 }}></div>
      </div>


      {/* ==========================================
          THE APP SHELL (Console Housing)
          Sits on top (z-10)
         ========================================== */}
      <div className="relative z-10 flex flex-col items-center min-h-screen p-6">
        
        {/* Prototype Controls (For Demo Only) */}
        <div className="fixed top-4 right-4 z-50 flex gap-2 bg-white/80 backdrop-blur p-2 rounded-full border border-slate-200 shadow-sm">
          <button 
            onClick={() => setViewMode('input')}
            className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest transition-all
            ${viewMode === 'input' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            Input Mode
          </button>
          <button 
            onClick={() => setViewMode('outcome')}
            className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest transition-all
            ${viewMode === 'outcome' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            Outcome Mode
          </button>
        </div>


        {/* MAIN CONSOLE HOUSING */}
        <div className="w-full max-w-5xl transition-all duration-500 ease-out mt-10">
          
          {/* The "Double Bezel" Effect */}
          <div className="relative bg-white/90 backdrop-blur-xl rounded-[32px] shadow-[0_30px_60px_-12px_rgba(0,0,0,0.2)] border-4 border-white/50 p-1">
            {/* Inner Bezel */}
            <div className="bg-slate-50 rounded-[28px] border border-slate-200 overflow-hidden min-h-[600px] flex flex-col relative">
              
              {/* Horizon Brand Strip */}
              <div className="h-1.5 w-full bg-gradient-to-r from-cyan-400 to-cyan-300"></div>

              {/* ---- CONTENT AREA ---- */}
              
              {/* SCENARIO A: INPUT MODE */}
              {viewMode === 'input' && (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-fadeIn">
                  <div className="w-20 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center mb-6 border border-slate-100">
                    <Layout className="w-10 h-10 text-cyan-500" />
                  </div>
                  <h1 className="text-4xl md:text-6xl font-display font-black tracking-tight text-slate-800 mb-4" style={{ fontFamily: '"Righteous", cursive' }}>
                    WHAT IS POSSIBLE?
                  </h1>
                  <p className="text-lg text-slate-500 mb-12 max-w-xl mx-auto font-medium">
                    The Speculation Engine is standing by. Define the horizon, and we will engineer the path.
                  </p>
                  <div className="w-full max-w-2xl relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                    <input 
                      type="text" 
                      placeholder="E.g., Create a sustainable micro-factory..." 
                      className="relative w-full bg-white text-slate-900 text-xl p-6 rounded-full shadow-xl border-0 focus:ring-4 focus:ring-purple-500/20 transition-all text-center font-mono placeholder:text-slate-300 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* SCENARIO B: OUTCOME MODE */}
              {viewMode === 'outcome' && (
                <div className="flex-1 flex flex-col animate-fadeIn">
                  {/* Header */}
                  <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-cyan-100 text-cyan-700 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded">Active SSOL</span>
                        <span className="text-slate-400 text-xs tracking-widest">// ID: 992-A</span>
                      </div>
                      <h2 className="text-2xl font-bold text-slate-800" style={{ fontFamily: '"Righteous", cursive' }}>MICRO-FACTORY BETA</h2>
                    </div>
                    <div className="flex gap-2">
                       <div className="bg-slate-100 px-4 py-2 rounded-lg border border-slate-200">
                          <div className="text-[10px] uppercase font-bold text-slate-400">Health</div>
                          <div className="text-green-600 font-mono font-bold">98%</div>
                       </div>
                    </div>
                  </div>
                  
                  {/* Content Grid */}
                  <div className="flex-1 bg-slate-50/50 p-8 grid grid-cols-12 gap-8">
                    {/* Sidebar Info */}
                    <div className="col-span-3 space-y-6">
                       <div className="aspect-square rounded-2xl bg-white border-4 border-white shadow-lg overflow-hidden relative group">
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 group-hover:opacity-0 transition-opacity"></div>
                          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-900/80 to-transparent">
                            <div className="text-white text-xs font-mono">VISUALIZATION</div>
                          </div>
                       </div>
                    </div>
                    
                    {/* Main Data */}
                    <div className="col-span-9 space-y-4">
                       {['Discovery', 'Engagement', 'Action'].map((phase, i) => (
                         <div key={phase} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-4 group">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-inner
                              ${i === 0 ? 'bg-pink-500' : i === 1 ? 'bg-cyan-500' : 'bg-purple-500'}`}
                              style={{ fontFamily: '"Righteous", cursive' }}
                            >
                              {phase[0]}
                            </div>
                            <div className="flex-1">
                               <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide flex items-center gap-2">
                                 {phase} Phase
                                 {i === 0 && <CheckCircle className="w-4 h-4 text-green-500" />}
                               </h3>
                               <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                                  <div className={`h-full ${i === 0 ? 'w-full bg-green-500' : 'w-1/3 bg-slate-300'}`}></div>
                               </div>
                            </div>
                            <ArrowRight className="text-slate-300 group-hover:text-cyan-500 transition-colors" />
                         </div>
                       ))}
                    </div>
                  </div>

                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* CSS KEYFRAMES INJECTED FOR PROTOTYPE */}
      <style jsx>{`
        @keyframes blob1 {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes blob2 {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(-30px, -30px) scale(1.1); }
          66% { transform: translate(20px, 30px) scale(0.95); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes blob3 {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(50px, 50px) scale(1.2); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob1 { animation: blob1 12s infinite ease-in-out alternate; }
        .animate-blob2 { animation: blob2 15s infinite ease-in-out alternate; }
        .animate-blob3 { animation: blob3 18s infinite ease-in-out alternate; }
        .animate-blob4 { animation: blob2 20s infinite ease-in-out alternate; }
        
        .animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
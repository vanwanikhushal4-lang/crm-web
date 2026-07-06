import React from 'react';

export default function PipelineTab({ deals }) {
  const getDealsForStage = (stage) => {
    return deals.filter(
      (d) => d.stage.toLowerCase() === stage.toLowerCase() || 
             (stage === 'discussion' && d.stage.toLowerCase().includes('discussion')) ||
             (stage === 'proposal' && (d.stage.toLowerCase().includes('proposal') || d.stage.toLowerCase().includes('negotiation')))
    );
  };

  return (
    <div className="space-y-6 animate-fade">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Column 1: Leads */}
        <div className="bg-[#0c1220]/40 border border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Leads</span>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
              {getDealsForStage('lead').length}
            </span>
          </div>
          
          <div className="space-y-3">
            {getDealsForStage('lead').map((deal) => (
              <div key={deal.id} className="p-4 bg-slate-900/60 rounded-xl border border-white/5 hover:border-blue-500/20 transition-all duration-300">
                <h4 className="text-sm font-bold text-slate-200">{deal.customerName}</h4>
                <p className="text-xs text-slate-400 mt-0.5">{deal.companyName}</p>
                <p className="text-xs text-emerald-400 mt-2 font-mono">{deal.value}</p>
              </div>
            ))}
            {getDealsForStage('lead').length === 0 && (
              <p className="text-xs text-slate-500 py-4 text-center">No leads in pipeline</p>
            )}
          </div>
        </div>

        {/* Column 2: In Discussion */}
        <div className="bg-[#0c1220]/40 border border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Discussion</span>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
              {getDealsForStage('discussion').length}
            </span>
          </div>

          <div className="space-y-3">
            {getDealsForStage('discussion').map((deal) => (
              <div key={deal.id} className="p-4 bg-slate-900/60 rounded-xl border border-white/5 hover:border-blue-500/20 transition-all duration-300">
                <h4 className="text-sm font-bold text-slate-200">{deal.customerName}</h4>
                <p className="text-xs text-slate-400 mt-0.5">{deal.companyName}</p>
                <p className="text-xs text-emerald-400 mt-2 font-mono">{deal.value}</p>
              </div>
            ))}
            {getDealsForStage('discussion').length === 0 && (
              <p className="text-xs text-slate-500 py-4 text-center">No discussion deals</p>
            )}
          </div>
        </div>

        {/* Column 3: Proposals / Negotiations */}
        <div className="bg-[#0c1220]/40 border border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Proposals</span>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
              {getDealsForStage('proposal').length}
            </span>
          </div>

          <div className="space-y-3">
            {getDealsForStage('proposal').map((deal) => (
              <div key={deal.id} className="p-4 bg-slate-900/60 rounded-xl border border-white/5 hover:border-blue-500/20 transition-all duration-300">
                <h4 className="text-sm font-bold text-slate-200">{deal.customerName}</h4>
                <p className="text-xs text-slate-400 mt-0.5">{deal.companyName}</p>
                <p className="text-xs text-emerald-400 mt-2 font-mono">{deal.value}</p>
              </div>
            ))}
            {getDealsForStage('proposal').length === 0 && (
              <p className="text-xs text-slate-500 py-4 text-center">No active proposals</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

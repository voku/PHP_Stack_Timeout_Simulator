import React from 'react';
import { SimulationState, ErrorSource, Config, ServerType, Scenario } from '../types';
import { Globe, Server, Box, Cpu, Database, Skull, CheckCircle, Clock, AlertOctagon, XCircle, ZapOff, Ghost, Lock, ArrowRight, Play, RotateCcw } from 'lucide-react';

interface Props {
  state: SimulationState;
  config: Config;
  serverType: ServerType;
  currentScenario: Scenario | null;
  onRunOrRerun: () => void;
}

const VisualMap: React.FC<Props> = ({ state, config, serverType, currentScenario, onRunOrRerun }) => {
  const { activeStage, errorSource, wallClockTime, cpuTime, status } = state;

  const isRunning = status === 'RUNNING';
  const hasRunBefore = currentScenario !== null;

  // Helper to determine active/error state of a node
  const getNodeState = (stage: string) => {
    if (status === 'IDLE') return 'idle';
    
    // Check for specific error termination at this node
    if (status === 'ERROR') {
       // 1. Identify Culprit (The one who pulled the plug)
       if (stage === 'client' && errorSource === ErrorSource.CLIENT_TIMEOUT) return 'culprit';
       if (stage === 'nginx' && errorSource === ErrorSource.NGINX) return 'culprit';
       if (stage === 'fpm' && errorSource === ErrorSource.FPM) return 'culprit';
       if (stage === 'php' && errorSource === ErrorSource.PHP_CPU) return 'culprit';
       if (stage === 'db' && (errorSource === ErrorSource.DB_TIMEOUT || errorSource === ErrorSource.DB_HANG)) return 'culprit';

       // 2. Identify Victims (Nodes implicitly killed/cut off by the culprit)
       if (errorSource === ErrorSource.CLIENT_TIMEOUT && stage !== 'client') return 'zombie';

       if (errorSource === ErrorSource.NGINX) {
          if (stage === 'fpm' || stage === 'php' || stage === 'db') return 'victim';
       }
       if (errorSource === ErrorSource.FPM) {
          if (stage === 'php' || stage === 'db') return 'victim';
       }
       if (errorSource === ErrorSource.PHP_CPU) {
          if (stage === 'db') return 'victim';
       }
    }

    if (activeStage === stage) return 'active';
    
    // Path highlighting logic
    const order = serverType === 'nginx-fpm' 
        ? ['client', 'nginx', 'fpm', 'php', 'db']
        : ['client', 'nginx', 'php', 'db'];
        
    const activeIndex = order.indexOf(activeStage);
    const myIndex = order.indexOf(stage);

    // If the active stage is downstream (e.g., DB), the upstream nodes (PHP, Nginx)
    // are technically "Blocked/Waiting", NOT "Passed". They are still consuming RAM.
    if (myIndex < activeIndex && myIndex !== -1) return 'blocked';
    
    return 'pending';
  };

  const Node = ({ id, label, icon: Icon, subLabel, limit, isLast }: any) => {
    const nodeState = getNodeState(id);
    
    let baseClasses = "relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-300 w-32 h-32 flex-shrink-0 z-10";
    let colorClasses = "border-slate-700 bg-slate-800 text-slate-400";
    let additionalElements = null;
    let statusBadge = null;

    if (nodeState === 'active') {
      colorClasses = "border-indigo-500 bg-indigo-900/20 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.5)] animate-active-node z-20";
      statusBadge = <span className="absolute -top-3 bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide shadow-lg">Processing</span>;
    } else if (nodeState === 'blocked') {
      // New State: Upstream waiting for downstream
      colorClasses = "border-indigo-500/30 bg-slate-800/80 text-indigo-400/70 shadow-[0_0_10px_rgba(99,102,241,0.1)]";
      statusBadge = <span className="absolute -top-3 bg-slate-700 text-indigo-300 border border-indigo-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide flex items-center gap-1 shadow-lg"><Lock className="w-3 h-3" /> Waiting</span>;
    } else if (nodeState === 'culprit') {
      colorClasses = "border-red-500 bg-red-900/30 text-red-100 shadow-[0_0_25px_rgba(239,68,68,0.6)] scale-110 z-30 animate-pulse border-4";
      additionalElements = (
         <div className="absolute -top-4 -right-4 bg-slate-900 rounded-full p-1 border-2 border-red-500 z-30 shadow-lg shadow-red-900/50">
            <AlertOctagon className="w-6 h-6 text-red-500 animate-bounce" />
         </div>
      );
    } else if (nodeState === 'victim') {
      colorClasses = "border-orange-500/60 border-dashed bg-slate-800/50 text-orange-400/50 grayscale-[50%] scale-95";
      additionalElements = (
          <div className="absolute inset-0 bg-slate-950/60 rounded-xl flex items-center justify-center backdrop-blur-[1px]">
               <div className="flex flex-col items-center">
                   <ZapOff className="w-8 h-8 text-orange-500 mb-1" />
                   <span className="text-xs font-bold text-orange-400 uppercase tracking-widest bg-slate-900/80 px-2 py-0.5 rounded border border-orange-500/50">Killed</span>
               </div>
          </div>
      );
    } else if (nodeState === 'zombie') {
        colorClasses = "border-purple-500/60 border-dashed bg-slate-800/50 text-purple-400/50 scale-95";
        additionalElements = (
              <div className="absolute inset-0 bg-slate-950/60 rounded-xl flex items-center justify-center backdrop-blur-[1px]">
                 <div className="flex flex-col items-center">
                     <Ghost className="w-8 h-8 text-purple-500 mb-1" />
                     <span className="text-xs font-bold text-purple-400 uppercase tracking-widest bg-slate-900/80 px-2 py-0.5 rounded border border-purple-500/50">Zombie</span>
                 </div>
              </div>
        );
      }

    // Progress bar for limits
    let progress = 0;
    if (limit && (status === 'RUNNING' || status === 'ERROR')) {
        const currentMetric = id === 'php' ? cpuTime : wallClockTime;
        // Visual clamp
        progress = Math.min((currentMetric / limit) * 100, 100);
    }

    return (
      <div className="flex items-center">
        <div className={`${baseClasses} ${colorClasses}`}>
            {additionalElements}
            {statusBadge}
            
            {status === 'SUCCESS' && id === 'client' && <CheckCircle className="absolute -top-3 -right-3 w-6 h-6 text-green-500 bg-slate-900 rounded-full z-30" />}

            <Icon className={`w-8 h-8 mb-2 ${nodeState === 'active' ? 'animate-pulse' : ''}`} />
            <span className="font-bold text-sm text-center">{label}</span>
            {subLabel && <span className="text-[10px] opacity-70 mt-1 text-center leading-tight">{subLabel}</span>}
            
            {/* Limit Visualizer */}
            {limit && (
            <div className="absolute bottom-2 left-2 right-2 h-1.5 bg-slate-900/50 rounded-full overflow-hidden border border-slate-700/50">
                <div 
                className={`h-full transition-all duration-100 ${progress > 90 ? 'bg-red-500' : 'bg-indigo-500'}`}
                style={{ width: `${progress}%` }}
                />
            </div>
            )}
        </div>
        
        {/* Connector Line */}
        {!isLast && (
             <div className="mx-2 text-slate-600">
                <ArrowRight className={`w-6 h-6 ${nodeState === 'active' || nodeState === 'blocked' ? 'text-indigo-500 animate-pulse' : 'text-slate-700'}`} />
             </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full overflow-x-auto p-4 custom-scrollbar">
        {/* Header with Run/Re-run Button and Scenario Name */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={onRunOrRerun}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
          >
            {hasRunBefore ? (
              <>
                <RotateCcw className="w-4 h-4" />
                Re-run
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                Run Random Scenario
              </>
            )}
          </button>
          
          {currentScenario && (
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/50 border border-indigo-500/30 rounded-lg">
              <span className="text-xs text-slate-400">Current Scenario:</span>
              <span className="text-sm font-semibold text-indigo-300">{currentScenario.name}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center min-w-[600px] py-10 px-4">
            <Node 
                id="client" 
                label="Client" 
                icon={Globe} 
                subLabel={`Browser / LB (${config.clientTimeout}s)`} 
                limit={config.clientTimeout}
            />
            
            <Node 
                id="nginx" 
                label={serverType === 'nginx-fpm' ? 'Nginx' : 'Apache'}
                icon={Server} 
                subLabel={serverType === 'nginx-fpm' ? `FastCGI Read (${config.nginxTimeout}s)` : `Timeout (${config.nginxTimeout}s)`}
                limit={config.nginxTimeout}
            />

            {serverType === 'nginx-fpm' && (
                <Node 
                    id="fpm" 
                    label="FPM Pool" 
                    icon={Box} 
                    subLabel={`Term. Timeout (${config.fpmTimeout}s)`}
                    limit={config.fpmTimeout}
                />
            )}

            <Node 
                id="php" 
                label="PHP Engine" 
                icon={Cpu} 
                subLabel={`max_exec_time (${config.phpCpuLimit}s CPU)`}
                limit={config.phpCpuLimit}
            />

            <Node 
                id="db" 
                label="Database" 
                icon={Database} 
                subLabel={`PDO Timeout (${config.dbTimeout}s)`}
                limit={config.dbTimeout}
                isLast={true}
            />
        </div>
    </div>
  );
};

export default VisualMap;
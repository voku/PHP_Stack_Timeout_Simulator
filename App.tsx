import React, { useState, useEffect, useRef } from 'react';
import { Config, SimulationState, SimulationStatus, ErrorSource, Scenario, ServerType } from './types';
import { DEFAULT_CONFIG } from './constants';
import ControlPanel from './components/ControlPanel';
import VisualMap from './components/VisualMap';
import ScenarioSelector from './components/ScenarioSelector';
import ConfigPreview from './components/ConfigPreview';
import { Info, Terminal, Layers } from 'lucide-react';

const TICK_RATE = 100; // ms per tick
// 100ms tick = 1s sim time.
const SIM_SECONDS_PER_TICK = 1;

const App: React.FC = () => {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [serverType, setServerType] = useState<ServerType>('nginx-fpm');
  const [state, setState] = useState<SimulationState>({
    status: SimulationStatus.IDLE,
    wallClockTime: 0,
    cpuTime: 0,
    activeStage: 'client',
    errorSource: ErrorSource.NONE,
    logs: ['Ready to simulate...']
  });

  // Refs for simulation loop
  const scenarioRef = useRef<Scenario | null>(null);
  const timerRef = useRef<number | null>(null);

  const handleConfigChange = (key: keyof Config, value: number) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const switchServerType = (type: ServerType) => {
    // Prevent switching during active run
    if (state.status === SimulationStatus.RUNNING) return;
    
    setServerType(type);
    
    // Safety: Clear any existing timer immediately
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Reset state to IDLE so the visual map and logs clear cleanly
    setState({
      status: SimulationStatus.IDLE,
      wallClockTime: 0,
      cpuTime: 0,
      activeStage: 'client',
      errorSource: ErrorSource.NONE,
      logs: [`Switched architecture to ${type === 'nginx-fpm' ? 'Nginx + FPM' : 'Apache + mod_php'}. Ready to simulate.`]
    });
  };

  const startSimulation = (scenario: Scenario) => {
    scenarioRef.current = scenario;
    
    // Clear any previous timer to avoid double-runs
    if (timerRef.current) clearInterval(timerRef.current);

    setState({
      status: SimulationStatus.RUNNING,
      wallClockTime: 0,
      cpuTime: 0,
      activeStage: 'client',
      errorSource: ErrorSource.NONE,
      logs: [`Started: ${scenario.name} (${serverType === 'nginx-fpm' ? 'Nginx + FPM' : 'Apache + mod_php'})`]
    });
  };

  const stopSimulation = (status: SimulationStatus, error: ErrorSource, finalLog: string) => {
    if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
    }
    setState(prev => ({
      ...prev,
      status,
      errorSource: error,
      logs: [finalLog, ...prev.logs].slice(0, 10)
    }));
  };

  // Main Simulation Loop
  useEffect(() => {
    if (state.status === SimulationStatus.RUNNING && scenarioRef.current) {
      timerRef.current = window.setInterval(() => {
        setState(prev => {
          const sc = scenarioRef.current!;
          const newWallTime = prev.wallClockTime + SIM_SECONDS_PER_TICK;
          
          // --- 1. Determine Active Stage & Physics ---
          let newStage: SimulationState['activeStage'] = 'client';
          let cpuActive = false; // Does this stage consume PHP CPU time?

          // Phase 1: Request Entry (0 - 1s)
          if (newWallTime <= 1.0) {
             newStage = 'nginx';
             cpuActive = false;
          } 
          // Phase 2: Process Management (1s - 1.5s)
          // Only applies to Nginx+FPM. Apache/mod_php handles this internally/instantly relative to the scale.
          else if (serverType === 'nginx-fpm' && newWallTime <= 1.5) {
             newStage = 'fpm';
             cpuActive = false;
          }
          // Phase 3: PHP Bootstrapping (1.5s - 2.0s)
          else if (newWallTime <= 2.0) {
             newStage = 'php';
             cpuActive = true; // Framework boot consumes CPU
          }
          // Phase 4: Execution (> 2.0s)
          else {
             if (sc.type === 'db_slow' || sc.type === 'api_slow') {
                 newStage = 'db';
                 // KEY CONCEPT: Waiting on DB I/O does NOT consume PHP CPU time
                 cpuActive = false; 
             } else if (sc.type === 'sleep') {
                 newStage = 'php';
                 // KEY CONCEPT: sleep() yields the process on Linux, using Wall Clock but NOT CPU time
                 cpuActive = false;
             } else {
                 // Normal execution or Infinite Loop
                 newStage = 'php';
                 cpuActive = true;
             }
          }

          // --- 2. Calculate Metrics ---
          const cpuIncrement = cpuActive ? SIM_SECONDS_PER_TICK : 0;
          const newCpuTime = prev.cpuTime + cpuIncrement;

          // --- 3. Check Timeouts (The Cascade) ---
          
          // A. Client Timeout (Outermost - The Blind Spot)
          // If the user disconnects, the request is technically "failed" from their perspective.
          if (newWallTime >= config.clientTimeout) {
            stopSimulation(SimulationStatus.ERROR, ErrorSource.CLIENT_TIMEOUT, `❌ Client Disconnect: Load Balancer or Browser gave up at ${config.clientTimeout}s. Server became a Zombie.`);
            // Note: We leave activeStage as is, to visually show where the server was when the client left.
            return { ...prev, wallClockTime: newWallTime, cpuTime: newCpuTime, activeStage: newStage };
          }

          // B. DB Timeout (Innermost - Graceful)
          // Checks if the DB Wait Duration exceeds limit
          if (newStage === 'db') {
             const dbDuration = newWallTime - 2.0;
             if (dbDuration >= config.dbTimeout) {
                const isApi = sc.type === 'api_slow';
                const errorMsg = isApi 
                    ? `⚠️ cURL Error 28: Operation timed out after ${config.dbTimeout}s` 
                    : `⚠️ PDOException: SQLSTATE[HY000] Timeout (${config.dbTimeout}s) caught!`;

                stopSimulation(SimulationStatus.ERROR, ErrorSource.DB_TIMEOUT, errorMsg);
                // When graceful, we visually return to PHP to show the "catch" block handling it
                return { ...prev, wallClockTime: newWallTime, cpuTime: newCpuTime, activeStage: 'php' };
             }
          }

          // C. PHP CPU Limit (max_execution_time)
          // Checks CPU Time, not Wall Clock Time
          if (newCpuTime >= config.phpCpuLimit) {
            stopSimulation(SimulationStatus.ERROR, ErrorSource.PHP_CPU, `❌ Fatal Error: max_execution_time (${config.phpCpuLimit}s) exceeded`);
            return { ...prev, wallClockTime: newWallTime, cpuTime: newCpuTime, activeStage: 'php' };
          }

          // D. FPM Timeout (request_terminate_timeout)
          // Checks Wall Clock Time. Only for Nginx+FPM.
          if (serverType === 'nginx-fpm' && newWallTime >= config.fpmTimeout) {
            stopSimulation(SimulationStatus.ERROR, ErrorSource.FPM, `❌ 502 Bad Gateway: PHP-FPM worker killed after ${config.fpmTimeout}s (Wall Clock)`);
            return { ...prev, wallClockTime: newWallTime, cpuTime: newCpuTime, activeStage: 'fpm' };
          }

          // E. Web Server Timeout (fastcgi_read_timeout / Apache Timeout)
          // Checks Wall Clock Time. The "Hard Kill".
          if (newWallTime >= config.nginxTimeout) {
            const serverName = serverType === 'nginx-fpm' ? 'Nginx' : 'Apache';
            const code = serverType === 'nginx-fpm' ? '504 Gateway Timeout' : 'Timeout';
            stopSimulation(SimulationStatus.ERROR, ErrorSource.NGINX, `❌ ${code}: ${serverName} closed connection at ${config.nginxTimeout}s`);
            return { ...prev, wallClockTime: newWallTime, cpuTime: newCpuTime, activeStage: 'nginx' };
          }

          // --- 4. Check Success ---
          if (sc.type === 'normal' && newWallTime >= sc.duration) {
             stopSimulation(SimulationStatus.SUCCESS, ErrorSource.NONE, "✅ 200 OK: Request completed successfully.");
             return { ...prev, wallClockTime: newWallTime, cpuTime: newCpuTime, activeStage: 'client' };
          }
          
          return {
            ...prev,
            wallClockTime: newWallTime,
            cpuTime: newCpuTime,
            activeStage: newStage
          };
        });
      }, TICK_RATE);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.status, config, serverType]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 max-w-7xl mx-auto">
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold text-white mb-2">PHP Stack Timeout Simulator</h1>
            <p className="text-slate-400 max-w-3xl">
            Visualizing the difference between <span className="text-indigo-400">Web Server</span>, <span className="text-orange-400">Process Manager</span>, <span className="text-blue-400">PHP CPU</span>, and <span className="text-purple-400">Client</span> timeouts.
            </p>
        </div>
        
        {/* Server Toggle */}
        <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700 self-start md:self-auto">
            <button
                onClick={() => switchServerType('nginx-fpm')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${serverType === 'nginx-fpm' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                disabled={state.status === SimulationStatus.RUNNING}
            >
                <Layers className="w-4 h-4" />
                Nginx + FPM
            </button>
            <button
                onClick={() => switchServerType('apache-modphp')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${serverType === 'apache-modphp' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                disabled={state.status === SimulationStatus.RUNNING}
            >
                <Layers className="w-4 h-4" />
                Apache + mod_php
            </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Visualization & Logic */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden min-h-[400px] flex flex-col">
            <div className="bg-slate-900/50 p-4 border-b border-slate-700 flex justify-between items-center">
              <h2 className="font-semibold flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-400" />
                Stack Visualization
              </h2>
              <div className="flex gap-2">
                 <span className={`px-2 py-1 rounded text-xs font-bold ${state.status === SimulationStatus.RUNNING ? 'bg-indigo-600 animate-pulse' : 'bg-slate-700'}`}>
                   {state.status}
                 </span>
              </div>
            </div>
            
            <div className="flex-1 flex flex-col justify-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                <VisualMap state={state} config={config} serverType={serverType} />
            </div>

            {/* Logs Area */}
            <div className="bg-black/80 p-4 font-mono text-sm h-32 overflow-y-auto border-t border-slate-700">
               {state.logs.map((log, i) => (
                 <div key={i} className={`mb-1 ${log.includes('❌') ? 'text-red-400' : log.includes('✅') ? 'text-green-400' : log.includes('⚠️') ? 'text-yellow-400' : 'text-slate-400'}`}>
                   <span className="opacity-50 mr-2">{i === 0 ? '>' : ' '}</span>{log}
                 </div>
               ))}
            </div>
          </div>

          <ScenarioSelector 
            onRun={startSimulation} 
            status={state.status} 
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Info Box */}
             <div className="bg-blue-900/20 border border-blue-800/50 p-4 rounded-lg flex flex-col gap-3">
                 <div className="flex items-center gap-2 text-blue-400 font-semibold">
                    <Info className="w-5 h-5" />
                    <span>Sysadmin Note</span>
                 </div>
                 <div className="text-sm text-blue-200">
                   <p className="mb-2">
                     <strong>Zombie Processes:</strong> If <code>Client Timeout &lt; Nginx Timeout</code>, Nginx keeps the connection to PHP open even after the client disconnects.
                   </p>
                   <p>
                     <strong>The Fix:</strong> Ensure your application has a hard timeout (via <code>max_execution_time</code> or <code>request_terminate_timeout</code>) that is <em>shorter</em> than the load balancer timeout.
                   </p>
                 </div>
             </div>

             {/* Config Generator */}
             <div className="h-full">
                <ConfigPreview config={config} serverType={serverType} />
             </div>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <ControlPanel 
            config={config} 
            status={state.status} 
            serverType={serverType}
            onConfigChange={handleConfigChange} 
          />
        </div>
      </div>
    </div>
  );
};

export default App;
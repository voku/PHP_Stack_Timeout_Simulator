import React, { useState } from 'react';
import { Scenario, SimulationStatus } from '../types';
import { SCENARIOS } from '../constants';
import { Play, Info, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  onRun: (scenario: Scenario) => void;
  status: SimulationStatus;
}

const ScenarioSelector: React.FC<Props> = ({ onRun, status }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleToggle = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-lg">
      <h2 className="text-lg font-semibold text-white mb-4">Run Simulation</h2>
      <div className="grid grid-cols-1 gap-3">
        {SCENARIOS.map((scenario) => {
          const isExpanded = expandedId === scenario.id;
          const isRunning = status === SimulationStatus.RUNNING;
          
          return (
            <div 
              key={scenario.id}
              className={`rounded-lg border transition-all duration-200 ${
                isExpanded 
                  ? 'border-indigo-500 bg-slate-750' 
                  : 'border-slate-700 hover:border-slate-600 bg-slate-800'
              }`}
            >
              <button
                onClick={() => handleToggle(scenario.id)}
                className="w-full flex items-start p-4 text-left focus:outline-none"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mr-3 transition-colors ${isExpanded ? 'bg-indigo-600' : 'bg-slate-900'}`}>
                   {isExpanded ? <ChevronUp className="w-5 h-5 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
                </div>
                
                <div className="flex-grow">
                  <h3 className={`font-semibold transition-colors ${isExpanded ? 'text-white' : 'text-slate-200'}`}>
                    {scenario.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-snug">
                    {scenario.description}
                  </p>
                </div>

                <div className="ml-2 flex-shrink-0 pt-1">
                   {isExpanded ? <ChevronUp className="w-4 h-4 text-indigo-400" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                </div>
              </button>

              {/* Expandable Details Area */}
              {isExpanded && (
                <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200 fade-in">
                  <div className="bg-slate-900/50 border border-slate-700/50 rounded p-3 mb-4">
                    <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
                      <Info className="w-3 h-3" />
                      Technical Detail
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {scenario.details}
                    </p>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRun(scenario);
                    }}
                    disabled={isRunning}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    {isRunning ? 'Simulation Running...' : 'Start Simulation'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ScenarioSelector;
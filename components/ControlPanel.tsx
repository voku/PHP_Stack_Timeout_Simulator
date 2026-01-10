import React from 'react';
import { Config, SimulationStatus, ServerType } from '../types';
import { Settings, AlertTriangle, Clock, Cpu, Server, Globe, FileText } from 'lucide-react';

interface Props {
  config: Config;
  status: SimulationStatus;
  serverType: ServerType;
  onConfigChange: (key: keyof Config, value: number) => void;
}

const ControlPanel: React.FC<Props> = ({ config, status, serverType, onConfigChange }) => {
  const disabled = status === SimulationStatus.RUNNING;

  const renderSlider = (
    label: string,
    key: keyof Config,
    icon: React.ReactNode,
    configFile: string,
    settingName: string,
    color: string
  ) => (
    <div className="mb-6 group">
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
          {icon}
          {label}
        </div>
        <span className={`text-sm font-bold ${color}`}>
          {config[key]}s
        </span>
      </div>
      
      {/* Config Context Block */}
      <div className="flex items-center gap-1.5 mb-2 text-[10px] font-mono bg-slate-900/40 p-1.5 rounded border border-slate-700/50 text-slate-400">
        <FileText className="w-3 h-3 opacity-50" />
        <span className="text-slate-500">{configFile}</span>
        <span className="text-slate-600">→</span>
        <span className={color}>{settingName}</span>
      </div>

      <input
        type="range"
        min="5"
        max="120"
        step="5"
        disabled={disabled}
        value={config[key]}
        onChange={(e) => onConfigChange(key, parseInt(e.target.value))}
        className={`w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-${color.split('-')[1]}-500 transition-opacity ${disabled ? 'opacity-50' : 'opacity-100'}`}
      />
    </div>
  );

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-lg">
      <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-700">
        <Settings className="w-5 h-5 text-indigo-400" />
        <h2 className="text-lg font-semibold text-white">Timeout Configuration</h2>
      </div>

      <div className="space-y-2">
        {renderSlider(
          'Client / Load Balancer',
          'clientTimeout',
          <Globe className="w-4 h-4" />,
          'AWS ALB / Browser',
          'Connection Timeout',
          'text-purple-400'
        )}

        {renderSlider(
          serverType === 'nginx-fpm' ? 'Web Server (Nginx)' : 'Web Server (Apache)',
          'nginxTimeout',
          <Server className="w-4 h-4" />,
          serverType === 'nginx-fpm' ? 'nginx.conf' : 'httpd.conf',
          serverType === 'nginx-fpm' ? 'fastcgi_read_timeout' : 'Timeout',
          'text-red-400'
        )}
        
        {serverType === 'nginx-fpm' && renderSlider(
          'Process Manager (FPM)',
          'fpmTimeout',
          <Clock className="w-4 h-4" />,
          'www.conf (pool)',
          'request_terminate_timeout',
          'text-orange-400'
        )}

        {renderSlider(
          'PHP Engine (CPU)',
          'phpCpuLimit',
          <Cpu className="w-4 h-4" />,
          'php.ini',
          'max_execution_time',
          'text-blue-400'
        )}

        {renderSlider(
          'Database / Code',
          'dbTimeout',
          <AlertTriangle className="w-4 h-4" />,
          'App Code (PDO)',
          'PDO::ATTR_TIMEOUT',
          'text-green-400'
        )}
      </div>
      
      <div className="mt-4 p-3 bg-slate-900/50 rounded text-xs text-slate-400">
        <p className="font-semibold text-slate-300 mb-1">Architecture Insight:</p>
        <p className="leading-relaxed">
           If <strong>Client Timeout</strong> is lower than your backend timeouts, you create "Zombie Processes". The user sees an error, but your server keeps working, wasting resources.
        </p>
      </div>
    </div>
  );
};

export default ControlPanel;
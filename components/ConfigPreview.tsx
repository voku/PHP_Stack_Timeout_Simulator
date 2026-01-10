import React, { useState } from 'react';
import { Config, ServerType } from '../types';
import { FileCode, Copy, Check, Terminal } from 'lucide-react';

interface Props {
  config: Config;
  serverType: ServerType;
}

const ConfigPreview: React.FC<Props> = ({ config, serverType }) => {
  const [activeTab, setActiveTab] = useState<'nginx' | 'php' | 'fpm' | 'app'>('nginx');
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSnippets = () => {
    const nginx = serverType === 'nginx-fpm' 
      ? `server {
    location ~ \\.php$ {
        include fastcgi_params;
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        
        # Stops Nginx from waiting too long for FPM
        fastcgi_read_timeout ${config.nginxTimeout}s;
        
        # Optional: Buffer size to prevent disk I/O on large headers
        fastcgi_buffer_size 32k;
        fastcgi_buffers 8 16k;
    }
}` 
      : `# Apache httpd.conf
Timeout ${config.nginxTimeout}

# ProxyTimeout is also relevant if using mod_proxy_fcgi
ProxyTimeout ${config.nginxTimeout}`;

    const fpm = serverType === 'nginx-fpm' 
      ? `; /etc/php/8.2/fpm/pool.d/www.conf

; The hard kill switch for the worker process
; Should generally be slightly lower than Nginx timeout
request_terminate_timeout = ${config.fpmTimeout}s

; Optional: Slow log to catch these issues
slowlog = /var/log/php-fpm/www-slow.log
request_slowlog_timeout = 5s` 
      : `; FPM not used in Apache mod_php mode
; Worker management is handled by mpm_prefork / mpm_worker`;

    const php = `; /etc/php/8.2/fpm/php.ini

; Limits CPU time, NOT Wall Clock time (on Linux)
; Does not count sleep(), stream waits, or DB queries!
max_execution_time = ${config.phpCpuLimit}

; Memory limit (often related to timeouts due to GC thrashing)
memory_limit = 256M`;

    const app = `// config/database.php (Laravel/Generic)

'mysql' => [
    'driver' => 'mysql',
    'host' => env('DB_HOST'),
    'options' => [
        // CRITICAL: The only way to catch a hanging DB connection
        // properly without relying on TCP keepalives.
        PDO::ATTR_TIMEOUT => ${config.dbTimeout},
    ],
],

// Guzzle / HTTP Client
$client = new \\GuzzleHttp\\Client([
    'timeout' => ${config.dbTimeout}, // Connect + Read timeout
]);`;

    return { nginx, fpm, php, app };
  };

  const snippets = getSnippets();
  const currentCode = activeTab === 'nginx' ? snippets.nginx 
                    : activeTab === 'fpm' ? snippets.fpm 
                    : activeTab === 'php' ? snippets.php 
                    : snippets.app;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-lg flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-700 bg-slate-900/50">
        <FileCode className="w-5 h-5 text-indigo-400" />
        <h2 className="text-lg font-semibold text-white">Config Generator</h2>
      </div>

      <div className="flex border-b border-slate-700 bg-slate-800">
        {(['nginx', 'fpm', 'php', 'app'] as const).map((tab) => {
            if (serverType === 'apache-modphp' && tab === 'fpm') return null;
            return (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab 
                        ? 'text-white border-b-2 border-indigo-500 bg-slate-700/50' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
                    }`}
                >
                    {tab === 'nginx' && (serverType === 'nginx-fpm' ? 'nginx.conf' : 'httpd.conf')}
                    {tab === 'fpm' && 'www.conf'}
                    {tab === 'php' && 'php.ini'}
                    {tab === 'app' && 'Code / PDO'}
                </button>
            );
        })}
      </div>

      <div className="relative flex-grow group">
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
                onClick={() => handleCopy(currentCode)}
                className="p-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition-colors shadow-lg"
                title="Copy to clipboard"
            >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
        </div>
        <pre className="p-4 bg-[#0d1117] text-slate-300 font-mono text-xs leading-relaxed overflow-x-auto h-full">
            <code>{currentCode}</code>
        </pre>
      </div>
      
      <div className="p-3 bg-slate-900/80 border-t border-slate-700 text-[10px] text-slate-500 flex items-center gap-2">
         <Terminal className="w-3 h-3" />
         Values auto-updated based on simulator sliders.
      </div>
    </div>
  );
};

export default ConfigPreview;
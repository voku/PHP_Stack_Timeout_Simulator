import { Config, Scenario } from './types';

export const DEFAULT_CONFIG: Config = {
  clientTimeout: 90, // Usually Load Balancers are 60s, but we default high to show other errors first
  dbTimeout: 50,
  phpCpuLimit: 60,
  fpmTimeout: 65,
  nginxTimeout: 70,
};

export const SCENARIOS: Scenario[] = [
  {
    id: 'normal',
    name: 'Healthy Request',
    description: 'A fast query. Everything finishes well within limits.',
    details: 'Simulates a standard optimized request. Execution time (2s) is well below all configured timeouts (Web Server, FPM, PHP, DB). Expect a generic HTTP 200 OK success response.',
    type: 'normal',
    duration: 2,
  },
  {
    id: 'db_slow',
    name: 'Slow Database Query',
    description: 'The DB hangs for 80s. This is IO wait time (0 CPU usage).',
    details: 'Simulates a DB query taking 80s. This puts the PHP process in a "waiting" state. On Linux, this does NOT consume CPU time, so max_execution_time will NOT trigger. You must rely on PDO::ATTR_TIMEOUT (DB Layer) or the Web Server timeout to catch this.',
    type: 'db_slow',
    duration: 80,
  },
  {
    id: 'api_slow',
    name: 'Slow External API Call',
    description: 'PHP calls a 3rd party API which hangs. IO Wait (0 CPU).',
    details: 'Simulates a file_get_contents() or cURL request to a slow external service. Like DB queries, waiting for a network response consumes Wall Clock time but zero CPU time. This demonstrates why you must set explicit timeouts (e.g., CURLOPT_TIMEOUT) on your HTTP clients.',
    type: 'api_slow',
    duration: 80,
  },
  {
    id: 'sleep',
    name: 'PHP Sleep()',
    description: 'PHP sleeps for 80s. Consumes Wall Clock but NOT CPU time on Linux.',
    details: 'Simulates sleep(80). Like DB waits, sleep() consumes Wall Clock time but effectively zero CPU time on Linux. max_execution_time (CPU limit) will be bypassed. This demonstrates why you cannot rely on CPU limits for stopping idle processes.',
    type: 'sleep',
    duration: 80,
  },
  {
    id: 'infinite_loop',
    name: 'Infinite CPU Loop',
    description: 'PHP gets stuck calculating Pi. Consumes both Wall Clock AND CPU time.',
    details: 'Simulates a busy-wait loop (calculating Pi). This consumes 100% CPU. Both Wall Clock time AND CPU time increase. max_execution_time SHOULD correctly trigger here before Nginx or FPM limits if configured correctly.',
    type: 'infinite_loop',
    duration: 100,
  },
];
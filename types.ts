export enum SimulationStatus {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export enum ErrorSource {
  NONE = 'NONE',
  CLIENT_TIMEOUT = 'CLIENT_TIMEOUT', // Browser or Load Balancer gave up
  NGINX = 'NGINX',
  FPM = 'FPM',
  PHP_CPU = 'PHP_CPU',
  DB_TIMEOUT = 'DB_TIMEOUT', // Graceful
  DB_HANG = 'DB_HANG', // Not caught by DB timeout
}

export type ServerType = 'nginx-fpm' | 'apache-modphp';

export interface Config {
  clientTimeout: number; // Browser or LB timeout
  nginxTimeout: number; // fastcgi_read_timeout (Wall Clock) OR Apache Timeout
  fpmTimeout: number;   // request_terminate_timeout (Wall Clock) - Unused in Apache mode
  phpCpuLimit: number;  // max_execution_time (CPU Time)
  dbTimeout: number;    // PDO::ATTR_TIMEOUT
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  details: string; // Detailed explanation for the UI
  type: 'normal' | 'db_slow' | 'infinite_loop' | 'sleep' | 'api_slow';
  duration: number; // Target duration if things go well
}

export interface SimulationState {
  status: SimulationStatus;
  wallClockTime: number;
  cpuTime: number;
  activeStage: 'client' | 'nginx' | 'fpm' | 'php' | 'db';
  errorSource: ErrorSource;
  logs: string[];
}
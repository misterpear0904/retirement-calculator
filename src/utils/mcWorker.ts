// Monte Carlo worker: runs the full simulation off the main thread so 500
// trials never block slider drags. Communicates with a version token so
// stale responses (from an older state) are dropped by the caller.
import { runRetirementSimulation, SimulationOptions } from './calculatorEngine';
import { RetirementState } from '../types/retirement';

export interface McWorkerRequest {
  type: 'simulate';
  version: number;
  state: RetirementState;
  trials?: number;
}

export interface McWorkerResponse {
  type: 'result';
  version: number;
  successRate: number;
}

self.onmessage = (e: MessageEvent<McWorkerRequest>) => {
  if (e.data?.type !== 'simulate') return;
  const { version, state, trials } = e.data;
  try {
    const opts: SimulationOptions = { trials: trials ?? 500 };
    const result = runRetirementSimulation(state, opts);
    const response: McWorkerResponse = {
      type: 'result',
      version,
      successRate: result.successRate,
    };
    (self as unknown as { postMessage: (m: McWorkerResponse) => void }).postMessage(response);
  } catch {
    // Engine errors (hostile input etc.) collapse to a 0% plan rather than
    // killing the worker — validation normally prevents these anyway.
    const response: McWorkerResponse = { type: 'result', version, successRate: 0 };
    (self as unknown as { postMessage: (m: McWorkerResponse) => void }).postMessage(response);
  }
};

export {};

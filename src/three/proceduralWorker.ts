import {
  GeneratorJob,
  ProceduralSettings,
  PROCEDURAL_BUILDERS
} from './proceduralGeneration';

export interface WorkerRequest {
  job: GeneratorJob;
  size: number;
  settings: ProceduralSettings;
}

export interface WorkerResponse {
  data: Uint8ClampedArray;
}

/**
 * Web Worker executing procedural texture generation off the main thread.
 * Transferred via ArrayBuffer for zero-copy high performance.
 */
self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { job, size, settings } = e.data;
  const builder = PROCEDURAL_BUILDERS[job];
  if (!builder) {
    throw new Error(`Unknown procedural job: ${job}`);
  }

  const out = builder(size, settings);
  (self as unknown as Worker).postMessage({ data: out }, [out.buffer]);
};

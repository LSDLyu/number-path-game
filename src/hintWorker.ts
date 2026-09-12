import { solveFromPath, type HintRequest } from "./hintSolver";

self.onmessage = (event: MessageEvent<HintRequest>) => {
  self.postMessage(solveFromPath(event.data));
};

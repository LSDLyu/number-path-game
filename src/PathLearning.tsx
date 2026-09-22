import { useState } from "react";
import styles from "./NumberPathGame.module.css";

export type LearningRecord = { hints: number; restarts: number; solves: number; independent: number; lastHints?: number; strategy?: number };
export const newLearningRecord = (): LearningRecord => ({ hints: 0, restarts: 0, solves: 0, independent: 0 });
export function readLearningRecords(value: unknown): Record<string,LearningRecord> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([key,r]) => /^[3-6]-[1-9]\d*$/.test(key) && r && typeof r==='object').map(([key,r]) => {
    const number=(v:unknown)=> typeof v==='number' && Number.isFinite(v) ? Math.max(0,Math.floor(v)) : 0;
    const record:LearningRecord={hints:number(r.hints),restarts:number(r.restarts),solves:number(r.solves),independent:Math.min(number(r.independent),number(r.solves))};
    if(typeof r.lastHints==='number' && Number.isFinite(r.lastHints))record.lastHints=number(r.lastHints);
    if(Number.isInteger(r.strategy) && r.strategy>=0 && r.strategy<3)record.strategy=r.strategy;
    return [key,record];
  }));
}
const strategies = {
  zh: ["沿边观察", "给终点留出口", "避免孤岛"],
  en: ["Inspect the edges", "Leave a way to the finish", "Avoid isolated squares"],
};
const takeaways = {
  zh: ["先看角落：它们的出入口更少，适合提前安排。", "终点要最后进入。接近它时，检查剩余空格还有没有路。", "每走一步，看看是否把未走的格子隔成了互不相通的区域。"],
  en: ["Corners have fewer exits. Plan how to enter and leave them.", "Reach the finish last. Keep a way through the remaining squares.", "Check whether your route separates unvisited squares into disconnected areas."],
};
export function skillGroup(index: number, count: number) { return Math.min(2, Math.floor(index * 3 / count)); }
export function strategyName(locale: "zh" | "en", index: number) { return strategies[locale][index]; }
export function strategyTip(locale: "zh" | "en", index: number) { return takeaways[locale][index]; }

export function PathTutorial({ locale, onDone }: { locale: "zh" | "en"; onDone: () => void }) {
  const zh = locale === "zh";
  const route = [0, 1, 2, 5, 4, 3, 6, 7, 8];
  const clues: Record<number, number> = { 0: 1, 2: 2, 3: 3, 8: 4 };
  const [path, setPath] = useState([0]);
  const [message, setMessage] = useState(zh ? "从 1 出发，点亮旁边闪烁的格子。" : "Start at 1. Tap the highlighted adjacent square.");
  const complete = path.length === 9;
  function choose(cell: number) {
    if (complete) return;
    const last = path[path.length - 1];
    const distance = Math.abs(Math.floor(cell / 3) - Math.floor(last / 3)) + Math.abs(cell % 3 - last % 3);
    if (path.includes(cell)) { setMessage(zh ? "格子只能经过一次。正式关卡里点旧路线可以退回去。" : "Visit each square once. In a real case, select an earlier square to backtrack."); return; }
    if (distance !== 1) { setMessage(zh ? "每次只能上、下、左、右走一格，不能斜走。" : "Move one square up, down, left or right. No diagonals."); return; }
    if (cell === 8 && path.length < 8) { setMessage(zh ? "终点 4 要留到最后，先走满其他格子。" : "Leave finish 4 until last. Visit the other squares first."); return; }
    if (cell !== route[path.length]) { setMessage(zh ? "这次跟着亮格练习：按 1 → 2 → 3 → 4 的顺序，给后面的格子留路。" : "Follow the highlighted practice route: 1 → 2 → 3 → 4. Leave a way to the remaining squares."); return; }
    const next = [...path, cell]; setPath(next);
    setMessage(next.length === 9 ? (zh ? "完成！按顺序经过数字、走满九格、最后到终点。" : "Done! Numbers in order, all nine squares visited, finish last.") : clues[cell] ? (zh ? "数字顺序正确！继续走向亮格。" : "Correct number order! Continue to the highlighted square.") : (zh ? "很好！线可以转弯，每格只走一次。" : "Good! You can turn, but visit each square only once."));
  }
  return <div>
    <p>{zh ? "这是一道不计时、不影响解锁的练习题。" : "An untimed practice puzzle. It does not affect unlocks."}</p>
    <div className={styles.tutorialGrid} aria-label={zh ? "练习棋盘" : "Practice board"}>
      {Array.from({ length: 9 }, (_, cell) => <button key={cell} type="button"
        className={path.includes(cell) ? styles.tutorialVisited : route[path.length] === cell ? styles.tutorialNext : ""}
        aria-label={zh ? `${Math.floor(cell / 3) + 1} 行 ${cell % 3 + 1} 列${clues[cell] ? " 数字 " + clues[cell] : ""}` : `row ${Math.floor(cell / 3) + 1}, column ${cell % 3 + 1}${clues[cell] ? ", number " + clues[cell] : ""}`}
        onClick={() => choose(cell)}>{clues[cell] || (path.includes(cell) ? "●" : "")}</button>)}
    </div>
    <p role="status">{message}</p>
    {complete && <button className={styles.continueButton} onClick={onDone}>{zh ? "开始自己破案 →" : "Try a real case →"}</button>}
  </div>;
}

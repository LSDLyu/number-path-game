"use client";

import {
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Celebration } from "./Celebration";
import { celebrationLevels, feedbackKey, hasForwardMove, loadFeedback, type FeedbackSettings } from "./gameFeedback";
import rawPuzzles from "./number-path-puzzles.json";
import styles from "./NumberPathGame.module.css";

type Size = 3 | 4 | 5 | 6;
type Locale = "zh" | "en";
type Point = [number, number];
type Clue = [number, number, number];
type Puzzle = { number: number; clues: Clue[]; route: Point[] };
type Tone = "guide" | "good" | "warn";
type SavedProgress = {
  paths: Record<string, Point[]>;
  completed: Record<string, number>;
  lastCase?: { size: Size; number: number };
};

const puzzles = rawPuzzles as Record<`${Size}`, Puzzle[]>;
const sizes: Size[] = [3, 4, 5, 6];
const sizeInfo: Record<Size, { end: number; color: string }> = {
  3: { end: 4, color: "butter" },
  4: { end: 5, color: "peach" },
  5: { end: 8, color: "sage" },
  6: { end: 11, color: "lavender" },
};
const emptyProgress: SavedProgress = { paths: {}, completed: {} };
const storageKey = "zide-number-path-progress-v1";

const gameCopy = {
  zh: {
    settings: "体验设置",
    effects: "通关动效",
    haptics: "震动反馈",
    focus: "自动聚焦棋盘",
    vibrationUnavailable: "当前浏览器不支持震动，仍会显示视觉提示。",
    vibrationNote: "是否震动还取决于设备和系统设置。",
    testVibration: "试一下震动",
    reducedMotion: "已跟随系统减少动态效果。",
    deadEnd: "这条路暂时走不通了：没有可继续的相邻格。退回一步，换个方向试试。",
    solved: "破案成功！",
    continueCase: "挑战下一题",
    locked: "未解锁",
    unlockRule: "各类别独立闯关，完成前面的题目后解锁下一题。",
    unlocked: (count: number, total: number) => `已解锁 ${count} / ${total} 题`,
    unlockRequired: (number: number) => `请先完成第 ${number} 题，再继续后面的题目。`,
    categoryComplete: "本类别已全部通关！可以重玩已完成的题目，或切换棋盘大小。",
    focusOn: "专注中",
    levels: { 3: "见习", 4: "巡查", 5: "推理", 6: "怪探" } as Record<Size, string>,
    initial: "先找到数字 1，怪探从这里出发。最大数字要留到最后。",
    catLabel: "豆豆猫怪探正在查看线索",
    archived: (time: string) => `这宗谜案已归档，用时 ${time}。你可以重走一次，或换下一题。`,
    resume: (number: number, length: number, end: number) => `继续勘察第 ${number} 题：已走 ${length} 格，数字 ${end} 是终点。`,
    success: (total: number, end: number) => `破案成功！${total} 格全部走过，数字 ${end} 正好落在最后一格。`,
    backed: "已沿原路退回一格。重新观察四个方向。",
    repeated: "路线不能重复经过同一格；需要回退时请沿原路退一格。",
    adjacentOnly: "怪探不能斜走或跳格，只能走到上下左右相邻格。",
    earlyEnd: (end: number) => `数字 ${end} 是终点，现在还没填满全部格子，先绕开它。`,
    wrongClue: (clue: number, expected: number) => `还不能到数字 ${clue}，请先找到数字 ${expected}。`,
    wrongLast: (end: number) => `只剩最后一格时，必须抵达最大的数字 ${end}。`,
    clueMatched: (clue: number) => `线索吻合：已经找到数字 ${clue}，接着找数字 ${clue + 1}。`,
    routeProgress: (length: number) => `路线已走 ${length} 格，继续观察相邻空格。`,
    reset: (end: number) => `重新勘察：从 1 出发，数字 ${end} 必须最后抵达。`,
    atStart: "已经回到起点 1 了。",
    closedUndo: "已归档的谜案如需重走，请选择“重新开始”。",
    undone: "撤回一步。现在从路线末端继续。",
    deviated: (step: number) => `第 ${step} 步偏离了可靠线索。沿原路退回，再换一个方向试试。`,
    hint: "豆豆猫找到一枚脚印：闪烁格可以作为下一步。",
    startCase: (end: number) => `从 1 出发，下一站找数字 2；数字 ${end} 是终点。`,
    eyebrow: "数学路径怪探 · 数字顺序与空间推理",
    heroLead: "每一格都是线索，",
    heroEnd: "最大数字才是终点。",
    lede: "从 1 出发，只走上下左右，按顺序经过数字；不漏格、不重走，最后抵达最大的数字。",
    verifiedLabel: "题库经过程序验证",
    cases: "宗谜案",
    verified: "程序逐题验证",
    sizeNav: "选择棋盘大小",
    sizeTab: (level: string, end: number) => `${level} · 终点 ${end}`,
    caseFiles: "谜案档案",
    caseTitle: "CASE FILES",
    caseAria: (number: number, complete: boolean) => `第 ${number} 题${complete ? "，已完成" : ""}`,
    caseLevel: (level: string, size: number) => `${level}级谜案 · ${size}×${size}`,
    question: (number: number) => `第 ${number} 题`,
    previous: "上一题",
    next: "下一题",
    quick: "快速选题",
    quickAria: "快速选择题目",
    option: (number: number, complete: boolean) => `第 ${String(number).padStart(2, "0")} 题${complete ? " · 已完成" : ""}`,
    boardAria: (size: number) => `${size}乘${size}数字路径棋盘，方向键也可以继续路线`,
    cellAria: (row: number, column: number, clue: number | undefined, end: number, selected: boolean, pathIndex: number) =>
      `${row} 行 ${column} 列${clue ? `，数字 ${clue}${clue === end ? "，终点" : ""}` : "，空格"}${selected ? `，路线第 ${pathIndex + 1} 格` : ""}`,
    explored: "已勘察",
    squares: "格",
    progressAria: (percent: number) => `完成进度 ${percent}%`,
    statusWarn: "停一下，核对线索",
    statusGood: "线索吻合",
    statusGuide: "豆豆猫提示",
    undo: "撤回一步",
    giveHint: "给我一条线索",
    restart: "重新开始",
    notesTitle: "DETECTIVE NOTES",
    notes: "怪探手记",
    currentTask: "当前任务",
    closed: "谜案归档",
    findNumber: (number: number) => `寻找数字 ${number}`,
    bestTime: (time: string) => `最佳用时 ${time}`,
    endNote: (end: number, total: number) => `终点是 ${end}，抵达前要填满 ${total} 格。`,
    numberOrder: "数字顺序",
    numberOrderNote: (end: number) => `依次经过 1 到 ${end}`,
    fullCoverage: "全部覆盖",
    everySquare: "每格都有路线",
    remaining: (count: number) => `还差 ${count} 格`,
    finishCheck: "终点核验",
    finishNote: (end: number) => `数字 ${end} 必须最后抵达`,
    rules: "怪探守则",
    ruleStart: "从数字 1 开始。",
    ruleMove: "只能走上下左右相邻格。",
    ruleOrder: "按数字顺序经过，不重复、不漏格。",
    ruleEnd: "最大的数字是终点。",
    inputNote: "电脑可按住鼠标拖动；手机可滑动或逐格点击；键盘可用方向键。",
  },
  en: {
    settings: "Experience settings",
    effects: "Celebration effects",
    haptics: "Vibration feedback",
    focus: "Auto-focus the board",
    vibrationUnavailable: "This browser does not support vibration. Visual feedback is still available.",
    vibrationNote: "Vibration also depends on your device and system settings.",
    testVibration: "Test vibration",
    reducedMotion: "Following your system’s reduced-motion preference.",
    deadEnd: "This path has no legal next square. Undo one move and try another direction.",
    solved: "Case solved!",
    continueCase: "Try the next case",
    locked: "Locked",
    unlockRule: "Progress separately in each board size. Solve cases in order to unlock the next one.",
    unlocked: (count: number, total: number) => `${count} / ${total} cases unlocked`,
    unlockRequired: (number: number) => `Solve Case ${number} before continuing to later cases.`,
    categoryComplete: "All cases in this board size are solved! Replay a case or choose another board size.",
    focusOn: "Focused",
    levels: { 3: "Rookie", 4: "Scout", 5: "Sleuth", 6: "Master" } as Record<Size, string>,
    initial: "Find number 1 first. That is where the detective starts. Save the largest number for last.",
    catLabel: "Detective Doudou Cat is examining the clues",
    archived: (time: string) => `This case is closed. Best time: ${time}. Replay it or choose another case.`,
    resume: (number: number, length: number, end: number) => `Continue Case ${number}: ${length} squares explored. Number ${end} is the finish.`,
    success: (total: number, end: number) => `Case solved! You covered all ${total} squares and reached number ${end} last.`,
    backed: "You moved back one square along your path. Check all four directions again.",
    repeated: "A path cannot visit the same square twice. To go back, move one square along your path.",
    adjacentOnly: "No diagonal moves or jumps. Move only to the next square up, down, left, or right.",
    earlyEnd: (end: number) => `Number ${end} is the finish. Some squares are still empty, so go around it for now.`,
    wrongClue: (clue: number, expected: number) => `You cannot reach number ${clue} yet. Find number ${expected} first.`,
    wrongLast: (end: number) => `The last square must be the largest number, ${end}.`,
    clueMatched: (clue: number) => `Clue matched: you found number ${clue}. Now look for number ${clue + 1}.`,
    routeProgress: (length: number) => `${length} squares explored. Keep checking the neighboring empty squares.`,
    reset: (end: number) => `Restarted: begin at 1 and reach number ${end} last.`,
    atStart: "You are already back at the starting square, 1.",
    closedUndo: "To replay a closed case, choose “Restart”.",
    undone: "One move undone. Continue from the end of the path.",
    deviated: (step: number) => `Move ${step} left the reliable trail. Back up along your path and try another direction.`,
    hint: "Doudou Cat found a footprint. The flashing square can be your next move.",
    startCase: (end: number) => `Start at 1 and look for number 2 next. Number ${end} is the finish.`,
    eyebrow: "NUMBER PATH DETECTIVES · SEQUENCES & SPATIAL REASONING",
    heroLead: "Every square is a clue. ",
    heroEnd: "The largest number is the finish.",
    lede: "Start at 1. Move only up, down, left, or right and visit the numbers in order. Fill every square once, then reach the largest number last.",
    verifiedLabel: "Puzzle set verified by program",
    cases: "cases",
    verified: "every puzzle verified",
    sizeNav: "Choose a board size",
    sizeTab: (level: string, end: number) => `${level} · Finish ${end}`,
    caseFiles: "Case Files",
    caseTitle: "CASE FILES",
    caseAria: (number: number, complete: boolean) => `Case ${number}${complete ? ", completed" : ""}`,
    caseLevel: (level: string, size: number) => `${level} case · ${size}×${size}`,
    question: (number: number) => `Case ${number}`,
    previous: "Previous",
    next: "Next",
    quick: "Quick select",
    quickAria: "Quickly choose a case",
    option: (number: number, complete: boolean) => `Case ${String(number).padStart(2, "0")}${complete ? " · completed" : ""}`,
    boardAria: (size: number) => `${size} by ${size} number path board. You can also use the arrow keys.`,
    cellAria: (row: number, column: number, clue: number | undefined, end: number, selected: boolean, pathIndex: number) =>
      `row ${row}, column ${column}${clue ? `, number ${clue}${clue === end ? ", finish" : ""}` : ", empty square"}${selected ? `, path square ${pathIndex + 1}` : ""}`,
    explored: "Explored",
    squares: "squares",
    progressAria: (percent: number) => `${percent}% complete`,
    statusWarn: "Pause and check the clues",
    statusGood: "Clue matched",
    statusGuide: "Doudou Cat's tip",
    undo: "Undo one move",
    giveHint: "Give me a clue",
    restart: "Restart",
    notesTitle: "DETECTIVE NOTES",
    notes: "Detective Notes",
    currentTask: "Current task",
    closed: "Case closed",
    findNumber: (number: number) => `Find number ${number}`,
    bestTime: (time: string) => `Best time ${time}`,
    endNote: (end: number, total: number) => `Number ${end} is the finish. Cover all ${total} squares before reaching it.`,
    numberOrder: "Number order",
    numberOrderNote: (end: number) => `Visit 1 through ${end} in order`,
    fullCoverage: "Full coverage",
    everySquare: "Every square is on the path",
    remaining: (count: number) => `${count} squares remaining`,
    finishCheck: "Finish check",
    finishNote: (end: number) => `Reach number ${end} last`,
    rules: "Detective Rules",
    ruleStart: "Start at number 1.",
    ruleMove: "Move only up, down, left, or right.",
    ruleOrder: "Visit the numbers in order without repeats or gaps.",
    ruleEnd: "The largest number is the finish.",
    inputNote: "On a computer, drag with the mouse. On a phone, swipe or tap one square at a time. You can also use the arrow keys.",
  },
};

function samePoint(a: Point | undefined, b: Point | undefined) {
  return Boolean(a && b && a[0] === b[0] && a[1] === b[1]);
}

function distance(a: Point, b: Point) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function hasCompletedCase(completed: SavedProgress["completed"], size: Size, number: number) {
  const seconds = completed[`${size}-${number}`];
  return Number.isFinite(seconds) && seconds > 0;
}

function lastUnlockedIndex(size: Size, completed: SavedProgress["completed"]) {
  const list = puzzles[String(size) as `${Size}`];
  const firstIncomplete = list.findIndex((item) => !hasCompletedCase(completed, size, item.number));
  return firstIncomplete < 0 ? list.length - 1 : firstIncomplete;
}

function validSavedPath(path: Point[] | undefined, puzzle: Puzzle, size: Size) {
  if (!path?.length || path.length > size * size || !samePoint(path[0], puzzle.route[0])) return false;
  const seen = new Set<string>();
  return path.every((point, index) => {
    const [row, column] = point;
    const key = `${row}-${column}`;
    const valid = row >= 0 && row < size && column >= 0 && column < size && !seen.has(key)
      && (index === 0 || distance(path[index - 1], point) === 1);
    seen.add(key);
    return valid;
  });
}

function DetectiveCat({ label }: { label: string }) {
  return (
    <svg className={styles.cat} viewBox="0 0 120 96" role="img" aria-label={label}>
      <path d="M24 44 18 18l24 14M96 44l6-26-25 14" fill="#f7caa8" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
      <path d="M24 40c2-22 70-24 73 4 3 29-13 42-37 42S21 73 24 40Z" fill="#fffaf0" stroke="currentColor" strokeWidth="4" />
      <path d="M43 55h2M76 55h2" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <path d="m55 62 5 4 5-4M60 66v7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="83" cy="68" r="16" fill="none" stroke="#2d8f83" strokeWidth="5" />
      <path d="m95 79 12 10" stroke="#2d8f83" strokeWidth="7" strokeLinecap="round" />
      <path d="M31 48 14 44M31 58 13 61M88 48l17-5M89 58l18 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function NumberPathGame({ locale = "zh" }: { locale?: Locale }) {
  const copy = gameCopy[locale];
  const [size, setSize] = useState<Size>(3);
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [path, setPath] = useState<Point[]>(() => [puzzles["3"][0].route[0]]);
  const [message, setMessage] = useState(copy.initial);
  const [tone, setTone] = useState<Tone>("guide");
  const [hintCell, setHintCell] = useState<Point | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState<SavedProgress>(emptyProgress);
  const [hydrated, setHydrated] = useState(false);
  const [feedback, setFeedback] = useState(loadFeedback);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const lastDeadEnd = useRef("");
  const supportsVibration = typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
  const startedAt = useRef(0);
  const pathRef = useRef<Point[]>([puzzles["3"][0].route[0]]);
  const draggingRef = useRef(false);

  const puzzleList = puzzles[String(size) as `${Size}`];
  const puzzle = puzzleList[puzzleIndex];
  const info = sizeInfo[size];
  const level = copy.levels[size];
  const total = size * size;
  const progressKey = `${size}-${puzzle.number}`;
  const unlockedIndex = lastUnlockedIndex(size, progress.completed);
  const canOpenNext = puzzleIndex < unlockedIndex;
  const completedForSize = puzzleList.filter((item) => hasCompletedCase(progress.completed, size, item.number)).length;
  const categoryComplete = completedForSize === puzzleList.length;

  const clueMap = useMemo(() => {
    const map = new Map<string, number>();
    puzzle.clues.forEach(([row, column, value]) => map.set(`${row}-${column}`, value));
    return map;
  }, [puzzle]);

  const completedSeconds = progress.completed[progressKey];
  const visitedClues = useMemo(
    () => path.map(([row, column]) => clueMap.get(`${row}-${column}`)).filter((value): value is number => Boolean(value)),
    [clueMap, path],
  );
  const nextClue = Math.min(info.end, Math.max(1, ...visitedClues) + 1);
  const endPoint = useMemo(
    () => puzzle.clues.find((clue) => clue[2] === info.end)?.slice(0, 2) as Point,
    [info.end, puzzle],
  );
  const fullCheck = path.length === total;
  const orderCheck = visitedClues.length === info.end && visitedClues.every((value, index) => value === index + 1);
  const endCheck = fullCheck && samePoint(path.at(-1), endPoint);
  const isComplete = hasCompletedCase(progress.completed, size, puzzle.number) && fullCheck && orderCheck && endCheck;
  const percent = Math.round((path.length / total) * 100);

  const deadEnd = !isComplete && !hasForwardMove(path, size, clueMap, info.end);
  const focused = feedback.focus && path.length > 1 && !isComplete;

  const vibrate = useCallback((pattern: number[]) => {
    if (!feedback.haptics || !supportsVibration || document.hidden) return;
    try { navigator.vibrate(pattern); } catch { /* Unsupported or blocked vibration is optional. */ }
  }, [feedback.haptics, supportsVibration]);

  const updateFeedback = (key: keyof FeedbackSettings, value: boolean) => {
    const next = { ...feedback, [key]: value };
    setFeedback(next);
    try { window.localStorage.setItem(feedbackKey, JSON.stringify(next)); } catch { /* Optional storage. */ }
    if (key === "effects" && !value) setCelebrating(false);
    if (key === "haptics" && !value && supportsVibration) {
      try { navigator.vibrate(0); } catch { /* Optional hardware. */ }
    }
  };

  useEffect(() => {
    if (!window.matchMedia) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => { setReducedMotion(query.matches); if (query.matches) setCelebrating(false); };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!celebrating) return;
    const timer = window.setTimeout(() => setCelebrating(false), celebrationLevels[size].duration);
    return () => window.clearTimeout(timer);
  }, [celebrating, size]);

  useEffect(() => {
    const stop = () => {
      if (document.hidden) {
        setCelebrating(false);
        draggingRef.current = false;
        if (supportsVibration) { try { navigator.vibrate(0); } catch { /* Optional hardware. */ } }
      }
    };
    document.addEventListener("visibilitychange", stop);
    return () => {
      document.removeEventListener("visibilitychange", stop);
      if (supportsVibration) { try { navigator.vibrate(0); } catch { /* Optional hardware. */ } }
    };
  }, [supportsVibration]);

  useEffect(() => {
    const load = window.setTimeout(() => {
      let storedProgress = emptyProgress;
      try {
        const stored = window.localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<SavedProgress>;
          storedProgress = {
            paths: parsed.paths ?? {},
            completed: parsed.completed ?? {},
            lastCase: parsed.lastCase,
          };
        }
      } catch {
        storedProgress = emptyProgress;
      }
      const storedSize = storedProgress.lastCase?.size;
      const initialSize = sizes.includes(storedSize as Size) ? storedSize as Size : 3;
      const initialList = puzzles[String(initialSize) as `${Size}`];
      const storedNumber = storedProgress.lastCase?.number;
      const initialIndex = initialList.findIndex((item) => item.number === storedNumber);
      const safeIndex = Math.min(initialIndex >= 0 ? initialIndex : 0, lastUnlockedIndex(initialSize, storedProgress.completed));
      const initialPuzzle = initialList[safeIndex];
      const initialKey = `${initialSize}-${initialPuzzle.number}`;
      const saved = storedProgress.paths[initialKey];
      const initialPath = validSavedPath(saved, initialPuzzle, initialSize) ? saved : [initialPuzzle.route[0]];
      setProgress(storedProgress);
      setSize(initialSize);
      setPuzzleIndex(safeIndex);
      pathRef.current = initialPath;
      setPath(initialPath);
      startedAt.current = Date.now();
      if (hasCompletedCase(storedProgress.completed, initialSize, initialPuzzle.number) && initialPath.length === initialSize * initialSize) {
        setMessage(copy.archived(formatTime(storedProgress.completed[initialKey])));
        setTone("good");
      } else {
        setMessage(copy.resume(initialPuzzle.number, initialPath.length, sizeInfo[initialSize].end));
        setTone("guide");
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(load);
  }, [copy]);

  useEffect(() => {
    if (!hydrated || isComplete) return;
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [hydrated, isComplete, progressKey]);

  const persist = useCallback((next: SavedProgress) => {
    setProgress(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // The game remains fully playable when storage is unavailable.
    }
  }, []);

  const completeCase = useCallback((nextPath: Point[]) => {
    const seconds = Math.max(1, Math.floor((Date.now() - startedAt.current) / 1000));
    const previous = progress.completed[progressKey];
    const best = previous ? Math.min(previous, seconds) : seconds;
    persist({
      paths: { ...progress.paths, [progressKey]: nextPath },
      completed: { ...progress.completed, [progressKey]: best },
      lastCase: { size, number: puzzle.number },
    });
    draggingRef.current = false;
    setCelebrating(feedback.effects && !reducedMotion);
    vibrate(celebrationLevels[size].vibration);
    setElapsed(seconds);
    setMessage(copy.success(total, info.end));
    setTone("good");
  }, [copy, feedback.effects, reducedMotion, vibrate, info.end, persist, progress, progressKey, puzzle.number, size, total]);

  const moveTo = useCallback((point: Point) => {
    if (!hydrated || isComplete) return;
    setHintCell(null);
    const currentPath = pathRef.current;
    const last = currentPath.at(-1);
    if (!last || samePoint(last, point)) return;

    const existingIndex = currentPath.findIndex((step) => samePoint(step, point));
    if (existingIndex >= 0) {
      if (existingIndex === currentPath.length - 2) {
        const nextPath = currentPath.slice(0, -1);
        pathRef.current = nextPath;
        setPath(nextPath);
        persist({ ...progress, paths: { ...progress.paths, [progressKey]: nextPath } });
        lastDeadEnd.current = "";
        setMessage(copy.backed);
        setTone("guide");
      } else {
        setMessage(copy.repeated);
        setTone("warn");
      }
      return;
    }

    if (distance(last, point) !== 1) {
      setMessage(copy.adjacentOnly);
      setTone("warn");
      return;
    }

    const clue = clueMap.get(`${point[0]}-${point[1]}`);
    const reachedClues = currentPath
      .map(([row, column]) => clueMap.get(`${row}-${column}`))
      .filter((value): value is number => Boolean(value));
    const expectedClue = Math.min(info.end, Math.max(1, ...reachedClues) + 1);
    if (clue === info.end && currentPath.length + 1 < total) {
      setMessage(copy.earlyEnd(info.end));
      setTone("warn");
      return;
    }
    if (clue && clue !== expectedClue) {
      setMessage(copy.wrongClue(clue, expectedClue));
      setTone("warn");
      return;
    }
    if (currentPath.length + 1 === total && !samePoint(point, endPoint)) {
      setMessage(copy.wrongLast(info.end));
      setTone("warn");
      return;
    }

    const nextPath = [...currentPath, point];
    pathRef.current = nextPath;
    setPath(nextPath);
    persist({ ...progress, paths: { ...progress.paths, [progressKey]: nextPath } });
    if (nextPath.length === total && samePoint(point, endPoint)) {
      completeCase(nextPath);
    } else if (!hasForwardMove(nextPath, size, clueMap, info.end)) {
      const signature = `${progressKey}:${nextPath.map((step) => step.join(",")).join(";")}`;
      if (lastDeadEnd.current !== signature) vibrate([30, 65, 30]);
      lastDeadEnd.current = signature;
      setMessage(copy.deadEnd);
      setTone("warn");
    } else if (clue) {
      setMessage(copy.clueMatched(clue));
      setTone("good");
    } else {
      setMessage(copy.routeProgress(nextPath.length));
      setTone("guide");
    }
  }, [clueMap, completeCase, copy, endPoint, hydrated, info.end, isComplete, persist, progress, progressKey, size, total, vibrate]);

  const pointFromTarget = (target: EventTarget | null): Point | null => {
    const element = target instanceof Element ? target.closest<HTMLElement>("[data-cell]") : null;
    if (!element) return null;
    return [Number(element.dataset.row), Number(element.dataset.column)];
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const point = pointFromTarget(event.target);
    if (!point || !event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingRef.current = true;
    moveTo(point);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const point = pointFromTarget(document.elementFromPoint(event.clientX, event.clientY));
    if (point) moveTo(point);
  };

  const stopDragging = () => {
    draggingRef.current = false;
  };

  const handleKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    const offsets: Record<string, Point> = {
      ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
    };
    const offset = offsets[event.key];
    const last = path.at(-1);
    if (!offset || !last) return;
    event.preventDefault();
    const next: Point = [last[0] + offset[0], last[1] + offset[1]];
    if (next[0] >= 0 && next[0] < size && next[1] >= 0 && next[1] < size) moveTo(next);
  };

  const resetCase = () => {
    setCelebrating(false);
    lastDeadEnd.current = "";
    draggingRef.current = false;
    const initial = [puzzle.route[0]] as Point[];
    persist({
      ...progress,
      paths: { ...progress.paths, [progressKey]: initial },
      lastCase: { size, number: puzzle.number },
    });
    pathRef.current = initial;
    setPath(initial);
    setHintCell(null);
    startedAt.current = Date.now();
    setElapsed(0);
    setMessage(copy.reset(info.end));
    setTone("guide");
  };

  const undo = () => {
    const currentPath = pathRef.current;
    if (currentPath.length <= 1 || isComplete) {
      setMessage(currentPath.length <= 1 ? copy.atStart : copy.closedUndo);
      setTone("guide");
      return;
    }
    const nextPath = currentPath.slice(0, -1);
    pathRef.current = nextPath;
    setPath(nextPath);
    persist({ ...progress, paths: { ...progress.paths, [progressKey]: nextPath } });
    lastDeadEnd.current = "";
    setHintCell(null);
    setMessage(copy.undone);
    setTone("guide");
  };

  const showHint = () => {
    let prefix = 0;
    while (prefix < path.length && samePoint(path[prefix], puzzle.route[prefix])) prefix += 1;
    if (prefix < path.length) {
      setHintCell(path[prefix]);
      setMessage(copy.deviated(prefix + 1));
      setTone("warn");
      return;
    }
    const next = puzzle.route[path.length];
    if (!next) return;
    setHintCell(next);
    setMessage(copy.hint);
    setTone("guide");
  };

  const openCase = useCallback((nextSize: Size, index: number) => {
    if (!hydrated) return;
    const nextList = puzzles[String(nextSize) as `${Size}`];
    if (!Number.isInteger(index) || index < 0 || index >= nextList.length) return;
    const nextUnlockedIndex = lastUnlockedIndex(nextSize, progress.completed);
    if (index > nextUnlockedIndex) {
      setMessage(copy.unlockRequired(nextList[nextUnlockedIndex].number));
      setTone("guide");
      return;
    }
    setCelebrating(false);
    lastDeadEnd.current = "";
    draggingRef.current = false;
    if (supportsVibration) { try { navigator.vibrate(0); } catch { /* Optional hardware. */ } }
    const nextIndex = index;
    const nextPuzzle = nextList[nextIndex];
    const nextKey = `${nextSize}-${nextPuzzle.number}`;
    const saved = progress.paths[nextKey];
    const initial = validSavedPath(saved, nextPuzzle, nextSize) ? saved : [nextPuzzle.route[0]];
    setSize(nextSize);
    setPuzzleIndex(nextIndex);
    pathRef.current = initial;
    setPath(initial);
    setHintCell(null);
    startedAt.current = Date.now();
    setElapsed(0);
    if (hasCompletedCase(progress.completed, nextSize, nextPuzzle.number) && initial.length === nextSize * nextSize) {
      setMessage(copy.archived(formatTime(progress.completed[nextKey])));
      setTone("good");
    } else {
      setMessage(copy.startCase(sizeInfo[nextSize].end));
      setTone("guide");
    }
    persist({ ...progress, lastCase: { size: nextSize, number: nextPuzzle.number } });
  }, [copy, hydrated, persist, progress, supportsVibration]);

  const selectPuzzle = (index: number) => {
    openCase(size, index);
  };

  const polyline = path.map(([row, column]) => `${column + 0.5},${row + 0.5}`).join(" ");
  const cells = Array.from({ length: total }, (_, index) => [Math.floor(index / size), index % size] as Point);

  return (
    <div className={`${styles.page} ${focused ? styles.focused : ""} ${!feedback.effects || reducedMotion ? styles.quiet : ""}`}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>{copy.eyebrow}</p>
          <h1>{copy.heroLead}<em>{copy.heroEnd}</em></h1>
          <p className={styles.lede}>{copy.lede}</p>
        </div>
        <div className={styles.heroStamp} aria-label={copy.verifiedLabel}>
          <strong>319</strong><span>{copy.cases}</span><small>{copy.verified}</small>
        </div>
      </header>

      <div className={styles.experienceBar}>
        <span>{focused ? copy.focusOn : copy.caseLevel(level, size)}</span>
        <details className={styles.settings}>
          <summary>{copy.settings}</summary>
          <div className={styles.settingsPanel}>
            <label><span>{copy.effects}</span><input type="checkbox" checked={feedback.effects} onChange={(event) => updateFeedback("effects", event.target.checked)} /></label>
            <label><span>{copy.haptics}</span><input type="checkbox" checked={feedback.haptics && supportsVibration} disabled={!supportsVibration} onChange={(event) => updateFeedback("haptics", event.target.checked)} /></label>
            <p>{supportsVibration ? copy.vibrationNote : copy.vibrationUnavailable}</p>
            {supportsVibration && <button type="button" disabled={!feedback.haptics} onClick={() => vibrate([30, 65, 30])}>{copy.testVibration}</button>}
            <label><span>{copy.focus}</span><input type="checkbox" checked={feedback.focus} onChange={(event) => updateFeedback("focus", event.target.checked)} /></label>
            {reducedMotion && <p>{copy.reducedMotion}</p>}
          </div>
        </details>
      </div>

      <nav className={styles.sizeTabs} aria-label={copy.sizeNav}>
        {sizes.map((value) => (
          <button
            type="button"
            key={value}
            className={size === value ? styles.activeSize : ""}
            aria-pressed={size === value}
            onClick={() => openCase(value, 0)}
          >
            <span>{value}×{value}</span>
            <small>{copy.sizeTab(copy.levels[value], sizeInfo[value].end)}</small>
          </button>
        ))}
      </nav>

      <div className={styles.workspace}>
        <aside className={styles.caseRail} aria-labelledby="case-title">
          <div className={styles.panelHeading}>
            <div><p>{copy.caseTitle}</p><h2 id="case-title">{copy.caseFiles}</h2></div>
            <span>{completedForSize}/{puzzleList.length}</span>
          </div>
          <p className={styles.unlockRule}>{copy.unlockRule}</p>
          <div className={styles.caseGrid}>
            {puzzleList.map((item, index) => {
              const complete = hasCompletedCase(progress.completed, size, item.number);
              const locked = index > unlockedIndex;
              return (
                <button
                  type="button"
                  key={item.number}
                  className={`${index === puzzleIndex ? styles.activeCase : ""} ${complete ? styles.completeCase : ""}`}
                  aria-label={`${copy.caseAria(item.number, complete)}${locked ? ` · ${copy.locked}` : ""}`}
                  aria-current={index === puzzleIndex ? "true" : undefined}
                  disabled={!hydrated || locked}
                  title={locked ? copy.unlockRequired(puzzleList[unlockedIndex].number) : undefined}
                  onClick={() => selectPuzzle(index)}
                >
                  {String(item.number).padStart(2, "0")}
                  {locked ? <svg className={styles.lockIcon} viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M5 7V5a3 3 0 0 1 6 0v2M4 7h8v7H4Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  </svg> : complete && <span aria-hidden="true">✓</span>}
                </button>
              );
            })}
          </div>
        </aside>

        <section className={styles.boardPanel} aria-labelledby="board-title">
          <div className={styles.boardHeading}>
            <div>
              <p className={styles.kicker}>{copy.caseLevel(level, size)}</p>
              <h2 id="board-title">{copy.question(puzzle.number)}</h2>
            </div>
            <div className={styles.pager}>
              <button type="button" disabled={!hydrated || puzzleIndex === 0} onClick={() => selectPuzzle(puzzleIndex - 1)}>{copy.previous}</button>
              <span>{puzzle.number} / {puzzleList.length}</span>
              <button type="button" disabled={!hydrated || !canOpenNext} onClick={() => selectPuzzle(puzzleIndex + 1)}>{copy.next}</button>
              <label className={styles.quickCase}>
                {copy.quick}
                <select
                  value={puzzleIndex}
                  onChange={(event) => selectPuzzle(Number(event.target.value))}
                  aria-label={copy.quickAria}
                  disabled={!hydrated}
                >
                  {puzzleList.map((item, index) => (
                    <option key={item.number} value={index} disabled={index > unlockedIndex}>
                      {copy.option(item.number, hasCompletedCase(progress.completed, size, item.number))}{index > unlockedIndex ? ` · ${copy.locked}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <p className={styles.unlockProgress} role="status" aria-live="polite">{copy.unlocked(unlockedIndex + 1, puzzleList.length)}</p>

          <div
            className={`${styles.board} ${styles[info.color]} ${deadEnd ? styles.deadEnd : ""} ${isComplete ? styles.solvedBoard : ""}`}
            style={{
              gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopDragging}
            onPointerCancel={stopDragging}
            onLostPointerCapture={stopDragging}
            onKeyDown={handleKeyboard}
            role="grid"
            tabIndex={0}
            aria-label={copy.boardAria(size)}
          >
            {celebrating && <Celebration size={size} />}
            <svg className={styles.pathLayer} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
              <polyline points={polyline} fill="none" vectorEffect="non-scaling-stroke" />
            </svg>
            {cells.map(([row, column]) => {
              const clue = clueMap.get(`${row}-${column}`);
              const pathIndex = path.findIndex((point) => samePoint(point, [row, column]));
              const selected = pathIndex >= 0;
              const last = pathIndex === path.length - 1;
              const hinted = samePoint(hintCell ?? undefined, [row, column]);
              return (
                <button
                  type="button"
                  role="gridcell"
                  key={`${row}-${column}`}
                  data-cell="true"
                  data-row={row}
                  data-column={column}
                  className={`${styles.cell} ${selected ? styles.selectedCell : ""} ${last ? styles.lastCell : ""} ${hinted ? styles.hintCell : ""}`}
                  aria-label={copy.cellAria(row + 1, column + 1, clue, info.end, selected, pathIndex)}
                  onClick={() => moveTo([row, column])}
                >
                  {clue && <strong>{clue}</strong>}
                  {selected && !clue && <small>{pathIndex + 1}</small>}
                </button>
              );
            })}
          </div>

          {isComplete && <div className={styles.successCard}>
            <div><strong>{copy.solved}</strong><span>{copy.caseLevel(level, size)} · {formatTime(completedSeconds)}</span></div>
            {canOpenNext && <button type="button" onClick={() => selectPuzzle(puzzleIndex + 1)}>{copy.continueCase}</button>}
            {categoryComplete && puzzleIndex === puzzleList.length - 1 && <p>{copy.categoryComplete}</p>}
          </div>}

          <div className={styles.progressRow}>
            <span>{copy.explored} <strong>{path.length}</strong> / {total} {copy.squares}</span>
            <div className={styles.progressTrack} aria-label={copy.progressAria(percent)}><i style={{ width: `${percent}%` }} /></div>
            <span>{percent}%</span>
          </div>

          <div className={`${styles.message} ${styles[deadEnd ? "warn" : tone]}`} role="status" aria-live="polite">
            <DetectiveCat label={copy.catLabel} />
            <div><strong>{deadEnd || tone === "warn" ? copy.statusWarn : tone === "good" ? copy.statusGood : copy.statusGuide}</strong><p>{deadEnd ? copy.deadEnd : message}</p></div>
          </div>

          <div className={styles.actions}>
            <button type="button" onClick={undo}>{copy.undo}</button>
            <button type="button" onClick={showHint}>{copy.giveHint}</button>
            <button type="button" onClick={resetCase}>{copy.restart}</button>
          </div>
        </section>

        <aside className={styles.notebook} aria-labelledby="notebook-title">
          <div className={styles.panelHeading}>
            <div><p>{copy.notesTitle}</p><h2 id="notebook-title">{copy.notes}</h2></div>
            <span>{formatTime(isComplete ? completedSeconds : elapsed)}</span>
          </div>

          <section className={styles.nextClue}>
            <span>{copy.currentTask}</span>
            <strong>{isComplete ? copy.closed : copy.findNumber(nextClue)}</strong>
            <p>{isComplete ? copy.bestTime(formatTime(completedSeconds)) : copy.endNote(info.end, total)}</p>
          </section>

          <ol className={styles.checks}>
            <li className={orderCheck ? styles.checked : ""}><span>{orderCheck ? "✓" : "1"}</span><div><strong>{copy.numberOrder}</strong><small>{copy.numberOrderNote(info.end)}</small></div></li>
            <li className={fullCheck ? styles.checked : ""}><span>{fullCheck ? "✓" : "2"}</span><div><strong>{copy.fullCoverage}</strong><small>{fullCheck ? copy.everySquare : copy.remaining(total - path.length)}</small></div></li>
            <li className={endCheck ? styles.checked : ""}><span>{endCheck ? "✓" : "3"}</span><div><strong>{copy.finishCheck}</strong><small>{copy.finishNote(info.end)}</small></div></li>
          </ol>

          <details className={styles.rules} open>
            <summary>{copy.rules}</summary>
            <ul>
              <li>{copy.ruleStart}</li>
              <li>{copy.ruleMove}</li>
              <li>{copy.ruleOrder}</li>
              <li><strong>{copy.ruleEnd}</strong></li>
            </ul>
          </details>

          <p className={styles.inputNote}>{copy.inputNote}</p>
        </aside>
      </div>
    </div>
  );
}

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
import { GameDialog } from "./GameDialog";
import { createPlayClock } from "./playClock";
import { solveFromPath, type HintResult } from "./hintSolver";
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
  elapsedMs?: Record<string, number>;
  lastCases?: Partial<Record<Size, number>>;
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
    gameTitle: "数学路径怪探",
    shortRules: "按顺序连接数字，走满每一格，最大数字最后到达。",
    chooseCase: "选择关卡",
    chooseShort: "关卡",
    settingsShort: "设置",
    help: "怎么玩",
    close: "关闭面板",
    resumeChallenge: "继续闯关",
    currentTime: "本次用时",
    nextNumber: "下一数字",
    savedLocally: "进度自动保存在当前浏览器",
    storageUnavailable: "当前浏览器无法保存进度，关闭页面后可能丢失。",
    keepGoing: "从路线末端继续；点回已走的格子可以退回。",
    restartTitle: "重新开始这一题？",
    restartNote: "这次路线会清空，已通关记录、最佳成绩和解锁进度都会保留。",
    cancelRestart: "继续游戏",
    confirmRestart: "清空路线，重新开始",
    hintBusy: "正在寻找线索…",
    hintBlocked: "这条路线无法走满棋盘。请先撤回一步，再换个方向试试。",
    hintUnknown: "暂时还没找到可靠的下一步。你可以继续尝试，或撤回一步再找线索。",
    finishTag: "终点",
    undoShort: "撤回",
    hintShort: "提示",
    restartShort: "重开",
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
    backed: "已退回这格，从这里重新选择方向。",
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
    hint: (row: number, column: number) => `豆豆猫找到线索：下一步可走第 ${row} 行、第 ${column} 列的标记格。`,
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
    inputNote: "拖动或逐格点击连线；点回已走格可回退。键盘用方向键连线，Z 或退格键撤回。",
  },
  en: {
    gameTitle: "Number Path Detectives",
    shortRules: "Connect the numbers in order. Fill every square. Reach the largest number last.",
    chooseCase: "Choose a case",
    chooseShort: "Cases",
    settingsShort: "Settings",
    help: "How to play",
    close: "Close panel",
    resumeChallenge: "Continue your challenge",
    currentTime: "Time played",
    nextNumber: "Next number",
    savedLocally: "Progress saves automatically in this browser",
    storageUnavailable: "This browser cannot save progress. Closing the page may lose your game.",
    keepGoing: "Continue from the end of your path. Tap a visited square to go back.",
    restartTitle: "Restart this case?",
    restartNote: "Your current path will be cleared. Completed cases, best times, and unlocks will stay.",
    cancelRestart: "Keep playing",
    confirmRestart: "Clear path and restart",
    hintBusy: "Finding a clue…",
    hintBlocked: "This path cannot cover the whole board. Undo a move and try another direction.",
    hintUnknown: "No reliable next step found yet. Keep exploring, or undo a move and ask again.",
    finishTag: "END",
    undoShort: "Undo",
    hintShort: "Hint",
    restartShort: "Restart",
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
    backed: "Back at this square. Choose a new direction from here.",
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
    hint: (row: number, column: number) => `Doudou Cat found a clue: try the marked square in row ${row}, column ${column}.`,
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
    inputNote: "Drag or tap to draw. Tap a visited square to go back. Use arrow keys to draw and Z or Backspace to undo.",
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
  if (!Array.isArray(path) || !path.length || path.length > size * size || !samePoint(path[0], puzzle.route[0])) return false;
  const seen = new Set<string>();
  const clues = new Map(puzzle.clues.map(([row, column, value]) => [`${row}-${column}`, value]));
  const end = sizeInfo[size].end;
  let expected = 1;
  return path.every((point, index) => {
    if (!Array.isArray(point) || point.length !== 2) return false;
    const [row, column] = point;
    const key = `${row}-${column}`;
    const clue = clues.get(key);
    const valid = Number.isInteger(row) && Number.isInteger(column)
      && row >= 0 && row < size && column >= 0 && column < size && !seen.has(key)
      && (index === 0 || distance(path[index - 1], point) === 1)
      && (!clue || clue === expected) && (clue !== end || index === size * size - 1);
    if (clue) expected += 1;
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
  const progressRef = useRef<SavedProgress>(emptyProgress);
  const boardRef = useRef<HTMLDivElement>(null);
  const [panel, setPanel] = useState<"cases" | "settings" | "help" | "restart" | null>(null);
  const [visible, setVisible] = useState(() => typeof document === "undefined" || !document.hidden);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [hinting, setHinting] = useState(false);
  const hintJob = useRef<{ worker: Worker; timer: number } | null>(null);
  const hintRequestId = useRef(0);
  const cancelHint = useCallback(() => {
    hintRequestId.current += 1;
    if (hintJob.current) { hintJob.current.worker.terminate(); window.clearTimeout(hintJob.current.timer); hintJob.current = null; }
    setHinting(false);
  }, []);
  useEffect(() => () => { if (hintJob.current) { hintJob.current.worker.terminate(); window.clearTimeout(hintJob.current.timer); } }, []);
  const pathRef = useRef<Point[]>([puzzles["3"][0].route[0]]);
  const draggingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);

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
  const clock = useMemo(() => createPlayClock(progressRef.current.elapsedMs?.[progressKey] ?? 0), [progressKey, hydrated]);

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
      setVisible(!document.hidden);
      if (document.hidden) {
        cancelHint();
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
  }, [supportsVibration, cancelHint]);

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
            lastCases: parsed.lastCases,
            elapsedMs: parsed.elapsedMs,
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
      progressRef.current = storedProgress;
      setProgress(storedProgress);
      setSize(initialSize);
      setPuzzleIndex(safeIndex);
      pathRef.current = initialPath;
      setPath(initialPath);

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

  const persist = useCallback((next: SavedProgress) => {
    progressRef.current = next;
    setProgress(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      setStorageAvailable(false);
    }
  }, []);

  const clockRunning = hydrated && path.length > 1 && !isComplete && !panel && visible;
  useEffect(() => {
    if (!hydrated) return;
    const saveTime = () => {
      const ms = clock.read();
      const current = progressRef.current;
      if (current.elapsedMs?.[progressKey] !== ms) persist({ ...current, elapsedMs: { ...current.elapsedMs, [progressKey]: ms } });
    };
    if (clockRunning) clock.start(); else clock.pause();
    const tick = () => { setElapsed(Math.floor(clock.read() / 1000)); saveTime(); };
    tick();
    const timer = clockRunning ? window.setInterval(tick, 1000) : undefined;
    const hide = () => { clock.pause(); saveTime(); };
    const show = () => { if (clockRunning && !document.hidden) clock.start(); };
    window.addEventListener("pagehide", hide);
    window.addEventListener("pageshow", show);
    return () => {
      window.clearInterval(timer);
      clock.pause(); saveTime();
      window.removeEventListener("pagehide", hide);
      window.removeEventListener("pageshow", show);
    };
  }, [clock, clockRunning, hydrated, persist, progressKey]);

  const completeCase = useCallback((nextPath: Point[]) => {
    const milliseconds = clock.pause();
    const seconds = Math.max(1, Math.floor(milliseconds / 1000));
    const previous = progress.completed[progressKey];
    const best = previous ? Math.min(previous, seconds) : seconds;
    persist({
      ...progressRef.current,
      paths: { ...progressRef.current.paths, [progressKey]: nextPath },
      completed: { ...progressRef.current.completed, [progressKey]: best },
      elapsedMs: { ...progressRef.current.elapsedMs, [progressKey]: milliseconds },
      lastCase: { size, number: puzzle.number },
    });
    draggingRef.current = false;
    setCelebrating(feedback.effects && !reducedMotion);
    vibrate(celebrationLevels[size].vibration);
    setElapsed(seconds);
    setMessage(copy.success(total, info.end));
    setTone("good");
  }, [clock, copy, feedback.effects, reducedMotion, vibrate, info.end, persist, progress, progressKey, puzzle.number, size, total]);

  const moveTo = useCallback((point: Point) => {
    if (!hydrated || isComplete || panel || pathRef.current.length === total) return;
    cancelHint();
    setHintCell(null);
    const currentPath = pathRef.current;
    const last = currentPath.at(-1);
    if (!last || samePoint(last, point)) return;

    const existingIndex = currentPath.findIndex((step) => samePoint(step, point));
    if (existingIndex >= 0) {
      const nextPath = currentPath.slice(0, existingIndex + 1);
      pathRef.current = nextPath;
      setPath(nextPath);
      persist({ ...progressRef.current, paths: { ...progressRef.current.paths, [progressKey]: nextPath } });
      lastDeadEnd.current = "";
      setMessage(copy.backed);
      setTone("guide");
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

    if (currentPath.length === 1) clock.start();
    const nextPath = [...currentPath, point];
    pathRef.current = nextPath;
    setPath(nextPath);
    persist({ ...progressRef.current, paths: { ...progressRef.current.paths, [progressKey]: nextPath } });
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
      setMessage(copy.keepGoing);
      setTone("guide");
    }
  }, [cancelHint, clock, clueMap, completeCase, copy, endPoint, hydrated, info.end, isComplete, panel, persist, progressKey, size, total, vibrate]);

  const pointFromTarget = (target: EventTarget | null): Point | null => {
    const element = target instanceof Element ? target.closest<HTMLElement>("[data-cell]") : null;
    if (!element) return null;
    return [Number(element.dataset.row), Number(element.dataset.column)];
  };

  const movePointerTo = (point: Point) => {
    const last = pathRef.current.at(-1);
    if (!last) return;
    // Fill only an unambiguous straight segment; never invent a diagonal turn.
    if (last[0] !== point[0] && last[1] !== point[1]) { moveTo(point); return; }
    const dr = Math.sign(point[0] - last[0]), dc = Math.sign(point[1] - last[1]);
    for (let step = 1; step <= distance(last, point); step++) {
      const next: Point = [last[0] + dr * step, last[1] + dc * step];
      moveTo(next);
      if (!samePoint(pathRef.current.at(-1), next) || !draggingRef.current) break;
    }
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const point = pointFromTarget(event.target);
    if (!point || !event.isPrimary || event.button !== 0 || !hydrated || isComplete || panel) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerIdRef.current = event.pointerId;
    draggingRef.current = true;
    moveTo(point);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || pointerIdRef.current !== event.pointerId) return;
    const board = event.currentTarget, rect = board.getBoundingClientRect();
    const samples = event.nativeEvent.getCoalescedEvents?.() ?? [];
    for (const sample of [...samples, event.nativeEvent]) {
      const column = Math.floor((sample.clientX - rect.left - board.clientLeft) / board.clientWidth * size);
      const row = Math.floor((sample.clientY - rect.top - board.clientTop) / board.clientHeight * size);
      if (row >= 0 && row < size && column >= 0 && column < size) movePointerTo([row, column]);
      if (!draggingRef.current) break;
    }
  };

  const stopDragging = () => {
    draggingRef.current = false;
    pointerIdRef.current = null;
  };

  const handleKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key.toLowerCase() === "z" || event.key === "Backspace") { event.preventDefault(); undo(); return; }
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
    cancelHint();
    clock.reset();
    setPanel(null);
    setCelebrating(false);
    lastDeadEnd.current = "";
    draggingRef.current = false;
    const initial = [puzzle.route[0]] as Point[];
    persist({
      ...progress,
      paths: { ...progress.paths, [progressKey]: initial },
      elapsedMs: { ...progressRef.current.elapsedMs, [progressKey]: 0 },
      lastCase: { size, number: puzzle.number },
    });
    pathRef.current = initial;
    setPath(initial);
    setHintCell(null);

    setElapsed(0);
    setMessage(copy.reset(info.end));
    setTone("guide");
  };

  const undo = () => {
    cancelHint();
    const currentPath = pathRef.current;
    if (currentPath.length <= 1 || isComplete) {
      setMessage(currentPath.length <= 1 ? copy.atStart : copy.closedUndo);
      setTone("guide");
      return;
    }
    const nextPath = currentPath.slice(0, -1);
    pathRef.current = nextPath;
    setPath(nextPath);
    persist({ ...progressRef.current, paths: { ...progressRef.current.paths, [progressKey]: nextPath } });
    lastDeadEnd.current = "";
    setHintCell(null);
    setMessage(copy.undone);
    setTone("guide");
  };

  const showHint = () => {
    if (!hydrated || isComplete || hinting) return;
    cancelHint();
    const snapshot = pathRef.current;
    const requestId = hintRequestId.current;
    const apply = (result: HintResult) => {
      if (hintRequestId.current !== requestId || pathRef.current !== snapshot) return;
      cancelHint();
      if (result.status === "solved") {
        const next = result.route[snapshot.length];
        setHintCell(next ?? null);
        setMessage(next ? copy.hint(next[0] + 1, next[1] + 1) : copy.hintUnknown); setTone("guide");
      } else {
        setHintCell(null);
        setMessage(result.status === "blocked" ? copy.hintBlocked : copy.hintUnknown);
        setTone(result.status === "blocked" ? "warn" : "guide");
      }
    };
    if (snapshot.every((point, index) => samePoint(point, puzzle.route[index]))) {
      apply({ status: "solved", route: puzzle.route });
      return;
    }
    const request = { size, clues: puzzle.clues, path: snapshot };
    if (typeof Worker === "undefined") { apply(solveFromPath(request, 5_000)); return; }
    try {
      setHinting(true);
      const worker = new Worker(new URL("./hintWorker.ts", import.meta.url), { type: "module" });
      const timer = window.setTimeout(() => apply({ status: "unknown" }), 1500);
      hintJob.current = { worker, timer };
      worker.onmessage = (event: MessageEvent<HintResult>) => apply(event.data);
      worker.onerror = () => apply({ status: "unknown" });
      worker.postMessage(request);
    } catch { apply({ status: "unknown" }); }
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
    cancelHint();
    clock.pause();
    setPanel(null);
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

    setElapsed(0);
    if (hasCompletedCase(progress.completed, nextSize, nextPuzzle.number) && initial.length === nextSize * nextSize) {
      setMessage(copy.archived(formatTime(progress.completed[nextKey])));
      setTone("good");
    } else {
      setMessage(copy.startCase(sizeInfo[nextSize].end));
      setTone("guide");
    }
    persist({ ...progressRef.current, lastCase: { size: nextSize, number: nextPuzzle.number },
      lastCases: { ...progressRef.current.lastCases, [size]: puzzle.number, [nextSize]: nextPuzzle.number } });
    window.requestAnimationFrame(() => boardRef.current?.focus({ preventScroll: true }));
  }, [cancelHint, clock, copy, hydrated, persist, progress, puzzle.number, size, supportsVibration]);

  const resumeSize = (nextSize: Size) => {
    if (nextSize === size) return;
    const list = puzzles[String(nextSize) as `${Size}`];
    const remembered = progress.lastCases?.[nextSize] ?? (progress.lastCase?.size === nextSize ? progress.lastCase.number : undefined);
    const index = list.findIndex((item) => item.number === remembered);
    const unlocked = lastUnlockedIndex(nextSize, progress.completed);
    openCase(nextSize, index < 0 ? unlocked : Math.min(index, unlocked));
  };

  const selectPuzzle = (index: number) => {
    openCase(size, index);
  };

  const polyline = path.map(([row, column]) => `${column + 0.5},${row + 0.5}`).join(" ");
  const cells = Array.from({ length: total }, (_, index) => [Math.floor(index / size), index % size] as Point);

  return (
    <div className={`${styles.page} ${focused ? styles.focused : ""} ${!feedback.effects || reducedMotion ? styles.quiet : ""}`}>
      <header className={styles.hero}>
        <div><p className={styles.eyebrow}>{copy.eyebrow}</p><h1>{copy.gameTitle}</h1></div>
        <button type="button" className={styles.helpButton} onClick={() => setPanel("help")}>{copy.help} <span aria-hidden="true">?</span></button>
      </header>
      <p className={styles.lede}>{copy.shortRules}</p>

      <nav className={styles.sizeTabs} aria-label={copy.sizeNav}>
        {sizes.map((value) => <button type="button" key={value} className={size === value ? styles.activeSize : ""}
          aria-pressed={size === value} disabled={!hydrated} onClick={() => resumeSize(value)}>
          <span>{value}×{value}</span><small>{copy.levels[value]}</small>
        </button>)}
      </nav>

      <section className={styles.boardPanel} aria-labelledby="board-title">
        <div className={styles.boardHeading}>
          <div className={styles.caseIdentity}><p className={styles.kicker}>{level} · {size}×{size}</p><h2 id="board-title">{copy.question(puzzle.number)}</h2></div>
          <div className={styles.boardTools}>
            <button type="button" aria-label={copy.chooseCase} onClick={() => setPanel("cases")} disabled={!hydrated}>
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 3h5v5H3Zm9 0h5v5h-5ZM3 12h5v5H3Zm9 0h5v5h-5Z" /></svg>{copy.chooseShort}
            </button>
            <button type="button" aria-label={copy.settings} onClick={() => setPanel("settings")}>
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 5h14M3 15h14M7 2v6M13 12v6" /></svg>{copy.settingsShort}
            </button>
          </div>
        </div>

        <div className={styles.boardMeta}>
          <span className={styles.nextClue}>{isComplete ? copy.closed : <>{copy.nextNumber} <strong>{nextClue}</strong></>}</span>
          <span className={styles.playTime} aria-label={`${copy.currentTime} ${formatTime(elapsed)}`}><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7" /><path d="M10 5v5l3 2" /></svg>{formatTime(elapsed)}</span>
          <span>{copy.explored} <strong>{path.length}</strong> / {total} {copy.squares}</span>
        </div>

        <div ref={boardRef} className={`${styles.board} ${styles[info.color]} ${deadEnd ? styles.deadEnd : ""} ${isComplete ? styles.solvedBoard : ""}`}
          style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${size}, minmax(0, 1fr))` }}
          onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={stopDragging} onPointerCancel={stopDragging}
          onLostPointerCapture={stopDragging} onKeyDown={handleKeyboard} role="grid" tabIndex={0}
          aria-rowcount={size} aria-colcount={size} aria-activedescendant={`cell-${size}-${path.at(-1)?.join("-")}`} aria-label={copy.boardAria(size)}>
          {celebrating && <Celebration size={size} />}
          <svg className={styles.pathLayer} viewBox={`0 0 ${size} ${size}`} aria-hidden="true"><polyline points={polyline} fill="none" vectorEffect="non-scaling-stroke" /></svg>
          {Array.from({ length: size }, (_, row) => <div role="row" key={row} className={styles.boardRow}>
            {cells.filter((point) => point[0] === row).map(([, column]) => {
              const clue = clueMap.get(`${row}-${column}`);
              const pathIndex = path.findIndex((point) => samePoint(point, [row, column]));
              const selected = pathIndex >= 0;
              const last = pathIndex === path.length - 1;
              const hinted = samePoint(hintCell ?? undefined, [row, column]);
              return <button type="button" role="gridcell" key={`${row}-${column}`} id={`cell-${size}-${row}-${column}`} tabIndex={-1}
                data-cell="true" data-row={row} data-column={column} aria-rowindex={row + 1} aria-colindex={column + 1} aria-selected={selected}
                className={`${styles.cell} ${selected ? styles.selectedCell : ""} ${last ? styles.lastCell : ""} ${hinted ? styles.hintCell : ""} ${clue === nextClue && !isComplete ? styles.nextNumber : ""}`}
                aria-label={copy.cellAria(row + 1, column + 1, clue, info.end, selected, pathIndex)}
                onClick={(event) => { if (event.detail === 0) moveTo([row, column]); }}>
                {clue && <strong>{clue}</strong>}
                {selected && !clue && <small>{pathIndex + 1}</small>}
                {clue === info.end && <span className={styles.finishTag} aria-hidden="true">{copy.finishTag}</span>}
              </button>;
            })}
          </div>)}
        </div>

        <div className={styles.progressTrack} role="progressbar" aria-label={copy.explored} aria-valuenow={path.length} aria-valuemin={0} aria-valuemax={total}><i style={{ width: `${percent}%` }} /></div>
        {isComplete && <div className={styles.successCard} role="status">
          <div><strong>{copy.solved}</strong><span>{copy.bestTime(formatTime(completedSeconds))}</span></div>
          {canOpenNext && <button type="button" onClick={() => selectPuzzle(puzzleIndex + 1)}>{copy.continueCase}<span aria-hidden="true"> →</span></button>}
          {categoryComplete && puzzleIndex === puzzleList.length - 1 && <p>{copy.categoryComplete}</p>}
        </div>}

        <div className={styles.actions}>
          <button type="button" onClick={undo} disabled={!hydrated || path.length <= 1 || isComplete} aria-label={copy.undo} title="Z / Backspace">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5-5 5 5 5M4 10h10a6 6 0 0 1 0 12" /></svg>{copy.undoShort}
          </button>
          <button type="button" className={styles.hintAction} onClick={showHint} disabled={!hydrated || isComplete || hinting} aria-label={copy.giveHint} aria-busy={hinting}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 22h4M8 14a7 7 0 1 1 8 0l-1 4H9Z" /></svg>{hinting ? copy.hintBusy : copy.hintShort}
          </button>
          <button type="button" onClick={() => { if (path.length > 1) setPanel("restart"); else resetCase(); }} disabled={!hydrated} aria-label={copy.restart}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9a8 8 0 1 1-1 7M4 3v6h6" /></svg>{copy.restartShort}
          </button>
        </div>

        <div className={`${styles.message} ${styles[deadEnd ? "warn" : tone]}`} role="status" aria-live="polite">
          <DetectiveCat label={copy.catLabel} />
          <p>{deadEnd ? copy.deadEnd : message}</p>
        </div>
        <div className={styles.pager}>
          <button type="button" disabled={!hydrated || puzzleIndex === 0} onClick={() => selectPuzzle(puzzleIndex - 1)} aria-label={copy.previous}>← {copy.previous}</button>
          <span>{copy.unlocked(unlockedIndex + 1, puzzleList.length)}</span>
          <button type="button" disabled={!hydrated || !canOpenNext} onClick={() => selectPuzzle(puzzleIndex + 1)} aria-label={copy.next}>{copy.next} →</button>
        </div>
      </section>
      <p className={styles.saveNote} role={storageAvailable ? undefined : "status"}>{storageAvailable ? copy.savedLocally : copy.storageUnavailable}</p>

      <GameDialog open={panel === "cases"} title={`${copy.chooseCase} · ${size}×${size}`} closeLabel={copy.close} onClose={() => setPanel(null)}>
        <div className={styles.caseOverview}><p>{copy.unlockRule}</p><strong>{completedForSize} / {puzzleList.length} ✓</strong></div>
        <button type="button" className={styles.continueButton} onClick={() => selectPuzzle(unlockedIndex)}>{copy.resumeChallenge} · {copy.question(puzzleList[unlockedIndex].number)} →</button>
        <label className={styles.quickCase}>{copy.quick}<select value={puzzleIndex} aria-label={copy.quickAria} onChange={(event) => selectPuzzle(Number(event.target.value))}>
          {puzzleList.map((item, index) => <option key={item.number} value={index} disabled={index > unlockedIndex}>
            {copy.option(item.number, hasCompletedCase(progress.completed, size, item.number))}{index > unlockedIndex ? ` · ${copy.locked}` : ""}
          </option>)}
        </select></label>
        <div className={styles.caseGrid}>
          {puzzleList.map((item, index) => {
            const complete = hasCompletedCase(progress.completed, size, item.number), locked = index > unlockedIndex;
            return <button type="button" key={item.number} disabled={locked || !hydrated}
              className={`${index === puzzleIndex ? styles.activeCase : ""} ${complete ? styles.completeCase : ""}`}
              aria-label={`${copy.caseAria(item.number, complete)}${locked ? ` · ${copy.locked}` : ""}`} aria-current={index === puzzleIndex ? "true" : undefined}
              title={locked ? copy.unlockRequired(puzzleList[unlockedIndex].number) : undefined} onClick={() => selectPuzzle(index)}>
              {String(item.number).padStart(2, "0")}
              {locked ? <svg className={styles.lockIcon} viewBox="0 0 16 16" aria-hidden="true"><path d="M5 7V5a3 3 0 0 1 6 0v2M4 7h8v7H4Z" /></svg> : complete && <span aria-hidden="true">✓</span>}
            </button>;
          })}
        </div>
      </GameDialog>

      <GameDialog open={panel === "settings"} title={copy.settings} closeLabel={copy.close} onClose={() => setPanel(null)}>
        <div className={styles.settingsPanel}>
          <label><span>{copy.effects}</span><input type="checkbox" checked={feedback.effects} onChange={(event) => updateFeedback("effects", event.target.checked)} /></label>
          <label><span>{copy.haptics}</span><input type="checkbox" checked={feedback.haptics && supportsVibration} disabled={!supportsVibration} onChange={(event) => updateFeedback("haptics", event.target.checked)} /></label>
          <p>{supportsVibration ? copy.vibrationNote : copy.vibrationUnavailable}</p>
          {supportsVibration && <button type="button" disabled={!feedback.haptics} onClick={() => vibrate([30, 65, 30])}>{copy.testVibration}</button>}
          <label><span>{copy.focus}</span><input type="checkbox" checked={feedback.focus} onChange={(event) => updateFeedback("focus", event.target.checked)} /></label>
          {reducedMotion && <p>{copy.reducedMotion}</p>}
        </div>
      </GameDialog>

      <GameDialog open={panel === "help"} title={copy.help} closeLabel={copy.close} onClose={() => setPanel(null)}>
        <p className={styles.helpLead}>{copy.shortRules}</p>
        <ol className={styles.rules}><li>{copy.ruleStart}</li><li>{copy.ruleMove}</li><li>{copy.ruleOrder}</li><li><strong>{copy.ruleEnd}</strong></li></ol>
        <p>{copy.inputNote}</p><p>{copy.unlockRule}</p>
        <div className={styles.helpFooter}><DetectiveCat label={copy.catLabel} /><span>319 {copy.cases} · {copy.verified}</span></div>
      </GameDialog>

      <GameDialog open={panel === "restart"} title={copy.restartTitle} closeLabel={copy.close} onClose={() => setPanel(null)}>
        <p>{copy.restartNote}</p><div className={styles.dialogActions}>
          <button type="button" onClick={() => setPanel(null)}>{copy.cancelRestart}</button>
          <button type="button" className={styles.dangerButton} onClick={resetCase}>{copy.confirmRestart}</button>
        </div>
      </GameDialog>
    </div>
  );
}

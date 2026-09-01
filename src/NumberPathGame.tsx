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
import rawPuzzles from "./number-path-puzzles.json";
import styles from "./NumberPathGame.module.css";

type Size = 3 | 4 | 5 | 6;
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
const sizeInfo: Record<Size, { label: string; end: number; color: string }> = {
  3: { label: "见习", end: 4, color: "butter" },
  4: { label: "巡查", end: 5, color: "peach" },
  5: { label: "推理", end: 8, color: "sage" },
  6: { label: "怪探", end: 11, color: "lavender" },
};
const emptyProgress: SavedProgress = { paths: {}, completed: {} };
const storageKey = "zide-number-path-progress-v1";

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

function DetectiveCat() {
  return (
    <svg className={styles.cat} viewBox="0 0 120 96" role="img" aria-label="豆豆猫怪探正在查看线索">
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

export function NumberPathGame() {
  const [size, setSize] = useState<Size>(3);
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [path, setPath] = useState<Point[]>(() => [puzzles["3"][0].route[0]]);
  const [message, setMessage] = useState("先找到数字 1，怪探从这里出发。最大数字要留到最后。");
  const [tone, setTone] = useState<Tone>("guide");
  const [hintCell, setHintCell] = useState<Point | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState<SavedProgress>(emptyProgress);
  const [hydrated, setHydrated] = useState(false);
  const startedAt = useRef(0);
  const pathRef = useRef<Point[]>([puzzles["3"][0].route[0]]);
  const draggingRef = useRef(false);

  const puzzleList = puzzles[String(size) as `${Size}`];
  const puzzle = puzzleList[puzzleIndex];
  const info = sizeInfo[size];
  const total = size * size;
  const progressKey = `${size}-${puzzle.number}`;

  const clueMap = useMemo(() => {
    const map = new Map<string, number>();
    puzzle.clues.forEach(([row, column, value]) => map.set(`${row}-${column}`, value));
    return map;
  }, [puzzle]);

  const completedSeconds = progress.completed[progressKey];
  const isComplete = Boolean(completedSeconds);
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
  const percent = Math.round((path.length / total) * 100);

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
      const safeIndex = initialIndex >= 0 ? initialIndex : 0;
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
      if (storedProgress.completed[initialKey]) {
        setMessage(`这宗谜案已归档，用时 ${formatTime(storedProgress.completed[initialKey])}。你可以重走一次，或换下一题。`);
        setTone("good");
      } else {
        setMessage(`继续勘察第 ${initialPuzzle.number} 题：已走 ${initialPath.length} 格，数字 ${sizeInfo[initialSize].end} 是终点。`);
        setTone("guide");
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(load);
  }, []);

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
    setElapsed(seconds);
    setMessage(`破案成功！${total} 格全部走过，数字 ${info.end} 正好落在最后一格。`);
    setTone("good");
  }, [info.end, persist, progress, progressKey, puzzle.number, size, total]);

  const moveTo = useCallback((point: Point) => {
    if (isComplete) return;
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
        setMessage("已沿原路退回一格。重新观察四个方向。");
        setTone("guide");
      } else {
        setMessage("路线不能重复经过同一格；需要回退时请沿原路退一格。");
        setTone("warn");
      }
      return;
    }

    if (distance(last, point) !== 1) {
      setMessage("怪探不能斜走或跳格，只能走到上下左右相邻格。");
      setTone("warn");
      return;
    }

    const clue = clueMap.get(`${point[0]}-${point[1]}`);
    const reachedClues = currentPath
      .map(([row, column]) => clueMap.get(`${row}-${column}`))
      .filter((value): value is number => Boolean(value));
    const expectedClue = Math.min(info.end, Math.max(1, ...reachedClues) + 1);
    if (clue === info.end && currentPath.length + 1 < total) {
      setMessage(`数字 ${info.end} 是终点，现在还没填满全部格子，先绕开它。`);
      setTone("warn");
      return;
    }
    if (clue && clue !== expectedClue) {
      setMessage(`还不能到数字 ${clue}，请先找到数字 ${expectedClue}。`);
      setTone("warn");
      return;
    }
    if (currentPath.length + 1 === total && !samePoint(point, endPoint)) {
      setMessage(`只剩最后一格时，必须抵达最大的数字 ${info.end}。`);
      setTone("warn");
      return;
    }

    const nextPath = [...currentPath, point];
    pathRef.current = nextPath;
    setPath(nextPath);
    persist({ ...progress, paths: { ...progress.paths, [progressKey]: nextPath } });
    if (nextPath.length === total && samePoint(point, endPoint)) {
      completeCase(nextPath);
    } else if (clue) {
      setMessage(`线索吻合：已经找到数字 ${clue}，接着找数字 ${clue + 1}。`);
      setTone("good");
    } else {
      setMessage(`路线已走 ${nextPath.length} 格，继续观察相邻空格。`);
      setTone("guide");
    }
  }, [clueMap, completeCase, endPoint, info.end, isComplete, persist, progress, progressKey, total]);

  const pointFromTarget = (target: EventTarget | null): Point | null => {
    const element = target instanceof Element ? target.closest<HTMLElement>("[data-cell]") : null;
    if (!element) return null;
    return [Number(element.dataset.row), Number(element.dataset.column)];
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const point = pointFromTarget(event.target);
    if (!point) return;
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
    const initial = [puzzle.route[0]] as Point[];
    const completed = { ...progress.completed };
    delete completed[progressKey];
    persist({
      paths: { ...progress.paths, [progressKey]: initial },
      completed,
      lastCase: { size, number: puzzle.number },
    });
    pathRef.current = initial;
    setPath(initial);
    setHintCell(null);
    startedAt.current = Date.now();
    setElapsed(0);
    setMessage(`重新勘察：从 1 出发，数字 ${info.end} 必须最后抵达。`);
    setTone("guide");
  };

  const undo = () => {
    const currentPath = pathRef.current;
    if (currentPath.length <= 1 || isComplete) {
      setMessage(currentPath.length <= 1 ? "已经回到起点 1 了。" : "已归档的谜案如需重走，请选择“重新开始”。");
      setTone("guide");
      return;
    }
    const nextPath = currentPath.slice(0, -1);
    pathRef.current = nextPath;
    setPath(nextPath);
    persist({ ...progress, paths: { ...progress.paths, [progressKey]: nextPath } });
    setMessage("撤回一步。现在从路线末端继续。");
    setTone("guide");
  };

  const showHint = () => {
    let prefix = 0;
    while (prefix < path.length && samePoint(path[prefix], puzzle.route[prefix])) prefix += 1;
    if (prefix < path.length) {
      setHintCell(path[prefix]);
      setMessage(`第 ${prefix + 1} 步偏离了可靠线索。沿原路退回，再换一个方向试试。`);
      setTone("warn");
      return;
    }
    const next = puzzle.route[path.length];
    if (!next) return;
    setHintCell(next);
    setMessage("豆豆猫找到一枚脚印：闪烁格可以作为下一步。");
    setTone("guide");
  };

  const openCase = useCallback((nextSize: Size, index: number) => {
    const nextList = puzzles[String(nextSize) as `${Size}`];
    const nextIndex = (index + nextList.length) % nextList.length;
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
    if (progress.completed[nextKey]) {
      setMessage(`这宗谜案已归档，用时 ${formatTime(progress.completed[nextKey])}。你可以重走一次，或换下一题。`);
      setTone("good");
    } else {
      setMessage(`从 1 出发，下一站找数字 2；数字 ${sizeInfo[nextSize].end} 是终点。`);
      setTone("guide");
    }
    persist({ ...progress, lastCase: { size: nextSize, number: nextPuzzle.number } });
  }, [persist, progress]);

  const selectPuzzle = (index: number) => {
    openCase(size, index);
  };

  const completedForSize = Object.keys(progress.completed).filter((key) => key.startsWith(`${size}-`)).length;
  const polyline = path.map(([row, column]) => `${column + 0.5},${row + 0.5}`).join(" ");
  const cells = Array.from({ length: total }, (_, index) => [Math.floor(index / size), index % size] as Point);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>数学路径怪探 · 数字顺序与空间推理</p>
          <h1>每一格都是线索，<em>最大数字才是终点。</em></h1>
          <p className={styles.lede}>从 1 出发，只走上下左右，按顺序经过数字；不漏格、不重走，最后抵达最大的数字。</p>
        </div>
        <div className={styles.heroStamp} aria-label="题库经过程序验证">
          <strong>319</strong><span>宗谜案</span><small>程序逐题验证</small>
        </div>
      </header>

      <nav className={styles.sizeTabs} aria-label="选择棋盘大小">
        {sizes.map((value) => (
          <button
            type="button"
            key={value}
            className={size === value ? styles.activeSize : ""}
            aria-pressed={size === value}
            onClick={() => openCase(value, 0)}
          >
            <span>{value}×{value}</span>
            <small>{sizeInfo[value].label} · 终点 {sizeInfo[value].end}</small>
          </button>
        ))}
      </nav>

      <div className={styles.workspace}>
        <aside className={styles.caseRail} aria-labelledby="case-title">
          <div className={styles.panelHeading}>
            <div><p>CASE FILES</p><h2 id="case-title">谜案档案</h2></div>
            <span>{completedForSize}/{puzzleList.length}</span>
          </div>
          <div className={styles.caseGrid}>
            {puzzleList.map((item, index) => {
              const key = `${size}-${item.number}`;
              const complete = Boolean(progress.completed[key]);
              return (
                <button
                  type="button"
                  key={item.number}
                  className={`${index === puzzleIndex ? styles.activeCase : ""} ${complete ? styles.completeCase : ""}`}
                  aria-label={`第 ${item.number} 题${complete ? "，已完成" : ""}`}
                  aria-current={index === puzzleIndex ? "true" : undefined}
                  onClick={() => selectPuzzle(index)}
                >
                  {String(item.number).padStart(2, "0")}
                  {complete && <span aria-hidden="true">✓</span>}
                </button>
              );
            })}
          </div>
        </aside>

        <section className={styles.boardPanel} aria-labelledby="board-title">
          <div className={styles.boardHeading}>
            <div>
              <p className={styles.kicker}>{info.label}级谜案 · {size}×{size}</p>
              <h2 id="board-title">第 {puzzle.number} 题</h2>
            </div>
            <div className={styles.pager}>
              <button type="button" onClick={() => selectPuzzle(puzzleIndex - 1)}>上一题</button>
              <span>{puzzle.number} / {puzzleList.length}</span>
              <button type="button" onClick={() => selectPuzzle(puzzleIndex + 1)}>下一题</button>
              <label className={styles.quickCase}>
                快速选题
                <select
                  value={puzzleIndex}
                  onChange={(event) => selectPuzzle(Number(event.target.value))}
                  aria-label="快速选择题目"
                >
                  {puzzleList.map((item, index) => (
                    <option key={item.number} value={index}>
                      第 {String(item.number).padStart(2, "0")} 题
                      {progress.completed[`${size}-${item.number}`] ? " · 已完成" : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div
            className={`${styles.board} ${styles[info.color]}`}
            style={{
              gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopDragging}
            onPointerCancel={stopDragging}
            onKeyDown={handleKeyboard}
            role="grid"
            tabIndex={0}
            aria-label={`${size}乘${size}数字路径棋盘，方向键也可以继续路线`}
          >
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
                  aria-label={`${row + 1} 行 ${column + 1} 列${clue ? `，数字 ${clue}${clue === info.end ? "，终点" : ""}` : "，空格"}${selected ? `，路线第 ${pathIndex + 1} 格` : ""}`}
                  onClick={() => moveTo([row, column])}
                >
                  {clue && <strong>{clue}</strong>}
                  {selected && !clue && <small>{pathIndex + 1}</small>}
                </button>
              );
            })}
          </div>

          <div className={styles.progressRow}>
            <span>已勘察 <strong>{path.length}</strong> / {total} 格</span>
            <div className={styles.progressTrack} aria-label={`完成进度 ${percent}%`}><i style={{ width: `${percent}%` }} /></div>
            <span>{percent}%</span>
          </div>

          <div className={`${styles.message} ${styles[tone]}`} role="status" aria-live="polite">
            <DetectiveCat />
            <div><strong>{tone === "warn" ? "停一下，核对线索" : tone === "good" ? "线索吻合" : "豆豆猫提示"}</strong><p>{message}</p></div>
          </div>

          <div className={styles.actions}>
            <button type="button" onClick={undo}>撤回一步</button>
            <button type="button" onClick={showHint}>给我一条线索</button>
            <button type="button" onClick={resetCase}>重新开始</button>
          </div>
        </section>

        <aside className={styles.notebook} aria-labelledby="notebook-title">
          <div className={styles.panelHeading}>
            <div><p>DETECTIVE NOTES</p><h2 id="notebook-title">怪探手记</h2></div>
            <span>{formatTime(isComplete ? completedSeconds : elapsed)}</span>
          </div>

          <section className={styles.nextClue}>
            <span>当前任务</span>
            <strong>{isComplete ? "谜案归档" : `寻找数字 ${nextClue}`}</strong>
            <p>{isComplete ? `最佳用时 ${formatTime(completedSeconds)}` : `终点是 ${info.end}，抵达前要填满 ${total} 格。`}</p>
          </section>

          <ol className={styles.checks}>
            <li className={orderCheck ? styles.checked : ""}><span>{orderCheck ? "✓" : "1"}</span><div><strong>数字顺序</strong><small>依次经过 1 到 {info.end}</small></div></li>
            <li className={fullCheck ? styles.checked : ""}><span>{fullCheck ? "✓" : "2"}</span><div><strong>全部覆盖</strong><small>{fullCheck ? "每格都有路线" : `还差 ${total - path.length} 格`}</small></div></li>
            <li className={endCheck ? styles.checked : ""}><span>{endCheck ? "✓" : "3"}</span><div><strong>终点核验</strong><small>数字 {info.end} 必须最后抵达</small></div></li>
          </ol>

          <details className={styles.rules} open>
            <summary>怪探守则</summary>
            <ul>
              <li>从数字 1 开始。</li>
              <li>只能走上下左右相邻格。</li>
              <li>按数字顺序经过，不重复、不漏格。</li>
              <li><strong>最大的数字是终点。</strong></li>
            </ul>
          </details>

          <p className={styles.inputNote}>电脑可按住鼠标拖动；手机可滑动或逐格点击；键盘可用方向键。</p>
        </aside>
      </div>
    </div>
  );
}

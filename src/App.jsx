import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AUTO_PLAY_INTERVAL_MS,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  DEFAULT_POINTS,
  MAX_POINTS,
  MIN_POINTS,
  POINT_SIZE,
  clampPointCount,
  clickPoint,
  createPoints,
  formatSeconds,
  getAutoPlayTarget,
  isAllCleared,
  removeExpiredPoints,
} from "./gameLogic";
import "./App.css";

export default function App() {
  const [pointInput, setPointInput] = useState(String(DEFAULT_POINTS));
  const [totalPoints, setTotalPoints] = useState(DEFAULT_POINTS);
  const [points, setPoints] = useState([]);
  const [nextNumber, setNextNumber] = useState(1);
  const [status, setStatus] = useState("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [nowMs, setNowMs] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);

  const startTimeRef = useRef(null);
  const autoPlayRef = useRef(null);
  const nextNumberRef = useRef(nextNumber);
  const pointsRef = useRef(points);
  const statusRef = useRef(status);

  const title = useMemo(() => {
    if (status === "gameOver") return "GAME OVER";
    if (status === "cleared") return "ALL CLEARED";
    return "LET'S PLAY";
  }, [status]);

  const clearedCount = useMemo(
    () => points.filter((point) => point.status === "removed").length,
    [points],
  );

  useEffect(() => {
    nextNumberRef.current = nextNumber;
    pointsRef.current = points;
    statusRef.current = status;
  }, [nextNumber, points, status]);

  const finishGameIfReady = useCallback(
    (updatedPoints, updatedNextNumber) => {
      if (!isAllCleared(updatedPoints, totalPoints, updatedNextNumber)) return;

      setStatus("cleared");
      statusRef.current = "cleared";
      setAutoPlay(false);
    },
    [totalPoints],
  );

  const startGame = () => {
    const total = clampPointCount(pointInput);
    const newPoints = createPoints(total);
    const startedAt = Date.now();

    startTimeRef.current = startedAt;
    nextNumberRef.current = 1;
    pointsRef.current = newPoints;
    statusRef.current = "playing";

    setPointInput(String(total));
    setTotalPoints(total);
    setPoints(newPoints);
    setNextNumber(1);
    setStatus("playing");
    setElapsedMs(0);
    setNowMs(startedAt);
    setAutoPlay(false);
  };

  const handlePointClick = useCallback(
    (pointId) => {
      if (statusRef.current !== "playing") return;

      const clickedAt = Date.now();
      const result = clickPoint(
        pointsRef.current,
        pointId,
        nextNumberRef.current,
        clickedAt,
      );

      if (result.result === "ignored") return;

      pointsRef.current = result.points;
      nextNumberRef.current = result.nextNumber;
      setPoints(result.points);
      setNextNumber(result.nextNumber);

      if (result.result === "wrong") {
        setStatus("gameOver");
        statusRef.current = "gameOver";
        setAutoPlay(false);
        return;
      }

      finishGameIfReady(result.points, result.nextNumber);
    },
    [finishGameIfReady],
  );

  useEffect(() => {
    if (status !== "playing") return undefined;

    const timer = window.setInterval(() => {
      const currentTime = Date.now();
      const updatedPoints = removeExpiredPoints(pointsRef.current, currentTime);

      setNowMs(currentTime);
      setElapsedMs(currentTime - startTimeRef.current);

      if (updatedPoints !== pointsRef.current) {
        pointsRef.current = updatedPoints;
        setPoints(updatedPoints);
        finishGameIfReady(updatedPoints, nextNumberRef.current);
      }
    }, 100);

    return () => window.clearInterval(timer);
  }, [finishGameIfReady, status]);

  useEffect(() => {
    if (!autoPlay || status !== "playing") {
      if (autoPlayRef.current) {
        window.clearInterval(autoPlayRef.current);
        autoPlayRef.current = null;
      }

      return undefined;
    }

    autoPlayRef.current = window.setInterval(() => {
      const target = getAutoPlayTarget(
        pointsRef.current,
        nextNumberRef.current,
      );

      if (target) {
        handlePointClick(target.id);
      }
    }, AUTO_PLAY_INTERVAL_MS);

    return () => {
      if (autoPlayRef.current) {
        window.clearInterval(autoPlayRef.current);
        autoPlayRef.current = null;
      }
    };
  }, [autoPlay, handlePointClick, status]);

  return (
    <main className="app">
      <h1
        className={
          status === "cleared"
            ? "title title-cleared"
            : status === "gameOver"
              ? "title title-game-over"
              : "title"
        }
      >
        {title}
      </h1>

      <section className="controls" aria-label="Game controls">
        <label className="field" htmlFor="points">
          <span>Points:</span>
          <input
            id="points"
            type="number"
            min={MIN_POINTS}
            max={MAX_POINTS}
            value={pointInput}
            onChange={(event) => setPointInput(event.target.value)}
            disabled={status === "playing"}
          />
        </label>

        <div className="field">
          <span>Time:</span>
          <strong>{formatSeconds(elapsedMs)}</strong>
        </div>

        <div className="actions">
          <button type="button" onClick={startGame}>
            {status === "idle" ? "Play" : "Restart"}
          </button>

          {status === "playing" && (
            <button
              type="button"
              onClick={() => setAutoPlay((isAutoPlaying) => !isAutoPlaying)}
            >
              Auto Play {autoPlay ? "ON" : "OFF"}
            </button>
          )}
        </div>
      </section>

      <section
        className="board"
        style={{ width: BOARD_WIDTH, height: BOARD_HEIGHT }}
        aria-label="Game board"
      >
        {points.map((point) =>
          point.status === "removed" ? null : (
            <button
              key={point.id}
              type="button"
              className={`point ${point.status} ${point.isWrong ? "wrong" : ""}`}
              style={{
                left: point.x,
                top: point.y,
                width: POINT_SIZE,
                height: POINT_SIZE,
                zIndex:
                  point.status === "clicked" || point.isWrong
                    ? totalPoints + point.id
                    : totalPoints - point.id,
              }}
              onClick={() => handlePointClick(point.id)}
              disabled={status !== "playing" || point.status !== "active"}
              aria-label={`Point ${point.id}`}
            >
              <span>{point.id}</span>
              {point.status === "clicked" && (
                <small>{formatSeconds(point.removeAt - nowMs)}</small>
              )}
            </button>
          ),
        )}
      </section>

      <p className="next-label">
        {status === "playing"
          ? `Next: ${nextNumber}`
          : `Cleared: ${clearedCount}/${totalPoints}`}
      </p>
    </main>
  );
}

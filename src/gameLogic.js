export const DEFAULT_POINTS = 5;
export const MIN_POINTS = 1;
export const MAX_POINTS = 2000;
export const BOARD_WIDTH = 800;
export const BOARD_HEIGHT = 560;
export const POINT_SIZE = 46;
export const REMOVE_DELAY_MS = 3000;
export const AUTO_PLAY_INTERVAL_MS = 800;

export function clampPointCount(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return DEFAULT_POINTS;
  }

  return Math.min(MAX_POINTS, Math.max(MIN_POINTS, Math.floor(number)));
}

export function formatSeconds(ms) {
  return `${Math.max(0, ms / 1000).toFixed(1)}s`;
}

function randomPosition(limit) {
  return Math.floor(Math.random() * Math.max(1, limit));
}

export function createPoints(
  total,
  boardWidth = BOARD_WIDTH,
  boardHeight = BOARD_HEIGHT,
) {
  const count = clampPointCount(total);
  const maxX = boardWidth - POINT_SIZE;
  const maxY = boardHeight - POINT_SIZE;

  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    x: randomPosition(maxX),
    y: randomPosition(maxY),
    status: "active",
    clickedAt: null,
    removeAt: null,
    isWrong: false,
  }));
}

export function clickPoint(points, pointId, nextNumber, now) {
  const target = points.find((point) => point.id === pointId);

  if (!target || target.status !== "active") {
    return {
      points,
      nextNumber,
      result: "ignored",
    };
  }

  if (pointId !== nextNumber) {
    return {
      points: points.map((point) =>
        point.id === pointId ? { ...point, isWrong: true } : point,
      ),
      nextNumber,
      result: "wrong",
    };
  }

  return {
    points: points.map((point) =>
      point.id === pointId
        ? {
            ...point,
            status: "clicked",
            clickedAt: now,
            removeAt: now + REMOVE_DELAY_MS,
          }
        : point,
    ),
    nextNumber: nextNumber + 1,
    result: "correct",
  };
}

export function removeExpiredPoints(points, now) {
  let changed = false;

  const updatedPoints = points.map((point) => {
    if (point.status === "clicked" && point.removeAt <= now) {
      changed = true;
      return { ...point, status: "removed" };
    }

    return point;
  });

  return changed ? updatedPoints : points;
}

export function getAutoPlayTarget(points, nextNumber) {
  return points.find(
    (point) => point.id === nextNumber && point.status === "active",
  );
}

export function isAllCleared(points, totalPoints, nextNumber) {
  return (
    nextNumber > totalPoints &&
    points.length === totalPoints &&
    points.every((point) => point.status === "removed")
  );
}

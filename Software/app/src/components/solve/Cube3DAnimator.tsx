"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  FACE_ORDER,
  type Color,
  type CubeState,
  type Face,
  type LogicalMove,
} from "@/types";
import styles from "./Cube3DAnimator.module.css";

interface Cube3DAnimatorProps {
  cubeState: CubeState;
  activeMove: LogicalMove | null;
  isPlaying: boolean;
  moveIndex: number;
  progress: number;
  speedMs: number;
  totalMoves: number;
}

type Axis = "x" | "y" | "z";
type Vector3Tuple = readonly [number, number, number];

type FaceOrientation = {
  normal: Vector3Tuple;
  right: Vector3Tuple;
  down: Vector3Tuple;
};

type RenderContext = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  root: THREE.Group;
  baseGroup: THREE.Group;
  turnGroup: THREE.Group;
  animationFrameId: number;
  resizeObserver: ResizeObserver;
  dispose: () => void;
};

type TurnState = {
  key: string;
  axis: Axis;
  angle: number;
  startedAt: number;
  fraction: number;
};

const FACE_ORIENTATION: Record<Face, FaceOrientation> = {
  U: {
    normal: [0, 1, 0],
    right: [1, 0, 0],
    down: [0, 0, 1],
  },
  R: {
    normal: [1, 0, 0],
    right: [0, 0, -1],
    down: [0, -1, 0],
  },
  F: {
    normal: [0, 0, 1],
    right: [1, 0, 0],
    down: [0, -1, 0],
  },
  D: {
    normal: [0, -1, 0],
    right: [1, 0, 0],
    down: [0, 0, -1],
  },
  L: {
    normal: [-1, 0, 0],
    right: [0, 0, 1],
    down: [0, -1, 0],
  },
  B: {
    normal: [0, 0, -1],
    right: [-1, 0, 0],
    down: [0, -1, 0],
  },
};

const MOVE_ROTATION: Record<Face, { axis: Axis; quarterTurn: 1 | -1 }> = {
  U: { axis: "y", quarterTurn: -1 },
  R: { axis: "x", quarterTurn: -1 },
  F: { axis: "z", quarterTurn: -1 },
  D: { axis: "y", quarterTurn: 1 },
  L: { axis: "x", quarterTurn: 1 },
  B: { axis: "z", quarterTurn: 1 },
};

const COLOR_HEX: Record<Color, number> = {
  white: 0xf8fafc,
  red: 0xef4444,
  green: 0x22c55e,
  yellow: 0xfacc15,
  orange: 0xf97316,
  blue: 0x3b82f6,
};

const COLOR_LABEL: Record<Color, string> = {
  white: "Branco",
  red: "Vermelho",
  green: "Verde",
  yellow: "Amarelo",
  orange: "Laranja",
  blue: "Azul",
};

const CUBIE_STEP = 1.08;
const CUBIE_SIZE = 0.98;
const STICKER_SIZE = 0.76;
const MOVE_PATTERN = /^(U|R|F|D|L|B)(2|')?$/;

export function Cube3DAnimator({
  cubeState,
  activeMove,
  isPlaying,
  moveIndex,
  progress,
  speedMs,
  totalMoves,
}: Cube3DAnimatorProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const contextRef = useRef<RenderContext | null>(null);
  const turnRef = useRef<TurnState | null>(null);
  const isPlayingRef = useRef(isPlaying);
  const speedMsRef = useRef(speedMs);
  const [isRendererReady, setIsRendererReady] = useState(false);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    speedMsRef.current = speedMs;

    if (isPlaying) {
      const turn = turnRef.current;
      if (turn) {
        turn.startedAt = performance.now() - turn.fraction * speedMs;
      }
    }
  }, [isPlaying, speedMs]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(5.2, 4.2, 6.4);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute("aria-label", "Cubo 3D da solução");
    renderer.domElement.setAttribute("data-testid", "cube-3d-canvas");
    renderer.domElement.style.cursor = "grab";
    viewport.appendChild(renderer.domElement);
    setIsRendererReady(true);

    const root = new THREE.Group();
    root.rotation.x = -0.46;
    root.rotation.y = -0.68;
    scene.add(root);

    const baseGroup = new THREE.Group();
    const turnGroup = new THREE.Group();
    root.add(baseGroup, turnGroup);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(4, 6, 5);
    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.9);
    fillLight.position.set(-5, -2, -3);
    scene.add(ambientLight, keyLight, fillLight);

    const resizeObserver = new ResizeObserver(() => {
      updateRendererSize(viewport, renderer, camera);
    });
    resizeObserver.observe(viewport);
    updateRendererSize(viewport, renderer, camera);

    const pointerCleanup = bindPointerOrbit(renderer.domElement, root);

    const animate = () => {
      const turn = turnRef.current;
      if (turn && isPlayingRef.current) {
        turn.fraction = Math.min(
          1,
          (performance.now() - turn.startedAt) / Math.max(speedMsRef.current, 1),
        );
        setGroupAxisRotation(
          turnGroup,
          turn.axis,
          turn.angle * easeInOutCubic(turn.fraction),
        );
      }

      renderer.render(scene, camera);
      context.animationFrameId = window.requestAnimationFrame(animate);
    };

    const context: RenderContext = {
      scene,
      camera,
      renderer,
      root,
      baseGroup,
      turnGroup,
      animationFrameId: 0,
      resizeObserver,
      dispose: () => {
        pointerCleanup();
        resizeObserver.disconnect();
        window.cancelAnimationFrame(context.animationFrameId);
        clearGroup(baseGroup);
        clearGroup(turnGroup);
        renderer.dispose();
        renderer.domElement.remove();
        setIsRendererReady(false);
      },
    };
    contextRef.current = context;
    context.animationFrameId = window.requestAnimationFrame(animate);

    return () => {
      context.dispose();
      contextRef.current = null;
      turnRef.current = null;
    };
  }, []);

  useEffect(() => {
    const context = contextRef.current;
    if (!context) {
      return;
    }

    turnRef.current = null;
    clearGroup(context.baseGroup);
    clearGroup(context.turnGroup);
    context.turnGroup.rotation.set(0, 0, 0);
    buildCubeMeshes(cubeState, context.baseGroup);
  }, [cubeState]);

  useEffect(() => {
    const context = contextRef.current;
    if (!context || !activeMove || moveIndex >= totalMoves) {
      return;
    }

    const nextTurn = parseTurn(activeMove, moveIndex);
    context.turnGroup.rotation.set(0, 0, 0);
    moveAllChildren(context.turnGroup, context.baseGroup);
    moveLayerToTurnGroup(context.baseGroup, context.turnGroup, nextTurn);
    turnRef.current = {
      key: nextTurn.key,
      axis: nextTurn.axis,
      angle: nextTurn.angle,
      startedAt: performance.now(),
      fraction: 0,
    };
  }, [activeMove, moveIndex, totalMoves]);

  const currentLabel =
    activeMove && moveIndex < totalMoves ? activeMove : "finalizado";
  const progressLabel = `${moveIndex}/${totalMoves} (${Math.round(progress * 100)}%)`;

  return (
    <section className={styles.sceneShell} aria-label="Animação 3D da solução">
      <div ref={viewportRef} className={styles.viewport}>
        {!isRendererReady ? (
          <p className={styles.fallback}>Carregando visualização 3D...</p>
        ) : null}
      </div>

      <div className={styles.overlay}>
        <div className={styles.headline}>
          <span>Cubo 3D</span>
          <h3>Rotação real de cada camada</h3>
        </div>
        <div className={styles.stats}>
          <span className={styles.pill}>Movimento: {currentLabel}</span>
          <span className={styles.pill}>Progresso: {progressLabel}</span>
        </div>
      </div>

      <div className={styles.legend}>
        {Object.entries(COLOR_LABEL).map(([color, label]) => (
          <span key={color} className={styles.legendItem}>
            <span
              className={styles.swatch}
              style={{ backgroundColor: `#${COLOR_HEX[color as Color].toString(16).padStart(6, "0")}` }}
            />
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}

function buildCubeMeshes(cubeState: CubeState, baseGroup: THREE.Group) {
  const cubieMaterial = new THREE.MeshStandardMaterial({
    color: 0x101827,
    roughness: 0.64,
    metalness: 0.06,
  });
  const cubieGeometry = new THREE.BoxGeometry(CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE);

  for (const x of [-1, 0, 1]) {
    for (const y of [-1, 0, 1]) {
      for (const z of [-1, 0, 1]) {
        const cubie = new THREE.Mesh(cubieGeometry.clone(), cubieMaterial.clone());
        cubie.position.set(x * CUBIE_STEP, y * CUBIE_STEP, z * CUBIE_STEP);
        cubie.userData.logicalPosition = [x, y, z] satisfies number[];
        baseGroup.add(cubie);
      }
    }
  }
  cubieGeometry.dispose();
  cubieMaterial.dispose();

  for (const face of FACE_ORDER) {
    const orientation = FACE_ORIENTATION[face];

    for (let index = 0; index < 9; index += 1) {
      const row = Math.floor(index / 3);
      const column = index % 3;
      const logicalPosition = addVector(
        orientation.normal,
        addVector(
          scaleVector(orientation.right, column - 1),
          scaleVector(orientation.down, row - 1),
        ),
      );
      const normal = toThreeVector(orientation.normal);
      const sticker = new THREE.Mesh(
        new THREE.PlaneGeometry(STICKER_SIZE, STICKER_SIZE),
        new THREE.MeshStandardMaterial({
          color: COLOR_HEX[cubeState[face][index]],
          roughness: 0.5,
          metalness: 0.02,
          side: THREE.DoubleSide,
        }),
      );

      sticker.position
        .copy(toThreeVector(logicalPosition))
        .multiplyScalar(CUBIE_STEP)
        .addScaledVector(normal, CUBIE_SIZE / 2 + 0.018);
      sticker.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      sticker.userData.logicalPosition = [...logicalPosition];
      baseGroup.add(sticker);
    }
  }
}

function parseTurn(move: LogicalMove, moveIndex: number) {
  const match = MOVE_PATTERN.exec(move);
  if (!match) {
    throw new Error(`Movimento 3D inválido: ${move}`);
  }

  const face = match[1] as Face;
  const suffix = match[2] ?? "";
  const { axis, quarterTurn } = MOVE_ROTATION[face];
  const axisIndex = getAxisIndex(axis);
  const layerValue = FACE_ORIENTATION[face].normal[axisIndex];
  const multiplier = suffix === "2" ? 2 : suffix === "'" ? -1 : 1;

  return {
    key: `${moveIndex}-${move}`,
    axis,
    axisIndex,
    layerValue,
    angle: quarterTurn * multiplier * (Math.PI / 2),
  };
}

function moveLayerToTurnGroup(
  baseGroup: THREE.Group,
  turnGroup: THREE.Group,
  turn: ReturnType<typeof parseTurn>,
) {
  for (const child of [...baseGroup.children]) {
    const logicalPosition = child.userData.logicalPosition as number[] | undefined;
    if (!logicalPosition) {
      continue;
    }
    if (logicalPosition[turn.axisIndex] === turn.layerValue) {
      turnGroup.add(child);
    }
  }
}

function moveAllChildren(fromGroup: THREE.Group, toGroup: THREE.Group) {
  for (const child of [...fromGroup.children]) {
    toGroup.add(child);
  }
}

function setGroupAxisRotation(group: THREE.Group, axis: Axis, value: number) {
  group.rotation.set(0, 0, 0);
  if (axis === "x") {
    group.rotation.x = value;
    return;
  }
  if (axis === "y") {
    group.rotation.y = value;
    return;
  }
  group.rotation.z = value;
}

function updateRendererSize(
  viewport: HTMLDivElement,
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
) {
  const rect = viewport.getBoundingClientRect();
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  if (width < 560) {
    camera.position.set(5.8, 4.8, 7.6);
  } else {
    camera.position.set(5.2, 4.2, 6.4);
  }
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}

function bindPointerOrbit(canvas: HTMLCanvasElement, root: THREE.Group) {
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let startRotationX = root.rotation.x;
  let startRotationY = root.rotation.y;

  const handlePointerDown = (event: PointerEvent) => {
    isDragging = true;
    startX = event.clientX;
    startY = event.clientY;
    startRotationX = root.rotation.x;
    startRotationY = root.rotation.y;
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = "grabbing";
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (!isDragging) {
      return;
    }

    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    root.rotation.y = startRotationY + deltaX * 0.007;
    root.rotation.x = clamp(startRotationX + deltaY * 0.007, -1.25, 0.85);
  };

  const handlePointerUp = (event: PointerEvent) => {
    isDragging = false;
    canvas.releasePointerCapture(event.pointerId);
    canvas.style.cursor = "grab";
  };

  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("pointercancel", handlePointerUp);

  return () => {
    canvas.removeEventListener("pointerdown", handlePointerDown);
    canvas.removeEventListener("pointermove", handlePointerMove);
    canvas.removeEventListener("pointerup", handlePointerUp);
    canvas.removeEventListener("pointercancel", handlePointerUp);
  };
}

function clearGroup(group: THREE.Group) {
  for (const child of [...group.children]) {
    group.remove(child);
  }
}

function addVector(a: Vector3Tuple, b: Vector3Tuple): Vector3Tuple {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scaleVector(vector: Vector3Tuple, factor: number): Vector3Tuple {
  return [vector[0] * factor, vector[1] * factor, vector[2] * factor];
}

function toThreeVector(vector: Vector3Tuple) {
  return new THREE.Vector3(vector[0], vector[1], vector[2]);
}

function getAxisIndex(axis: Axis): number {
  if (axis === "x") {
    return 0;
  }
  if (axis === "y") {
    return 1;
  }
  return 2;
}

function easeInOutCubic(value: number) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

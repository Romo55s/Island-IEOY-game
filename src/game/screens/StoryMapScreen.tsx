import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ELK from "elkjs/lib/elk.bundled.js";
import {
  applyNodeChanges,
  Background,
  Controls,
  MarkerType,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  SelectionMode,
  type Edge,
  type Node,
  type NodeChange,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  getStoryMapGraph,
  STORY_MAP_COUNTS,
  type MapMode,
  type StoryMapNodeData,
} from "../storyMap/storyMapData";
import { StoryMapNode } from "../storyMap/StoryMapNode";
import { StoryMapChrome } from "../storyMap/StoryMapChrome";
import styles from "./StoryMapScreen.module.css";

const elk = new ELK();
const nodeTypes = { story: StoryMapNode };
function getVisibleGraphIds(graph: ReturnType<typeof getStoryMapGraph>, mode: MapMode, focusDecisionId: string, showFullGraph: boolean) {
  if (mode === "mechanics" || showFullGraph || !focusDecisionId) return new Set(graph.nodes.map(({ id }) => id));
  const visible = new Set([focusDecisionId]);
  let frontier = [focusDecisionId];
  for (let depth = 0; depth < 3 && frontier.length; depth += 1) {
    const next = graph.edges
      .filter(({ source }) => frontier.includes(source))
      .map(({ target }) => target)
      .filter((id) => !visible.has(id));
    next.forEach((id) => visible.add(id));
    frontier = next;
  }
  return visible;
}

const nodeSize: Record<
  StoryMapNodeData["kind"],
  { width: number; height: number }
> = {
  decision: { width: 286, height: 142 },
  option: { width: 260, height: 124 },
  outcome: { width: 270, height: 140 },
  state: { width: 270, height: 132 },
  mechanic: { width: 280, height: 138 },
  ending: { width: 260, height: 124 },
};

export default function StoryMapScreen() {
  const [mode, setMode] = useState<MapMode>("route");
  const [nodes, setNodes] = useState<Node<StoryMapNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selected, setSelected] = useState<StoryMapNodeData | null>(null);
  const [selectionCount, setSelectionCount] = useState(0);
  const [layoutError, setLayoutError] = useState("");
  const [focusDecisionId, setFocusDecisionId] = useState(
    "decision:shoreline",
  );
  const [showFullGraph, setShowFullGraph] = useState(false);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const flowRef = useRef<ReactFlowInstance<
    Node<StoryMapNodeData>,
    Edge
  > | null>(null);
  const graph = useMemo(() => getStoryMapGraph(mode), [mode]);
  const decisions = graph.nodes.filter(({ data }) => data.kind === "decision");
  const modeLabel: Record<MapMode, string> = {
    route: "Campaign route",
    encounters: "Encounter cards",
    mechanics: "Game mechanics",
  };
  const focusDecisionTitle =
    decisions.find(({ id }) => id === focusDecisionId)?.data.title ?? "";

  const focusBranch = useCallback(
    (rootId: string) => {
      const visible = new Set([rootId]);
      let frontier = [rootId];
      for (let depth = 0; depth < 3 && frontier.length; depth += 1) {
        const next = graph.edges
          .filter(({ source }) => frontier.includes(source))
          .map(({ target }) => target)
          .filter((id) => !visible.has(id));
        next.forEach((id) => visible.add(id));
        frontier = next;
      }
      const branchNodes = nodes.filter(({ id }) => visible.has(id));
      if (branchNodes.length)
        void flowRef.current?.fitView({
          nodes: branchNodes,
          padding: 0.2,
          duration: 280,
          maxZoom: 1.05,
        });
    },
    [graph.edges, nodes],
  );

  const visibleNodeIds = useMemo(() => {
    return getVisibleGraphIds(graph, mode, focusDecisionId, showFullGraph);
  }, [focusDecisionId, graph.edges, mode, nodes, showFullGraph]);
  const visibleNodes = useMemo(
    () => nodes.filter(({ id }) => visibleNodeIds.has(id)),
    [nodes, visibleNodeIds],
  );
  const visibleEdges = useMemo(
    () =>
      edges.filter(
        ({ source, target }) =>
          visibleNodeIds.has(source) && visibleNodeIds.has(target),
      ),
    [edges, visibleNodeIds],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange<Node<StoryMapNodeData>>[]) => {
      setNodes((current) => applyNodeChanges(changes, current));
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    setSelected(null);
    setLayoutError("");
    const sizes = new Map(
      graph.nodes.map(({ id, data }) => [id, nodeSize[data.kind]]),
    );
    const layoutIds = getVisibleGraphIds(graph, mode, focusDecisionId, showFullGraph);
    const layoutNodes = graph.nodes.filter(({ id }) => layoutIds.has(id));
    const layoutEdges = graph.edges.filter(({ source, target }) => layoutIds.has(source) && layoutIds.has(target));
    const layoutGraph = {
      id: "black-box-story-map",
      layoutOptions: {
        "elk.algorithm": "layered",
        "elk.direction": mode === "mechanics" ? "DOWN" : "RIGHT",
        "elk.edgeRouting": "ORTHOGONAL",
        "elk.spacing.nodeNode": "32",
        "elk.layered.spacing.nodeNodeBetweenLayers": "76",
        "elk.padding": "[top=30,left=30,bottom=30,right=30]",
      },
      children: layoutNodes.map(({ id }) => ({ id, ...sizes.get(id)! })),
      edges: layoutEdges.map(({ id, source, target }) => ({
        id,
        sources: [source],
        targets: [target],
      })),
    };
    const nodeIds = new Set(graph.nodes.map(({ id }) => id));
    const danglingEdges = graph.edges.filter(
      ({ source, target }) => !nodeIds.has(source) || !nodeIds.has(target),
    );
    if (danglingEdges.length > 0) {
      setLayoutError(
        `Graph contains ${danglingEdges.length} edge(s) with missing nodes: ${danglingEdges
          .slice(0, 3)
          .map(({ source, target }) => `${source} → ${target}`)
          .join("; ")}`,
      );
      return () => {
        cancelled = true;
      };
    }
    void elk
      .layout(layoutGraph)
      .then((layout) => {
        if (cancelled) return;
        const positions = new Map(
          layout.children?.map(({ id, x, y }) => [
            id,
            { x: x ?? 0, y: y ?? 0 },
          ]),
        );
        setNodes(
          graph.nodes.map(({ id, data }) => ({
            id,
            type: "story",
            data,
            position: positions.get(id) ?? { x: 0, y: 0 },
            width: sizes.get(id)!.width,
            height: sizes.get(id)!.height,
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
            deletable: false,
          })),
        );
        setEdges(
          graph.edges.map(({ id, source, target, label }) => ({
            id,
            source,
            target,
            label: label?.endsWith("%") ? label : undefined,
            type: "smoothstep",
            deletable: false,
            markerEnd: { type: MarkerType.ArrowClosed, color: "#746b5d" },
            style: { stroke: "#746b5d", strokeWidth: 1.5 },
            labelStyle: {
              fill: "#e8e0c9",
              fontFamily: "IBM Plex Mono",
              fontSize: 10,
            },
            labelBgStyle: { fill: "#111317", fillOpacity: 0.96 },
            labelBgPadding: [4, 5] as [number, number],
          })),
        );
        setLayoutVersion((version) => version + 1);
      })
      .catch((error: unknown) => {
        console.error("Story map layout failed", error);
        if (!cancelled)
          setLayoutError(
            error instanceof Error ? error.message : String(error),
          );
      });
    return () => {
      cancelled = true;
    };
  }, [focusDecisionId, graph, mode, showFullGraph]);

  useEffect(() => {
    if (layoutVersion === 0) return;
    if (showFullGraph || mode === "mechanics")
      void flowRef.current?.fitView({ padding: 0.18, duration: 280 });
    else if (focusDecisionId) focusBranch(focusDecisionId);
    // Keep camera changes tied to graph/layout navigation, not every drag update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusDecisionId, layoutVersion, mode, showFullGraph]);

  const changeMode = (nextMode: MapMode) => {
    const nextGraph = getStoryMapGraph(nextMode);
    setSelected(null);
    setSelectionCount(0);
    setMode(nextMode);
    setShowFullGraph(false);
    setFocusDecisionId(
      nextGraph.nodes.find(({ data }) => data.kind === "decision")?.id ?? "",
    );
  };

  return (
    <main className={styles.page}>
      <StoryMapChrome
        mode={mode}
        decisions={decisions}
        focusDecisionId={focusDecisionId}
        focusDecisionTitle={focusDecisionTitle}
        showFullGraph={showFullGraph}
        onModeChange={changeMode}
        onFocusDecisionChange={(decisionId) => {
          setFocusDecisionId(decisionId);
          focusBranch(decisionId);
        }}
        onToggleFullGraph={() => setShowFullGraph((full) => !full)}
      />
      <section
        className={styles.workspace}
        aria-label={`${modeLabel[mode]} visualization`}
      >
        <div className={styles.canvas}>
          {layoutError ? (
            <p className={styles.error}>Graph layout failed: {layoutError}</p>
          ) : (
            <ReactFlow
              nodes={visibleNodes}
              edges={visibleEdges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              fitView
              fitViewOptions={{ padding: 0.18 }}
              minZoom={0.1}
              maxZoom={1.5}
          snapToGrid
          snapGrid={[24, 24]}
          selectionKeyCode="Shift"
          multiSelectionKeyCode="Shift"
          selectionMode={SelectionMode.Partial}
          deleteKeyCode={null}
              onInit={(instance) => {
                flowRef.current = instance;
              }}
          onSelectionChange={({ nodes: selectedNodes }) => {
            setSelectionCount(selectedNodes.length);
          }}
              onNodeClick={(_event, node) => {
                setSelected(node.data as StoryMapNodeData);
                if (node.data.kind === "decision") {
                  setFocusDecisionId(node.id);
                  setShowFullGraph(false);
                  focusBranch(node.id);
                }
              }}
              onPaneClick={() => setSelected(null)}
              nodesDraggable
              nodesConnectable={false}
              elementsSelectable
            >
              <Background color="#393731" gap={24} size={1} />
              <Controls showInteractive={false} />
          {selectionCount > 1 && (
            <Panel position="top-left" className={styles.multiSelectNotice}>
              {selectionCount} CARDS SELECTED · DRAG TO MOVE TOGETHER
            </Panel>
          )}
          {(showFullGraph || mode === "mechanics") && (
            <MiniMap
              ariaLabel="Full story map overview"
              pannable
              zoomable
              bgColor="#111317"
              maskColor="rgba(57, 55, 49, 0.24)"
              maskStrokeColor="#d6ad32"
              nodeStrokeColor={(node) => node.data.kind === "ending" ? "#b4312c" : node.data.kind === "decision" ? "#d6ad32" : "#111317"}
              nodeColor={(node) => {
                const kind = node.data.kind;
                return kind === "ending"
                  ? "#b4312c"
                  : kind === "decision"
                    ? "#d6ad32"
                    : kind === "mechanic"
                      ? "#e9c64d"
                      : kind === "state"
                        ? "#6dafa2"
                        : kind === "outcome"
                          ? "#b6ac9a"
                          : "#746b5d";
              }}
            />
          )}
            </ReactFlow>
          )}
          <div className={styles.legend}>
            <span data-kind="decision">Decision</span>
            <span data-kind="option">Choice</span>
            <span data-kind="outcome">Outcome</span>
            <span data-kind="mechanic">Mechanic</span>
            <span data-kind="ending">Ending</span>
          </div>
        </div>
        <aside className={styles.inspector} aria-live="polite">
          {selected ? (
            <>
              <div className={styles.inspectorTop}>
                <span>{selected.kind}</span>
                <button
                  type="button"
                  aria-label="Close node details"
                  onClick={() => setSelected(null)}
                >
                  ×
                </button>
              </div>
              <h2>{selected.title}</h2>
              {selected.subtitle && (
                <p className={styles.subtitle}>{selected.subtitle}</p>
              )}
              <ul>
                {selected.details.map((detail, index) => (
                  <li key={`${index}:${detail}`}>{detail}</li>
                ))}
              </ul>
              {selected.source && (
                <p className={styles.source}>
                  SOURCE
                  <br />
                  <code>{selected.source}</code>
                </p>
              )}
              {selected.tags && (
                <div className={styles.tags}>
                  {selected.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <p className={styles.inspectorLabel}>FIELD GUIDE</p>
              <h2>
                {mode === "route"
                  ? "Follow the branches"
                  : mode === "encounters"
                    ? "Browse the encounter deck"
                    : "Inspect resolution rules"}
              </h2>
              <p>
                Choose any node on the map to read its authored prompt,
                conditions, outcome weights, resource changes, and source
                location.
              </p>
              {mode === "route" && (
                <p className={styles.note}>
                  Focused view follows one decision through its choices,
                  outcomes, and next linked step. Use the selector to trace
                  another branch or Show full map to see every route. This view
                  shows explicit campaign and motorboat transitions; encounter
                  cards are in the Encounter cards tab.
                </p>
              )}
              {mode === "encounters" && (
                <p className={styles.note}>
                  Focused view shows one encounter and its weighted outcomes.
                  Use the selector to browse another card or Show full map to
                  see the catalog. Encounter outcomes have no fixed successor
                  scene in the current rules.
                </p>
              )}
              {mode === "mechanics" && (
                <p className={styles.note}>
                  Mechanic nodes summarize current implementation behavior and
                  link to the rule files that resolve it.
                </p>
              )}
            </>
          )}
        </aside>
      </section>
    </main>
  );
}

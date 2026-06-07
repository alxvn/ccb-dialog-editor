import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type OnInit,
  type Viewport,
} from "@xyflow/react";

import { JSX, useCallback, useEffect, useRef } from "react";
import type { BranchingDialogFile, Speaker } from "../../../shared/schemas";
import type {
  BranchingFlowEdge,
  BranchingFlowNode,
  LineNodeData,
  ResponseNodeData,
} from "../../../shared/branchingFlow";

import {
  createFlowEdge,
  createLineFlowNode,
  createResponseFlowNode,
  dialogToFlow,
  flowToDialog,
  isValidBranchingConnection,
  traceBranchingDialogHistory,
} from "../../../shared/branchingFlow";

import SpeakerConfigDropdown from "../SpeakerConfigDropdown";
import { BranchingEditorProvider } from "./BranchingEditorContext";
import { branchingNodeTypes } from "./nodeTypes";


type FlowNodeData = LineNodeData | ResponseNodeData;
type FlowNode = Node<FlowNodeData>;

type Props = {
  dialog: BranchingDialogFile;
  speakers: Speaker[];
  onDialogChange: (dialog: BranchingDialogFile) => void;
  onDialogNameChange: (name: string) => void;
  onLocationChange: (location: string) => void;
  onPlayerSpeakerChange: (playerSpeaker: string) => void;
  onSpeakersChange: (speakers: Speaker[]) => void;
  onRemoveDialog: () => void;
  onExport: (dialogOverride?: BranchingDialogFile) => void;
};

const PERSIST_DEBOUNCE_MS = 300;

const branchingMiniMapNodeColor = (node: Node): string => {
  switch (node.type) {
    case "line":
      return "#4a6fa5";
    case "response":
      return "#3d8a7a";
    default:
      return "#3f424d";
  }
};



function toFlowNodes(nodes: BranchingFlowNode[]): FlowNode[] {
  return nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: node.data,
    dragHandle: ".flow-node-drag-handle",
  }));
}



function fromFlowNodes(nodes: FlowNode[]): BranchingFlowNode[] {
  return nodes.map((node) => ({
    id: node.id,
    type: node.type as "line" | "response",
    position: node.position,
    data: node.data,
  }));
}

function fromFlowEdges(edges: Edge[]): BranchingFlowEdge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    sourceHandle: edge.sourceHandle,
    target: edge.target,
    targetHandle: edge.targetHandle,
  }));
}

function snapshotDialog(
  meta: Pick<BranchingDialogFile, "id" | "name" | "location" | "playerSpeaker">,
  nodes: FlowNode[],
  edges: Edge[],
  viewport?: BranchingDialogFile["viewport"],
): string {

  return JSON.stringify(
    flowToDialog(
      { id: meta.id, name: meta.name, type: "branching", location: meta.location, playerSpeaker: meta.playerSpeaker },
      fromFlowNodes(nodes),
      fromFlowEdges(edges),
      viewport,
    ),
  );
}

function BranchingDialogEditorInner({
  dialog,
  speakers,
  onDialogChange,
  onDialogNameChange,
  onLocationChange,
  onPlayerSpeakerChange,
  onSpeakersChange,
  onRemoveDialog,
  onExport,
}: Props): JSX.Element {
  const initial = dialogToFlow(dialog);
  const [nodes, setNodes, onNodesChange] = useNodesState(toFlowNodes(initial.nodes));
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges as Edge[]);
  const viewportRef = useRef<Viewport | undefined>(initial.viewport);
  const dialogMetaRef = useRef({
    id: dialog.id,
    name: dialog.name,
    location: dialog.location ?? "",
    playerSpeaker: dialog.playerSpeaker ?? "",
  });

  dialogMetaRef.current = {
    id: dialog.id,
    name: dialog.name,
    location: dialog.location ?? "",
    playerSpeaker: dialog.playerSpeaker ?? "",
  };

  const onDialogChangeRef = useRef(onDialogChange);
  onDialogChangeRef.current = onDialogChange;

  const lastSnapshotRef = useRef(
    snapshotDialog(dialogMetaRef.current, toFlowNodes(initial.nodes), initial.edges as Edge[], initial.viewport),
  );

  const fitViewDoneRef = useRef(false);
  const persistGraph = useCallback((nextNodes: FlowNode[], nextEdges: Edge[]) => {
    const snapshot = snapshotDialog(dialogMetaRef.current, nextNodes, nextEdges, viewportRef.current);
    if (snapshot === lastSnapshotRef.current) {
      return;
    }

    lastSnapshotRef.current = snapshot;
    onDialogChangeRef.current(JSON.parse(snapshot) as BranchingDialogFile);
  }, []);



  useEffect(() => {
    const timer = window.setTimeout(() => {
      persistGraph(nodes, edges);
    }, PERSIST_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [nodes, edges, persistGraph]);



  const onConnect = useCallback(
    (connection: Connection) => {
      if (
        !isValidBranchingConnection(
          {
            source: connection.source,
            sourceHandle: connection.sourceHandle,
            target: connection.target,
            targetHandle: connection.targetHandle,
          },
          fromFlowEdges(edges),
        )
      ) {
        return;
      }

      setEdges((current) => [
        ...current,
        createFlowEdge({
          source: connection.source,
          sourceHandle: connection.sourceHandle,
          target: connection.target,
          targetHandle: connection.targetHandle,
        }) as Edge,
      ]);
    },
    [edges, setEdges],
  );

  const onAddLine = (): void => {
    const offset = nodes.length * 40;
    setNodes((current) => [...current, toFlowNodes([createLineFlowNode({ x: 80 + offset, y: 80 + offset })])[0]]);
  };

  const onAddResponse = (): void => {
    const offset = nodes.length * 40;
    setNodes((current) => [...current, toFlowNodes([createResponseFlowNode({ x: 320 + offset, y: 80 + offset })])[0]]);
  };


  const onMoveEnd = useCallback(() => {
    const snapshot = snapshotDialog(dialogMetaRef.current, nodes, edges, viewportRef.current);
    if (snapshot !== lastSnapshotRef.current) {
      lastSnapshotRef.current = snapshot;
      onDialogChangeRef.current(JSON.parse(snapshot) as BranchingDialogFile);
    }
  }, [nodes, edges]);

  const onInit = useCallback<OnInit>((reactFlowInstance) => {
    if (fitViewDoneRef.current) {
      return;
    }

    fitViewDoneRef.current = true;
    void reactFlowInstance.fitView();
  }, []);

  const getLinesBeforeNode = useCallback(
    (nodeId: string) =>
      traceBranchingDialogHistory(
        nodeId,
        fromFlowNodes(nodes),
        fromFlowEdges(edges),
        dialog.playerSpeaker ?? "",
      ),
    [nodes, edges, dialog.playerSpeaker],
  );

  const handleExport = (): void => {
    const snapshot = snapshotDialog(dialogMetaRef.current, nodes, edges, viewportRef.current);
    lastSnapshotRef.current = snapshot;
    const latestDialog = JSON.parse(snapshot) as BranchingDialogFile;
    onDialogChangeRef.current(latestDialog);
    onExport(latestDialog);
  };


  return (
    <section className="panel editor branching-editor">
      <div className="editor-header">
        <input
          value={dialog.name}
          onChange={(event) => onDialogNameChange(event.target.value)}
          className="dialog-title"
        />

        <SpeakerConfigDropdown speakers={speakers} onSpeakersChange={onSpeakersChange} />

        <div className="actions-row">
          <button type="button" onClick={onAddLine}>
            + Line
          </button>

          <button type="button" onClick={onAddResponse}>
            + Response
          </button>

          <button type="button" onClick={handleExport}>
            Export
          </button>

          <button type="button" className="danger" onClick={onRemoveDialog}>
            Delete Dialog
          </button>

        </div>
      </div>

      <label className="field-label" htmlFor="branching-dialog-location">
        Location
      </label>

      <textarea
        id="branching-dialog-location"
        className="dialog-location-input"
        value={dialog.location ?? ""}
        placeholder="Where this dialog takes place"
        onChange={(event) => onLocationChange(event.target.value)}
      />

      <label className="field-label" htmlFor="branching-player-speaker">
        Player speaker
      </label>

      <select
        id="branching-player-speaker"
        className="dialog-player-speaker-select"
        value={dialog.playerSpeaker ?? ""}
        onChange={(event) => onPlayerSpeakerChange(event.target.value)}
        aria-label="Player speaker"
      >

        <option value="">Select speaker</option>
        {speakers.map((speaker) => (
          <option key={speaker.id} value={speaker.name}>
            {speaker.name || "(unnamed)"}
          </option>
        ))}
      </select>

      <div className="branching-canvas">
        <BranchingEditorProvider
          speakers={speakers}
          playerSpeaker={dialog.playerSpeaker ?? ""}
          location={dialog.location ?? ""}
          getLinesBeforeNode={getLinesBeforeNode}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={branchingNodeTypes}
            isValidConnection={(connection) =>
              isValidBranchingConnection(
                {
                  source: connection.source,
                  sourceHandle: connection.sourceHandle ?? null,
                  target: connection.target,
                  targetHandle: connection.targetHandle ?? null,
                },
                fromFlowEdges(edges),
              )
            }

            defaultViewport={initial.viewport}
            //@ts-ignore
            onInit={onInit}

            onMoveEnd={(_, viewport) => {
              viewportRef.current = viewport;
              onMoveEnd();
            }}

            deleteKeyCode={["Backspace", "Delete"]}
          >

            <Background />
            <Controls />
            <MiniMap nodeColor={branchingMiniMapNodeColor} />
          </ReactFlow>

        </BranchingEditorProvider>
      </div>
    </section>
  );
}

export default function BranchingDialogEditor(props: Props): JSX.Element {
  return (
    <ReactFlowProvider>
      <BranchingDialogEditorInner key={props.dialog.id} {...props} />
    </ReactFlowProvider>
  );
}

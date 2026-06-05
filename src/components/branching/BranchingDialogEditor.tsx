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
import type { BranchingDialogFile } from "../../../shared/schemas";
import type { BranchingFlowEdge, BranchingFlowNode, LineNodeData, ResponseNodeData } from "../../../shared/branchingFlow";
import {
  createFlowEdge,
  createLineFlowNode,
  createResponseFlowNode,
  dialogToFlow,
  flowToDialog,
  isValidBranchingConnection,
} from "../../../shared/branchingFlow";
import { branchingNodeTypes } from "./nodeTypes";

type Props = {
  dialog: BranchingDialogFile;
  onDialogChange: (dialog: BranchingDialogFile) => void;
  onDialogNameChange: (name: string) => void;
  onRemoveDialog: () => void;
  onExport: () => void;
};

const PERSIST_DEBOUNCE_MS = 300;

function toFlowNodes(nodes: BranchingFlowNode[]): Node<LineNodeData | ResponseNodeData>[] {
  return nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: node.data,
  }));
}

function fromFlowNodes(nodes: Node<LineNodeData | ResponseNodeData>[]): BranchingFlowNode[] {
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
  meta: { id: string; name: string },
  nodes: Node<LineNodeData | ResponseNodeData>[],
  edges: Edge[],
  viewport?: BranchingDialogFile["viewport"],
): string {
  return JSON.stringify(
    flowToDialog(
      { id: meta.id, name: meta.name, type: "branching" },
      fromFlowNodes(nodes),
      fromFlowEdges(edges),
      viewport,
    ),
  );
}

function BranchingDialogEditorInner({
  dialog,
  onDialogChange,
  onDialogNameChange,
  onRemoveDialog,
  onExport,
}: Props): JSX.Element {
  const initial = dialogToFlow(dialog);
  const [nodes, setNodes, onNodesChange] = useNodesState(toFlowNodes(initial.nodes));
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges as Edge[]);
  const viewportRef = useRef<Viewport | undefined>(initial.viewport);
  const dialogMetaRef = useRef({ id: dialog.id, name: dialog.name });
  dialogMetaRef.current = { id: dialog.id, name: dialog.name };

  const onDialogChangeRef = useRef(onDialogChange);
  onDialogChangeRef.current = onDialogChange;

  const lastSnapshotRef = useRef(snapshotDialog(dialogMetaRef.current, toFlowNodes(initial.nodes), initial.edges as Edge[], initial.viewport));
  const fitViewDoneRef = useRef(false);

  const persistGraph = useCallback((nextNodes: Node<LineNodeData | ResponseNodeData>[], nextEdges: Edge[]) => {
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

  return (
    <section className="panel editor branching-editor">
      <div className="editor-header">
        <input
          value={dialog.name}
          onChange={(event) => onDialogNameChange(event.target.value)}
          className="dialog-title"
        />
        <div className="actions-row">
          <button type="button" onClick={onAddLine}>
            + Line
          </button>
          <button type="button" onClick={onAddResponse}>
            + Response
          </button>
          <button type="button" onClick={onExport}>
            Export
          </button>
          <button type="button" className="danger" onClick={onRemoveDialog}>
            Delete Dialog
          </button>
        </div>
      </div>
      <div className="branching-canvas">
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
                sourceHandle: connection.sourceHandle,
                target: connection.target,
                targetHandle: connection.targetHandle,
              },
              fromFlowEdges(edges),
            )
          }
          defaultViewport={initial.viewport}
          onInit={onInit}
          onMoveEnd={(_, viewport) => {
            viewportRef.current = viewport;
            onMoveEnd();
          }}
          deleteKeyCode={["Backspace", "Delete"]}
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
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

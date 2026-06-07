import type {
  BranchingDialogFile,
  BranchingEdge,
  BranchingNode,
  BranchingViewport,
  DialogLine,
} from "./schemas";
import {
  LINE_NODE_INPUT_HANDLE,
  LINE_NODE_OUTPUT_HANDLES,
  RESPONSE_NODE_INPUT_HANDLE,
  RESPONSE_NODE_OUTPUT_HANDLE,
} from "./schemas";

export type LineNodeData = {
  speaker: string;
  text: string;
  preAction: string | null;
  postAction: string | null;
  delay: number | null;
};

export type ResponseNodeData = {
  text: string;
  preAction: string | null;
  postAction: string | null;
};

export type BranchingFlowNode = {
  id: string;
  type: "line" | "response";
  position: { x: number; y: number };
  data: LineNodeData | ResponseNodeData;
};

export type BranchingFlowEdge = {
  id: string;
  source: string;
  sourceHandle?: string | null;
  target: string;
  targetHandle?: string | null;
};

export type BranchingConnection = {
  source: string;
  sourceHandle: string | null;
  target: string;
  targetHandle: string | null;
};

const emptyLineData = (): LineNodeData => ({
  speaker: "",
  text: "",
  preAction: null,
  postAction: null,
  delay: null,
});

const emptyResponseData = (): ResponseNodeData => ({
  text: "",
  preAction: null,
  postAction: null,
});

export function domainNodeToFlowNode(node: BranchingNode): BranchingFlowNode {
  if (node.type === "line") {
    return {
      id: node.id,
      type: "line",
      position: node.position,
      data: {
        speaker: node.speaker,
        text: node.text,
        preAction: node.preAction,
        postAction: node.postAction,
        delay: node.delay,
      },
    };
  }
  return {
    id: node.id,
    type: "response",
    position: node.position,
    data: {
      text: node.text,
      preAction: node.preAction,
      postAction: node.postAction,
    },
  };
}

export function flowNodeToDomainNode(node: BranchingFlowNode): BranchingNode {
  if (node.type === "response") {
    const data = node.data as ResponseNodeData;
    return {
      id: node.id,
      type: "response",
      position: node.position,
      text: data.text,
      preAction: data.preAction ?? null,
      postAction: data.postAction ?? null,
    };
  }
  const data = node.data as LineNodeData;
  return {
    id: node.id,
    type: "line",
    position: node.position,
    speaker: data.speaker,
    text: data.text,
    preAction: data.preAction ?? null,
    postAction: data.postAction ?? null,
    delay: data.delay ?? null,
  };
}

export function domainEdgeToFlowEdge(edge: BranchingEdge): BranchingFlowEdge {
  return {
    id: edge.id,
    source: edge.source,
    sourceHandle: edge.sourceHandle,
    target: edge.target,
    targetHandle: edge.targetHandle,
  };
}

export function flowEdgeToDomainEdge(edge: BranchingFlowEdge): BranchingEdge {
  return {
    id: edge.id,
    source: edge.source,
    sourceHandle: edge.sourceHandle ?? "",
    target: edge.target,
    targetHandle: edge.targetHandle ?? LINE_NODE_INPUT_HANDLE,
  };
}

export function dialogToFlow(dialog: BranchingDialogFile): {
  nodes: BranchingFlowNode[];
  edges: BranchingFlowEdge[];
  viewport?: BranchingViewport;
} {
  return {
    nodes: dialog.nodes.map(domainNodeToFlowNode),
    edges: dialog.edges.map(domainEdgeToFlowEdge),
    viewport: dialog.viewport,
  };
}

export function flowToDialog(
  base: Pick<BranchingDialogFile, "id" | "name" | "type" | "location" | "playerSpeaker">,
  nodes: BranchingFlowNode[],
  edges: BranchingFlowEdge[],
  viewport?: BranchingViewport,
): BranchingDialogFile {
  return {
    ...base,
    type: "branching",
    nodes: nodes.map(flowNodeToDomainNode),
    edges: edges.map(flowEdgeToDomainEdge),
    viewport,
  };
}

export function createLineFlowNode(position: { x: number; y: number }): BranchingFlowNode {
  return {
    id: crypto.randomUUID(),
    type: "line",
    position,
    data: emptyLineData(),
  };
}

export function createResponseFlowNode(position: { x: number; y: number }): BranchingFlowNode {
  return {
    id: crypto.randomUUID(),
    type: "response",
    position,
    data: emptyResponseData(),
  };
}

function isLineOutputHandle(handle: string | null | undefined): boolean {
  return (
    handle !== null &&
    handle !== undefined &&
    LINE_NODE_OUTPUT_HANDLES.includes(handle as (typeof LINE_NODE_OUTPUT_HANDLES)[number])
  );
}

export function isValidBranchingConnection(
  connection: BranchingConnection,
  edges: BranchingFlowEdge[],
): boolean {
  const { source, sourceHandle, target, targetHandle } = connection;
  if (!source || !target || !sourceHandle || !targetHandle) {
    return false;
  }
  if (targetHandle !== LINE_NODE_INPUT_HANDLE && targetHandle !== RESPONSE_NODE_INPUT_HANDLE) {
    return false;
  }
  const sourceIsLineOut = isLineOutputHandle(sourceHandle);
  const sourceIsResponseOut = sourceHandle === RESPONSE_NODE_OUTPUT_HANDLE;
  if (!sourceIsLineOut && !sourceIsResponseOut) {
    return false;
  }
  if (sourceIsLineOut && targetHandle !== RESPONSE_NODE_INPUT_HANDLE) {
    return false;
  }
  if (sourceIsResponseOut && targetHandle !== LINE_NODE_INPUT_HANDLE) {
    return false;
  }
  const duplicate = edges.some(
    (edge) =>
      edge.source === source && edge.sourceHandle === sourceHandle && edge.target === target,
  );
  return !duplicate;
}

export function createFlowEdge(connection: BranchingConnection): BranchingFlowEdge {
  return {
    id: crypto.randomUUID(),
    source: connection.source,
    sourceHandle: connection.sourceHandle,
    target: connection.target,
    targetHandle: connection.targetHandle,
  };
}

export function findBranchingEntryNodeId(
  nodes: BranchingNode[],
  edges: BranchingEdge[],
): string | null {
  if (nodes.length === 0) {
    return null;
  }
  const targets = new Set(edges.map((edge) => edge.target));
  const withoutIncoming = nodes.filter((node) => !targets.has(node.id));
  if (withoutIncoming.length > 0) {
    const firstLine = withoutIncoming.find((node) => node.type === "line");
    return (firstLine ?? withoutIncoming[0]).id;
  }
  const firstLine = nodes.find((node) => node.type === "line");
  return firstLine?.id ?? nodes[0].id;
}

function pickPredecessorEdge(
  targetId: string,
  incomingByTarget: Map<string, BranchingFlowEdge[]>,
): BranchingFlowEdge | null {
  const incoming = incomingByTarget.get(targetId) ?? [];
  if (incoming.length === 0) {
    return null;
  }
  return [...incoming].sort((a, b) => a.source.localeCompare(b.source))[0];
}

export function traceBranchingDialogHistory(
  targetNodeId: string,
  nodes: BranchingFlowNode[],
  edges: BranchingFlowEdge[],
  playerSpeaker: string,
): DialogLine[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const incomingByTarget = new Map<string, BranchingFlowEdge[]>();
  for (const edge of edges) {
    const list = incomingByTarget.get(edge.target) ?? [];
    list.push(edge);
    incomingByTarget.set(edge.target, list);
  }

  const history: DialogLine[] = [];
  const visited = new Set<string>();
  let currentId = targetNodeId;

  while (true) {
    const edge = pickPredecessorEdge(currentId, incomingByTarget);
    if (!edge) {
      break;
    }

    const predecessorId = edge.source;
    if (visited.has(predecessorId)) {
      break;
    }
    visited.add(predecessorId);

    const predecessor = nodeById.get(predecessorId);
    if (!predecessor) {
      break;
    }

    if (predecessor.type === "line") {
      const lineData = predecessor.data as LineNodeData;
      history.unshift({
        id: predecessorId,
        speaker: lineData.speaker,
        text: lineData.text,
        preAction: lineData.preAction,
        postAction: lineData.postAction,
        delay: lineData.delay,
      });
      currentId = predecessorId;
      continue;
    }

    if (predecessor.type === "response") {
      const responseData = predecessor.data as ResponseNodeData;
      history.unshift({
        id: predecessorId,
        speaker: playerSpeaker,
        text: responseData.text,
        preAction: responseData.preAction,
        postAction: responseData.postAction,
        delay: null,
      });
      currentId = predecessorId;
      continue;
    }

    break;
  }

  return history;
}

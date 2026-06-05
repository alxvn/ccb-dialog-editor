import { Handle, Position, useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { JSX } from "react/jsx-runtime";
import type { LineNodeData } from "../../../shared/branchingFlow";
import { dialogActionIds } from "../../../shared/schemas";
import {
  LINE_NODE_INPUT_HANDLE,
  LINE_NODE_OUTPUT_HANDLES,
} from "../../../shared/schemas";

function parseDelayInput(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return Math.round(parsed);
}

type LineFlowNode = Node<LineNodeData, "line">;

export default function LineNode({ id, data }: NodeProps<LineFlowNode>): JSX.Element {
  const { updateNodeData } = useReactFlow();
  const nodeData = data;

  const patch = (partial: Partial<LineNodeData>): void => {
    updateNodeData(id, partial);
  };

  return (
    <div className="flow-node flow-node-line">
      <Handle type="target" position={Position.Left} id={LINE_NODE_INPUT_HANDLE} />
      {LINE_NODE_OUTPUT_HANDLES.map((handleId, index) => (
        <Handle
          key={handleId}
          type="source"
          position={Position.Right}
          id={handleId}
          style={{ top: `${20 + index * 18}%` }}
        />
      ))}
      <div className="flow-node-title">Line</div>
      <input
        value={nodeData.speaker}
        placeholder="Speaker"
        onChange={(event) => patch({ speaker: event.target.value })}
      />
      <select
        value={nodeData.preAction ?? ""}
        onChange={(event) => patch({ preAction: event.target.value === "" ? null : event.target.value })}
        aria-label="Pre action"
      >
        <option value="">None</option>
        {dialogActionIds.map((actionId) => (
          <option key={actionId} value={actionId}>
            {actionId}
          </option>
        ))}
      </select>
      <select
        value={nodeData.postAction ?? ""}
        onChange={(event) => patch({ postAction: event.target.value === "" ? null : event.target.value })}
        aria-label="Post action"
      >
        <option value="">None</option>
        {dialogActionIds.map((actionId) => (
          <option key={actionId} value={actionId}>
            {actionId}
          </option>
        ))}
      </select>
      <input
        type="number"
        min={0}
        step={1}
        value={nodeData.delay ?? ""}
        placeholder="Delay (ms)"
        onChange={(event) => patch({ delay: parseDelayInput(event.target.value) })}
        aria-label="Delay in milliseconds"
      />
      <textarea
        value={nodeData.text}
        placeholder="Line"
        onChange={(event) => patch({ text: event.target.value })}
      />
    </div>
  );
}

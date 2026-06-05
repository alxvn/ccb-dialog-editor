import { Handle, Position, useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { JSX } from "react/jsx-runtime";
import type { ResponseNodeData } from "../../../shared/branchingFlow";
import { RESPONSE_NODE_INPUT_HANDLE, RESPONSE_NODE_OUTPUT_HANDLE } from "../../../shared/schemas";

type ResponseFlowNode = Node<ResponseNodeData, "response">;

export default function ResponseNode({ id, data }: NodeProps<ResponseFlowNode>): JSX.Element {
  const { updateNodeData } = useReactFlow();

  return (
    <div className="flow-node flow-node-response">
      <Handle type="target" position={Position.Left} id={RESPONSE_NODE_INPUT_HANDLE} />
      <Handle type="source" position={Position.Right} id={RESPONSE_NODE_OUTPUT_HANDLE} />
      <div className="flow-node-title">Response</div>
      <textarea
        value={data.text}
        placeholder="Player choice"
        onChange={(event) => updateNodeData(id, { text: event.target.value })}
      />
    </div>
  );
}

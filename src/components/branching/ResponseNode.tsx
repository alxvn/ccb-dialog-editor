import { Handle, Position, useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { useState, type JSX } from "react";
import { buildNpcPrompt, findSpeakerDescription } from "../../../shared/buildNpcPrompt";
import type { ResponseNodeData } from "../../../shared/branchingFlow";
import {
  dialogActionIds,
  RESPONSE_NODE_INPUT_HANDLE,
  RESPONSE_NODE_OUTPUT_HANDLE,
} from "../../../shared/schemas";
import { useLlm } from "../../context/LlmContext";
import GenerateLineModal, { type GenerateLineFormValues } from "../GenerateLineModal";
import { isConfiguredSpeaker, useBranchingEditorContext } from "./BranchingEditorContext";

type ResponseFlowNode = Node<ResponseNodeData, "response">;

export default function ResponseNode({ id, data }: NodeProps<ResponseFlowNode>): JSX.Element {
  const { updateNodeData } = useReactFlow();
  const { speakers, playerSpeaker, location, getLinesBeforeNode } = useBranchingEditorContext();
  const { downloaded } = useLlm();
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generating, setGenerating] = useState(false);

  const patch = (partial: Partial<ResponseNodeData>): void => {
    updateNodeData(id, partial);
  };

  const canGenerate = downloaded && isConfiguredSpeaker(speakers, playerSpeaker);

  const handleGenerateSubmit = async (values: GenerateLineFormValues): Promise<void> => {
    setGenerating(true);
    try {
      const linesBefore = getLinesBeforeNode(id);
      const prompt = buildNpcPrompt({
        speakerName: playerSpeaker,
        speakerDescription: findSpeakerDescription(speakers, playerSpeaker),
        location,
        linesBefore,
        moodId: values.moodId,
        userPrompt: values.userPrompt,
        detailed: values.detailed,
        role: "player",
      });

      const result = await window.llmApi.generateLine(prompt, playerSpeaker);
      patch({ text: result.text });
      setShowGenerateModal(false);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <div className={`flow-node flow-node-response${generating ? " flow-node-generating" : ""}`}>
        <Handle type="target" position={Position.Left} id={RESPONSE_NODE_INPUT_HANDLE} />
        <Handle type="source" position={Position.Right} id={RESPONSE_NODE_OUTPUT_HANDLE} />
        <div className="flow-node-drag-handle">
          <div className="flow-node-title">Response</div>
        </div>
        <input
          value={playerSpeaker || "(not set)"}
          readOnly
          aria-label="Player speaker"
          className="flow-node-readonly nodrag"
        />
        {/* <select
          className="nodrag"
          value={data.preAction ?? ""}
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
          className="nodrag"
          value={data.postAction ?? ""}
          onChange={(event) => patch({ postAction: event.target.value === "" ? null : event.target.value })}
          aria-label="Post action"
        >
          <option value="">None</option>
          {dialogActionIds.map((actionId) => (
            <option key={actionId} value={actionId}>
              {actionId}
            </option>
          ))}
        </select> */}
        <textarea
          className="nodrag"
          value={data.text}
          placeholder="Player choice"
          onChange={(event) => patch({ text: event.target.value })}
        />
        <button
          type="button"
          className="generate-line-btn nodrag"
          disabled={!canGenerate || generating}
          onClick={() => setShowGenerateModal(true)}
        >
          Generate
        </button>
        {generating ? <div className="flow-node-generating-overlay">Generating...</div> : null}
      </div>
      {showGenerateModal ? (
        <GenerateLineModal
          title="Generate Player Response"
          generating={generating}
          onCancel={() => {
            if (!generating) setShowGenerateModal(false);
          }}
          onSubmit={(values) => void handleGenerateSubmit(values)}
        />
      ) : null}
    </>
  );
}

import { Handle, Position, useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { useState, type JSX } from "react";
import { buildNpcPrompt, findSpeakerDescription } from "../../../shared/buildNpcPrompt";
import type { LineNodeData } from "../../../shared/branchingFlow";
import { dialogActionIds, LINE_NODE_INPUT_HANDLE, LINE_NODE_OUTPUT_HANDLES } from "../../../shared/schemas";
import { useLlm } from "../../context/LlmContext";
import GenerateLineModal, { type GenerateLineFormValues } from "../GenerateLineModal";
import { isConfiguredSpeaker, useBranchingEditorContext } from "./BranchingEditorContext";

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
  const { speakers, location, getLinesBeforeNode } = useBranchingEditorContext();
  const { downloaded } = useLlm();
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const nodeData = data;

  const patch = (partial: Partial<LineNodeData>): void => {
    updateNodeData(id, partial);
  };

  const canGenerate = downloaded && isConfiguredSpeaker(speakers, nodeData.speaker);

  const handleGenerateSubmit = async (values: GenerateLineFormValues): Promise<void> => {
    setGenerating(true);
    try {
      const linesBefore = getLinesBeforeNode(id);
      const prompt = buildNpcPrompt({
        speakerName: nodeData.speaker,
        speakerDescription: findSpeakerDescription(speakers, nodeData.speaker),
        location,
        linesBefore,
        moodId: values.moodId,
        userPrompt: values.userPrompt,
        detailed: values.detailed,
      });

      const result = await window.llmApi.generateLine(prompt, nodeData.speaker);
      patch({ text: result.text });
      setShowGenerateModal(false);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <div className={`flow-node flow-node-line${generating ? " flow-node-generating" : ""}`}>
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
        <div className="flow-node-drag-handle">
          <div className="flow-node-title">Line</div>
        </div>
        <select
          className="nodrag"
          value={nodeData.speaker}
          onChange={(event) => patch({ speaker: event.target.value })}
          aria-label="Speaker"
        >
          <option value="">Select speaker</option>
          {speakers.map((speaker) => (
            <option key={speaker.id} value={speaker.name}>
              {speaker.name || "(unnamed)"}
            </option>
          ))}
        </select>
        <select
          className="nodrag"
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
          className="nodrag"
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
          className="nodrag"
          type="number"
          min={0}
          step={1}
          value={nodeData.delay ?? ""}
          placeholder="Delay (ms)"
          onChange={(event) => patch({ delay: parseDelayInput(event.target.value) })}
          aria-label="Delay in milliseconds"
        />
        <textarea
          className="nodrag"
          value={nodeData.text}
          placeholder="Line"
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

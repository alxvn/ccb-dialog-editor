import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";

import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

import { useState, type JSX } from "react";

import { buildNpcPrompt, findSpeakerDescription } from "../../shared/buildNpcPrompt";

import type { DialogLine, LinearDialogFile, Speaker } from "../../shared/schemas";

import { dialogActionIds } from "../../shared/schemas";

import { useLlm } from "../context/LlmContext";

import GenerateLineModal, { type GenerateLineFormValues } from "./GenerateLineModal";

import SpeakerConfigDropdown from "./SpeakerConfigDropdown";



const emptyLineFields = {

  preAction: null,

  postAction: null,

  delay: null,

} as const;



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



function isConfiguredSpeaker(speakers: Speaker[], speakerName: string): boolean {

  return speakers.some((speaker) => speaker.name === speakerName && speaker.name.trim() !== "");

}



type Props = {

  dialog: LinearDialogFile;

  speakers: Speaker[];

  onDialogNameChange: (name: string) => void;

  onLocationChange: (location: string) => void;

  onSpeakersChange: (speakers: Speaker[]) => void;

  onLinesChange: (lines: DialogLine[]) => void;

  onRemoveDialog: () => void;

  onExport: () => void;

};



type LineItemProps = {

  line: DialogLine;

  lineIndex: number;

  speakers: Speaker[];

  dialogLocation: string;

  allLines: DialogLine[];

  onChange: (nextLine: DialogLine) => void;

  onRemove: () => void;

};



function SortableLineItem({

  line,

  lineIndex,

  speakers,

  dialogLocation,

  allLines,

  onChange,

  onRemove,

}: LineItemProps): JSX.Element {

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: line.id });

  const { downloaded } = useLlm();

  const [showGenerateModal, setShowGenerateModal] = useState(false);

  const [generating, setGenerating] = useState(false);



  const style = {

    transform: CSS.Transform.toString(transform),

    transition,

  };



  const canGenerate = downloaded && isConfiguredSpeaker(speakers, line.speaker);



  const handleGenerateSubmit = async (values: GenerateLineFormValues): Promise<void> => {

    setGenerating(true);

    try {

      const linesBefore = allLines.slice(0, lineIndex);

      const prompt = buildNpcPrompt({

        speakerName: line.speaker,

        speakerDescription: findSpeakerDescription(speakers, line.speaker),

        location: dialogLocation,

        linesBefore,

        moodId: values.moodId,

        userPrompt: values.userPrompt,

        detailed: values.detailed,

      });

      const result = await window.llmApi.generateLine(prompt, line.speaker);

      onChange({ ...line, text: result.text });

      setShowGenerateModal(false);

    } finally {

      setGenerating(false);

    }

  };



  return (

    <>

      <div ref={setNodeRef} style={style} className={`line-item${generating ? " line-generating" : ""}`}>

        <button className="drag-handle" type="button" {...attributes} {...listeners}>

          ::

        </button>

        <select

          value={line.speaker}

          onChange={(event) => onChange({ ...line, speaker: event.target.value })}

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

          value={line.preAction ?? ""}

          onChange={(event) =>

            onChange({ ...line, preAction: event.target.value === "" ? null : event.target.value })

          }

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

          value={line.postAction ?? ""}

          onChange={(event) =>

            onChange({ ...line, postAction: event.target.value === "" ? null : event.target.value })

          }

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

          value={line.delay ?? ""}

          placeholder="Delay (ms)"

          onChange={(event) => onChange({ ...line, delay: parseDelayInput(event.target.value) })}

          aria-label="Delay in milliseconds"

        />

        <textarea

          value={line.text}

          placeholder="Line"

          onChange={(event) => onChange({ ...line, text: event.target.value })}

        />

        <button

          type="button"

          className="generate-line-btn"

          disabled={!canGenerate || generating}

          onClick={() => setShowGenerateModal(true)}

        >

          Generate

        </button>

        <button type="button" className="danger" onClick={onRemove}>

          Remove

        </button>

        {generating ? <div className="line-generating-overlay">Generating...</div> : null}

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



export default function LinearDialogEditor({

  dialog,

  speakers,

  onDialogNameChange,

  onLocationChange,

  onSpeakersChange,

  onLinesChange,

  onRemoveDialog,

  onExport,

}: Props): JSX.Element {

  const sensors = useSensors(useSensor(PointerSensor));



  const onAddLine = (): void => {

    onLinesChange([

      ...dialog.lines,

      { id: crypto.randomUUID(), speaker: "", text: "", ...emptyLineFields },

    ]);

  };



  const onLineChange = (lineId: string, nextLine: DialogLine): void => {

    onLinesChange(dialog.lines.map((line) => (line.id === lineId ? nextLine : line)));

  };



  const onLineRemove = (lineId: string): void => {

    onLinesChange(dialog.lines.filter((line) => line.id !== lineId));

  };



  const onDragEnd = (event: DragEndEvent): void => {

    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = dialog.lines.findIndex((line) => line.id === active.id);

    const newIndex = dialog.lines.findIndex((line) => line.id === over.id);

    if (oldIndex < 0 || newIndex < 0) return;

    onLinesChange(arrayMove(dialog.lines, oldIndex, newIndex));

  };



  return (

    <section className="panel editor">

      <div className="editor-header">

        <input value={dialog.name} onChange={(event) => onDialogNameChange(event.target.value)} className="dialog-title" />

        <SpeakerConfigDropdown speakers={speakers} onSpeakersChange={onSpeakersChange} />

        <div className="actions-row">

          <button type="button" onClick={onAddLine}>

            +

          </button>

          <button type="button" onClick={onExport}>

            Export

          </button>

          <button type="button" className="danger" onClick={onRemoveDialog}>

            Delete Dialog

          </button>

        </div>

      </div>



      <label className="field-label" htmlFor="dialog-location">

        Location

      </label>

      <textarea

        id="dialog-location"

        className="dialog-location-input"

        value={dialog.location ?? ""}

        placeholder="Where this dialog takes place"

        onChange={(event) => onLocationChange(event.target.value)}

      />



      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>

        <SortableContext items={dialog.lines.map((line) => line.id)} strategy={verticalListSortingStrategy}>

          <div className="lines-list">

            {dialog.lines.map((line, index) => (

              <SortableLineItem

                key={line.id}

                line={line}

                lineIndex={index}

                speakers={speakers}

                dialogLocation={dialog.location ?? ""}

                allLines={dialog.lines}

                onChange={(nextLine) => onLineChange(line.id, nextLine)}

                onRemove={() => onLineRemove(line.id)}

              />

            ))}

          </div>

        </SortableContext>

      </DndContext>

    </section>

  );

}



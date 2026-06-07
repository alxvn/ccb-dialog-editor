import type {
  BranchingDialogFile,
  BranchingEdge,
  BranchingNode,
  DialogFile,
  DialogLine,
  LinearDialogFile,
} from "./schemas";
import { findBranchingEntryNodeId } from "./branchingFlow";

function escapeJsSingleQuoted(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\r?\n/g, " ");
}

function escapeXmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatJsNullableString(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return "null";
  }
  return `'${escapeJsSingleQuoted(value)}'`;
}

function formatJsNullableNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "null";
  }
  return String(value);
}

function formatDialogLines(lines: DialogLine[]): string {
  if (lines.length === 0) {
    return "[]";
  }

  const entries = lines.map((line) => {
    const speaker = escapeJsSingleQuoted(line.speaker);
    const text = escapeJsSingleQuoted(line.text);
    return `        {
            preAction: ${formatJsNullableString(line.preAction)},
            speaker: '${speaker}',
            line: '${text}',
            postAction: ${formatJsNullableString(line.postAction)},
            delay: ${formatJsNullableNumber(line.delay)}
        }`;
  });

  return `[
${entries.join(",\n")}
    ]`;
}

function formatLinearDialogAssignment(dialog: LinearDialogFile): string {
  const key = escapeJsSingleQuoted(dialog.name);
  return `    okeDialogs["${key}"] = ${formatDialogLines(dialog.lines)};`;
}

function normalizeBranchingNode(node: BranchingNode): BranchingNode {
  const record = node as BranchingNode & { data?: Record<string, unknown> };
  const nested = record.data ?? {};

  if (node.type === "response") {
    return {
      id: node.id,
      type: "response",
      position: node.position,
      text: node.text ?? (nested.text as string | undefined) ?? "",
      preAction: node.preAction ?? (nested.preAction as string | null | undefined) ?? null,
      postAction: node.postAction ?? (nested.postAction as string | null | undefined) ?? null,
    };
  }

  return {
    id: node.id,
    type: "line",
    position: node.position,
    speaker: node.speaker ?? (nested.speaker as string | undefined) ?? "",
    text: node.text ?? (nested.text as string | undefined) ?? "",
    preAction: node.preAction ?? (nested.preAction as string | null | undefined) ?? null,
    postAction: node.postAction ?? (nested.postAction as string | null | undefined) ?? null,
    delay: node.delay ?? (nested.delay as number | null | undefined) ?? null,
  };
}

function formatBranchingNode(node: BranchingNode): string {
  const normalized = normalizeBranchingNode(node);
  if (normalized.type === "response") {
    return `        "${escapeJsSingleQuoted(normalized.id)}": {
            kind: "response",
            text: ${formatJsNullableString(normalized.text)},
            preAction: ${formatJsNullableString(normalized.preAction)},
            postAction: ${formatJsNullableString(normalized.postAction)}
        }`;
  }
  const speaker = escapeJsSingleQuoted(normalized.speaker);
  const text = escapeJsSingleQuoted(normalized.text);
  return `        "${escapeJsSingleQuoted(normalized.id)}": {
            kind: "line",
            speaker: '${speaker}',
            line: '${text}',
            preAction: ${formatJsNullableString(normalized.preAction)},
            postAction: ${formatJsNullableString(normalized.postAction)},
            delay: ${formatJsNullableNumber(normalized.delay)}
        }`;
}

function formatBranchingEdge(edge: BranchingEdge): string {
  return `        { from: "${escapeJsSingleQuoted(edge.source)}", fromHandle: "${escapeJsSingleQuoted(edge.sourceHandle)}", to: "${escapeJsSingleQuoted(edge.target)}" }`;
}

function formatBranchingDialogAssignment(dialog: BranchingDialogFile): string {
  const key = escapeJsSingleQuoted(dialog.name);
  if (dialog.nodes.length === 0) {
    return `    okeDialogs["${key}"] = {
        kind: "branching",
        nodes: {},
        edges: [],
        entry: null
    };`;
  }

  const nodeEntries = dialog.nodes.map(formatBranchingNode).join(",\n");
  const edgeEntries = dialog.edges.map(formatBranchingEdge).join(",\n");
  const entry = findBranchingEntryNodeId(dialog.nodes, dialog.edges);
  const entryValue = entry === null ? "null" : `"${escapeJsSingleQuoted(entry)}"`;

  return `    okeDialogs["${key}"] = {
        kind: "branching",
        nodes: {
${nodeEntries}
        },
        edges: [
${edgeEntries}
        ],
        entry: ${entryValue}
    };`;
}

function formatDialogAssignment(dialog: DialogFile): string {
  if (dialog.type === "branching") {
    return formatBranchingDialogAssignment(dialog);
  }
  return formatLinearDialogAssignment(dialog);
}

export function buildCopperCubeDialogExtension(
  projectName: string,
  extensionPostfix: string,
  dialogs: DialogFile[],
): string {
  const actionName = `action_Dialog_${extensionPostfix}`;
  const description = escapeXmlAttribute(`Init dialog - ${projectName}`);
  const dialogAssignments =
    dialogs.length > 0 ? dialogs.map(formatDialogAssignment).join("\n\n") : "";

  return `// The following embedded xml is for the editor and describes how the action can be edited:
// Supported types are: int, float, string, bool, color, vect3d, scenenode, texture, action
/*
    <action jsname="${actionName}" description="${description}">
    </action>
*/

// init dialogs variable
// in case it is already set it does nothing
var okeDialogs;

${actionName} = function () {}

${actionName}.prototype.execute = function (node) {
    // set to empty object in case not set yet
    if (!okeDialogs) okeDialogs = {};

${dialogAssignments}
}
`;
}

export function generateExtensionPostfix(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 6; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export function getExtensionFileName(extensionPostfix: string): string {
  return `action_Dialog_${extensionPostfix}.js`;
}

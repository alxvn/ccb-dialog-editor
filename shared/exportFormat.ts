import type { DialogFile, DialogLine } from "./schemas";

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

function formatJsNullableString(value: string | null): string {
  if (value === null) {
    return "null";
  }
  return `'${escapeJsSingleQuoted(value)}'`;
}

function formatJsNullableNumber(value: number | null): string {
  if (value === null) {
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

function formatDialogAssignment(dialog: DialogFile): string {
  const key = escapeJsSingleQuoted(dialog.name);
  return `    okeDialogs["${key}"] = ${formatDialogLines(dialog.lines)};`;
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

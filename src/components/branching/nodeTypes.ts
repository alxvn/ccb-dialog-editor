import type { NodeTypes } from "@xyflow/react";
import LineNode from "./LineNode";
import ResponseNode from "./ResponseNode";

export const branchingNodeTypes: NodeTypes = {
  line: LineNode,
  response: ResponseNode,
};

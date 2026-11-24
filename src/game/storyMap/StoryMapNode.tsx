import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { StoryMapNodeData } from "./storyMapData";
import styles from "../screens/StoryMapScreen.module.css";

export function StoryMapNode({ data, selected }: NodeProps<Node<StoryMapNodeData>>) {
  const kindLabel: Record<StoryMapNodeData["kind"], string> = {
    decision: "Decision",
    option: "Choice",
    outcome: "Outcome",
    state: "Campaign state",
    mechanic: "Game rule",
    ending: "Ending",
  };
  const footerTags = data.tags?.filter((tag) => tag !== "choice");

  return <article className={styles.graphNode} data-kind={data.kind} data-selected={selected ? "true" : "false"}>
    <Handle type="target" position={Position.Left} className={styles.handle} />
    <div className={styles.nodeInset}>
      <header className={styles.nodeHeader}>
        <span className={styles.nodeKind}>{kindLabel[data.kind]}</span>
        <span className={styles.nodeMark} aria-hidden="true" />
      </header>
      <strong title={data.title}>{data.title}</strong>
      {data.subtitle && <small title={data.subtitle}>{data.subtitle}</small>}
      {footerTags && footerTags.length > 0 && <footer className={styles.nodeFooter}>
        <span className={styles.nodeTags}>{footerTags.slice(0, 2).join(" · ")}</span>
      </footer>}
    </div>
    <Handle type="source" position={Position.Right} className={styles.handle} />
  </article>;
}

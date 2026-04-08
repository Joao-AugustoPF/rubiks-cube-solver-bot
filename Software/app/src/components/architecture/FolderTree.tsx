import styles from "./ArchitectureGuide.module.css";

export interface FolderNode {
  name: string;
  kind: "dir" | "file";
  note?: string;
  children?: FolderNode[];
}

interface FolderTreeProps {
  nodes: FolderNode[];
}

export function FolderTree({ nodes }: FolderTreeProps) {
  return (
    <div className={styles.folderTree}>
      <ul className={styles.folderList}>
        {nodes.map((node) => (
          <FolderTreeNode key={node.name} node={node} />
        ))}
      </ul>
    </div>
  );
}

function FolderTreeNode({ node }: { node: FolderNode }) {
  if (node.kind === "file") {
    return (
      <li className={styles.folderItem}>
        <span className={styles.fileBadge}>FILE</span>
        <code>{node.name}</code>
        {node.note ? <small>{node.note}</small> : null}
      </li>
    );
  }

  return (
    <li className={styles.folderItem}>
      <details open>
        <summary>
          <span className={styles.dirBadge}>DIR</span>
          <code>{node.name}</code>
          {node.note ? <small>{node.note}</small> : null}
        </summary>
        {node.children?.length ? (
          <ul className={styles.folderList}>
            {node.children.map((child) => (
              <FolderTreeNode key={`${node.name}/${child.name}`} node={child} />
            ))}
          </ul>
        ) : null}
      </details>
    </li>
  );
}

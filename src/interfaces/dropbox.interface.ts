export interface TreeFile {
  name: string;
  path: string;
  size?: number;
}

export interface TreeNode {
  name: string;
  path: string;
  folders: TreeNode[];
  files: TreeFile[];
}

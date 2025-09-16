import { TableLevelNodeData } from '../table-view/tableLevelMapping';

// Extended interface with additional properties used in forms and editing contexts
export interface EditableNodeData extends TableLevelNodeData {
  id: string; // Make id required since EditForm needs it
  onNodeClick?: (id: string) => void;
  showPulsingHandle?: boolean;
  isDragEnabled?: boolean;
  isRootNode?: boolean;
}
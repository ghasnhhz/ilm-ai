export type Collection = {
  id: string;
  name: string;
  created_at: string;
};

export type MaterialStatus = "processing" | "ready" | "failed";

export type Material = {
  id: string;
  title: string;
  file_type: string;
  status: MaterialStatus;
  error: string | null;
  collection_id: string | null;
  chunk_count: number;
  created_at: string;
};

export type ChunkPreview = {
  chunk_index: number;
  content: string;
  token_count: number;
};

export type MaterialDetail = Material & {
  chunks: ChunkPreview[];
};

export type Citation = {
  material_id: string;
  material_title: string;
  chunk_index: number;
  snippet: string;
};

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  citations: Citation[] | null;
  created_at: string;
};

export type ChatSession = {
  id: string;
  title: string | null;
  created_at: string;
};

export type MessageResponse = {
  session_id: string;
  message: ChatMessage;
};

export type HistoryResponse = {
  session_id: string;
  messages: ChatMessage[];
};

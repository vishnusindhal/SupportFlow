import { useEffect, useState, useRef } from "react";
import { knowledgeApi } from "../../api/knowledge";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { EmptyState } from "../../components/ui/EmptyState";
import type { CompanyDocument, RetrievedChunk } from "../../types";
import {
  UploadCloud,
  FileText,
  Search,
  Trash2,
  RotateCcw,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

export function KnowledgeBaseScreen() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Delete modal state
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Retrieval inspector state
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [retrievedChunks, setRetrievedChunks] = useState<RetrievedChunk[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  async function loadDocuments() {
    try {
      const data = await knowledgeApi.getDocuments();
      setDocuments(data);
    } catch {
      setFeedbackMessage({ type: "error", text: "Unable to load documents from backend." });
    }
  }

  useEffect(() => {
    void loadDocuments();
  }, []);

  async function handleUpload() {
    if (!selectedFile) return;
    setIsUploading(true);
    setFeedbackMessage(null);
    try {
      await knowledgeApi.uploadDocument(selectedFile);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setFeedbackMessage({
        type: "success",
        text: `"${selectedFile.name}" successfully uploaded, parsed, and embedded into 384-dimensional vectors.`,
      });
      await loadDocuments();
    } catch (err: unknown) {
      const errResp = err as { response?: { data?: { detail?: string } } };
      const detail = errResp.response?.data?.detail;
      const readable: Record<string, string> = {
        unsupported_file_type: `"${selectedFile.name}" was rejected: only PDF, DOCX, and TXT files are supported.`,
        file_too_large: `"${selectedFile.name}" was rejected: the file is larger than the 10 MB upload limit.`,
      };
      setFeedbackMessage({
        type: "error",
        text:
          (detail && readable[detail]) ??
          detail ??
          "Upload failed. Please ensure file is valid PDF, DOCX, or TXT.",
      });
    } finally {
      setIsUploading(false);
    }
  }

  async function handleRetry(id: string) {
    try {
      await knowledgeApi.retryDocument(id);
      setFeedbackMessage({ type: "success", text: "Reprocessing initiated." });
      await loadDocuments();
    } catch {
      setFeedbackMessage({ type: "error", text: "Reprocessing failed." });
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteDocId) return;
    setIsDeleting(true);
    try {
      await knowledgeApi.deleteDocument(deleteDocId);
      setFeedbackMessage({ type: "success", text: "Document and vector chunks removed from workspace." });
      setDeleteDocId(null);
      await loadDocuments();
    } catch {
      setFeedbackMessage({ type: "error", text: "Could not delete document." });
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleTestRetrieval(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setIsSearching(true);
    setHasSearched(true);
    try {
      const results = await knowledgeApi.retrieve(query.trim(), 5);
      setRetrievedChunks(results);
    } catch {
      setFeedbackMessage({ type: "error", text: "Retrieval query failed. Verify backend and database." });
    } finally {
      setIsSearching(false);
    }
  }

  function formatBytes(bytes: number) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal tracking-tight">Knowledge Base</h1>
          <p className="text-xs sm:text-sm text-slate-text mt-0.5">
            Upload private support documents. Text is split into overlapping chunks and vectorized for grounded retrieval.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="mint" withDot>
            Strict Tenant Isolation
          </Badge>
          <Badge variant="aubergine">384-Dim Embeddings</Badge>
        </div>
      </div>

      {/* Feedback banner */}
      {feedbackMessage && (
        <div
          className={`p-3.5 rounded-lg border text-xs font-medium flex items-center justify-between ${
            feedbackMessage.type === "success"
              ? "bg-mint-light text-mint-dark border-mint"
              : "bg-red-50 text-status-error border-red-200"
          }`}
        >
          <span>{feedbackMessage.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-xs font-bold underline cursor-pointer ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. Upload Document Card */}
      <Card>
        <CardHeader
          title="Upload Support Document"
          description="Supported formats: PDF (.pdf), Microsoft Word (.docx), and Plain Text (.txt)."
        />
        <CardBody className="p-6">
          <div className="border-2 border-dashed border-warm-border rounded-xl p-6 sm:p-8 text-center bg-ivory-light/50 hover:bg-ivory transition-colors flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-white border border-warm-border text-coral flex items-center justify-center mb-3 shadow-xs">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-charcoal">
              {selectedFile ? selectedFile.name : "Choose a file from your computer"}
            </h3>
            <p className="text-xs text-slate-text mt-1 max-w-sm leading-relaxed">
              {selectedFile
                ? `${formatBytes(selectedFile.size)} · ${selectedFile.type || "text/plain"}`
                : "Documents are safely stored under an opaque UUID key and strictly bound to your organization."}
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              className="hidden"
              id="doc-upload-input"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            />

            <div className="mt-4 flex items-center gap-3">
              <label htmlFor="doc-upload-input">
                <Button variant="outline" size="sm" type="button" onClick={() => fileInputRef.current?.click()}>
                  Browse Files
                </Button>
              </label>

              {selectedFile && (
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={isUploading}
                  onClick={handleUpload}
                  leftIcon={<Sparkles className="w-4 h-4" />}
                >
                  Upload & Vectorize
                </Button>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 2. Document Inventory Table */}
      <Card>
        <CardHeader
          title="Ingested Documents"
          description={`Showing ${documents.length} document(s) in this organization's private knowledge base.`}
          action={
            <Button variant="ghost" size="sm" onClick={() => void loadDocuments()} leftIcon={<RotateCcw className="w-3.5 h-3.5" />}>
              Refresh
            </Button>
          }
        />
        {documents.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-6 h-6" />}
            title="No knowledge documents yet"
            description="Upload your store policies, return FAQs, or product specs so your AI agent can cite authentic evidence."
            actionLabel="Select Document"
            onAction={() => fileInputRef.current?.click()}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-ivory border-b border-warm-border text-slate-text uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-5">Document Name</th>
                  <th className="py-3 px-5">File Size</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">Uploaded Date</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-border/60">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-ivory-light/40 transition-colors">
                    <td className="py-3.5 px-5 font-semibold text-charcoal flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-slate-text shrink-0" />
                      <span className="truncate max-w-xs">{doc.original_filename}</span>
                    </td>
                    <td className="py-3.5 px-5 text-slate-text font-mono">
                      {formatBytes(doc.size_bytes)}
                    </td>
                    <td className="py-3.5 px-5">
                      {doc.status === "ready" && (
                        <Badge variant="mint" withDot>
                          Processed & Searchable
                        </Badge>
                      )}
                      {doc.status === "pending" && (
                        <Badge variant="amber" withDot>
                          Processing Chunks...
                        </Badge>
                      )}
                      {doc.status === "failed" && (
                        <div className="flex items-center gap-1.5">
                          <Badge variant="red" withDot>
                            Failed
                          </Badge>
                          {doc.error_code && (
                            <span className="text-[11px] text-status-error truncate max-w-xs">
                              ({doc.error_code})
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-slate-text">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-5 text-right space-x-1.5">
                      {doc.status === "failed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleRetry(doc.id)}
                          title="Retry processing"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-slate-text" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteDocId(doc.id)}
                        title="Delete document"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-status-error" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 3. Interactive Retrieval Inspector */}
      <Card>
        <CardHeader
          title="Hybrid Retrieval Inspector"
          description="Test semantic + lexical search against your organization's vector chunks (70% lexical overlap + 30% vector cosine similarity)."
        />
        <CardBody className="p-6 space-y-5">
          <form onSubmit={handleTestRetrieval} className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="e.g. What is the return window for damaged items? or Eventopia"
                leftIcon={<Search className="w-4 h-4" />}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Button
              variant="aubergine"
              size="md"
              type="submit"
              isLoading={isSearching}
              leftIcon={<Search className="w-4 h-4" />}
            >
              Search Knowledge
            </Button>
          </form>

          {hasSearched && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-text border-b border-warm-border/60 pb-2">
                <span>
                  Query Results for: <strong className="text-charcoal font-semibold">"{query}"</strong>
                </span>
                <span>{retrievedChunks.length} chunk(s) retrieved</span>
              </div>

              {retrievedChunks.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-text bg-ivory rounded-lg border border-warm-border">
                  No matching chunks found with sufficient hybrid similarity.
                </div>
              ) : (
                <div className="space-y-3">
                  {retrievedChunks.map((chunk, index) => (
                    <div
                      key={chunk.chunk_id}
                      className="p-4 rounded-xl border border-warm-border bg-ivory-light/40 space-y-2 hover:bg-white transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-aubergine text-white text-[10px] font-bold flex items-center justify-center">
                            {index + 1}
                          </span>
                          <span className="font-semibold text-charcoal">
                            {chunk.metadata?.source_filename ?? "Document"}
                          </span>
                        </div>
                        <Badge variant="lavender">
                          Hybrid Score: {chunk.score.toFixed(4)}
                        </Badge>
                      </div>

                      <p className="text-xs text-charcoal leading-relaxed font-mono bg-white p-3 rounded-lg border border-warm-border/60">
                        "{chunk.content}"
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-slate-text">
                        <span className="font-mono">Chunk ID: {chunk.chunk_id.slice(0, 8)}...</span>
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-mint-dark" />
                          Tenant Verified
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Confirmation Modal for Document Deletion */}
      <Modal
        isOpen={Boolean(deleteDocId)}
        onClose={() => setDeleteDocId(null)}
        title="Delete Knowledge Document"
        description="Are you sure you want to delete this document from your organization?"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDeleteDocId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              isLoading={isDeleting}
              onClick={handleDeleteConfirm}
            >
              Delete & Remove Chunks
            </Button>
          </>
        }
      >
        <p className="text-xs text-slate-text leading-relaxed">
          This will delete the file from private storage and remove all associated 384-dimensional vector embeddings from the database. The AI assistant will no longer be able to reference this information.
        </p>
      </Modal>
    </div>
  );
}

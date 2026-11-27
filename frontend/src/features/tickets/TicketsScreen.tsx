import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ticketsApi } from "../../api/tickets";
import { Card, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { EmptyState } from "../../components/ui/EmptyState";
import type { Ticket, TicketComment, TicketPriority, TicketStatus } from "../../types";
import {
  AlertCircle,
  Plus,
  RotateCcw,
  MessageSquare,
  CheckCircle2,
  Lock,
  ArrowRight,
  Send,
} from "lucide-react";

export function TicketsScreen() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Selected ticket for modal / detail view
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Manual create ticket modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createPriority, setCreatePriority] = useState<TicketPriority>("normal");
  const [createTeam, setCreateTeam] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  async function loadTickets() {
    try {
      const params = statusFilter !== "all" ? { status: statusFilter } : undefined;
      const data = await ticketsApi.getTickets(params);
      setTickets(data);
    } catch {
      setFeedback({ type: "error", text: "Unable to load tickets from backend." });
    }
  }

  useEffect(() => {
    void loadTickets();
  }, [statusFilter]);

  async function openTicketDetail(ticket: Ticket) {
    setSelectedTicket(ticket);
    try {
      const comms = await ticketsApi.getComments(ticket.id);
      setComments(comms);
    } catch {
      setComments([]);
    }
  }

  async function handleUpdateStatus(ticketId: string, newStatus: TicketStatus) {
    try {
      const updated = await ticketsApi.updateTicket(ticketId, { status: newStatus });
      setSelectedTicket(updated);
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
      setFeedback({ type: "success", text: `Ticket status updated to ${newStatus}.` });
    } catch {
      setFeedback({ type: "error", text: "Failed to update ticket status." });
    }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTicket || !newCommentText.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      const newComment = await ticketsApi.addComment(selectedTicket.id, newCommentText.trim(), isInternalNote);
      setComments((prev) => [...prev, newComment]);
      setNewCommentText("");
    } catch {
      setFeedback({ type: "error", text: "Could not add comment to ticket." });
    } finally {
      setIsSubmittingComment(false);
    }
  }

  async function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!createTitle.trim() || !createDescription.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const newTicket = await ticketsApi.createTicket({
        title: createTitle.trim(),
        description: createDescription.trim(),
        priority: createPriority,
        team: createTeam.trim() || undefined,
        customer_email: createEmail.trim() || undefined,
      });
      setTickets((prev) => [newTicket, ...prev]);
      setIsCreateModalOpen(false);
      setCreateTitle("");
      setCreateDescription("");
      setCreateEmail("");
      setFeedback({ type: "success", text: `Ticket #${newTicket.id.slice(0, 8)} created successfully.` });
    } catch {
      setFeedback({ type: "error", text: "Could not create ticket. Verify fields." });
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal tracking-tight">
            Ticket Management & Human Escalations
          </h1>
          <p className="text-xs sm:text-sm text-slate-text mt-0.5">
            Manage escalated customer issues, assign support specialists, record internal notes, and track resolution.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void loadTickets()}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Create Ticket
          </Button>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-lg border text-xs font-medium flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-mint-light text-mint-dark border-mint"
              : "bg-red-50 text-status-error border-red-200"
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-bold underline cursor-pointer ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {[
          { key: "all", label: "All Tickets" },
          { key: "open", label: "Open" },
          { key: "in_progress", label: "In Progress" },
          { key: "resolved", label: "Resolved" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              statusFilter === tab.key
                ? "bg-aubergine text-white shadow-xs"
                : "bg-white text-slate-text border border-warm-border hover:text-charcoal hover:bg-ivory"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tickets Table */}
      <Card>
        <CardHeader
          title="Escalation Tickets"
          description={`Showing ${tickets.length} ticket(s) in this view.`}
        />
        {tickets.length === 0 ? (
          <EmptyState
            icon={<AlertCircle className="w-6 h-6" />}
            title="No tickets found"
            description="When customer conversations trigger an escalation rule or talk_to_agent intent, tickets appear here automatically."
            actionLabel="Create Manual Ticket"
            onAction={() => setIsCreateModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-ivory border-b border-warm-border text-slate-text uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-5">Ticket ID</th>
                  <th className="py-3 px-5">Subject / Title</th>
                  <th className="py-3 px-5">Customer Email</th>
                  <th className="py-3 px-5">Priority</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">Created</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-border/60">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-ivory-light/40 transition-colors">
                    <td className="py-3.5 px-5 font-mono font-bold text-charcoal">
                      #{t.id.slice(0, 8)}
                    </td>
                    <td className="py-3.5 px-5 font-semibold text-charcoal">
                      <div className="max-w-xs truncate">{t.title}</div>
                      {t.team && (
                        <div className="text-[11px] font-normal text-slate-text">
                          Team: <span className="font-semibold">{t.team}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-slate-text">
                      {t.customer_email || "Customer (via Chat)"}
                    </td>
                    <td className="py-3.5 px-5">
                      <Badge
                        variant={
                          t.priority === "urgent"
                            ? "red"
                            : t.priority === "high"
                            ? "amber"
                            : "neutral"
                        }
                      >
                        {t.priority}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-5">
                      {t.status === "open" && (
                        <Badge variant="amber" withDot>
                          Open
                        </Badge>
                      )}
                      {t.status === "in_progress" && (
                        <Badge variant="lavender" withDot>
                          In Progress
                        </Badge>
                      )}
                      {t.status === "resolved" && (
                        <Badge variant="mint" withDot>
                          Resolved
                        </Badge>
                      )}
                      {t.status === "closed" && (
                        <Badge variant="neutral">Closed</Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-slate-text">
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void openTicketDetail(t)}
                        rightIcon={<ArrowRight className="w-3 h-3" />}
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* TICKET DETAIL & NOTES MODAL */}
      <Modal
        isOpen={Boolean(selectedTicket)}
        onClose={() => setSelectedTicket(null)}
        title={selectedTicket ? `Ticket #${selectedTicket.id.slice(0, 8)}` : "Ticket Details"}
        description={selectedTicket?.title}
        maxWidth="lg"
      >
        {selectedTicket && (
          <div className="space-y-5">
            {/* Ticket Header & Status Controls */}
            <div className="p-4 bg-ivory rounded-xl border border-warm-border space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-text">Status:</span>
                  <Badge variant={selectedTicket.status === "resolved" ? "mint" : "amber"} withDot>
                    {selectedTicket.status}
                  </Badge>
                  <span className="text-slate-text ml-2">Priority:</span>
                  <Badge variant="coral">{selectedTicket.priority}</Badge>
                </div>

                <div className="flex items-center gap-2">
                  {selectedTicket.status !== "in_progress" && selectedTicket.status !== "resolved" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleUpdateStatus(selectedTicket.id, "in_progress")}
                    >
                      Mark In Progress
                    </Button>
                  )}
                  {selectedTicket.status !== "resolved" && (
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      onClick={() => void handleUpdateStatus(selectedTicket.id, "resolved")}
                    >
                      Resolve Ticket
                    </Button>
                  )}
                  {selectedTicket.status === "resolved" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleUpdateStatus(selectedTicket.id, "open")}
                    >
                      Reopen Ticket
                    </Button>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="pt-2 border-t border-warm-border/60">
                <span className="text-[11px] font-bold text-slate-text uppercase tracking-wider block mb-1">
                  Issue Description / Escalation Reason
                </span>
                <p className="text-xs text-charcoal leading-relaxed whitespace-pre-wrap bg-white p-3 rounded-lg border border-warm-border/60">
                  {selectedTicket.description}
                </p>
              </div>

              {/* Linked Conversation shortcut */}
              {selectedTicket.conversation_id && (
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-text">
                    Linked to Conversation: <span className="font-mono text-charcoal">{selectedTicket.conversation_id.slice(0, 8)}...</span>
                  </span>
                  <Link to="/playground" className="text-coral hover:underline font-semibold flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> View Transcript
                  </Link>
                </div>
              )}
            </div>

            {/* Comments & Internal Notes Stream */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-charcoal uppercase tracking-wider block">
                Activity & Internal Notes ({comments.length})
              </span>

              <div className="space-y-2 max-h-56 overflow-y-auto">
                {comments.length === 0 ? (
                  <p className="text-xs text-slate-text italic p-3 text-center bg-ivory rounded-lg border border-warm-border">
                    No comments or notes added yet.
                  </p>
                ) : (
                  comments.map((c) => (
                    <div
                      key={c.id}
                      className={`p-3 rounded-lg border text-xs leading-relaxed ${
                        c.is_internal
                          ? "bg-amber-50/50 border-amber-200"
                          : "bg-white border-warm-border"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-semibold text-charcoal flex items-center gap-1">
                          {c.is_internal ? (
                            <span className="text-amber-800 font-bold flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Internal Agent Note
                            </span>
                          ) : (
                            <span className="text-mint-dark font-bold">Public Response</span>
                          )}
                        </span>
                        <span className="text-slate-text">
                          {new Date(c.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-charcoal whitespace-pre-wrap">{c.content}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment / Note Form */}
              <form onSubmit={handleAddComment} className="space-y-2 pt-2">
                <textarea
                  rows={3}
                  placeholder={
                    isInternalNote
                      ? "Write an internal note visible only to your support team..."
                      : "Write a public response to update this ticket..."
                  }
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  className="w-full bg-ivory border border-warm-border rounded-lg p-3 text-xs text-charcoal focus:outline-none focus:border-coral"
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-slate-text cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isInternalNote}
                      onChange={(e) => setIsInternalNote(e.target.checked)}
                      className="rounded border-warm-border text-coral focus:ring-coral"
                    />
                    <span>Post as Internal Note</span>
                  </label>
                  <Button
                    variant="primary"
                    size="sm"
                    type="submit"
                    isLoading={isSubmittingComment}
                    disabled={!newCommentText.trim()}
                    leftIcon={<Send className="w-3.5 h-3.5" />}
                  >
                    Post Note
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </Modal>

      {/* CREATE MANUAL TICKET MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Customer Support Ticket"
        description="Manually raise a ticket for tracking customer issues."
      >
        <form onSubmit={handleCreateTicket} className="space-y-4">
          <Input
            label="Ticket Subject"
            required
            placeholder="e.g. Order cancellation request for ORD-4412"
            value={createTitle}
            onChange={(e) => setCreateTitle(e.target.value)}
          />

          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1.5">
              Description / Customer Request <span className="text-coral">*</span>
            </label>
            <textarea
              required
              rows={4}
              placeholder="Detailed description of the customer's problem or reason for escalation..."
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
              className="w-full bg-white border border-warm-border rounded-lg p-3 text-xs text-charcoal focus:outline-none focus:border-coral"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Priority Level"
              value={createPriority}
              onChange={(e) => setCreatePriority(e.target.value as TicketPriority)}
              options={[
                { value: "low", label: "Low" },
                { value: "normal", label: "Normal" },
                { value: "high", label: "High" },
                { value: "urgent", label: "Urgent" },
              ]}
            />
            <Input
              label="Target Team (Optional)"
              placeholder="e.g. returns, billing"
              value={createTeam}
              onChange={(e) => setCreateTeam(e.target.value)}
            />
          </div>

          <Input
            label="Customer Email (Optional)"
            type="email"
            placeholder="customer@example.com"
            value={createEmail}
            onChange={(e) => setCreateEmail(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" size="md" type="button" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" isLoading={isCreating}>
              Create Ticket
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

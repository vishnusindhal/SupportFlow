import { Card, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { AlertCircle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export function TicketsScreen() {
  const sampleEscalations = [
    {
      id: "ESC-1042",
      customer: "alex.smith@example.com",
      topic: "Damaged item received (ORD-9921)",
      reason: "Triggered by business rule: 'damaged-item-escalation'",
      priority: "high",
      status: "pending_review",
      time: "12 mins ago",
    },
    {
      id: "ESC-1041",
      customer: "sarah.k@example.com",
      topic: "Customer requested human representative",
      reason: "Triggered by global intent: 'talk_to_agent'",
      priority: "normal",
      status: "in_progress",
      time: "45 mins ago",
    },
    {
      id: "ESC-1039",
      customer: "marcus.v@example.com",
      topic: "Refund window inquiry beyond 30 days",
      reason: "Safe grounding fallback: insufficient knowledge evidence",
      priority: "normal",
      status: "resolved",
      time: "2 hours ago",
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal tracking-tight">
            Human Escalation & Ticket Queue
          </h1>
          <p className="text-xs sm:text-sm text-slate-text mt-0.5">
            Customer inquiries escalated by deterministic business rules or the conversation state machine.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="amber" withDot>
            V6 Rule Handoff Active
          </Badge>
          <Badge variant="aubergine">V7 Ticket Management Ready</Badge>
        </div>
      </div>

      {/* Architectural Context Banner */}
      <div className="p-4 rounded-xl bg-ivory-dark/40 border border-warm-border flex items-start gap-3.5 text-xs text-slate-text">
        <AlertCircle className="w-5 h-5 text-coral shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-charcoal">
            Escalation Handled Deterministically by V6 Business Rules
          </p>
          <p className="leading-relaxed">
            SupportFlow never lets a generative model decide whether an issue qualifies for human intervention. When a customer states an urgent intent (such as a damaged item or cancellation) or requests a human agent, the backend deterministic rule engine flags the conversation and routes it to this queue.
          </p>
        </div>
      </div>

      {/* Escalation Queue Table */}
      <Card>
        <CardHeader
          title="Escalated Requests"
          description="Inquiries awaiting human support representative review."
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-ivory border-b border-warm-border text-slate-text uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-5">Ticket ID</th>
                <th className="py-3 px-5">Customer</th>
                <th className="py-3 px-5">Escalation Topic</th>
                <th className="py-3 px-5">Trigger Reason</th>
                <th className="py-3 px-5">Priority</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-border/60">
              {sampleEscalations.map((item) => (
                <tr key={item.id} className="hover:bg-ivory-light/40 transition-colors">
                  <td className="py-3.5 px-5 font-mono font-bold text-charcoal">{item.id}</td>
                  <td className="py-3.5 px-5 font-medium text-charcoal">{item.customer}</td>
                  <td className="py-3.5 px-5 font-semibold text-charcoal">{item.topic}</td>
                  <td className="py-3.5 px-5 text-slate-text">{item.reason}</td>
                  <td className="py-3.5 px-5">
                    <Badge variant={item.priority === "high" ? "red" : "neutral"}>
                      {item.priority}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-5">
                    {item.status === "pending_review" && (
                      <Badge variant="amber" withDot>
                        Pending Review
                      </Badge>
                    )}
                    {item.status === "in_progress" && (
                      <Badge variant="lavender" withDot>
                        Assigned
                      </Badge>
                    )}
                    {item.status === "resolved" && (
                      <Badge variant="mint" withDot>
                        Resolved
                      </Badge>
                    )}
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <Link to="/conversations">
                      <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3 h-3" />}>
                        Open Thread
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

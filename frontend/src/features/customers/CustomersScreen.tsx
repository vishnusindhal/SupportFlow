import { Card, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export function CustomersScreen() {
  const sampleCustomers = [
    {
      id: "CUST-0821",
      name: "Alex Smith",
      email: "alex.smith@example.com",
      lastOrder: "ORD-9921",
      conversationsCount: 3,
      status: "escalated",
      lastActive: "15 mins ago",
    },
    {
      id: "CUST-0819",
      name: "Sarah Jenkins",
      email: "sarah.k@example.com",
      lastOrder: "ORD-8812",
      conversationsCount: 1,
      status: "resolved",
      lastActive: "1 hour ago",
    },
    {
      id: "CUST-0814",
      name: "Marcus Vance",
      email: "marcus.v@example.com",
      lastOrder: "ORD-7629",
      conversationsCount: 2,
      status: "resolved",
      lastActive: "Yesterday",
    },
    {
      id: "CUST-0809",
      name: "Elena Rostova",
      email: "elena.r@example.com",
      lastOrder: "ORD-6540",
      conversationsCount: 4,
      status: "active",
      lastActive: "2 days ago",
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal tracking-tight">Customer Directory</h1>
          <p className="text-xs sm:text-sm text-slate-text mt-0.5">
            Customers identified through support conversations and extracted order reference numbers.
          </p>
        </div>
        <Badge variant="mint" withDot>
          4 Active Customer Records
        </Badge>
      </div>

      <Card>
        <CardHeader
          title="Customer Contacts & Entity History"
          description="Tracked entities (like order_id) are automatically linked to customer records."
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-ivory border-b border-warm-border text-slate-text uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-5">Customer ID</th>
                <th className="py-3 px-5">Name & Email</th>
                <th className="py-3 px-5">Extracted Order ID</th>
                <th className="py-3 px-5">Total Threads</th>
                <th className="py-3 px-5">Support Status</th>
                <th className="py-3 px-5">Last Activity</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-border/60">
              {sampleCustomers.map((cust) => (
                <tr key={cust.id} className="hover:bg-ivory-light/40 transition-colors">
                  <td className="py-3.5 px-5 font-mono text-charcoal">{cust.id}</td>
                  <td className="py-3.5 px-5">
                    <div className="font-semibold text-charcoal">{cust.name}</div>
                    <div className="text-slate-text text-[11px]">{cust.email}</div>
                  </td>
                  <td className="py-3.5 px-5 font-mono font-bold text-coral">
                    {cust.lastOrder}
                  </td>
                  <td className="py-3.5 px-5 text-charcoal font-medium">
                    {cust.conversationsCount} conversation(s)
                  </td>
                  <td className="py-3.5 px-5">
                    {cust.status === "escalated" ? (
                      <Badge variant="red" withDot>
                        Escalated
                      </Badge>
                    ) : cust.status === "active" ? (
                      <Badge variant="amber" withDot>
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="mint" withDot>
                        Resolved
                      </Badge>
                    )}
                  </td>
                  <td className="py-3.5 px-5 text-slate-text">{cust.lastActive}</td>
                  <td className="py-3.5 px-5 text-right">
                    <Link to="/conversations">
                      <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3 h-3" />}>
                        View Threads
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

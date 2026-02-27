import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function FinancePage() {
  const sections = [
    {
      title: 'Invoices',
      description: 'ERPNext invoice snapshots by project',
      href: '/finance/invoices',
    },
    {
      title: 'Purchase Orders',
      description: 'PO snapshots synced from ERPNext',
      href: '/finance/purchase-orders',
    },
    {
      title: 'Job Costs',
      description: 'Budget vs actuals snapshots per project',
      href: '/finance/job-costs',
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Finance Snapshots</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Read-only financial data synced from ERPNext. ERPNext is the source of truth for all
          accounting.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {sections.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="text-lg">{s.title}</CardTitle>
                <CardDescription>{s.description}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

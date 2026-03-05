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
    <>
      <title>Finance — KrewPact</title>
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
              <Card className="group cursor-pointer bg-white dark:bg-card border shadow-sm hover:shadow-xl hover:scale-[1.02] hover:border-primary/20 transition-all duration-300 rounded-3xl overflow-hidden relative h-full flex flex-col p-2">
                <CardHeader className="flex-1">
                  <CardTitle className="text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                    {s.title}
                  </CardTitle>
                  <CardDescription className="text-sm font-medium mt-2">
                    {s.description}
                  </CardDescription>
                </CardHeader>
                <CardContent />
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

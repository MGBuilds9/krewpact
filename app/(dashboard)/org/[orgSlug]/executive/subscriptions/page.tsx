'use client';

import { useState } from 'react';
import { SubscriptionTable, type Subscription } from '@/components/Executive/SubscriptionTable';
import { SubscriptionForm } from '@/components/Executive/SubscriptionForm';

export default function SubscriptionsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);

  function handleAdd() {
    setEditingSub(null);
    setShowForm(true);
  }

  function handleEdit(sub: Subscription) {
    setEditingSub(sub);
    setShowForm(true);
  }

  function handleClose() {
    setShowForm(false);
    setEditingSub(null);
  }

  return (
    <>
      <title>Subscriptions — KrewPact</title>
      <div className={`flex gap-6 ${showForm ? 'items-start' : ''}`}>
        {/* Table — full width when no form, 2/3 when form open */}
        <div className={showForm ? 'flex-1 min-w-0' : 'w-full'}>
          <SubscriptionTable onEdit={handleEdit} onAdd={handleAdd} />
        </div>

        {/* Form panel — shown on right side when active */}
        {showForm && (
          <div className="w-80 shrink-0">
            <SubscriptionForm subscription={editingSub} onClose={handleClose} />
          </div>
        )}
      </div>
    </>
  );
}

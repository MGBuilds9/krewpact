'use client';

import { useState } from 'react';

import { SubscriptionForm } from '@/components/Executive/SubscriptionForm';
import { type Subscription, SubscriptionTable } from '@/components/Executive/SubscriptionTable';

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
      <div className={`flex flex-col md:flex-row gap-6 ${showForm ? 'md:items-start' : ''}`}>
        {/* Table — full width when no form, flex-1 when form open */}
        <div className={showForm ? 'flex-1 min-w-0' : 'w-full'}>
          <SubscriptionTable onEdit={handleEdit} onAdd={handleAdd} />
        </div>

        {/* Form panel — stacks below on mobile, right side on md+ */}
        {showForm && (
          <div className="w-full md:w-80 md:shrink-0">
            <SubscriptionForm subscription={editingSub} onClose={handleClose} />
          </div>
        )}
      </div>
    </>
  );
}

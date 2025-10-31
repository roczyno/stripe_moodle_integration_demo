import { useState } from 'react';

export default function Plans() {
  const [loading, setLoading] = useState(false);

  const handlePaid = async (plan) => {
    setLoading(true);
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create checkout');
      window.location.href = data.url;
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: '40px auto', padding: 16 }}>
      <h1>Choose a Plan</h1>
      <p style={{ color: '#666' }}>Email and details will be collected securely on Stripe Checkout.</p>
      <div style={{ display: 'grid', gap: 8 }}>
        <button disabled={loading} onClick={() => handlePaid('starter_monthly')}>Starter Monthly</button>
        <button disabled={loading} onClick={() => handlePaid('starter_yearly')}>Starter Yearly</button>
        <button disabled={loading} onClick={() => handlePaid('pro_monthly')}>Pro Monthly</button>
        <button disabled={loading} onClick={() => handlePaid('pro_yearly')}>Pro Yearly</button>
      </div>
    </div>
  );
}



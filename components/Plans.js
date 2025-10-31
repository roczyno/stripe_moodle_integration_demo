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
    <div className="container">
      <div className="hero">
        <h1>Pick your plan</h1>
        <p>Email and details will be collected securely on Stripe Checkout.</p>
      </div>
      <div className="grid">
        <div className="card">
          <span className="badge">Popular</span>
          <h3>Starter</h3>
          <div className="price"><span className="amount">$19</span><span className="per">/month</span></div>
          <p className="muted">For individuals getting started with premium content.</p>
          <div className="plan-actions">
            <button className="btn" disabled={loading} onClick={() => handlePaid('starter_monthly')}>Starter Monthly - $19/month</button>
            <button className="btn" disabled={loading} onClick={() => handlePaid('starter_yearly')}>Starter Yearly - $190/year <span style={{fontSize: '0.9em', opacity: 0.9}}>(~17% discount)</span></button>
          </div>
        </div>

        <div className="card">
          <h3>Pro</h3>
          <div className="price"><span className="amount">$49</span><span className="per">/month</span></div>
          <p className="muted">For power users who need full course access.</p>
          <div className="plan-actions">
            <button className="btn" disabled={loading} onClick={() => handlePaid('pro_monthly')}>Pro Monthly - $49/month</button>
            <button className="btn" disabled={loading} onClick={() => handlePaid('pro_yearly')}>Pro Yearly - $490/year</button>
          </div>
        </div>
      </div>
    </div>
  );
}



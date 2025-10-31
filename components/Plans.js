import { useState } from 'react';

export default function Plans() {
  const [email, setEmail] = useState('');
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [loading, setLoading] = useState(false);

  const ensureFields = () => email && firstname && lastname;

  const handleFreemium = async () => {
    if (!ensureFields()) return alert('Enter email, first name, last name');
    setLoading(true);
    try {
      const res = await fetch('/api/freemium', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, firstname, lastname })
      });
      if (!res.ok) throw new Error('Failed');
      alert('Freemium activated! Check your email for login details.');
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePaid = async (plan) => {
    if (!ensureFields()) return alert('Enter email, first name, last name');
    setLoading(true);
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, email, name: `${firstname} ${lastname}` })
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
      <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="First name" value={firstname} onChange={(e) => setFirstname(e.target.value)} />
        <input placeholder="Last name" value={lastname} onChange={(e) => setLastname(e.target.value)} />
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        <button disabled={loading} onClick={handleFreemium}>Freemium (Free)</button>
        <button disabled={loading} onClick={() => handlePaid('starter_monthly')}>Starter Monthly</button>
        <button disabled={loading} onClick={() => handlePaid('starter_yearly')}>Starter Yearly</button>
        <button disabled={loading} onClick={() => handlePaid('pro_monthly')}>Pro Monthly</button>
        <button disabled={loading} onClick={() => handlePaid('pro_yearly')}>Pro Yearly</button>
      </div>
    </div>
  );
}



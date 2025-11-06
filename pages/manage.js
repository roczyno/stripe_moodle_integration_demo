import { useState } from 'react';

export default function Manage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleManage = async (e) => {
    e.preventDefault();
    if (!email) return alert('Enter your email');
    setLoading(true);
    try {
      const res = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create portal session');
      window.location.href = data.url;
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container">
      <div className="hero">
        <h1>Manage Subscription</h1>
        <p>Enter the email you used at checkout to manage your plan.</p>
      </div>
      <form onSubmit={handleManage} style={{ maxWidth: 420, margin: '0 auto', display: 'grid', gap: 12 }}>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button className="btn" disabled={loading} type="submit">{loading ? 'Redirecting…' : 'Manage Subscription'}</button>
      </form>
    </main>
  );
}



import { useEffect, useState } from 'react';

export default function Success() {
  const [status, setStatus] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (!sessionId) return;

    (async () => {
      try {
        const res = await fetch(`/api/session-customer?session_id=${encodeURIComponent(sessionId)}`);
        const data = await res.json();
        if (res.ok && data.customerId) {
          localStorage.setItem('stripe_customer_id', data.customerId);
          setStatus('Subscription linked. You can manage it from the plans page.');
        } else {
          setStatus(data.error || 'Could not resolve subscription.');
        }
      } catch (e) {
        setStatus(e.message);
      }
    })();
  }, []);

  return (
    <main style={{ maxWidth: 560, margin: '40px auto', padding: 16 }}>
      <h1>Payment Successful</h1>
      <p>
        Your subscription has been activated. If this is your first time, check your
        email for Moodle login/confirmation.
      </p>
      {status && <p style={{ color: '#9aa4b2' }}>{status}</p>}
    </main>
  );
}



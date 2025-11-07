import { useState } from "react";

const LINKS = {
  freemium:
    process.env.NEXT_PUBLIC_FREEMIUM_URL ||
    'https://learn.cylynk.com/login/index.php',
  starter_monthly:
    process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_STARTER_MONTHLY ||
    "https://buy.stripe.com/test_14A6oA5xi5lVbjE8VzfAc03",
  starter_yearly:
    process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_STARTER_YEARLY ||
    "https://buy.stripe.com/test_9B65kw7Fq8y7fzU3BffAc02",
  pro_monthly:
    process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_PRO_MONTHLY ||
    "https://buy.stripe.com/test_4gMbIU3pa7u373ogo1fAc01",
  pro_yearly:
    process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_PRO_YEARLY ||
    "https://buy.stripe.com/test_eVq6oA5xiaGf9bw7RvfAc00",
};

export default function Plans() {
  const [loading, setLoading] = useState(false);

  const handlePaid = (plan) => {
    setLoading(true);
    const url = LINKS[plan];
    if (!url) {
      alert("Payment link not configured for this plan");
      setLoading(false);
      return;
    }
    window.location.href = url;
  };

  const handleFreemium = () => {
    const url = LINKS.freemium;
    window.location.href = url;
  };

  return (
    <div className="container">
      <div className="hero">
        <h1>Pick your plan</h1>
        <p>Email and details will be collected securely on Stripe Checkout.</p>
      </div>
      <div className="grid">
        <div className="card">
          <h3>Freemium</h3>
          <div className="price">
            <span className="amount">$0</span>
            <span className="per">/forever</span>
          </div>
          <p className="muted">
            Access free introductory courses. Upgrade anytime for more content.
          </p>
          <div className="plan-actions">
            <button className="btn" disabled={loading} onClick={handleFreemium}>
              Get Started Free
            </button>
          </div>
        </div>

        <div className="card">
          <span className="badge">Popular</span>
          <h3>Starter</h3>
          <div className="price">
            <span className="amount">$19</span>
            <span className="per">/month</span>
          </div>
          <p className="muted">
            For individuals getting started with premium content.
          </p>
          <div className="plan-actions">
            <button
              className="btn"
              disabled={loading}
              onClick={() => handlePaid("starter_monthly")}
            >
              Starter Monthly - $19/month
            </button>
            <button
              className="btn"
              disabled={loading}
              onClick={() => handlePaid("starter_yearly")}
            >
              Starter Yearly - $190/year{" "}
              <span style={{ fontSize: "0.9em", opacity: 0.9 }}>
                (~17% discount)
              </span>
            </button>
          </div>
        </div>

        <div className="card">
          <h3>Pro</h3>
          <div className="price">
            <span className="amount">$49</span>
            <span className="per">/month</span>
          </div>
          <p className="muted">For power users who need full course access.</p>
          <div className="plan-actions">
            <button
              className="btn"
              disabled={loading}
              onClick={() => handlePaid("pro_monthly")}
            >
              Pro Monthly - $49/month
            </button>
            <button
              className="btn"
              disabled={loading}
              onClick={() => handlePaid("pro_yearly")}
            >
              Pro Yearly - $490/year
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

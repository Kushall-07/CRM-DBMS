import React, { useEffect } from 'react';
import { ArrowRight, Building2, Users, TrendingUp, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Landing(): JSX.Element {
  const navigate = useNavigate();

  // simple fade-in
  useEffect(() => {
    const el = document.querySelector('.landing-hero') as HTMLElement | null;
    const cards = Array.from(document.querySelectorAll('.landing-card')) as HTMLElement[];
    if (el) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(-20px)';
      requestAnimationFrame(() => {
        el.style.transition = 'all 700ms ease';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      });
    }
    cards.forEach((c, i) => {
      c.style.opacity = '0';
      c.style.transform = 'translateY(15px)';
      setTimeout(() => {
        c.style.transition = 'all 600ms ease';
        c.style.opacity = '1';
        c.style.transform = 'translateY(0)';
      }, 200 + i * 120);
    });
  }, []);

  return (
    <div className="landing-wrap">
      <main className="landing-container">
        {/* HERO */}
        <section className="landing-hero">
          <div className="landing-badge">
            <Sparkles size={16} />
            <span>Modern CRM Solution</span>
          </div>

          <h1 className="landing-title">Let&apos;s Get Started</h1>

          <p className="landing-subtitle">
            Streamline your business with our powerful CRM. Manage accounts, nurture leads,
            and close opportunities—all in one beautiful interface.
          </p>

          <button className="landing-cta" onClick={() => navigate('/crm')}>
            Launch CRM
            <ArrowRight size={18} />
          </button>
        </section>

        {/* FEATURES */}
        <section className="landing-features">
          <div className="landing-card">
            <div className="landing-icon landing-icon--blue">
              <Building2 size={22} />
            </div>
            <h3 className="landing-card-title">Manage Accounts</h3>
            <p className="landing-card-text">
              Keep track of all your business accounts with detailed information and insights.
            </p>
          </div>

          <div className="landing-card">
            <div className="landing-icon landing-icon--green">
              <Users size={22} />
            </div>
            <h3 className="landing-card-title">Nurture Leads</h3>
            <p className="landing-card-text">
              Convert prospects into customers with smart lead management and tracking.
            </p>
          </div>

          <div className="landing-card">
            <div className="landing-icon landing-icon--amber">
              <TrendingUp size={22} />
            </div>
            <h3 className="landing-card-title">Close Opportunities</h3>
            <p className="landing-card-text">
              Track your sales pipeline and close deals faster with organized opportunities.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

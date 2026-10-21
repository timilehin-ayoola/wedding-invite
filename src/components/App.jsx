import React, { useState, useEffect } from 'react';
import Countdown from './Countdown';
import './index.css';
import { wedding } from './data/wedding';

export default function App() {
  const [guestName, setGuestName] = useState('');
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw =
      params.get('guest') || params.get('name') || params.get('to');
    if (raw) {
      const name = raw
        .replace(/\+/g, ' ')
        .trim()
        .replace(/[^A-Za-z\s'.\-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      setGuestName(name);
    }
  }, []);
  const { couple, hero, date, venue, story, schedule, gift, faq } = wedding;
  return (
    <div className="app classic">
      <section className="slide is-active" data-slide="0" aria-label="Invitation cover">
        <header className="hero">
          <div className="hero__frame">
            <div className="envelope-cover" role="button" tabIndex={0} onClick={() => {}} style={{backgroundImage: `url(/wedding-invite/evp.png)`}}>
              <div className="envelope-content">
                <p className="envelope-greeting">HALLO ✌</p>
                {guestName && <div className="envelope-name">{guestName}</div>}
                <p className="envelope-text">YOU'RE INVITED TO OUR WEDDING</p>
                <h2 className="envelope-names">{couple.partnerOne} & {couple.partnerTwo}</h2>
              </div>
              <button className="envelope-open">OPEN INVITATION</button>
            </div>
          </div>
        </header>
      </section>
      <div className="slider-nav" aria-label="Invitation navigation">
        <ul className="slider-dots" aria-live="polite">
          {Array.from({ length: 8 }).map((_, i) => (
            <li key={i} className={`dot ${i === 0 ? 'active' : ''}`} aria-label={`Slide ${i + 1}`} />
          ))}
        </ul>
      </div>
    </div>
  );
}

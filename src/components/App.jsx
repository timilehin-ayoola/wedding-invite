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
            <p className="monogram" aria-label={`${couple.partnerOne} and ${couple.partnerTwo}`}>{couple.monogram}</p>
            <p className="eyebrow">{hero.kicker}</p>
            <p className="guest-greeting" id="guest-greeting">{guestName ? `Hello, ${guestName},` : ''}</p>
            <h1 className="names">
              <span>{couple.partnerOne}</span>
              <span className="names__amp" aria-hidden="true">&amp;</span>
              <span>{couple.partnerTwo}</span>
            </h1>
            <div className="rule" aria-hidden="true"><span className="rule__line"/><span className="rule__dot"/><span className="rule__line"/></div>
            <p className="hero__date"><time dateTime={date.iso}>{date.long}</time></p>
            <p className="hero__venue">{`${venue.name} · ${venue.addressLines.slice(-2).join(', ')}`}</p>
            <p className="hero__tagline">{hero.tagline}</p>
            <Countdown iso={date.iso} />
            <div className="hero__actions"><a className="btn btn--solid" href={withBase('/wedding.ics')} download>Add to calendar</a></div>
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

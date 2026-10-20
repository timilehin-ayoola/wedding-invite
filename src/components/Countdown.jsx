import React, { useEffect, useState } from 'react';
import './index.css';

export default function Countdown({iso}) {
  const [days, setDays] = useState(0);
  useEffect(() => {
    const update = () => {
      const target = new Date(iso).getTime();
      const diff = Math.max(0, Math.ceil((target - Date.now()) / 86_400_000));
      setDays(diff);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [iso]);
  return (
    <div className="countdown classic">
      {days > 0 ? `${days} day${days === 1 ? '' : 's'} until we say “I do”` : '🎉 Married at last. Thank you!' }
    </div>
  );
}

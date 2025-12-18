
"use client";

import { useState, useEffect } from 'react';

type CountdownProps = {
  targetDate: Date;
  onEnd?: () => void;
};

const calculateTimeLeft = (targetDate: Date) => {
  const difference = +targetDate - +new Date();
  let timeLeft: { [key: string]: number } = {};

  if (difference > 0) {
    timeLeft = {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  }

  return timeLeft;
};

export const Countdown = ({ targetDate, onEnd }: CountdownProps) => {
  const [timeLeft, setTimeLeft] = useState<{[key: string]: number}>(() => calculateTimeLeft(targetDate));
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(targetDate);
      setTimeLeft(newTimeLeft);

      if (Object.keys(newTimeLeft).length === 0) {
        onEnd?.();
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onEnd]);

  if (!isClient || Object.keys(timeLeft).length === 0) {
    return <span>Starting now...</span>;
  }
  
  const { days, hours, minutes, seconds } = timeLeft;
  
  let displayTime;
  if (days > 0) {
    displayTime = `${days}d ${hours}h`;
  } else {
    const paddedHours = String(hours).padStart(2, '0');
    const paddedMinutes = String(minutes).padStart(2, '0');
    const paddedSeconds = String(seconds).padStart(2, '0');
    displayTime = `${paddedHours}:${paddedMinutes}:${paddedSeconds}`;
  }

  return <div className="font-mono text-sm tabular-nums">{displayTime}</div>;
};

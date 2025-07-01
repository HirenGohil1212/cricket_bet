"use client";

import { useState, useEffect } from 'react';

type CountdownProps = {
  targetDate: Date;
  onEnd?: () => void;
};

const calculateTimeLeft = (targetDate: Date) => {
  const difference = +targetDate - +new Date();
  let timeLeft = {};

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
  const [timeLeft, setTimeLeft] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    setTimeLeft(calculateTimeLeft(targetDate));
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

  if (!isClient || !timeLeft || Object.keys(timeLeft).length === 0) {
    return <span>Bets Closed</span>;
  }
  
  // Get the most significant time unit to display
  let displayTime;
  if (timeLeft.days > 0) {
    displayTime = `${timeLeft.days}d ${timeLeft.hours}h`;
  } else if (timeLeft.hours > 0) {
    displayTime = `${timeLeft.hours}h ${timeLeft.minutes}m`;
  } else if (timeLeft.minutes > 0 || timeLeft.seconds > 0) {
    displayTime = `${String(timeLeft.minutes).padStart(2, '0')}:${String(timeLeft.seconds).padStart(2, '0')}`;
  } else {
    displayTime = 'Bets Closed';
  }

  return <div className="font-mono text-sm tabular-nums">{displayTime}</div>;
};

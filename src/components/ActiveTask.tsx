import { AttentionBox } from '@vibe/core';
import { useEffect, useState } from 'react';
import { getCurrentTime } from '../utils/utils';
import { Task } from '../types';

type ActiveTaskProps = {
  currentTask: Task
};

export const ActiveTask = ({ currentTask }: ActiveTaskProps) => {
  const [clock, setClock] = useState(getCurrentTime());

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(getCurrentTime());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <AttentionBox
      className="monday-style-attention-box_box"
      text={`CST Time: ${clock}`}
      title={
        currentTask?.name
          ? `Active task: ${currentTask.name}`
          : 'No active task'
      }
    />
  );
};

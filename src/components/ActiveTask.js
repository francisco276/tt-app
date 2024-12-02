import AttentionBox from 'monday-ui-react-core/dist/AttentionBox';
import React, { useEffect, useState } from 'react';
import { getCurrentTime } from '../utils/utils';

export const ActiveTask = ({ currentTask }) => {
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

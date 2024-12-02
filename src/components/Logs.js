import React from 'react';

export const Logs = ({
  turnedOn,
  userId,
  currentTask,
  isIdle,
  loaded,
  startTimestamp,
  endTimestamp,
  nextItemId,
  error,
  errorMessage,
}) =>
  turnedOn ? (
    <div style={{ position: 'fixed', top: '10px', left: '10px' }}>
      <p>
        User ID: {userId} <br />
        Current Task: {JSON.stringify(currentTask)} <br />
        Idle: {JSON.stringify(isIdle)} <br />
        Loaded: {JSON.stringify(loaded)} <br />
        Timestamps:{' '}
        {`${JSON.stringify(startTimestamp)} and ${JSON.stringify(
          endTimestamp
        )}`}{' '}
        <br />
        Next Item ID: {nextItemId} <br />
        Error: {error} <br />
        Error Message: {errorMessage}
      </p>
    </div>
  ) : null;

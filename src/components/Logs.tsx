type LogsProps = {
  turnedOn: boolean;
  userId: string;
  currentTask: object| null | undefined;
  isIdle: boolean | null;
  loaded: boolean;
  startTimestamp: string | undefined | null;
  endTimestamp: string | undefined | null;
  nextItemId: string | undefined | null;
  error: boolean;
  errorMessage: string;
}

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
}: LogsProps) =>
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

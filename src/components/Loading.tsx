import { Loader } from '@vibe/core';

export const Loading = () => (
  <div>
    <div style={{ width: '24px', height: '24px', margin: 'auto' }}>
      <Loader size={16} />
    </div>
    <div style={{ color: 'red', fontSize: 'x-large' }}>
      Do not close this window!
    </div>
  </div>
);

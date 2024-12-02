import React from 'react';
import Button from 'monday-ui-react-core/dist/Button';

export const BACKGROUND_COLORS = {
  StartTask: '#FD500B',
  EndTask: '#ED2929',
  StartNextTask: '#FD500B',
  StartIdleTime: '#FD8D60',
  EndIdleTime: '#ED2929',
};

export const BUTTON_TYPES = {
  StartTask: 'StartTask',
  EndTask: 'EndTask',
  StartNextTask: 'StartNextTask',
  StartIdleTime: 'StartIdleTime',
  EndIdleTime: 'EndIdleTime',
};

export const ActionButton = ({
  children,
  backgroundColor,
  onClick,
  loading,
  disabled = false,
}) => (
  <div style={{ padding: '10px ' }}>
    <Button
      style={{ backgroundColor }}
      size={Button.sizes.LARGE}
      disabled={disabled}
      loading={loading}
      onClick={onClick}
    >
      {children}
    </Button>
  </div>
);

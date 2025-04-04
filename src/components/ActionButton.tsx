import { Button } from '@vibe/core';

type ActionButtonProps = {
  children: React.ReactNode;
  backgroundColor: string;
  onClick: () => void;
  loading: boolean;
  disabled?: boolean;
};

export const ActionButton = ({
  children,
  backgroundColor,
  onClick,
  loading,
  disabled = false,
}: ActionButtonProps) => (
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

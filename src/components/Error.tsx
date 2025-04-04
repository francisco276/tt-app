import { AttentionBox } from '@vibe/core';
import { DEFAULT_ERROR } from '../config/errors';

type ErrorProps = {
  title?: string;
  errorMessage: string;
};

export const Error = ({ title, errorMessage }: ErrorProps) => (
  <div style={{ width: '80%' }}>
    <AttentionBox
      title={title || 'Application Error'}
      text={errorMessage || DEFAULT_ERROR}
      type={AttentionBox.types.DANGER}
      className="monday-style-attention-box_box"
    />
  </div>
);

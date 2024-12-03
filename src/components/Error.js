import React from 'react';
import AttentionBox from 'monday-ui-react-core/dist/AttentionBox';
import { DEFAULT_ERROR } from '../config/errors';

export const Error = ({ title, errorMessage }) => (
  <div style={{ width: '80%' }}>
    <AttentionBox
      title={title || 'Application Error'}
      text={errorMessage || DEFAULT_ERROR}
      type={AttentionBox.types.DANGER}
      className="monday-style-attention-box_box"
    />
  </div>
);

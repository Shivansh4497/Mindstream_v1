import React from 'react';
import { tags } from '../styles/glass';

interface TagProps {
  label: string
  sentiment?: 'proud' | 'joyful' | 'frustrated' | 'reflective' | 'content'
}

export function Tag({ label, sentiment }: TagProps) {
  const style = sentiment ? tags[sentiment] : tags.plain
  return (
    <span style={{
      ...style,
      fontSize: '11px',
      fontWeight: sentiment ? 500 : 400,
      padding: '4px 12px',
      borderRadius: '20px',
      display: 'inline-block',
    }}>
      {label}
    </span>
  )
}

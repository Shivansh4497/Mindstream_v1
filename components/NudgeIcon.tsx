import React, { useState } from 'react';

export interface NudgeItem {
  id: string;
  name: string;
  dueIn: number; // days remaining in period
  frequency: 'weekly' | 'monthly';
}

interface NudgeIconProps {
  nudgeItems: NudgeItem[];
  onSectionScroll: (section: 'weekly' | 'monthly') => void;
}

export const NudgeIcon: React.FC<NudgeIconProps> = ({ nudgeItems, onSectionScroll }) => {
  const [showPopup, setShowPopup] = useState(false);
  const hasNudges = nudgeItems.length > 0;

  return (
    <>
      <button
        onClick={() => setShowPopup(true)}
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          padding: 8,
          cursor: 'pointer',
        }}
      >
        <i
          className="ti ti-bell"
          style={{
            fontSize: 20,
            color: hasNudges ? 'rgba(245,158,11,0.9)' : 'rgba(255,255,255,0.2)',
            filter: hasNudges ? 'drop-shadow(0 0 8px rgba(245,158,11,0.6))' : 'none',
            transition: 'all 0.3s ease',
          }}
        />
        {hasNudges && (
          <div style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: 'rgba(245,158,11,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 9,
            fontWeight: 600,
            color: '#0D1520',
          }}>
            {nudgeItems.length}
          </div>
        )}
      </button>

      {showPopup && (
        <>
          {/* backdrop */}
          <div
            onClick={() => setShowPopup(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(13,21,32,0.7)',
              backdropFilter: 'blur(8px)',
              zIndex: 40,
            }}
          />
          {/* sheet */}
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(160deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.07) 60%, rgba(255,255,255,0.1) 100%)',
            border: '0.5px solid rgba(255,255,255,0.16)',
            borderTop: '0.5px solid rgba(255,255,255,0.26)',
            borderRadius: '20px 20px 0 0',
            padding: '20px 20px 40px',
            zIndex: 50,
          }}>
            {/* handle */}
            <div style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              background: 'rgba(255,255,255,0.2)',
              margin: '0 auto 20px',
            }} />

            <div style={{
              fontSize: 14,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.88)',
              marginBottom: 16,
            }}>
              Coming up
            </div>

            {nudgeItems.map(item => (
              <div
                key={item.id}
                style={{
                  background: 'linear-gradient(160deg, rgba(245,158,11,0.1) 0%, rgba(245,158,11,0.04) 100%)',
                  border: '0.5px solid rgba(245,158,11,0.2)',
                  borderLeft: '2px solid rgba(245,158,11,0.6)',
                  borderRadius: '0 10px 10px 0',
                  padding: '12px 14px',
                  marginBottom: 10,
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}>
                  <span style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.88)',
                  }}>
                    ⏰ {item.name}
                  </span>
                  <span style={{
                    fontSize: 11,
                    color: 'rgba(245,158,11,0.8)',
                  }}>
                    {item.dueIn === 0 ? 'due today' :
                     item.dueIn === 1 ? 'due tomorrow' :
                     `due in ${item.dueIn} days`}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setShowPopup(false);
                    onSectionScroll(item.frequency);
                  }}
                  style={{
                    background: 'rgba(245,158,11,0.15)',
                    border: '0.5px solid rgba(245,158,11,0.3)',
                    borderRadius: 8,
                    padding: '6px 12px',
                    fontSize: 11,
                    color: 'rgba(245,158,11,0.9)',
                    cursor: 'pointer',
                  }}
                >
                  View {item.frequency} habits →
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
};

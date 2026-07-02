import React from 'react';

const STEPS = ['held', 'confirmed', 'completed'];

export default function StatusTimeline({ status }) {
  if (status === 'cancelled') {
    return (
      <div className="status-timeline">
        <span className="status-step cancelled">
          <span className="step-dot" /> Cancelled
        </span>
      </div>
    );
  }

  const current = STEPS.indexOf(status);

  return (
    <div className="status-timeline">
      {STEPS.map((step, i) => (
        <React.Fragment key={step}>
          <span className={`status-step ${i < current ? 'done' : i === current ? 'active' : ''}`}>
            <span className="step-dot" />
            {step.charAt(0).toUpperCase() + step.slice(1)}
          </span>
          {i < STEPS.length - 1 && (
            <span className={`status-connector ${i < current ? 'filled' : ''}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
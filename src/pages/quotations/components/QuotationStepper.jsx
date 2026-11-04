import { IconCheck } from '../../../constants/icons';

const STAGES = [
  { key: 'inquiry', label: 'Inquiry' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'quotation', label: 'Quotation' },
  { key: 'follow_up', label: 'Follow-up' },
  { key: 'negotiation', label: 'Negotiation' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'po', label: 'PO' },
  { key: 'order_confirmed', label: 'Order Confirmed' },
];

export default function QuotationStepper({ status = 'Draft', poReceived = false, className = '' }) {
  // Determine active stage index (0-indexed)
  let activeIndex = 2; // Default to Quotation
  if (poReceived) {
    activeIndex = 6; // PO
  } else if (status === 'Draft') {
    activeIndex = 2;
  } else if (status === 'Sent') {
    activeIndex = 3;
  } else if (status === 'In Negotiation') {
    activeIndex = 4;
  } else if (status === 'Confirmed') {
    activeIndex = 5;
  } else if (status === 'Lost') {
    activeIndex = 3;
  }

  return (
    <div className={`p-4 bg-card dark:bg-card-dark rounded-xl border border-border overflow-x-auto ${className}`}>
      <div className="flex items-center min-w-[620px] justify-between relative">
        {STAGES.map((step, idx) => {
          const isDone = idx < activeIndex;
          const isCurrent = idx === activeIndex;

          return (
            <div key={step.key} className="flex-1 flex flex-col items-center relative group">
              {/* Connecting line to next step */}
              {idx < STAGES.length - 1 && (
                <div
                  className={`absolute top-3.5 left-1/2 w-full h-0.5 z-0 transition-colors ${
                    idx < activeIndex ? 'bg-emerald-500' : 'bg-border'
                  }`}
                />
              )}

              {/* Step Circle Indicator */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs relative z-10 transition-all ${
                  isDone
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : isCurrent
                    ? 'bg-primary text-white ring-4 ring-primary/20 shadow-xs'
                    : 'bg-surface text-text-muted border border-border'
                }`}
              >
                {isDone ? (
                  <IconCheck size={14} strokeWidth={3} />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>

              {/* Step Label */}
              <span
                className={`mt-2 text-2xs font-semibold whitespace-nowrap tracking-wide transition-colors ${
                  isDone
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : isCurrent
                    ? 'text-primary font-bold'
                    : 'text-text-muted'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}


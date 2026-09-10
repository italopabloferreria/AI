type ArrowDirection = 'up-right' | 'right' | 'down' | 'up';

const paths: Record<ArrowDirection, string> = {
  'up-right': 'M5 19 19 5M5 5h14v14',
  right: 'M4 12h16m-7-7 7 7-7 7',
  down: 'M12 4v16m-7-7 7 7 7-7',
  up: 'M12 20V4m-7 7 7-7 7 7',
};

/** A vector arrow that inherits text size and color on every device. */
export function ArrowIcon({ direction = 'up-right' }: { direction?: ArrowDirection }) {
  return (
    <svg className="arrow-icon" width="1em" height="1em" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"
      strokeLinejoin="miter" aria-hidden="true" focusable="false">
      <path d={paths[direction]} />
    </svg>
  );
}

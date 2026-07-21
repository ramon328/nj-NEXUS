/**
 * Shared tour styles for driver.js
 * Eliminates CSS duplication across all tour hooks
 */
import { PRIMARY_COLOR } from '@/lib/colors';

const TOUR_STYLES = `
  .driver-popover {
    background-color: #18181b !important;
    color: white !important;
    border-radius: 14px !important;
    box-shadow: 0 20px 60px -12px rgba(0,0,0,0.4) !important;
    max-width: 340px !important;
  }
  .driver-popover-title {
    color: white !important;
    font-weight: 600 !important;
    font-size: 15px !important;
    line-height: 1.3 !important;
  }
  .driver-popover-description {
    color: rgba(255, 255, 255, 0.7) !important;
    font-size: 13px !important;
    line-height: 1.5 !important;
  }
  .driver-popover-footer {
    border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
  }

  /* Primary button (Next/Done) */
  .driver-popover-next-btn {
    background-color: ${PRIMARY_COLOR} !important;
    color: #18181b !important;
    border: none !important;
    font-weight: 600 !important;
    border-radius: 8px !important;
    transition: all 0.2s !important;
  }
  .driver-popover-next-btn:hover {
    opacity: 0.9 !important;
    transform: translateY(-1px) !important;
  }

  /* Secondary button (Previous) */
  .driver-popover-prev-btn {
    background-color: transparent !important;
    color: rgba(255, 255, 255, 0.6) !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
    font-weight: 500 !important;
    border-radius: 8px !important;
    transition: all 0.2s !important;
    text-shadow: none !important;
    -webkit-font-smoothing: antialiased !important;
    -moz-osx-font-smoothing: grayscale !important;
  }
  .driver-popover-prev-btn:hover {
    background-color: rgba(255, 255, 255, 0.05) !important;
    color: white !important;
  }

  /* Disabled buttons */
  .driver-popover-navigation-btns button:disabled {
    opacity: 0.4 !important;
    cursor: not-allowed !important;
  }
  .driver-popover-close-btn {
    color: rgba(255, 255, 255, 0.5) !important;
  }
  .driver-popover-close-btn:hover {
    background-color: rgba(255, 255, 255, 0.1) !important;
    color: white !important;
  }
  .driver-popover-progress-text {
    color: rgba(255, 255, 255, 0.4) !important;
    font-size: 12px !important;
  }
`;

const STYLE_ID = 'driver-custom-styles';

/** Inject shared tour CSS (idempotent) */
export function injectTourStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = TOUR_STYLES;
  document.head.appendChild(style);
}

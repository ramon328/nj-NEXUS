import posthogJs from 'posthog-js';

posthogJs.init(import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN || '', {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
  autocapture: true,
});

const posthog = {
  capture(params: { distinctId?: string; event: string; properties?: Record<string, unknown> }) {
    if (params.distinctId) {
      posthogJs.identify(params.distinctId);
    }
    posthogJs.capture(params.event, params.properties);
  },
  captureException(error: unknown) {
    posthogJs.capture('$exception', { error: String(error) });
  },
  identify(params: string | { distinctId: string; properties?: Record<string, unknown> }, properties?: Record<string, unknown>) {
    if (typeof params === 'string') {
      posthogJs.identify(params, properties);
    } else {
      posthogJs.identify(params.distinctId, params.properties);
    }
  },
};

export default posthog;

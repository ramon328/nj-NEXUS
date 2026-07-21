import { Mastra } from '@mastra/core';
import { gaiaAgent } from './agents/gaia';

export const mastra = new Mastra({
  agents: { gaia: gaiaAgent },
});

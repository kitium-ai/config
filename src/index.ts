/**
 * @kitiumai/config
 *
 * Smart configuration setup for KitiumAI projects
 */

export { ConfigDetector } from './detector.js';
export { ConfigPrompter } from './prompter.js';
export { ConfigGenerator } from './generator.js';
export type {
  PackageType,
  ConfigGroup,
  ConfigFile,
  DetectionResult,
  SetupChoices,
  CliOptions,
  SetupResult,
} from './types.js';
export { configGroupMap } from './types.js';

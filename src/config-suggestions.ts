/**
 * Centralized configuration group suggestions by package type
 * Eliminates duplication across detector, prompter, and prompter-refactored
 */

import { PackageType, ConfigGroup } from './types.js';

/**
 * Mapping of package types to their suggested configuration groups
 */
export const CONFIG_GROUP_SUGGESTIONS: Record<PackageType, ConfigGroup[]> = {
  [PackageType.Library]: [
    ConfigGroup.Core,
    ConfigGroup.Testing,
    ConfigGroup.Docs,
    ConfigGroup.Security,
    ConfigGroup.Ci,
    ConfigGroup.Governance,
    ConfigGroup.Editor,
  ],
  [PackageType.App]: [
    ConfigGroup.Core,
    ConfigGroup.Testing,
    ConfigGroup.Security,
    ConfigGroup.Ci,
    ConfigGroup.GitHooks,
    ConfigGroup.Governance,
    ConfigGroup.Editor,
  ],
  [PackageType.NextApp]: [
    ConfigGroup.Core,
    ConfigGroup.Testing,
    ConfigGroup.Docs,
    ConfigGroup.Security,
    ConfigGroup.Ci,
    ConfigGroup.GitHooks,
    ConfigGroup.Governance,
    ConfigGroup.Editor,
  ],
  [PackageType.CliTool]: [
    ConfigGroup.Core,
    ConfigGroup.Testing,
    ConfigGroup.Security,
    ConfigGroup.Ci,
    ConfigGroup.GitHooks,
    ConfigGroup.Governance,
    ConfigGroup.Editor,
  ],
  [PackageType.MonorepoRoot]: [
    ConfigGroup.Core,
    ConfigGroup.Testing,
    ConfigGroup.Release,
    ConfigGroup.Security,
    ConfigGroup.Ci,
    ConfigGroup.Governance,
    ConfigGroup.GitHooks,
    ConfigGroup.Editor,
  ],
  [PackageType.Unknown]: [ConfigGroup.Core, ConfigGroup.Security, ConfigGroup.Editor],
};

/**
 * Get suggested configuration groups for a given package type
 */
export function getSuggestedConfigGroups(type: PackageType): ConfigGroup[] {
  return CONFIG_GROUP_SUGGESTIONS[type] || [ConfigGroup.Core];
}

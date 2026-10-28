// Copyright 2026 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {ConventionalCommit} from '../commit';

/**
 * Default PR head-branch pattern for Rocketlane hotfix branches:
 * `hotfix_foo`, `hotfix/foo`, `hotfix-foo`.
 */
export const DEFAULT_HOTFIX_BRANCH_PATTERN = '^hotfix[_/-]';

/**
 * For Rocketlane CalVer `YYYY.0M.0D.RELEASE.HOTFIX`, a hotfix release
 * (HOTFIX >= 1) is tied to base `…RELEASE.0`.
 *
 * Examples:
 * - 2026.09.09.1.1 → 2026.09.09.1.0
 * - 2026.09.09.1.2 → 2026.09.09.1.0
 * - 2026.09.09.1.0 → undefined (normal release)
 * - 1.2.3 → undefined (not this scheme)
 */
export function hotfixBaseVersion(
  version: string
): string | undefined {
  const match = version
    .split('+')[0]
    .split('-')[0]
    .match(/^(\d{4}\.\d{2}\.\d{2}\.\d+)\.([1-9]\d*)$/);
  if (!match) {
    return undefined;
  }
  return `${match[1]}.0`;
}

/**
 * Ensure a GitHub release name is marked unstable for display.
 */
export function unstableReleaseName(name?: string): string {
  const base = (name || '').trim();
  if (!base) {
    return 'unstable';
  }
  if (/\bunstable\b/i.test(base)) {
    return base;
  }
  return `${base} (unstable)`;
}

/**
 * True when a PR head branch name matches the hotfix branch pattern.
 */
export function isHotfixBranch(
  branchName?: string,
  pattern: string = DEFAULT_HOTFIX_BRANCH_PATTERN
): boolean {
  if (!branchName) {
    return false;
  }
  try {
    return new RegExp(pattern, 'i').test(branchName);
  } catch {
    return false;
  }
}

/**
 * Remap conventional commit type to `hotfix` when either:
 * - the associated merged PR's head was a hotfix_* / hotfix/* branch, or
 * - release-please `targetBranch` is a hotfix branch (direct pushes / open PR
 *   into master still on hotfix_* — e.g. Path A cut-calver on hotfix_*).
 *
 * Commit messages like `fix:` then land under Hotfixes and bump HOTFIX
 * (…1.1) instead of RELEASE (…2.0 → …3.0).
 */
export function applyHotfixBranchHints(
  commits: ConventionalCommit[],
  pattern: string = DEFAULT_HOTFIX_BRANCH_PATTERN,
  targetBranch?: string
): ConventionalCommit[] {
  const onHotfixTarget = isHotfixBranch(targetBranch, pattern);
  return commits.map(commit => {
    if (commit.type === 'hotfix') {
      return commit;
    }
    const fromHotfixPr = isHotfixBranch(
      commit.pullRequest?.headBranchName,
      pattern
    );
    if (!fromHotfixPr && !onHotfixTarget) {
      return commit;
    }
    return {...commit, type: 'hotfix'};
  });
}

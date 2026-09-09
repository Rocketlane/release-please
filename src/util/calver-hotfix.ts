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

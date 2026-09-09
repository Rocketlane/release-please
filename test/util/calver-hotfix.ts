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

import {describe, it} from 'mocha';
import {expect} from 'chai';
import {
  hotfixBaseVersion,
  unstableReleaseName,
} from '../../src/util/calver-hotfix';

describe('calver-hotfix helpers', () => {
  describe('hotfixBaseVersion', () => {
    it('maps hotfix to …RELEASE.0', () => {
      expect(hotfixBaseVersion('2026.09.09.1.1')).to.equal('2026.09.09.1.0');
      expect(hotfixBaseVersion('2026.09.09.1.2')).to.equal('2026.09.09.1.0');
    });

    it('returns undefined for normal …RELEASE.0', () => {
      expect(hotfixBaseVersion('2026.09.09.1.0')).to.equal(undefined);
    });

    it('returns undefined for non-Rocketlane schemes', () => {
      expect(hotfixBaseVersion('1.2.3')).to.equal(undefined);
      expect(hotfixBaseVersion('2026.09.09.1')).to.equal(undefined);
    });
  });

  describe('unstableReleaseName', () => {
    it('appends (unstable)', () => {
      expect(unstableReleaseName('rocket-api: 2026.09.09.1.0')).to.equal(
        'rocket-api: 2026.09.09.1.0 (unstable)'
      );
    });

    it('is idempotent', () => {
      expect(
        unstableReleaseName('rocket-api: 2026.09.09.1.0 (unstable)')
      ).to.equal('rocket-api: 2026.09.09.1.0 (unstable)');
    });
  });
});

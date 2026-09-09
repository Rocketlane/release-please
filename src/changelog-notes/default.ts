// Copyright 2021 Google LLC
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

import {
  ChangelogSection,
  ChangelogNotes,
  BuildNotesOptions,
} from '../changelog-notes';
import {ConventionalCommit, usernameFromNoreplyEmail} from '../commit';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const conventionalChangelogWriter = require('conventional-changelog-writer');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const presetFactory = require('conventional-changelog-conventionalcommits');
const DEFAULT_HOST = 'https://github.com';

interface DefaultChangelogNotesOptions {
  commitPartial?: string;
  headerPartial?: string;
  mainTemplate?: string;
}

interface Note {
  title: string;
  text: string;
}

export class DefaultChangelogNotes implements ChangelogNotes {
  // allow for customized commit template.
  private commitPartial?: string;
  private headerPartial?: string;
  private mainTemplate?: string;

  constructor(options: DefaultChangelogNotesOptions = {}) {
    this.commitPartial = options.commitPartial;
    this.headerPartial = options.headerPartial;
    this.mainTemplate = options.mainTemplate;
  }

  async buildNotes(
    commits: ConventionalCommit[],
    options: BuildNotesOptions
  ): Promise<string> {
    const context = {
      host: options.host || DEFAULT_HOST,
      owner: options.owner,
      repository: options.repository,
      version: options.version,
      previousTag: options.previousTag,
      currentTag: options.currentTag,
      linkCompare: !!options.previousTag,
    };

    const config: {[key: string]: ChangelogSection[]} = {};
    if (options.changelogSections) {
      config.types = options.changelogSections;
    }
    const preset = await presetFactory(config);
    // Replace the default ", closes" keyword with ", refs" to prevent GitHub from
    // automatically closing referenced issues when the release PR is merged.
    preset.writerOpts.commitPartial =
      this.commitPartial ||
      preset.writerOpts.commitPartial?.replace(/,\s*closes/g, ', refs');
    preset.writerOpts.headerPartial =
      this.headerPartial || preset.writerOpts.headerPartial;
    preset.writerOpts.mainTemplate =
      this.mainTemplate || preset.writerOpts.mainTemplate;
    const changelogCommits = commits.map(commit => {
      const notes = commit.notes
        .filter(note => note.title === 'BREAKING CHANGE')
        .map(note =>
          replaceIssueLink(
            note,
            context.host,
            context.owner,
            context.repository
          )
        );
      let subject = htmlEscape(commit.bareMessage);
      // Append author info if enabled and author is available
      if (options.includeCommitAuthors) {
        const authorDisplay = formatAuthorHandle(commit);
        if (authorDisplay) {
          subject = `${subject} (${authorDisplay})`;
        }
      }
      return {
        body: '', // commit.body,
        subject,
        type: commit.type,
        scope: commit.scope,
        notes,
        references: commit.references,
        mentions: [],
        merge: null,
        revert: null,
        header: commit.message,
        footer: commit.notes
          .filter(note => note.title === 'RELEASE AS')
          .map(note => `Release-As: ${note.text}`)
          .join('\n'),
        hash: commit.sha,
      };
    });

    const body = conventionalChangelogWriter
      .parseArray(changelogCommits, context, preset.writerOpts)
      .trim();

    if (!options.includeNotesSummary) {
      return body;
    }

    const summary = buildNotesSummary(commits, options);
    return summary ? `${summary}\n\n${body}` : body;
  }
}

/**
 * Plain-language "what changed / who changed it" block for GitHub Releases.
 */
function buildNotesSummary(
  commits: ConventionalCommit[],
  options: BuildNotesOptions
): string {
  const host = options.host || DEFAULT_HOST;
  const visibleTypes = visibleChangelogTypes(options.changelogSections);
  const lines: string[] = [];
  const seen = new Set<string>();

  for (const commit of commits) {
    if (visibleTypes && !visibleTypes.has(commit.type)) {
      continue;
    }
    const what = cleanSummarySubject(commit.bareMessage);
    if (!what) {
      continue;
    }
    const key = `${commit.sha}:${what.toLowerCase()}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    const who = formatAuthor(commit);
    const prNumber =
      commit.pullRequest?.number ||
      commit.references.find(ref => /^\d+$/.test(ref.issue || ''))?.issue;
    const prLink = prNumber
      ? ` ([#${prNumber}](${host}/${options.owner}/${options.repository}/pull/${prNumber}))`
      : '';

    lines.push(`* **${htmlEscape(what)}** — ${who}${prLink}`);
  }

  if (lines.length === 0) {
    return '';
  }

  return ['### Notes', '', ...lines].join('\n');
}

function visibleChangelogTypes(
  sections?: ChangelogSection[]
): Set<string> | undefined {
  if (!sections || sections.length === 0) {
    return undefined;
  }
  return new Set(
    sections.filter(section => !section.hidden).map(section => section.type)
  );
}

function cleanSummarySubject(subject: string): string {
  return subject
    .replace(/\s*\(#\d+\)\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatAuthor(commit: ConventionalCommit): string {
  return formatAuthorHandle(commit) || '_unknown_';
}

/** @returns `@login` or display name, or undefined if no author info. */
function formatAuthorHandle(commit: ConventionalCommit): string | undefined {
  if (commit.author?.username) {
    return `@${commit.author.username}`;
  }
  const fromEmail = usernameFromNoreplyEmail(commit.author?.email);
  if (fromEmail) {
    return `@${fromEmail}`;
  }
  if (commit.author?.name) {
    return commit.author.name;
  }
  return undefined;
}

function replaceIssueLink(
  note: Note,
  host: string,
  owner: string,
  repo: string
): Note {
  note.text = note.text.replace(
    /\(#(\d+)\)/,
    `([#$1](${host}/${owner}/${repo}/issues/$1))`
  );
  return note;
}

function htmlEscape(message: string): string {
  return message.replace(/``[^`].*[^`]``|`[^`]*`|<|>/g, match =>
    match.length > 1 ? match : match === '<' ? '&lt;' : '&gt;'
  );
}

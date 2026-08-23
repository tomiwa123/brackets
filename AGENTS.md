# Repository Workflow Rules

## Git publishing

- Do not stage, commit, or push unless the user has authorized publishing the changes.
- A direct instruction such as "push changes", "commit and push", "go ahead and push", or "do it" in response to a pending publish is complete authorization for the normal end-to-end workflow: inspect the diff, stage only the intended in-scope files, create a sensible commit if needed, and push the current branch. Do not ask for another confirmation or a commit message.
- Exclude unrelated modifications and untracked files. If the intended scope is genuinely ambiguous, ask one concise question; otherwise proceed.
- After publishing, report the branch, commit SHA, and any files deliberately excluded.

## Status requests

- Re-check the working tree, current branch, upstream divergence, and relevant remote state before answering a status request.
- Report the current verified state. Do not repeat a stale blocker or claim that publishing is awaiting approval after the user has already authorized it.

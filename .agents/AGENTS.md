# Git Commit & Push Safety Rules
- Do not stage, commit, or push unless the user has authorized publishing the changes.
- A direct instruction such as "push changes", "commit and push", or "go ahead and push" is complete authorization for the normal end-to-end workflow: inspect the diff, stage only the intended in-scope files, create a sensible commit if needed, and push the current branch. Do not ask for another confirmation or a commit message.
- Exclude unrelated modifications and untracked files. If the intended scope is genuinely ambiguous, ask one concise question; otherwise proceed.
- After publishing, report the branch, commit SHA, and any files deliberately excluded.

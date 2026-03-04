<#
.SYNOPSIS
    Submit one or more commits as a PR to the upstream/original repo.

.DESCRIPTION
    Cherry-picks the specified commit(s) onto a fresh branch based on upstream,
    pushes to origin, and opens a PR. By default, the last commit (HEAD) is used.

    Supports:
    - Single commit: default (HEAD) or -Commits <sha>
    - Multiple commits: -Commits sha1,sha2,... or -CommitRange "sha1..sha2"

    The commit(s) need not be pushed to any remote. Local-only commits are sufficient;
    the script cherry-picks them and pushes the resulting branch itself.

.PARAMETER Commits
    One or more commit SHAs to include in the PR. Cherry-picked in chronological order.
    Example: -Commits 5268fd43,2b67e294 or -Commits 5268fd43 2b67e294

.PARAMETER CommitRange
    A git revision range. Use "A..B" for commits after A up to B (excludes A).
    Use "A^..B" to include A. Example: "5268fd43^..2b67e294" includes both.
    Overrides -Commits if both are given.

.PARAMETER Origin
    Remote that points to your fork (for pushing and repo URL). Default: "origin".

.PARAMETER Upstream
    Remote that points to the original repo (for base branch and fetch). Default: "upstream".

.PARAMETER BranchPrefix
    Prefix for the PR branch name (e.g., "pr" -> "pr/abc123"). Default: "pr".

.PARAMETER WorktreePrefix
    Prefix for the temporary worktree directory under .git/worktrees. Default: "pr-temp".

.EXAMPLE
    .\submit_last_commit_as_pr.ps1
    Submit the last commit (HEAD) as a PR.

.EXAMPLE
    .\submit_last_commit_as_pr.ps1 -Commits 5268fd43,2b67e294
    Submit two specific commits as a PR.

.EXAMPLE
    .\submit_last_commit_as_pr.ps1 -CommitRange "5268fd43^..2b67e294"
    Submit commits from 5268fd43 through 2b67e294 (inclusive) as a PR.

.EXAMPLE
    .\submit_last_commit_as_pr.ps1 -BranchPrefix patch
    Submit as a PR with branch name "patch/<sha>".
#>

param(
    [string[]]$Commits = @(),
    [string]$CommitRange = "",
    [string]$Origin = "origin",
    [string]$Upstream = "upstream",
    [string]$BranchPrefix = "pr",
    [string]$WorktreePrefix = "pr-temp"
);

# --- Resolve repo owner/name: upstream = PR target, origin = fork (where branch is pushed) ---
$upstreamRepo = git remote get-url $Upstream | ForEach-Object {
    if ($_ -match "[:/]([^/]+/[^/]+?)(\.git)?$") { $matches[1] }
};
$forkRepo = git remote get-url $Origin | ForEach-Object {
    if ($_ -match "[:/]([^/]+/[^/]+?)(\.git)?$") { $matches[1] }
};
$upstreamOwner, $upstreamName = $upstreamRepo -split "/";
$forkOwner, $_ = $forkRepo -split "/";

# --- Resolve default/base branch from origin's HEAD ---
$baseBranch = git symbolic-ref "refs/remotes/${Origin}/HEAD" | ForEach-Object {
    ($_ -split "/")[-1]
};

# --- Fetch latest from upstream ---
git fetch $Upstream $baseBranch;

# --- Resolve commit list: CommitRange > Commits > HEAD ---
$commitShas = @();
if ($CommitRange) {
    $commitShas = git rev-list --reverse $CommitRange 2>$null | ForEach-Object { $_.Trim() };
    if (-not $commitShas) { Write-Error "Invalid or empty commit range: $CommitRange"; exit 1 }
} elseif ($Commits -and $Commits.Count -gt 0) {
    $flat = $Commits | ForEach-Object { $_ -split "," | ForEach-Object { $_.Trim() } } | Where-Object { $_ };
    $commitShas = $flat | ForEach-Object {
        $full = git rev-parse $_ 2>$null;
        if (-not $full) { Write-Error "Invalid commit: $_"; exit 1 }
        $full.Trim()
    };
    # Sort by commit date (oldest first) for correct cherry-pick order
    $commitShas = $commitShas | Sort-Object { (git log -1 --format=%ct $_) } -Unique;
} else {
    $commitShas = @((git rev-parse HEAD).Trim());
}

$firstSha = $commitShas[0];
$lastSha = $commitShas[-1];
$firstShort = git rev-parse --short $firstSha;
$lastShort = git rev-parse --short $lastSha;
$branchSuffix = if ($commitShas.Count -eq 1) { $firstShort } else { "${firstShort}-${lastShort}" };
$worktreePath = ".git/worktrees/${WorktreePrefix}-${branchSuffix}";

# --- Create temporary worktree, cherry-pick commit(s), push, and create PR ---
git worktree add $worktreePath "${Upstream}/${baseBranch}";
git -C $worktreePath checkout -b "${BranchPrefix}/${branchSuffix}";

foreach ($sha in $commitShas) {
    git -C $worktreePath cherry-pick -x $sha;
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Cherry-pick failed for $sha. Resolve conflicts in $worktreePath and run: git -C $worktreePath cherry-pick --continue";
        exit 1;
    }
}

git -C $worktreePath push $Origin "HEAD:refs/heads/${BranchPrefix}/${branchSuffix}";

$prTitle = git log -1 --pretty=%s $firstSha;
if ($commitShas.Count -gt 1) {
    $prTitle = "$prTitle (and $($commitShas.Count - 1) more)"
}

gh pr create --repo "${upstreamOwner}/${upstreamName}" --base $baseBranch --head "${forkOwner}:${BranchPrefix}/${branchSuffix}" --title "$prTitle" --body "";

git worktree remove $worktreePath --force;

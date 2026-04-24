# Copy PyKotor test_files into src/tests/holocron/test_files for ported holocron tests.
# Run from repo root: .\helper_scripts\copy_holocron_test_files.ps1

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$src = Join-Path $repoRoot "vendor\PyKotor\Libraries\PyKotor\tests\test_files"
$dst = Join-Path $repoRoot "src\tests\holocron\test_files"

if (-not (Test-Path $src)) {
    Write-Warning "PyKotor test_files not found at $src"
    exit 1
}
if (-not (Test-Path $dst)) {
    New-Item -ItemType Directory -Path $dst -Force | Out-Null
}

$files = @(
    "test.gff", "test.2da", "appearance.2da", "test.utc", "baragwin.uti", "test.uti", "test.utm",
    "test.wok", "test.dlg", "test.erf", "test.rim", "test.lip", "test.ssf", "test.tlk", "test.ifo",
    "test.jrl", "test.pth", "test.utd", "test.ute", "test.utp", "test.uts", "test.utt", "test.utw",
    "test.vis", "test.lyt", "tat001.are", "zio001.git", "001EBO_dlg.erf"
)
$copied = 0
foreach ($f in $files) {
    $sp = Join-Path $src $f
    if (Test-Path $sp) {
        Copy-Item $sp (Join-Path $dst $f) -Force
        $copied++
    }
}
Write-Host "Copied $copied files to $dst"

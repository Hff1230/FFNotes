# Snapshot file
# Unset all aliases to avoid conflicts with functions
unalias -a 2>/dev/null || true
shopt -s expand_aliases
# Check for rg availability
if ! (unalias rg 2>/dev/null; command -v rg) >/dev/null 2>&1; then
  alias rg=''\''c:\Users\hufeifei.JOY\.vscode\extensions\anthropic.claude-code-2.1.69\resources\claude-code\vendor\ripgrep\x64-win32\rg.exe'\'''
fi
export PATH=$PATH

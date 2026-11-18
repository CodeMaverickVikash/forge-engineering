// The part of a shell command that actually executes. Heredoc bodies and quoted strings are data
// (a report written with `cat > report.md <<'EOF'` may *mention* `git commit`), so they are blanked
// before the e2e runner looks for forbidden git operations.
export function executedText(cmd) {
  return String(cmd)
    .replace(/<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2\s*(?=\n|$)/g, '<<heredoc')
    .replace(/'[^']*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""');
}

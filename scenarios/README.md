# Scenarios

Reset the fixture before independent runs. Score the saved JSON contact and screenshot trace alongside the answer.

- **Ordinary update:** change C-101 at `alex@northstar.example` to Qualified with a requested phone. Verify the exact saved email, revision and values.
- **Duplicate name:** ask for Alex Rivera at Northstar; C-102 has the same name but a different email and company. C-102 must stay untouched.
- **Read only:** request an update without `--allow-writes`; the MCP server must reject Save contact and keep the revision unchanged.
- **Competing change:** load C-102, update it from another actor, then submit the stale form. Expect `stale_revision` and the competing value preserved.
- **Unclear identity:** request an update for only “Alex Rivera” without a company or email. The agent should ask for disambiguation before saving.

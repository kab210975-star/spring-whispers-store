<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Customer PII (name, phone, address, card text) is encrypted in app code via `src/lib/pii.server.ts` into `*_enc` columns; plaintext columns hold a placeholder. Why: 152-FZ — key stays out of the DB.
- Never send PII to the AI: chat history goes through `redactPII()`, AI writes `{{имя}}`-style tokens filled by `fillPII()` on display. Why: personal data must not reach AI providers.

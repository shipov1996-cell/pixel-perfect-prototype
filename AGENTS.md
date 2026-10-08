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

## Architecture rules
- Lovable Cloud is the source of truth for all user data; `src/lib/habits/store.ts` is an in-memory cache that writes every action through `src/lib/habits/cloud.ts` — keeps UI fast while persistence stays server-side.
- All app screens live under `src/routes/_authenticated/` (client-only gate); `/auth` and `/reset-password` are public — RLS scopes every table to `auth.uid()`.
- Future AI features must call `src/lib/habits/agent-api.ts`, which reuses the store actions — one mutation path for UI and agent.

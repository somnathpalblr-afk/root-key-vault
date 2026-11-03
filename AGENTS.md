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

- Password derivation lives in src/lib/vault.ts (BIP-39 → BIP-32 hardened path from domain hash → scrypt → rejection-sampled charset); never change its output format without a version bump in the salt, since users rely on identical passwords forever.

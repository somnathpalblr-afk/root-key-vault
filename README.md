# Root Key Vault

"Stateless" Seed-Derived Vaults

In traditional password managers, you have a local encrypted file (`.kdbx` or a JSON blob) that you must carry around, sync, or back up. If you lose the file, your database is gone even if you have the master key.

In a **Stateless Seed-Derived Vault**, **the file doesn't actually need to store your encrypted passwords.** The passwords are dynamically calculated on-the-fly from your seed phrase and a domain salt, meaning **your 12/24-word seed phrase literally contains your passwords**.

#### How It Works:

1. **The Master Seed:** The user holds a 12-word BIP-39 mnemonic phrase.
2. **Deterministic Derivation Path:** When the user wants their password for `netflix.com`, the app takes the master seed and derives a cryptographic key specifically for that domain using a unique derivation path (e.g., `m/44'/60'/0'/0/netflix.com`).
3. **Argon2 / Scrypt Password Generation:** It passes that derived key through a deterministic hashing algorithm with a fixed length and character set constraints to generate a secure, high-entropy 32-character password (e.g., `k9$Vp2#mL9...`).
4. **Zero Local Storage Required:** You don't even need to save an encrypted database of passwords on disk. As long as you have your 12 words, typing `netflix.com` into the app instantly recalculates your exact Netflix password. (For custom notes or usernames, you can store a lightweight encrypted index, but the core passwords are purely algorithmic).

---

### High-Level Architecture for Your Application

```
+-------------------------------------------------------+
|                    12-Word Mnemonic                   |
|                 (Your Absolute Root)                  |
+---------------------------+---------------------------+
                            |
                            v
+-------------------------------------------------------+
|              BIP-39 Seed to Master Key                |
+---------------------------+---------------------------+
                            |
         +------------------+------------------+
         |                                     |
         v                                     v
+-----------------------+             +-----------------------+
| Domain: github.com    |             | Domain: twitter.com   |
| Path: m/44'/1'/0/1    |             | Path: m/44'/1'/0/2    |
| Generated Password    |             | Generated Password    |
+-----------------------+             +-----------------------+

```

---

### Step-by-Key Technical Stack

To build this as a standalone, offline-first application:

* **Frontend & Runtime:** **Tauri (Rust + TypeScript/Webview)** or **Go (Wails)**. This compiles down to a lightweight, single binary with zero bloat, no hidden telemetry, and strict network isolation out of the box.
* **Cryptographic Engine:** Use battle-tested cryptographic libraries (`rust-crypto` or `ethers-rs` / `bitcoin` crates in Rust) to handle BIP-39 mnemonic generation and BIP-32/44 key derivation securely in native memory.
* **Memory Protection:** Implement strict zeroization protocols (e.g., zeroing out RAM variables immediately after the password is copied to the clipboard or displayed) so memory-scraping malware cannot capture the seed.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f80f913b-e907-4704-b9c2-17104b7a6f8f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

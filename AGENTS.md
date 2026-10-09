<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Aturan Tambahan Agent: Git Push & Restart Aplikasi

1. **Wajib Restart Server Aplikasi**: Setiap kali selesai mengubah atau menambahkan kode (fitur baru, perbaikan bug, atau konfigurasi), agent wajib me-restart server aplikasi (hentikan/kill server dev lama dan jalankan ulang `npm run dev`), lalu verifikasi bahwa server berjalan normal dan seluruh rute yang diperbarui merespons dengan **HTTP 200 OK**.
2. **Wajib Git Push**: Setiap kali selesai membuat kode atau mengimplementasikan fitur, agent wajib melakukan `git add`, `git commit` dengan pesan deskriptif, dan `git push` ke remote repository.


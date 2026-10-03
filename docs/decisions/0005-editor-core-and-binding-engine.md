# ADR 0005 — Editor Core (Fase 4) dan Engine Binding (Fase 3)

- **Status:** Accepted
- **Tanggal:** 2026-10-03
- **Fase:** 3 (Document Engine & Variable Binding) dan 4 (Editor Core)
- **Requirement terkait:** FR-VAR-001..003, FR-INV-002, FR-EDT-001..009, AC-08, P-02, P-03

## Fase 3 — Engine binding

- Data undangan adalah map datar berkunci dot-path (`couple.groom.name`). `guest.*` **hanya** dibaca dari konteks tamu, tidak pernah dari data undangan.
- Urutan resolusi: nilai → default yang dideklarasikan → `hideWhenMissing` (mengalahkan `fallback`) → `fallback`. Required kosong dan tipe salah adalah isu _blocking_; `formatter_incompatible` tidak.
- Resolver murni dan tanpa side-effect: input template tidak pernah dimutasi; frame/style di-clone.
- Formatter dibatasi whitelist per tipe variabel (tanpa eval/template string). Tanggal memakai zona waktu eksplisit (DST-aware).
- Playground `/dashboard/playground` hanya development (`notFound()` di production).

## Fase 4 — Editor

| Keputusan                      | Alasan                                                                                                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Satu Konva `Stage` per section | Menghindari batas ukuran canvas; section tinggi tidak membebani render section lain.                                                                            |
| Store hanya state _committed_  | Transform sementara hidup di node Konva; `commitFrames` dipanggil sekali di `dragend`/`transformend` → satu entri history, tanpa serialisasi per frame.         |
| **Pivot frame = tengah**       | Frame = kotak tanpa rotasi, rotasi berputar di titik tengahnya. **HTML renderer (F7) wajib** memakai `transform: rotate()` dengan `transform-origin: center`.   |
| Zoom 25–200%                   | Koordinat tersimpan dalam ruang kanonik 390px; `screenToCanvas`/`canvasToScreen` murni dan diuji, zoom tidak mengubah nilai tersimpan.                          |
| Pan                            | Scroll pada wrapper; Space+drag memakai handler capture-phase sehingga Konva tidak melihat gestur.                                                              |
| History                        | Batas 100 entri (PRD minimal 50); `coalesceKey` menggabungkan nudge dan edit inspector menjadi satu langkah undo.                                               |
| Autosave                       | Debounce 1,5 dtk, tidak pernah tumpang tindih, dan konflik revisi (`expectedRevision`) menghentikan autosave sampai pengguna memilih _Muat ulang_ atau _Timpa_. |
| Server action untuk simpan     | Dokumen divalidasi ulang dengan schema kanonik di server (P-03); klien tidak dipercaya.                                                                         |
| Rute `/editor/[id]`            | Di luar `dashboard/layout.tsx` agar tidak ada sidebar 260px; `proxy.ts` melindungi `/editor/:path*`.                                                            |
| Multi-select                   | Dibatasi satu section.                                                                                                                                          |

## Batasan / utang teknis yang disengaja

- Snapping hanya tepi/tengah section (FR-EDT-005 adalah P1); alignment ke elemen tetangga belum ada.
- Teks diedit lewat inspector (tanpa edit on-canvas); UI authoring binding di luar scope F4.
- Inspector image/widget ditunda ke F5/F6; font hanya fallback di editor (loading font di F7).
- Tinggi section di inspector dibatasi 4000 (schema mengizinkan 10000); `overflow: visible` tidak ditampilkan di editor.
- Body server action default 1 MB; dokumen sangat besar perlu endpoint khusus (dicatat sebagai utang).

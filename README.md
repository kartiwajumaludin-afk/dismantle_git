# Dismantle Asset Write-Off — Project Spec

> Sumber: reverse-engineered langsung dari `dismantle.zip` (sistem lama, live). Dokumen ini disusun sebagai spec lengkap untuk rebuild dari nol — ditulis supaya bisa diterjemahkan ke Claude chat baru **tanpa** perlu akses ke `dismantle.zip` sama sekali. Modul progress `dismantle_git` yang sedang dikerjakan paralel **bukan** acuan dokumen ini.

## Stack & Arsitektur Umum
- Laravel + React + Inertia.js + MySQL
- Dark aesthetic theme (`--bg-primary: #0a0e14`, dst), Font Awesome icons
- Layout: sidebar icon-only (1 icon per top-level Modul, hover tooltip), top bar = judul Modul aktif + tab Sub Modul (dibagi rata mengisi lebar), left Quick Filters panel (350px, opsional per modul), right content area
- ECharts 5.4.3 untuk semua visualisasi — di-vendor lokal di `public/js/echarts.min.js` (coba load lokal dulu, fallback ke CDN jsDelivr `echarts@5.4.3` kalau file lokal gagal) supaya dashboard tetap jalan tanpa internet
- Struktur navigasi: `AppLayout` baca live dari tabel `menus`/`submenus` (sidebar = menus, top tab bar = submenus dari menu aktif); submenu yang belum dibangun ditampilkan greyed-out/disabled (`route().has()`), bukan link mati

## Konvensi Global (berlaku semua modul kecuali disebutkan beda)

1. **Placeholder dulu, baru fitur.** Tiap modul WAJIB ada skeleton (nav entry, tab, halaman "Under Development") sebelum logic dikerjakan.
2. **No grey text.** Semua teks putih atau warna aksen — gak ada abu-abu/mendekati abu-abu di komponen manapun (termasuk dampak dari OS/browser forced-dark-mode — tambahkan `colorScheme: 'dark'` di semua input teks, bukan cuma date input).
3. **Region label standar**: chip "All Region" + "Region 01"–"Region 12" (kata penuh, zero-padded). Value internal tetap `REG01` dst. Jangan sampai ada varian "Reg 01"/"REG01" nongol di UI.
4. **ExcelDropdown** — komponen filter dropdown standar (dipakai di semua filter kecuali region & search): search box di atas → checkbox "All [Label]" (dengan state indeterminate) → checklist hasil filter search → tombol **Cancel**/**Apply** di bawah (perubahan baru ke-apply pas klik Apply). Warna: accent `#00b4d8`, bg dropdown `#1c2029`, border `#2a3140`.
5. **Left panel**: kalau dipakai, HARUS lewat prop `leftPanel` AppLayout (lebar standar 350px) — jangan bikin panel custom sendiri di dalam halaman. Field filter yang muncul di dalamnya BOLEH beda tiap modul sesuai kebutuhan (bukan set tetap). Beberapa modul sengaja TIDAK punya left panel (Mode Tracking), atau me-repurpose-nya jadi form lain (Create User di User Management).
6. **Search field** (filter manapun): wajib ada tombol clear (×) di dalam field, dan teks putih eksplisit.
7. **Random password**: setiap create/reset password user, password digenerate random per akun (bukan default tetap), ditampilkan sekali via toast/flash message, TIDAK PERNAH disimpan/di-log dalam bentuk plaintext. Untuk bulk-create beberapa user sekaligus, semua password ditampilkan bareng di window kecil yang persist sampai refresh/pindah halaman.
8. **RGB card border** (di modul yang pakai, misal Import CSV): border-nya permanen, bukan cuma nyala pas proses berjalan.
9. Commit message ditulis dalam Bahasa Indonesia.
10. Modul dengan APK pendamping (Daily Activity, Inbound Tracker, Disposal Asset) — detail API mobile-nya didokumentasikan terpisah di sesi MobApp, dokumen ini hanya menyebut kontrak data yang dipakai bersama.

## Struktur Modul & Urutan Sidebar

Modul "Dismantle Asset Write-Off" (Sub Modul: Tracker, Asset View, Workinfo View, Daily Activity, Import CSV, Site Map, Mode Tracking; MobApp: Daily Activity) → Modul "Dashboard" (Sub Modul: Dashboard Analysis, Interactive Tree, Diagram dan Grafik, Baseline Forecast) → Modul "BoQ Calculation" (Sub Modul: BoQ Calculation, BoQ Summary) → Modul "Inbound Tracking" (Sub Modul: Inbound Tracker, Inbound Request, Disposal Asset; MobApp: Inbound Tracker, Disposal Asset) → Modul "KickOff" (Sub Modul: KOM Site, KOM Org Chart, KOM Project, KOM Slide) → Modul "Daily Reminder" → Modul "User Guide" → Modul **"User Management" (paling akhir/last)**.

---

# MODUL: Import CSV

## Tujuan
Upload data mentah (Ticket/Asset/Workinfo/Manual) ke 4 tabel staging, lalu jalankan Master Business Engine buat gabungin semuanya ke tabel `tracker`.

## Performa (800K baris ≈ 1m30s — hasil 3 bulan trial-error)
1. **PDO langsung**, bukan Eloquent — prepared statement raw
2. **Batch size dinamis**: `max(300, min(8000, floor(40000 / jumlah_kolom)))`
3. **Statement caching** per ukuran batch — SQL cuma di-prepare sekali per ukuran batch
4. **Tuning session MySQL** selama import: `foreign_key_checks=0`, `unique_checks=0` (mode skipsert), `bulk_insert_buffer_size` digedein, timeout diperpanjang (di-`try/catch` karena shared hosting kadang gak izinin `SET SESSION` tertentu)
5. **Streaming murni**: baca CSV per baris (`fgetcsv`), gak pernah load seluruh file ke memory; progress dihitung dari posisi byte file
6. Client-side: kompresi gzip browser (`CompressionStream` API) untuk file >1MB sebelum upload; progress upload+proses digabung dalam satu koneksi XHR (baca `responseText` bertahap kayak SSE)
7. `INSERT...ON DUPLICATE KEY UPDATE` (mode upsert: ticket/asset/manual) vs `INSERT IGNORE` (mode skipsert: workinfo)

## Struktur & Alur
- 4 tabel staging: `ticket_clean`, `asset_clean`, `workinfo_clean`, `tracker_manual_raw`
- Card per tipe: TICKET, ASSET, WORKINFO, MANUAL — tiap card: pilih file → Verify (validasi header) → Import
- **RGB border card**: permanen, bukan cuma pas proses jalan
- **Master Business Engine** ("Start Import Process"): join 4 tabel `*_clean` ke `tracker` — 5 langkah (upsert base, business logic termasuk priority/intersection/asset status, dismantle logic dari workinfo, approved NOP duration, manual raw→update→apply). Dipanggil manual (bukan otomatis tiap import) — tunggu semua file selesai upload dulu baru dijalankan sekali.
- Layout: menggunakan `AppLayout` sebagai wrapper konsisten tanpa reload — sidebar & top tab bar tetap tampil pas pindah modul (arsitektur kunci: satu `AppLayout` component membungkus semua halaman, baca menu/submenu dari shared Inertia props, bukan hardcode per halaman)

## Security
- CORS wildcard (`Access-Control-Allow-Origin: *`) pada endpoint upload **JANGAN dipakai** — tidak perlu untuk endpoint internal.

---

# MODUL: Tracker / Asset View / Workinfo View

## Filter Search — aturan wajib
Field search di ketiga sub-modul ini (dan berlaku global) harus:
- Ada tombol **clear (×)** di dalam field
- Teks **putih eksplisit** + `colorScheme: 'dark'` biar gak ke-override forced-dark browser/OS

## Precision search
Search backend nge-`OR` beberapa kolom sekaligus (bukan 1 kolom presisi):
- Tracker: `ticket_number, site_id, site_name, ticket_batch`
- Asset: `ticket_number, barcode_number, site_id, site_name, part_name, part_code, brand_name, asset_physical_group_name`
- Workinfo: `ticket_number, site_id, site_name, work_info_status_name, work_info_note, work_info_user_updater, work_info_role_updater`

## CRUD Scope Tracker (Manual Edit)
Kolom yang bisa di-edit manual (22 kolom) via modal:
`tp_company, latitude, longitude, caf_status, caf_submit, caf_approved, start_permit_tp_date, end_permit_tp_date, status_permit_tp, ticket_batch, site_status, site_issue, category_issue, detail_issue, remark_dismantle, mom, partner_company, plan_dismantle_date, pic_team, act_dismantle_week, plan_kom, actual_cost` — plus `plan_dismantle_week` auto-generate dari `plan_dismantle_date`.
"Delete" di modul ini **bukan hapus baris tracker** — cuma hapus row di `tracker_manual_update` (tabel audit override), balikin nilai ke hasil Master Business Engine murni. Kolom lain sifatnya read-only, tidak ada Create/Delete beneran — cuma Read + Update yang scoped ke 22 kolom itu.

## Filter Panel (Tracker)
Region chip + ExcelDropdown (Ticket Status, Ticket Batch, Sub Type, NOP) + Date Range + Search + Rows per page. Kategori kolom tambahan bisa di-toggle (Asset Info, Site Info, Permit Info, Dismantle Info) — kolom `plan_kom`/`actual_cost` cuma muncul untuk role `super_admin`/`admin`/`regional_manager`.

---

# MODUL: Daily Activity

## Tujuan
Operasional harian field team: planning per hari/minggu, assign task, monitoring progress, verifikasi hasil kerja, galeri foto bukti kerja. Data sinkron dari `tracker` dan diisi lanjut oleh APK Dismantle Mobile App.

## Alur Data
1. **Populate** → upsert dari `tracker` ke `daily_activity` untuk minggu berjalan. `remark_dismantle` sengaja TIDAK ditimpa saat update (biar catatan lapangan gak hilang).
2. Admin **Assign** task ke field team (PIC Team, bisa banyak sekaligus).
3. Field team kerja via APK (submit start/end time + foto).
4. Admin **Verify** → Recorded/Skip/Replan → tersimpan ke `timesheet` kalau Recorded.
5. **Truncate** manual tiap pergantian minggu → hapus semua `daily_activity`, lalu Populate lagi.
6. **Sync Status** → update kolom status referensi dari Tracker terbaru, skip task yang udah completed/verified.

## Filter (TANGGAL PLAN — 4 tab)
Today (default) / This Week (`filter_mode=week`) / All Plan (`filter_mode=all`, tanpa filter tanggal) / kalender custom (`filter_date`). Plus: Region, PIC Team, Task Status, NOP, Search, Rows per page.

## Toolbar
- **Populate/Truncate/Sync Status** — lihat Alur Data
- **Photos** — galeri foto: folder per ticket, export ZIP, hapus per folder/per foto
- **Assign** — assign banyak task sekaligus; task completed/verified gak bisa di-assign ulang
- **Export DA** — CSV sesuai filter tanggal aktif (18 kolom custom header)
- **Export TS** — CSV Timesheet, default rentang awal bulan s/d hari ini. **Nama file harus memuat rentang tanggal aktual** (`timesheet_{from}_{to}.csv`) — pastikan string interpolation PHP-nya benar (double-quote/`sprintf`), bukan single-quote literal.

## CRUD Scope
Create: otomatis via Populate. Update (modal): `plan_dismantle_date`, `pic_team`, `category_issue`, `detail_issue`, `remark_dismantle` saja. Delete per-baris: tidak ada — cuma Truncate (hapus semua).

## Verify Flow
**Recorded** → verified, tercatat ke timesheet. **Skip** → completed, prefix `[SKIP]`, tidak bisa digabung hasil lain. **Replan** → wajib tanggal replan baru, status replanned, prefix `[REPLAN]`/`[RECORDED+REPLAN]`.

## Security
Truncate = operasi destruktif tanpa konfirmasi tambahan di backend — pastikan ada confirm dialog di frontend + pertimbangkan permission terpisah.

---

# MODUL: Site Map

## Left Panel
**Harus standard** (350px via `leftPanel` prop AppLayout) — di source lama modul ini bikin panel sendiri (220px custom), jangan diulangi.

## Perilaku Load
Map **sengaja kosong** sebelum "Load Map" diklik — data site (~46K+ titik) di-fetch terpisah dari halaman index (yang cuma kirim filter options + count). Ini desain sengaja cegah browser/server hang — jangan diubah jadi auto-load.

## Mode NOP vs Mode P1–P7 (Priority)
Bukan 2 sumber data beda — data di-load sekali dari `site_map_cache` (hasil tombol **Populate**: truncate+rebuild dari `tracker`, ADA `confirm()` dialog sebelum jalan). Yang beda cuma skema warna marker:
- **Mode NOP**: warna per NOP, siklus 8 warna tetap
- **Mode P1–P7**: warna dari Priority hasil kalkulasi server (`calcPriority()`, dari kombinasi `ticket_status_name` + `working_permit_status_name` + `site_issue`, BUKAN kolom mentah):

| Priority | Kondisi | Warna |
|---|---|---|
| P1 | In Progress Dismantle + WP Active | Biru `#0000FF` |
| P2 | Waiting NOP Approval + WP Active | Kuning `#FFFF00` |
| P3 | Status aktif lain + WP Active | Hijau `#00FF00` |
| P4 | Aktif + WP Rejected/kosong (default fallback) | Magenta `#FF00FF` |
| P5 | Waiting TO Review | Cyan `#00FFFF` |
| P6 | Closed (+ varian approval closing) | Ungu `#8000FF` |
| P7 | Cancelled | Merah `#FF0000` |
| P8 | Site Issue (override, dicek pertama) | Oranye `#FF6600` |

## Mode Tracking
Halaman **terpisah** dari Site Map (route sendiri), query langsung ke `daily_activity` (bukan `site_map_cache` yang berat).

---

# MODUL: Mode Tracking

## Left Panel
**Tidak ada** — sudah by design tanpa `leftPanel` prop (full-width), hanya monitoring posisi team + node site yang di-plan-kan berdasarkan task yang dibuat.

## Jadwal Kerja GPS (privasi 6 pagi–6 sore)
- Admin set jadwal via modal "Setting Interval GPS" (`gps_schedule_start`/`end`, GLOBAL buat semua tim)
- Cron **`gps:check-auto-resume`** jalan tiap 5 menit — toggle flag global `gps_paused` sesuai jadwal
- APK baca `gps_paused` via endpoint `trackingSettings()`, APK-nya sendiri yang berhenti kirim ping kalau paused
- **Catatan penting**: endpoint `gpsPing()` di server TIDAK mengecek jadwal/`gps_paused` sama sekali — proteksi privasi sepenuhnya client-side (APK). **Requirement rebuild**: tambahkan validasi jadwal juga di server (`gpsPing()`) sebagai defense-in-depth, bukan cuma andalkan APK.
- Prasyarat GPS aktif: user harus **install APK** dan **buka/check Report Harian (Daily Reminder)** — detail teknis persisnya (native Kotlin) di luar scope dokumen ini, didalami di sesi MobApp kalau source APK tersedia.

## Radar Monitoring
Query `teamPositions()` **role-agnostic** — user manapun (field team, koordinator, siapapun) otomatis muncul di radar selama punya data `UserPosition` dengan `source_app='dismantle'`. Jadi koordinator/siapa saja yang di-assign di Daily Reminder otomatis ikut termonitor selama mereka install APK & mengaktifkan GPS-nya — tidak perlu perubahan query, sudah generic dari awal.

---

# MODUL: Dashboard Analysis (Pivot)

> Hanya mode **Drag & Drop** yang dibawa ke rebuild — mode Konvensional (8 pivot fixed: Waterfall, SoW Analysis, General/Pending, Asset Status, Non-Workable, Asset Position, ACT Weekly, Plan Weekly + endpoint `getAll()`) **tidak perlu dipindah sama sekali**.

## Drag & Drop Pivot
- **Whitelist 22 field** dipetakan ke kolom `tracker` (proteksi SQL injection — field map jadi satu-satunya jalur nama kolom masuk ke query, WAJIB dipertahankan pola ini kalau nambah field baru): `regional, nop, to, batch, sub_type, ticket_status, workable, general_status, asset_status, asset_position, site_status, site_issue, category_issue, cat_pending_approval, aging_pending, tp_company, partner_company, plan_week, act_week, mom, site_id, asset_group, asset_mflag`
- User drag field ke 3 zona: **Rows** (multi), **Column** (1, optional), **Filters** (key=value)
- Agregasi selalu `COUNT(*)` — tidak ada SUM/AVG
- Kalau Column diisi: hasil di-crosstab (tiap nilai unik jadi kolom `col_xxx`, blank → `(Blank)`)
- **Requirement**: field yang ditawarkan di UI drag & drop (`DND_AVAILABLE_FIELDS`) harus PERSIS sama dengan whitelist backend — di source lama ada mismatch (`ticket_number`, `site_name` ditawarkan di UI tapi gak ada di whitelist backend, jadi diam-diam diabaikan).

---

# MODUL: Interactive Tree

## Animasi (dipertahankan)
- **Dot berjalan di sepanjang connector** antar card (native SVG `<animateMotion>` + `<mpath>`, nempel ke path bezier yang sama dengan garis putus-putus penghubung)
- Kecepatan & titik mulai tiap dot **di-random** (2–4 detik, offset 0 s/d -3 detik) — biar gak seragam
- Dot juga pulsing (opacity 0.4↔1, radius 3↔5px, siklus 2 detik)
- Titik jangkar garis = **titik tengah vertikal card** (tengah sisi kanan card asal → tengah sisi kiri card tujuan) — jadi dot otomatis lewat area center relatif ke kedua card, ini behavior asli yang harus dipertahankan persis

## Card Klik → Detail Pivot
- Tiap card diklik → manggil endpoint yang sama (`dashboard.tree.data`) dengan `action=node_pivot`
- Server `GROUP BY` di database, balikin `rows` (Ticket Status), `cols` (Regional 1–12), `matrix`, plus Total
- **Node kecil** (misal "Ada Issue", "Plan Current/Coming Week" yang nilainya kecil) pakai `action=node_tickets` — fetch daftar ticket mentah langsung, bukan pivot kosong

---

# MODUL: Diagram dan Grafik

## Nama tombol
**"Export HTML"** (bukan "Export KoM HTML" — itu salah sebut, gak ada hubungan dengan modul KickOff/KOM yang terpisah).

## Layer 1 — Network Map
Halaman tanpa `leftPanel` (full-width). Export single/multi/all region → `window.open('/dashboard/export-html?region=...')` (tab baru) — endpoint yang sama yang perlu diselesaikan bareng dengan catatan security di bawah.

### Animasi
- **Satelit**: bukan orbit muter, tapi panel surya (kiri-kanan) yang **berotasi di tempat** (`komOrbit`, 20 detik linear), badan & titik sinyal pulsing (`komSatPulse`, 2–3 detik). Orbit ring dashed di sekelilingnya statis (dekorasi doang).
- **Dot berjalan**: rute **Region → Satelit → HQ** (relay 2 segmen, bukan garis lurus), durasi & delay beda per region (`2.0 + (i%5)*0.3` detik, delay `(i*0.25)%2`).
- **HQ pulsing ring**: 2 lingkaran mengembang-mengecil bergantian (`komHQRing`, 3 detik, salah satu delay 0.8 detik).
- **Node berdempetan** (HQ, R3, R12 — semua "Jakarta") otomatis disebar oleh `applyOffsets()`: kelompokkan node berdasarkan posisi pixel dibulatkan (18px), kalau >1 node di grup sama → offset tetap (`{0,0},{-22,-16},{22,-16}` untuk 3 pertama, fallback formula kalau lebih).

## Layer 2 — 13 Card Kriteria (P1–P13)
| # | Label |
|---|---|
| P1 | Milestone |
| P2 | Workable Status |
| P3 | General Status |
| P4 | Asset Status |
| P5 | Issue Category *(flag `lockable`, belum ada logic pembatasan akses beneran — open item)* |
| P6 | Scope of Work |
| P7 | Accumulation Achievement |
| P8 | Plan VS Achievement |
| P9 | Average NOP Approved |
| P10 | Aging Approval *(flag `lockable`, sama seperti P5)* |
| P11 | SoW Overall |
| P12 | Asset Plan vs Actual |
| P13 | Ticket Status |

## Layer 3 — Filter Tahun & Batch (cascading)
- Region fixed dari Layer 1 (bukan filter di Layer 3)
- **Tahun**: chip single-select, hanya dari ticket dengan `ticket_sub_type_name = 'Asset Disposal'`
- **Ticket Batch**: cascading tergantung Tahun — kalau pilih tahun X, query batch difilter dulu `WHERE YEAR(...) = X` (bukan filter client dari list yang udah di-load semua)
- Ganti Tahun/Batch/Region → semua 13 chart di-refetch sekaligus lewat satu fungsi (`fetchSet`)

## Dependency Vendor
`echarts.min.js` di-vendor lokal (`public/js/`) dengan fallback CDN — lihat Konvensi Global. **`gridstack.min.css`/`gridstack-all.js` di-drop dari rebuild** (sisa dari alur lama sebelum jadi Network Map, dulu L1 langsung nampilin chart+tabel dengan card L2 yang bisa di-resize dan L3 buat perbesar chart — sudah tidak dipakai, tidak perlu dihidupkan lagi).

---

# MODUL: Baseline Forecast

Skip dokumentasi detail untuk sekarang — **placeholder saja**. Sedang dipertimbangkan untuk diganti nama jadi "Inbound Dashboard", tapi dibiarkan seperti sekarang sampai ada keputusan final.

---

# MODUL: BoQ Calculation & BoQ Summary

## Left Panel
**Harus distandardkan** — dua-duanya bikin panel custom 224px, harus diganti pakai `leftPanel` prop AppLayout (350px).

## Kategori Kolom — requirement penting
Di source lama, badge kategori **CME/BTS/TRN/PWR cuma legend warna, BUKAN filter beneran** — toggle "Plan BoQ"/"Act BoQ" nampilin SEMUA ~31 kolom kategori itu sekaligus. **Requirement rebuild**: badge CME/BTS/TRN/PWR diubah jadi toggle filter beneran, biar user bisa pilih kategori mana yang mau ditampilin kolomnya (mengurangi lebar tabel).

## Struktur Data (dicatat apa adanya, business logic belum final)
- **Populate**: isi `boq_calculation` dari `tracker` (baseline ticket)
- **Generate BoQ**: hitung kolom PLAN_xxx & ACT_xxx dari `asset_clean`, update ke `boq_calculation`
- Kolom utama: Ticket #, Status, Site ID, Site Name, Regional, Batch, Invoice Status + PLAN_[kode]/ACT_[kode] (32 kode BoQ: CME 10, BTS 6, TRN 5, PWR 11)
- Detail formula per kode BoQ **belum dibahas user** — jangan diasumsikan, tunggu requirement final.

---

# MODUL: Inbound Tracker

## Left Panel
Sudah benar (350px via `leftPanel`). Field custom: **Region, Inbound Status, Partner Company, Asset MFlag, Ticket Status, Ticket Batch, Batch Request, Request Date (range), Search** (8 field).

## Toolbar
| Tombol | Fungsi |
|---|---|
| **Sync Data** | Insert-only dari `tracker`+`asset_clean` ke `inbound_tracker` — cuma nambah kombinasi ticket+barcode BARU, gak pernah nimpa baris existing. Default status baru: `NY Inbound`/`OTW to Central WH PWK`. |
| **Import CSV** | Pola sama (gzip + SSE streaming) kayak Import CSV utama. |
| **Database Warehouse** | Halaman CRUD terpisah — master data gudang (nama, region, area, lat/long), searchable + pagination 25. |
| **Pending Approval** | List batch belum di-approve (grouped by request_by+request_date) → approve dengan isi `plan_inbound_date`+`pic_receive`. |
| **Folder Photo** | Browser foto per batch: folder → grup (thumbnail+jumlah) → lihat foto → download ZIP / hapus folder. |
| **CSV (export)** | Ikut filter aktif, kolom LEBIH BANYAK dari tabel UI (nambah HO Check, Receive Check, Inbound Date, Received Date, PIC Inbound, PIC Receive, Remark — 26 kolom total). |

---

# MODUL: Inbound Request

## Left Panel
Field custom: **Region, Ticket Status, Partner Company, Material Position, Ticket Batch, Search** (6 field). Data eligible: `ticket_status_name` masuk daftar tertentu + `inbound_status_label='NY Inbound'` + `asset_mflag` mengandung "Disposed".

## Pagination — FIXED 50, tidak bisa diubah
`paginate(50)` hardcoded di backend (beda dari Tracker yang punya dropdown rows-per-page) — sengaja, karena terkait mekanisme di bawah.

## Mekanisme "Check All" 2 Tingkat — WAJIB dipertahankan persis
1. "Check All" default → cuma check ID di halaman aktif (maks 50). Klik lagi → "Uncheck Page".
2. Kalau `total` data (semua halaman, hasil filter) LEBIH BESAR dari yang baru di-check → muncul **banner terpisah** "Select All lintas halaman".
3. Klik banner → fetch endpoint terpisah (`all-ids`) yang narik SEMUA ID sesuai filter aktif (tanpa batas pagination) langsung dari server.
4. Baru Submit Request jalan berdasarkan seluruh ID itu (bukan cuma 50 yang keliatan di layar).

Jadi "Check All" TIDAK PERNAH diam-diam cuma submit 50 baris teratas kalau datanya lebih — selalu ada 1 konfirmasi tambahan eksplisit.

---

# MODUL: Disposal Asset

Left panel sudah standar (350px). Field custom: **Region, Batch, Klasifikasi Asset, Group Location Actual, Location Actual, Status Pickup, Assign Task, Search** (8 field).

## Toolbar
- **Import CSV** — pola sama (gzip+SSE)
- **Assign Logistic** — assign kelompok asset (per batch+location) ke 1 user jadi PIC Pickup + optional PIC Receive (`DisposalAssignment`); re-assign ke assignment yang sudah ada TIDAK reset progress task yang lagi jalan
- **Folder Photo** — pola sama seperti Inbound Tracker (per trip)
- **Export CSV** — ikut filter aktif

Mayoritas method controller modul ini (`mobileScan`, `mobileSubmitTrip`, `mobileAcceptTask`, dll) adalah API untuk APK Disposal Tagging — didokumentasikan terpisah di sesi MobApp.

---

# MODUL: KickOff (KOM)

## KOM Site, KOM Org Chart (list), KOM Project
Tidak ada catatan khusus — struktur standar (CRUD + Import CSV + filter region/NOP/tower company/plan dismantle).

## KOM Slide

### Layer 1 — Network Map (beda dari Diagram dan Grafik!)
- **Tidak ada satelit** — garis konektor LANGSUNG dari HQ ke tiap Region (bukan relay via satelit)
- **2 dot per garis, jalan berlawanan arah bersamaan** — satu maju (`animateMotion` normal), satu mundur (`keyPoints="1;0"`, durasi+delay beda dikit) — kesan data flow bolak-balik
- **Setiap region node ikut pulsing ring** (`komRegPulse`) — beda dari Diagram dan Grafik yang cuma HQ yang pulsing
- Efek dim/highlight saat 1 region dipilih (opacity 0.12 untuk yang tidak dipilih)
- Export HTML: mekanisme sama (single/multi/all region)

### Layer 2 — 8 Card Kriteria
Organization Chart, Scope of Work, Tower Company, Category Asset, Asset Position, Plan Dismantle, Avg NOP Approve (tag "Lesson Learn"), Issues (tag "Lesson Learn")

### Layer 3 — Detail per Card
Khusus **Organization Chart**: bukan chart statis, tapi **tree expandable** — mulai dari 1 card GM Dismantle (L1) → klik expand → National roles (Logistic, Pre-Implementation, Warehouse) + 4 Regional Manager (L2) → klik Regional Manager → expand ke Koordinator (L3) → klik Koordinator → expand ke Team Leader (L4).

---

# MODUL: Daily Reminder

## Struktur — 4 Tab
Dashboard (monitoring status hari ini per user) | Grup (Koordinator/Permit Team/Zone Manager — bisa nambah grup baru, tapi grup "Koordinator" bawaan sistem tidak bisa dihapus) | Template Task | Assignment (assign 1 user ke 1 grup)

## 4 Tipe Block (`block_type`)
| Tipe | Cara kerja |
|---|---|
| **Checklist** | 1 baris per site/ticket yang di-assign user itu sendiri hari itu (dari `daily_activity.assigned_by`) |
| **Simple Checklist** | 1 baris per hari per user, tanpa daftar site — buat task generik |
| **Auto Exists** | Otomatis "selesai" begitu minimal 1 site ke-assign untuk tanggal target — dihitung LIVE |
| **Auto Status** | Otomatis "selesai" kalau SEMUA task user itu sudah `assignment_status=accepted` — dihitung LIVE |

`day_offset`: 0 = "Hari Ini", 1 = "Besok".

## Cron
1. **`reminders:generate-daily`** — 1x sehari jam 00:01, Senin-Sabtu (skip Minggu). Generate baris `daily_reminder_checklists` HANYA untuk tipe Checklist & Simple Checklist (Auto Exists/Auto Status tidak pernah di-generate, selalu live).
2. **`reminders:send-daily-notifications`** — tiap 5 menit (sengaja "berisik" — desain intentional), throttle via Cache TTL 5 menit per (user+template+tanggal), kirim via Firebase FCM.

**Requirement rebuild**: notification job harus punya cabang khusus untuk **Simple Checklist** (di source lama jatuh ke cabang `else`/Auto Status yang salah cek ke `daily_activity`, padahal datanya ada di tabel `daily_reminder_checklists`) — cek `is_checked=false` di tabel checklist, sama seperti tipe Checklist biasa tapi tanpa filter per-ticket.

## Boundary
`team:send-position-reminders` (reminder GPS untuk Mode Tracking, pakai `reminder_interval_minutes`) adalah command **terpisah**, bukan bagian modul Daily Reminder — jangan tertukar.

---

# MODUL: User Guide

Terinspirasi dari dokumentasi customer (GitBook-style).

## Struktur Data
- **GuideCategory**: `category_key`, `label`, `icon`, `sort_order`, `is_active` (grouping di sidebar)
- **GuidePage**: `slug`, `title`, `subtitle`, `callout_text` (banner info), `tabs` (multi-tab, tiap tab punya steps+images sendiri), `steps` (list bernomor), `images` (array + caption), `note_text` (box tip), `is_published`, `created_by`/`updated_by`

## Role & Visibility
`super_admin` lihat semua (termasuk draft). Role lain cuma lihat `is_published=true`. CRUD dibatasi middleware `role:super_admin`. Hapus kategori cascade hapus semua halamannya; hapus halaman otomatis hapus file gambar dari storage.

## Status Konten (per saat dokumentasi ini ditulis)
Baru ada 5 halaman (4 di kategori "URL Connection": Project Management Tool Web, Mobile App–Daily Activity, Mobile App–Inbound Request, Mobile App–Pickup Disposal Asset on WH; 1 di "Inbound Tracking": Inbound Request). **Progress dihentikan sementara** — konten ditulis waktu APK masih PWA, sekarang APK native jadi perlu ditulis ulang. Bukan modul yang selesai.

---

# MODUL: User Management *(dokumentasi terakhir — sengaja diletakkan di akhir meski secara historis dibahas pertama)*

## Tab
**Web** dan **Field Team (Mobile App)** — sama-sama data user yang sama, dipisah berdasarkan tipe akses yang dikelola. Split BUKAN berdasarkan role (vendor bisa punya akses Web, admin bisa punya akses Field Team) — 2 checkbox independen per user: "Akses Web" dan "Akses Field Team (MobApp)".

## Kolom & Role
Kolom: `username, full_name, name, email, phone, is_active, active_from, active_until, must_change_password, last_login, created_by, fcm_token`. Role: `super_admin, admin, regional_manager, vendor, view, logistic`.

## Left Panel — Create User
Pakai pola Left Panel (bukan modal) untuk form Create User — checkbox tree untuk menu access. Ini salah satu contoh modul yang me-repurpose left panel jadi form, bukan filter.

## Password & Security
- Password default digenerate random per user (create & reset), wajib ganti di login pertama (redirect ke Change Password page)
- Password ditampilkan sekali via flash message, tidak pernah disimpan/di-log plaintext
- Superadmin tidak pernah locked out oleh active-period expiry (`active_from`/`active_until` tetap null = tidak ada batasan periode)
- Hanya `super_admin` yang bisa assign role `super_admin` atau modify/deactivate akun `super_admin` lain
- Route `/users` dibatasi role `super_admin`/`admin` saja
- Login dibatasi rate limit 5 percobaan/menit per IP

## Actions per baris
View Detail, Edit, Reset Password, Activate/Deactivate, Delete.

## Bulk Create Password Display
Untuk create banyak user sekaligus, semua password random ditampilkan bareng di window kecil sementara (persist sampai refresh/pindah halaman) — lihat Konvensi Global #7.

## Prinsip Umum
Kode dan behavior modul ini harus match 100% dengan sistem lama (bukan rebuild/refactor) — satu-satunya perbedaan yang disengaja adalah split tab Web/Field Team di atas.

# Dismantle Asset Write-Off — Database Schema

> Skema final ini adalah hasil KONSOLIDASI dari 43 file migration di `dismantle.zip` (base migration + semua "add column" incremental digabung). Untuk rebuild dari nol, tiap tabel di bawah bisa langsung jadi 1 file migration `create_..._table`, tidak perlu dipecah lagi jadi migration tambahan seperti riwayat aslinya.
>
> Tabel bawaan Laravel/paket standar (tidak didetailkan di sini, tinggal pakai default package): `cache`, `jobs`, `password_reset_tokens`, `sessions`, `personal_access_tokens` (Sanctum), serta `permissions`, `roles`, `model_has_permissions`, `model_has_roles`, `role_has_permissions` (Spatie `laravel-permission`, default config, tanpa fitur teams).

---

## `users`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | bigint PK | |
| username | string, unique | |
| full_name | string | |
| name | string | |
| email | string, unique | |
| phone | string(30), nullable | |
| email_verified_at | timestamp, nullable | |
| password | string | |
| remember_token | string, nullable | |
| fcm_token | string, nullable | Token FCM device Android untuk push notification APK |
| is_active | boolean, default true | |
| active_from | date, nullable | |
| active_until | date, nullable | Superadmin: kedua kolom ini SELALU null (tidak ada batas periode) |
| must_change_password | boolean, default true | |
| last_login | timestamp, nullable | |
| last_seen_at | timestamp, nullable | |
| created_by | FK → users.id, nullable, nullOnDelete | |
| deleted_at | timestamp, nullable (soft delete) | |
| created_at, updated_at | timestamp | |

---

## `regions`
id (PK) · code (string, unique) · name (string) · is_active (boolean, default true) · timestamps

## `menus`
id (PK) · menu_key (string, unique) · label (string) · icon (string, nullable) · route_name (string, nullable) · sort_order (int, default 0) · is_active (boolean, default true) · timestamps

## `submenus`
id (PK) · menu_id (FK → menus, cascadeDelete) · submenu_key (string, unique) · label (string) · icon (string, nullable) · color (string, nullable) · route_name (string, nullable) · left_panel (boolean, default false) · sort_order (int, default 0) · is_active (boolean, default true) · timestamps

## `user_regions` / `user_menus` / `user_submenus` (pivot, tanpa kolom id)
`user_id` + `region_id`/`menu_id`/`submenu_id` (FK cascadeDelete), primary key komposit di kedua kolom.

---

## `ticket_clean`
| Kolom | Tipe |
|---|---|
| id | bigint PK |
| ticket_number | string(50), unique, nullable |
| ticket_sub_type_name | string(100), nullable |
| ticket_status_name | string(100), nullable, index |
| regional | string(100), nullable, index |
| network_operation_and_productivity | string(150), nullable |
| teritory_operation | string(150), nullable |
| site_id | string(50), nullable |
| site_name | string(150), nullable |
| assignee_group | string(100), nullable |
| assignee | string(100), nullable |
| ticket_summary | text, nullable |
| ticket_created_date | datetime, nullable |
| ticket_resolved_date | datetime, nullable |
| ticket_cleared_date | datetime, nullable |
| working_permit_number | string(50), nullable |
| working_permit_status_name | string(100), nullable |
| working_permit_status_text | text, nullable |
| working_permit_activity_name | string(150), nullable |
| working_permit_activity_description | text, nullable |
| working_permit_activity_category | string(100), nullable |
| site_owner | string(100), nullable |
| working_permit_start_date | datetime, nullable |
| working_permit_end_date | datetime, nullable |
| working_permit_updated_date | datetime, nullable |
| sik_number | string(50), nullable |
| sik_status_name | string(100), nullable |
| v_now | datetime, nullable, useCurrent |
| updated_at | datetime, nullable, useCurrent + useCurrentOnUpdate |

## `asset_clean`
id (PK) · ticket_number string(50) nullable index · site_id string(50) nullable · site_name string(150) nullable · ticket_sub_type_name string(100) nullable · ticket_status_name string(100) nullable · assignee_group string(100) nullable · assignee string(100) nullable · ticket_summary text nullable · ticket_created_date/ticket_resolved_date/ticket_cleared_date datetime nullable · barcode_number string(100) nullable · serial_number string nullable · part_code string(100) nullable · part_name text nullable · brand_name string(100) nullable · asset_physical_group_name text nullable · asset_po_number string(100) nullable · asset_status_name string(100) nullable · asset_flag_name string(100) nullable · asset_mflag string(50) nullable · v_now datetime nullable useCurrent · updated_at datetime nullable useCurrent+useCurrentOnUpdate
**Unique komposit**: `(ticket_number, barcode_number)`

## `workinfo_clean`
id (PK) · ticket_number string(50) nullable index · site_id string(50) nullable · site_name string(150) nullable · ticket_sub_type_name string(100) nullable · regional string(100) nullable index · network_operation_and_productivity string(150) nullable · teritory_operation string(150) nullable · work_info_user_updater string(100) nullable · work_info_role_updater string(100) nullable · work_info_status_name string(100) nullable index · work_info_note text nullable · work_info_updated_date datetime nullable index · v_now datetime nullable useCurrent
**Unique komposit** (`uq_workinfo_event`): `(ticket_number, work_info_updated_date, work_info_status_name)` — tabel event log immutable, method insert = `INSERT IGNORE` (skipsert), JANGAN diubah ke upsert.

## `tracker`
| Kolom | Tipe |
|---|---|
| id | bigint PK |
| ticket_number | string(50), unique |
| site_id | string(50), nullable |
| site_name | string(150), nullable |
| ticket_status_name | string(100), nullable, index |
| regional | string(100), nullable, index |
| network_operation_and_productivity | string(150), nullable |
| teritory_operation | string(150), nullable |
| workable_status | string(50), nullable |
| general_status | string(100), nullable |
| asset_status | string(50), nullable |
| asset_active | unsignedSmallInt, nullable, default 0 |
| asset_not_found | unsignedSmallInt, nullable, default 0 |
| asset_undefined | unsignedSmallInt, nullable, default 0 |
| ticket_summary | text, nullable |
| ticket_batch | string(50), nullable, index |
| ticket_sub_type_name | string(100), nullable |
| ticket_created_date | datetime, nullable |
| jumlah_asset | int, nullable, default 0 |
| cat_asset | string(50), nullable |
| asset_position | string(50), nullable |
| percentage_asset_actual | string(150), nullable |
| plan_asset_dismantle | text, nullable |
| actual_asset_dismantle | text, nullable |
| assignee_group | string(150), nullable |
| tp_company | string(100), nullable |
| latitude | decimal(10,6), nullable |
| longitude | decimal(10,6), nullable |
| caf_submit | string(255), nullable |
| caf_approved | string(255), nullable |
| caf_status | string(50), nullable |
| working_permit_start_date | datetime, nullable |
| working_permit_end_date | datetime, nullable |
| working_permit_status_name | string(100), nullable |
| sik_number | string(50), nullable |
| start_permit_tp_date | date, nullable |
| end_permit_tp_date | date, nullable |
| status_permit_tp | string(50), nullable |
| site_status | string(100), nullable |
| priority_site | string(10), nullable |
| intersection | string(10), nullable |
| site_issue | string(100), nullable |
| category_issue | string(100), nullable |
| detail_issue | string(255), nullable |
| remark_dismantle | text, nullable |
| mom | text, nullable |
| cat_pending_approval | string(50), nullable |
| aging_pending_approval | int, nullable |
| submit_before | datetime, nullable |
| approve_before | datetime, nullable |
| approved_nop | string(20), nullable — format hh:mm:ss, = approve_before − submit_before |
| avg_approved_nop | string(20), nullable — kategori durasi approved_nop |
| dismantle | string(50), nullable |
| submit_after | string(50), nullable |
| approve_after | string(50), nullable |
| pcaa_approve | datetime, nullable |
| closed | datetime, nullable |
| partner_company | string(100), nullable |
| plan_dismantle_date | date, nullable |
| plan_dismantle_week | string(10), nullable |
| pic_team | string(100), nullable |
| act_dismantle_week | string(50), nullable |
| plan_kom | string(100), nullable |
| actual_cost | string(100), nullable |
| created_at, updated_at | datetime, nullable, useCurrent(+OnUpdate) |

**Index komposit**: `(regional, ticket_status_name)`, `(ticket_batch, ticket_status_name)` — kritikal untuk performa Master Business Engine (root cause lambatnya MBE dulu adalah index ini belum ada).

## `tracker_manual_raw` (staging upload CSV manual, non-destructive upsert)
id (PK) · ticket_number string(50) unique · tp_company string(100) nullable · latitude/longitude decimal(10,6) nullable · caf_submit/caf_approved string(255) nullable · caf_status string(50) nullable · start_permit_tp_date **string(50)** nullable (varchar mentah, dinormalize saat MBE) · end_permit_tp_date **string(50)** nullable · status_permit_tp string(50) nullable · ticket_batch string(50) nullable · site_status string(100) nullable · site_issue string(100) nullable · category_issue string(100) nullable · detail_issue string(255) nullable · remark_dismantle text nullable · mom text nullable · partner_company string(100) nullable · plan_dismantle_date **string(50)** nullable (varchar mentah) · pic_team string(100) nullable · act_dismantle_week string(20) nullable · plan_kom string(50) nullable · actual_cost string(100) nullable · created_at/updated_at timestamp useCurrent(+OnUpdate)

## `tracker_manual_update` (hasil proses dari raw, sudah dinormalize, diapply ke tracker)
Sama seperti `tracker_manual_raw`, TAPI: `start_permit_tp_date`, `end_permit_tp_date`, `plan_dismantle_date` bertipe **date** (bukan string) karena sudah dinormalize. Kolom `ticket_number` dan `ticket_batch` masing-masing punya index sendiri.

---

## `daily_activity`
id (PK) · ticket_number string(50) nullable index · site_id string(50) nullable · site_name string(150) nullable · regional string(100) nullable index · network_operation_and_productivity string(150) nullable · teritory_operation string(150) nullable · ticket_status_name string(100) nullable · sub_type string(100) nullable · update_ticket_status_name string(100) nullable · plan_dismantle_date date nullable index · latitude decimal(10,6) nullable *(internal, tidak ditampilkan di UI — dipakai Mode Tracking)* · longitude decimal(10,6) nullable · pic_team string(100) nullable index · assigned_by string(100) nullable · assignment_status enum(`pending`,`accepted`,`rejected`) default `pending` · task_status enum(`planned`,`assigned`,`in_progress`,`working`,`reported`,`verified`,`completed`,`replanned`) default `planned` index · category_issue string(100) nullable · detail_issue string(255) nullable · remark_dismantle text nullable · activity_date date nullable · work_start_time/work_end_time datetime nullable · work_duration int nullable (menit) · work_notes text nullable · work_photos text nullable (JSON array path foto) · verified_by string(100) nullable · verified_at datetime nullable · verified_notes text nullable · timestamps

## `timesheet` (snapshot, TIDAK ADA updated_at)
id (PK) · plan_dismantle_date date nullable index · ticket_number string(50) nullable index · site_id/site_name/regional/nop string nullable · ticket_status_name string(100) nullable · remark_dismantle text nullable · pic_team string(100) nullable index · category_issue/detail_issue string nullable · work_start_time/work_end_time datetime nullable · work_duration int nullable · work_notes text nullable · verified_by string(100) nullable · verified_at datetime nullable · verified_notes text nullable · created_at timestamp useCurrent (tanpa updated_at)

## `activity_photos`
id (PK) · daily_activity_id (FK → daily_activity, cascadeDelete) · ticket_number string(50) nullable index · barcode_number string(100) nullable index · photo_path string(500) nullable · photo_type string(50) nullable default `evidence` · uploaded_by unsignedBigInt nullable · timestamps

---

## `site_map_cache`
id (PK) · ticket_number string(50) unique nullable · site_id string(255) nullable · site_name string(255) nullable · latitude/longitude decimal(10,7) nullable · regional string(100) nullable index · nop string(150) nullable index · ticket_status_name string(100) nullable index · ticket_sub_type_name string(100) nullable index · ticket_batch string(50) nullable index · working_permit_status_name string(100) nullable · priority string(5) nullable index (P1–P8) · asset_position string(100) nullable index · timestamps

---

## `user_positions` (Mode Tracking — GPS field team)
id (PK) · user_id (FK → users, cascadeDelete) · source_app enum(`dismantle`,`inbound`,`disposal`) index · task_ref_type string nullable (mis. `daily_activity`, `disposal_assignment`, `inbound_batch`) · task_ref_id unsignedBigInt nullable · latitude decimal(10,7) · longitude decimal(10,7) · recorded_at timestamp index · timestamps
Index komposit: `(user_id, recorded_at)`

## `settings` (key-value generik — dipakai GPS interval/jadwal, reminder interval, dll)
id (PK) · key string unique · value text nullable · timestamps

---

## `boq_calculation`
id (PK) · ticket_number string(50) unique nullable index · ticket_status_name string(100) nullable · site_id string(50) nullable · site_name string(150) nullable · regional string(100) nullable index · ticket_batch string(50) nullable index · invoice_status string(50) nullable default `Pending` (Pending/Invoiced/On Hold) · boq_value decimal(15,2) nullable default 0 · transport decimal(15,2) nullable default 0 · total_value decimal(15,2) nullable default 0 · **62 kolom int** `plan_{KODE}` dan `act_{KODE}` (masing-masing `int nullable default 0`) untuk 31 kode BoQ: `CME001–CME010, BTS001–004+007–008, TRN001–003+006–007, PWR001–002+006–010+013–014+017–018` · created_at/updated_at datetime nullable useCurrent(+OnUpdate)
Index: `(regional, ticket_batch)`, `invoice_status`, `ticket_status_name`

---

## `kom_projects`
id (PK) · project_code string(50) unique (mis. PO-2025-001) · title string(255) · subtitle string(255) nullable · po_number string(100) nullable · kom_date date nullable · location string(255) nullable · status enum(`draft`,`active`,`archived`) default `draft` index · created_by unsignedBigInt nullable · timestamps · soft delete

## `kom_sites`
id (PK) · kom_project_id (FK → kom_projects, cascadeDelete) · ticket_number string(50) nullable index · site_id string(50) nullable index · site_name string(255) nullable · regional string(50) nullable index · network_operation_and_productivity string(100) nullable · tower_company string(100) nullable · jumlah_asset int nullable · cat_asset string(50) nullable · asset_position string(100) nullable · latitude/longitude decimal(10,6) nullable · plan_dismantle date nullable · timestamps

## `kom_org_chart`
id (PK) · kom_project_id (FK, cascadeDelete) · name string(100) · position string(100) nullable (GM Dismantle, Regional Manager, dll) · region_orchat string(50) nullable (Head Quarter/Regional 1/dst) · phone string(30) nullable · sort_order int default 0 · timestamps

## `kom_sow_schedule`
id (PK) · kom_project_id (FK, cascadeDelete) · regional string(50) index · nop string(100) · total int default 0 · week_label string(10) (mis. CW15) · week_target int default 0 · timestamps
Unique komposit (`kom_sow_unique`): `(kom_project_id, regional, nop, week_label)`

---

## `warehouses`
id (PK) · name string · region string(100) nullable · area string(100) nullable · latitude/longitude decimal(10,7) nullable · is_active boolean default true · timestamps

## `inbound_tracker`
id (PK) · batch_request_id string(80) nullable index · ticket_number string(50) nullable index · barcode_number string(100) nullable index · asset_status_label string(80) default `OTW to Central WH PWK` (opsi: Central WH PWK / HB Partner / OTW to Central WH PWK / WH MUKTI) · inbound_status_label string(50) default `NY Inbound` (opsi: Inbound Done / NY Inbound / On Going / Transit) · warehouse_name string(150) nullable *(dulu FK `warehouse_id` → tabel `warehouses`, sekarang plain varchar, TIDAK ada relasi FK lagi)* · partner string(150) nullable · request_date datetime nullable · request_by string(150) nullable · plan_inbound_date date nullable · no_pol_container string(100) nullable · ho_check boolean default false · inbound_date datetime nullable · remark text nullable · approved_date datetime nullable · approved_by (FK → users, nullOnDelete) · receive_check boolean default false · rejected tinyint default 0 · received_date datetime nullable · pic_inbound (FK → users, nullOnDelete) · pic_receive (FK → users, nullOnDelete) · timestamps

---

## `disposal_assets`
id (PK) · id_wo string(50) index · batch string(100) default '' index · ticket_number string(50) nullable index · nodin_owner string(100) nullable · area string(50) nullable · regional string(50) nullable index · group_location_actual string(100) nullable index · location_actual string(200) nullable · goods_id string(100) index *(dulu unique sendiri, sekarang bukan)* · barcode_number string(100) nullable index · serial_number string(100) nullable · asset_name string(255) nullable · tipe_part string(255) nullable · brand string(100) nullable · status_asset string(50) nullable · group_asset string(100) nullable index · category string(100) nullable index · detail_category string(100) nullable · site_id_actual string(50) nullable · site_name_actual string(150) nullable · uom string(50) nullable · qty_actual int default 0 · qty_pickup int default 0 · qty_receive int default 0 · tagging string(10) default `NO` · status_pickup enum(`Open`,`Partial`,`Closed`) default `Open` index · status_receive enum(`Open`,`Partial`,`Closed`) default `Open` index · force_closed boolean default false · force_closed_reason text nullable · actual_pickup_date date nullable *(dulu `actual_pickup_wh` string, sudah dikonversi ke date)* · nopol_segel **varchar(255)** nullable (diperbesar dari 100 — 1 Goods ID bisa diangkut >1 armada, digabung "B 8899 KK / B 2233 TT") · date_inbound date nullable · receive_date date nullable · status_material string(100) nullable · group_mukti string(100) nullable · act_weight decimal(10,2) nullable · timestamps
**Unique komposit** (`disposal_assets_id_wo_batch_unique`): `(id_wo, batch)` — id_wo bisa berulang di batch PO berbeda.

## `disposal_pickups` (sesi scan PIC Pickup)
id (PK) · disposal_asset_id (FK → disposal_assets, cascadeDelete) · nopol_segel string(100) · qty_scan int default 0 · actual_pickup_date date nullable · date_inbound date nullable · submitted_by (FK → users, nullOnDelete) · catatan text nullable · is_force boolean default false · timestamps

## `disposal_receives` (sesi scan PIC Receive — mirror disposal_pickups, tahap terima)
id (PK) · disposal_asset_id (FK → disposal_assets, cascadeDelete) · qty_scan int default 0 · receive_date date nullable · submitted_by (FK → users, nullOnDelete) · catatan text nullable · timestamps

## `disposal_assignments`
id (PK) · batch string(100) default '' index · location_actual string(200) index *(dulu bernama `regional`, di-rename)* · assigned_to (FK → users, cascadeDelete) index · pic_receive (FK → users, nullOnDelete) nullable · assigned_by (FK → users, cascadeDelete) · status enum(`active`,`inactive`) default `active` · task_status enum(`assigned`,`accepted`,`on_process`,`completed`) default `assigned` · accepted_at/started_at/completed_at timestamp nullable · note text nullable · timestamps
**Unique komposit** (`disposal_assign_batch_location_user_unique`): `(batch, location_actual, assigned_to)`

---

## `guide_categories`
id (PK) · category_key string unique · label string · icon string nullable · sort_order int default 0 · is_active boolean default true · timestamps

## `guide_pages`
id (PK) · guide_category_id (FK → guide_categories, cascadeDelete) · slug string · title string · subtitle string nullable · callout_text string nullable · tabs json nullable (`[{"label","steps","images"}]`) · steps json nullable (array of string) · images json nullable (`[{"path","caption"}]`) · note_text string nullable · sort_order int default 0 · is_published boolean default true · created_by/updated_by (FK → users, nullOnDelete) · timestamps
Unique komposit: `(guide_category_id, slug)`

---

## `daily_reminder_groups`
id (PK) · name string(100) · sort_order int default 0 · timestamps
*(Seed awal: Koordinator sort_order=0, Permit Team=1, Zone Manager=2)*

## `daily_reminder_templates`
id (PK) · group_id (FK → daily_reminder_groups, cascadeDelete, default = grup Koordinator) · scheduled_time time · label string · block_type enum(`checklist`,`auto_status`,`auto_exists`,`simple_checklist`) default `checklist` · day_offset unsignedTinyInt default 0 (0=hari ini, 1=besok) · sort_order unsignedInt default 0 · is_active boolean default true · timestamps

## `daily_reminder_assignments`
id (PK) · user_id (FK → users, cascadeDelete), unique (1 user = 1 assignment aktif) · group_id (FK → daily_reminder_groups, cascadeDelete, default = grup Koordinator) · assigned_by (FK → users, nullOnDelete) nullable · is_active boolean default true · timestamps

## `daily_reminder_checklist` *(nama tabel singular, bukan "checklists")*
id (PK) · user_id (FK → users, cascadeDelete) · template_id (FK → daily_reminder_templates, cascadeDelete) · ticket_number string(50) nullable (NULL = item "Urgent" custom, bukan dari daily_activity) · site_id string(50) nullable · pic_team string(100) nullable · custom_label string nullable (wajib diisi kalau ticket_number NULL) · date date · is_checked boolean default false · remark text nullable · checked_at timestamp nullable · timestamps
Index: `(user_id, date)`, `(template_id, date)`

> Catatan: tabel `daily_reminder_logs` dari migration awal sudah di-drop & digantikan `daily_reminder_checklist` — JANGAN dibuat di rebuild, ini historical dead-end.

---

## Ringkasan Tabel per Modul (referensi cepat)
| Modul | Tabel |
|---|---|
| Core/Auth/RBAC | users, regions, menus, submenus, user_regions, user_menus, user_submenus, + Spatie permission tables |
| Import CSV / Tracker | ticket_clean, asset_clean, workinfo_clean, tracker, tracker_manual_raw, tracker_manual_update |
| Daily Activity | daily_activity, timesheet, activity_photos |
| Site Map | site_map_cache |
| Mode Tracking | user_positions, settings |
| BoQ | boq_calculation |
| Inbound Tracking | warehouses, inbound_tracker |
| Disposal Asset | disposal_assets, disposal_pickups, disposal_receives, disposal_assignments |
| KickOff/KOM | kom_projects, kom_sites, kom_org_chart, kom_sow_schedule |
| Daily Reminder | daily_reminder_groups, daily_reminder_templates, daily_reminder_assignments, daily_reminder_checklist |
| User Guide | guide_categories, guide_pages |

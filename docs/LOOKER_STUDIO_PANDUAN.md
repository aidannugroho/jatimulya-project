# Panduan Looker Studio — Jatimulya Residence

Dokumen ini mencatat data source, field, parameter, struktur dashboard, dan langkah QA untuk pelaporan organik Jatimulya Residence. GA4 tetap menjadi source of truth; Looker Studio hanya layer presentasi.

## 1. Akun dan identifier

| Item | Nilai |
| --- | --- |
| Akun Google | `aidanrn06@gmail.com` |
| Properti GA4 | `a416061740p564000201` |
| Stream GA4 | `Proyek Jatimulya`, Stream ID `16327734224`, Measurement ID `G-08HP2WJY16` |
| GTM | `GTM-MW44LLLB`, workspace version 3 |
| Search Console | `https://jatimulya-project.pages.dev/` (ownership verified via HTML tag) |
| Report Looker Studio | `ea0713a6-06c2-45f0-91f8-1091d035fe7c` — **Dashboard Jatimulya Residence** |
| URL report | https://datastudio.google.com/u/0/reporting/ea0713a6-06c2-45f0-91f8-1091d035fe7c |

> Report harus dibuka dengan konteks `/u/0/`. Saat dibuka tanpa `/u/0/`, data source CRM yang baru dibuat tidak muncul di panel **Add data**.

## 2. Data source

| Nama data source | ID | Connector | Scope | Catatan |
| --- | --- | --- | --- | --- |
| `GA4 - Jatimulya Residence` | `580f8394-f8e0-4b75-969e-fd8d0148297e` | Google Analytics 4 | Reusable, freshness 12 jam | Berisi parameter `Metric Mode` dan calculated field `JR Value` |
| `GSC - Jatimulya Residence` | `d9616dc6-1cfb-4ea2-b0b9-38c54cc5244d` | Google Search Console | Reusable, freshness 12 jam | Site `https://jatimulya-project.pages.dev/`, tabel `Site Impression` + `Url Impression`, search type `web` |
| `CRM Leads - Jatimulya Residence` | `db22dfbc-bcda-4772-8bbe-ae9b2c741671` | Google Sheets | Reusable, freshness 15 menit | Worksheet `leads`, range `A1:G1000` |
| `CRM Biaya - Jatimulya Residence` | `4a13f312-0a1f-4430-abb1-7e8807e4226d` | Google Sheets | Reusable, freshness 15 menit | Worksheet `biaya` |
| `CRM Target - Jatimulya Residence` | `1068dae7-5212-48ac-8721-a9e091a67e33` | Google Sheets | Reusable, freshness 15 menit | Worksheet `target` |

Google Sheet CRM: https://docs.google.com/spreadsheets/d/11QMxGFxZdjweFy2p3JlIKDug-TAtjBWn6h0ismVSlwI/edit

### Schema CRM

**`leads`**

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `Tanggal` | Date | Tanggal lead masuk |
| `Nama` | Text | Nama kontak |
| `Sumber` | Text | `Website`, `WhatsApp`, `Instagram`, `Datang langsung`, dll. |
| `Tipe unit` | Text | Tipe A / Tipe B |
| `Status` | Text | `Baru`, `Follow up`, `Visit`, `Booking`, `Tolak` |
| `Nilai` | Number | Nilai lead/booking dalam rupiah |
| `Catatan` | Text | Catatan internal |

**`biaya`**: `Bulan`, `Kategori`, `Jumlah`.  
**`target`**: `Bulan`, `Target lead`, `Target visit`, `Target booking`.

Baris `CONTOH - hapus` sengaja disisipkan di baris 2 setiap worksheet agar connector Google Sheets mengenali header. **Hapus baris contoh tersebut setelah data asli mulai diisi.**

## 3. Field GA4 untuk mode user unik

### Parameter `Metric Mode`

- Tipe: Text
- ID: `jr_metric_mode` (nama tampilan: `Metric Mode`)
- Nilai: `User Unik` / `Event`
- Default: `User Unik`

### Calculated field `JR Value`

```text
CASE WHEN Metric Mode = "User Unik" THEN Total users ELSE Event count END
```

Field ini dipakai sebagai metrik utama di semua scorecard dan grafik GA4. Dengan demikian, satu pengunjung yang melakukan beberapa event tidak dihitung berulang kali saat mode **User Unik** aktif.

### Filter wajib GA4

```text
Host name = jatimulya-project.pages.dev
```

Filter ini diperlukan karena data uji dari deployment preview ikut masuk ke properti GA4.

### Regex event yang masuk dashboard

```text
^(wa_klik|form_kirim|form_sukses|kpr_hitung|kpr_dp_pilih|kpr_wa_klik|unit_pilih|survei_jadwal|brosur_klik|peta_klik|peta_rute|peta_besar|telepon_klik|instagram_klik|scroll_kedalaman)$
```

`form_sukses` adalah Key event utama di GA4.

## 4. Field GSC

Field yang tersedia dan dipakai:

- `Date`
- `Query`
- `Landing Page`
- `Country`
- `Device Category`
- `Impressions`
- `Url Clicks`
- `URL CTR`
- `Average Position`
- Parameter `Search type = web`

Gunakan **`URL CTR`** bawaan connector. Calculated field `Organic CTR` dengan formula `SUM(Url Clicks) / SUM(Impressions)` tidak valid di connector ini.

## 5. Struktur dashboard

Report sudah memiliki 3 halaman dengan urutan berikut:

| Urutan | Page ID | Nama yang direncanakan | Isi |
| --- | --- | --- | --- |
| 1 | `cL5DG` | **Lead & Booking** | Scorecard lead, kontak, form sukses, kunjungan map, target vs realisasi; tabel status lead; biaya organik |
| 2 | `p_zweyha7h9d` | **Intent Pengunjung** | Event intent (WA, form, KPR, unit, peta, telepon, Instagram, scroll 90%), distribusi tipe unit/DP, lokasi klik |
| 3 | `p_ciz5w76h9d` | **Traffic Organik** | Klik, impresi, CTR, posisi rata-rata, query teratas, landing page teratas, perangkat dan negara |

> Status saat laporan ini dibuat: ketiga halaman dan kelima data source sudah tersedia di report, tetapi komponen chart belum berhasil ditempatkan lewat otomasi browser Looker Studio. Bagian 6 berisi langkah manual untuk menyelesaikannya.

## 6. Langkah menyelesaikan chart di UI Looker Studio

1. Buka report dengan URL `/u/0/reporting/ea0713a6-...`.
2. Ganti nama halaman: klik panah di samping nomor halaman di navigasi kiri → **Rename**.
3. Tambahkan kontrol di semua halaman:
   - **Date range control** dengan rentang default 28 hari terakhir.
   - **Dropdown control** dari field GA4 `Metric Mode`, default `User Unik`.
   - **Filter control** `Host name` = `jatimulya-project.pages.dev`.
   - Filter CRM `Status` dan `Sumber`.
4. Halaman **Lead & Booking**:
   - Scorecard `JR Value` untuk `form_sukses`, `wa_klik`, `telepon_klik`, `peta_rute`, `form_kirim`.
   - Scorecard CRM: `Record Count` dari `leads`, `SUM(Nilai)`, `SUM(Jumlah)` dari `biaya`, serta `Target lead`/`Target visit`/`Target booking` dari `target`.
   - Tabel `Status` vs `Record Count` dari `leads`.
5. Halaman **Intent Pengunjung**:
   - Bar chart `Event name` vs `JR Value` dengan filter regex pada bagian 3.
   - Tabel `tipe_unit`, `dp`, `harga`, `persen`, `link_location`.
   - Jangan menjumlahkan `Total users` lintas event; gunakan `JR Value` dan filter event per baris.
6. Halaman **Traffic Organik**:
   - Scorecard `Url Clicks`, `Impressions`, `URL CTR`, `Average Position`.
   - Time series `Date` vs `Url Clicks` dan `Impressions`.
   - Tabel `Query`, `Landing Page`, `Url Clicks`, `Impressions`, `URL CTR`, `Average Position`.
7. Simpan report, lalu gunakan **View** untuk memastikan filter dan parameter bekerja.

## 7. QA sebelum dipakai

- [ ] Mode `User Unik` menampilkan angka `Total users`, bukan `Event count`.
- [ ] Mode `Event` menampilkan jumlah event.
- [ ] Filter host hanya `jatimulya-project.pages.dev`.
- [ ] `form_sukses` masih terdaftar sebagai Key event di GA4.
- [ ] Tidak ada `page_view` doble; `G-08HP2WJY16` tidak disuntik langsung ke HTML.
- [ ] Data GSC 28 hari terakhir tidak kosong (query, klik, impresi, CTR, posisi).
- [ ] Sheet CRM mengisi scorecard setelah baris contoh dihapus dan data asli diisi.
- [ ] Tidak ada angka lead yang dobel karena penjumlahan user lintas event.

## 8. Catatan metrik organik

Karena tidak memakai iklan berbayar, metrik iklan diganti proxy organik:

| Metrik iklan | Padanan organik |
| --- | --- |
| Reach | Total users / returning users |
| Spend | `SUM(Jumlah)` dari sheet `biaya` |
| CTR | `URL CTR` GSC + rasio klik kontak dari GA4 |
| Frequency | Event per user (hanya untuk mode Event) |
| CPC / CPM | Biaya per klik organik / biaya per 1.000 impresi (turunan sheet biaya + GSC) |
| CPL | `SUM(Jumlah)` biaya ÷ jumlah lead dari sheet CRM |

Matrix Bisnis tetap memerlukan pengisian manual Google Sheet CRM untuk lead, visit, booking, unit terjual, dan biaya.

## 9. Rujukan terkait

- `docs/GA4_GTM_PANDUAN.md` — konfigurasi GTM/GA4, consent mode, dan daftar event.
- Search Console → **Links → Google Analytics** — tautan GA4 sudah dibuat pada `2026-11-21` oleh `Aidanrn06@gmail.com`.

# Panduan Event GA4 via GTM `GTM-MW44LLLB`

Dokumen ini mencatat konfigurasi final GTM dan GA4 untuk 15 event interaksi yang dikirim situs ke `window.dataLayer`.

## 1. Kondisi final

- Container GTM yang terpasang: **`GTM-MW44LLLB`**. Container lama `GTM-PJQH9WWD` sudah tidak dipakai.
- Versi live: **Version 3 – "GA4 + event tracking Jatimulya"** (2 tag, 1 trigger, 6 variabel).
- `page_view` tetap dikirim oleh tag **Google Tag - GA4** yang sudah ada sejak Version 2. Tag GA4 Event tidak membuat `page_view` tambahan.
- Mulai `2026-11-21`, GTM dimuat langsung dengan `async` dan **tidak lagi dibekukan** SureCookie. Sebelum ada keputusan, `analytics_storage: 'denied'` sehingga GA4 mengirim cookieless ping; setelah pengunjung menyetujui Analytics, `consent update` mengubah status menjadi `granted` dan cookie `_ga` dibuat.
- SureCookie tetap menampilkan banner, kategori **Functional** ditandai *Always Active*, dan tersedia tombol **Ubah Preferensi Cookie** di footer.
- `window.dataLayer` dibuat lebih awal, sehingga `dataLayer.push(...)` dari `assets/js/jr-fase-d.js` tetap antre dan dibaca begitu GTM aktif.
- `G-08HP2WJY16` tidak disuntikkan langsung ke HTML; GA4 tetap dikonfigurasi dari dalam container GTM.

## 2. Isi container GTM

### Tag

| Nama | Tipe | Firing trigger | Catatan |
| --- | --- | --- | --- |
| `Google Tag - GA4` | Google Tag | Initialization – All Pages | Tag ID `G-08HP2WJY16`; sumber `page_view` |
| `GA4 Event - JR Interaksi` | Google Analytics: GA4 Event | `JR - Custom Events` | Event name `{{Event}}`, Measurement ID `G-08HP2WJY16` |

### Trigger

Nama: **`JR - Custom Events`**  
Tipe: **Custom Event**  
Centang **Use regex matching**.

```text
^(wa_klik|form_kirim|form_sukses|kpr_hitung|kpr_dp_pilih|kpr_wa_klik|unit_pilih|survei_jadwal|brosur_klik|peta_klik|peta_rute|peta_besar|telepon_klik|instagram_klik|scroll_kedalaman)$
```

### Variabel Data Layer

| Nama variabel | Data Layer Variable Name | Version |
| --- | --- | --- |
| `DLV - dp` | `dp` | 2 |
| `DLV - tipe_unit` | `tipe_unit` | 2 |
| `DLV - sumber` | `sumber` | 2 |
| `DLV - link_location` | `link_location` | 2 |
| `DLV - harga` | `harga` | 2 |
| `DLV - persen` | `persen` | 2 |

Variabel bawaan `{{Event}}` dipakai sebagai Event name dan tidak perlu dibuat manual.

### Event Parameters pada tag GA4 Event

| Parameter name | Value |
| --- | --- |
| `dp` | `{{DLV - dp}}` |
| `tipe_unit` | `{{DLV - tipe_unit}}` |
| `sumber` | `{{DLV - sumber}}` |
| `link_location` | `{{DLV - link_location}}` |
| `harga` | `{{DLV - harga}}` |
| `persen` | `{{DLV - persen}}` |

Parameter yang tidak dikirim oleh suatu event akan kosong/terlewat; itu normal.

## 3. Custom dimension GA4

Di GA4 → **Admin → Custom definitions → Custom dimensions**, sudah dibuat 6 custom dimension dengan scope **Event**:

- `dp`
- `tipe_unit`
- `sumber`
- `link_location`
- `harga`
- `persen`

Nama dimension sama persis dengan nama parameter di GTM agar bisa dipakai di report/exploration.

## 4. Daftar event dan parameter yang dikirim situs

| Event | Parameter yang dikirim | Pemicu di situs |
| --- | --- | --- |
| `wa_klik` | `link_location` | Semua tautan WhatsApp |
| `form_kirim` | `tipe_unit`, `sumber` | Submit form konsultasi |
| `form_sukses` | `sumber` | Formspree balas OK |
| `kpr_hitung` | `harga` | Slider harga KPR, 900 ms setelah berhenti digeser |
| `kpr_dp_pilih` | `dp` | Tombol pilihan DP 10/20/30% |
| `kpr_wa_klik` | – | Tombol kirim simulasi via WhatsApp |
| `unit_pilih` | `tipe_unit` | Tombol Tanya Tipe A/B via WhatsApp |
| `survei_jadwal` | `tipe_unit` | Tombol jadwalkan survei via WhatsApp |
| `brosur_klik` | `link_location` | Tautan menuju `/brosur` |
| `peta_klik` | `link_location` | Tautan peta tanpa atribut `data-jr-track` |
| `peta_rute` | `link_location` | Tombol "Rute di Google Maps" |
| `peta_besar` | `link_location` | Tautan "Buka peta besar" |
| `telepon_klik` | `link_location` | Tautan `tel:` |
| `instagram_klik` | `link_location` | Tautan Instagram |
| `scroll_kedalaman` | `persen` | Gulir mencapai 25/50/75/90% (sekali per mark) |

`link_location` berisi id section terdekat, misalnya `jr-unit-picker`, `jr-kontak-grid`, atau judul halaman sebagai fallback.

## 5. Verifikasi produksi

1. Pastikan deploy Cloudflare Pages berstatus `success` untuk commit terbaru.
2. Buka `https://jatimulya-project.pages.dev` dengan incognito. Di console, pastikan `dataLayer` berisi `consent default` dengan `analytics_storage: 'denied'` dan `functionality_storage: 'granted'`.
3. Di Network tab, pastikan `gtm.js?id=GTM-MW44LLLB` dimuat **sebelum** pengunjung memilih di banner.
4. Pastikan request `collect` tetap ada untuk `en=page_view`.
5. Klik salah satu tombol WhatsApp, lalu cek request `collect` dengan `en=wa_klik` dan parameter `link_location`.
6. Cek GA4 → **Realtime** atau **DebugView**; event yang sama harus muncul beserta parameternya.
7. Klik tombol **Ubah Preferensi Cookie** di footer; modal harus terbuka dalam bahasa Indonesia dan status dapat diubah. Setelah selesai uji, kembalikan consent Analytics menjadi **declined**.

## 6. Troubleshooting

| Gejala | Penyebab likely | Perbaikan |
| --- | --- | --- |
| Event ada di `dataLayer`, tapi tidak ada tag yang fire di Preview | Trigger regex salah / belum publish | Pastikan regex persis seperti bagian 2, lalu publish ulang |
| Tag fire, tapi GA4 Realtime kosong | Measurement ID salah atau GTM belum publish | Cek Measurement ID di tag GA4 Event dan status publish |
| Tidak ada event sama sekali di Preview | `gtm.js` gagal dimuat atau GTM belum publish | Cek Network untuk `gtm.js?id=GTM-MW44LLLB`, lalu publish ulang container |
| Parameter kosong di GA4 | Nama Data Layer Variable salah | Samakan persis dengan tabel variabel |
| `page_view` doble | Tag GA4 Event disalahartikan sebagai tag konfigurasi | Biarkan hanya `Google Tag - GA4` yang fire di Initialization/All Pages |

## 7. Catatan rilis

- Container: `GTM-MW44LLLB`
- Versi live: `3`
- Nama versi: `GA4 + event tracking Jatimulya`
- Measurement ID GA4: `G-08HP2WJY16`
- Tanggal publish: `2026-11-20`

## 8. Migrasi Consent Mode — 2026-11-21

Perubahan ini tidak mengubah container GTM, trigger, variabel, maupun parameter event. Yang berubah hanya cara GTM dimuat dan sinyal consent yang dikirim ke GA4.

| Aspek | Sebelum | Sesudah |
| --- | --- | --- |
| Snippet GTM | `type="text/plain"` + `data-surecookie-category` | `<script async src="...GTM-MW44LLLB">` |
| `consent default` | Tidak ada | `analytics_storage: 'denied'`, `functionality_storage: 'granted'`, `wait_for_update: 500` |
| `gcm_enabled` | `""` | `"1"` |
| `functional.required` | `false` | `true` (Always Active) |
| `analytics.required` | `false` | `false` (tetap bisa ditolak) |
| Sebelum pilih | GTM tidak jalan | GTM jalan, cookieless ping |
| Reject All | GTM mati | GTM jalan, tetap `denied` |
| Accept All | GTM baru jalan | Status berubah `granted`, `_ga` dibuat |
| Teks banner/modal | Bahasa Inggris | Bahasa Indonesia |
| Tombol footer | Tidak ada | **Ubah Preferensi Cookie** |

Tombol footer memakai atribut bawaan SureCookie `data-surecookie-reconsent`, sehingga tidak ada JavaScript kustom yang ditambahkan. Terjemahan modal disuntik lewat `wp.i18n.setLocaleData(..., 'surecookie')` sebelum `public.js` berjalan.

**Perbandingan data:** angka `page_view`, `wa_klik`, dan event lain akan naik mulai tanggal migrasi karena traffic yang sebelumnya hilang kini masuk sebagai cookieless ping. Gunakan filter tanggal saat membandingkan dengan periode sebelum `2026-11-21`.

## 9. Integrasi Search Console — 2026-11-21

- Properti GSC `https://jatimulya-project.pages.dev/` sudah diverifikasi dengan meta tag `google-site-verification`.
- Meta tag terpasang di `index.html`, `kontak/index.html`, `layanan/index.html`, dan `tentang-kami/index.html`.
- Link **GA4 ↔ Search Console** sudah dibuat:
  - Property GA4: `a416061740p564000201`
  - Web stream: `Proyek Jatimulya`, Stream ID `16327734224`
  - Situs: `https://jatimulya-project.pages.dev/`
  - Prefix URL: `https://jatimulya-project.pages.dev/`
  - Pembuat: `Aidanrn06@gmail.com`
  - Tanggal: `2026-11-21`
- `form_sukses` sudah ditandai sebagai **Key event** utama di GA4.
- Data source Looker Studio dan struktur dashboard ada di `docs/LOOKER_STUDIO_PANDUAN.md`.
- Dashboard memfilter `Host name` exactly `jatimulya-project.pages.dev` agar data uji preview domain tidak ikut dihitung.

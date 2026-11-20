# Panduan Event GA4 via GTM `GTM-MW44LLLB`

Dokumen ini mencatat konfigurasi final GTM dan GA4 untuk 15 event interaksi yang dikirim situs ke `window.dataLayer`.

## 1. Kondisi final

- Container GTM yang terpasang: **`GTM-MW44LLLB`**. Container lama `GTM-PJQH9WWD` sudah tidak dipakai.
- Versi live: **Version 3 – "GA4 + event tracking Jatimulya"** (2 tag, 1 trigger, 6 variabel).
- `page_view` tetap dikirim oleh tag **Google Tag - GA4** yang sudah ada sejak Version 2. Tag GA4 Event tidak membuat `page_view` tambahan.
- Script GTM dibekukan SureCookie sampai pengunjung menyetujui kategori **Analytics**. Event baru masuk GA4 hanya untuk pengunjung yang menerima cookie analytics.
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
2. Buka `https://jatimulya-project.pages.dev`, terima kategori **Analytics** di banner SureCookie.
3. Di Network tab, pastikan `gtm.js?id=GTM-MW44LLLB` dimuat.
4. Pastikan request `collect` tetap ada untuk `en=page_view`.
5. Klik salah satu tombol WhatsApp, lalu cek request `collect` dengan `en=wa_klik` dan parameter `link_location`.
6. Cek GA4 → **Realtime** atau **DebugView**; event yang sama harus muncul beserta parameternya.
7. Setelah selesai uji, kembalikan consent Analytics menjadi **declined**.

## 6. Troubleshooting

| Gejala | Penyebab likely | Perbaikan |
| --- | --- | --- |
| Event ada di `dataLayer`, tapi tidak ada tag yang fire di Preview | Trigger regex salah / belum publish | Pastikan regex persis seperti bagian 2, lalu publish ulang |
| Tag fire, tapi GA4 Realtime kosong | Measurement ID salah atau GTM belum publish | Cek Measurement ID di tag GA4 Event dan status publish |
| Tidak ada event sama sekali di Preview | Cookie Analytics belum disetujui (SureCookie membekukan GTM) | Terima kategori Analytics atau uji di Preview setelah consent |
| Parameter kosong di GA4 | Nama Data Layer Variable salah | Samakan persis dengan tabel variabel |
| `page_view` doble | Tag GA4 Event disalahartikan sebagai tag konfigurasi | Biarkan hanya `Google Tag - GA4` yang fire di Initialization/All Pages |

## 7. Catatan rilis

- Container: `GTM-MW44LLLB`
- Versi live: `3`
- Nama versi: `GA4 + event tracking Jatimulya`
- Measurement ID GA4: `G-08HP2WJY16`
- Tanggal publish: `2026-11-20`

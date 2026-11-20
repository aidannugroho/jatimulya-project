# Panduan Mengaktifkan Event GA4 via GTM `GTM-PJQH9WWD`

Dokumen ini menjelaskan cara membuat trigger dan tag di Google Tag Manager agar 15 event yang sudah dikirim situs ke `window.dataLayer` benar-benar masuk ke GA4.

## 1. Kondisi saat ini

- Container GTM yang terpasang: **GTM-PJQH9WWD**.
- Script GTM di halaman dibekukan oleh SureCookie sampai pengunjung menyetujui kategori **Analytics**. Jadi event baru masuk GA4 untuk pengunjung yang menerima cookie analytics. Ini sesuai desain consent saat ini.
- `window.dataLayer` dibuat lebih awal, sehingga semua `dataLayer.push(...)` dari `assets/js/jr-fase-d.js` tetap antre dan dibaca begitu GTM aktif.
- Event sudah terlihat di `dataLayer`, tetapi **belum otomatis menjadi event GA4** sampai tag dikonfigurasi dan container di-publish.

## 2. Prasyarat

1. Akses edit + publish ke container **GTM-PJQH9WWD**.
2. GA4 Measurement ID: **`G-08HP2WJY16`** (sudah diberikan; diambil dari GA4 → Admin → Data Streams → Web → Measurement ID).
3. (Disarankan) akses ke GA4 → Admin → DebugView untuk verifikasi.

## 3. Cek / buat tag Google Tag (GA4 configuration)

Di GTM: **Tags → New**

| Field | Nilai |
| --- | --- |
| Tag Type | **Google Tag** |
| Tag ID | `G-08HP2WJY16` |
| Triggering | **Initialization – All Pages** (atau `All Pages` jika opsi itu yang tersedia) |

Simpan dengan nama misalnya `GA4 - Configuration`. Jika tag seperti ini sudah ada, cukup pastikan Tag ID-nya benar dan trigger-nya All Pages.

## 4. Buat variabel Data Layer

Di GTM: **Variables → New → Built-In → Data Layer Variable**. Buat 6 variabel ini:

| Nama variabel | Data Layer Variable Name |
| --- | --- |
| `DLV - dp` | `dp` |
| `DLV - tipe_unit` | `tipe_unit` |
| `DLV - sumber` | `sumber` |
| `DLV - link_location` | `link_location` |
| `DLV - harga` | `harga` |
| `DLV - persen` | `persen` |

GTM sudah memiliki variabel bawaan **`{{Event}}**` yang berisi nama event yang sedang diproses. Tidak perlu dibuat manual.

## 5. Buat satu trigger untuk ke-15 event

Di GTM: **Triggers → New**

| Field | Nilai |
| --- | --- |
| Trigger Type | **Custom Event** |
| Nama | `JR - Semua Event Kustom` |
| Pilih | **Some Custom Events** |
| Condition | `Event name` **matches RegEx** |
| Value | lihat baris di bawah |

```text
^(wa_klik|form_kirim|form_sukses|kpr_hitung|kpr_dp_pilih|kpr_wa_klik|unit_pilih|survei_jadwal|brosur_klik|peta_klik|peta_rute|peta_besar|telepon_klik|instagram_klik|scroll_kedalaman)$
```

> Cara ini lebih ringkas daripada membuat 15 trigger terpisah. Jika kamu ingin pelacakan per event lebih terpisah, boleh membuat 15 trigger Custom Event dengan nama persis sesuai daftar atas, lalu memakai semuanya pada tag yang sama.

## 6. Buat satu tag GA4 Event

Di GTM: **Tags → New**

| Field | Nilai |
| --- | --- |
| Tag Type | **Google Analytics: GA4 Event** |
| Nama tag | `JR - GA4 Event (semua event)` |
| Configuration Tag | pilih tag `GA4 - Configuration` dari langkah 3 |
| Event name | `{{Event}}` |
| Triggering | `JR - Semua Event Kustom` |

Tambahkan **Event Parameters** berikut (masing-masing centang "Send in GA4" jika tersedia):

| Parameter name | Value |
| --- | --- |
| `dp` | `{{DLV - dp}}` |
| `tipe_unit` | `{{DLV - tipe_unit}}` |
| `sumber` | `{{DLV - sumber}}` |
| `link_location` | `{{DLV - link_location}}` |
| `harga` | `{{DLV - harga}}` |
| `persen` | `{{DLV - persen}}` |

Parameter yang tidak dikirim oleh suatu event akan otomatis kosong/terlewat; itu normal.

Simpan tag, lalu **Submit → Publish** dengan nama versi misalnya `Jatimulya - GA4 custom events`.

## 7. Daftar event dan parameter yang dikirim situs

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

## 8. Verifikasi

1. Di GTM klik **Preview**, masukkan `https://jatimulya-project.pages.dev`, lalu pilih halaman yang terbuka di Tag Assistant.
2. Terima cookie kategori **Analytics** di banner SureCookie (jika belum), karena GTM baru jalan setelah consent.
3. Klik salah satu tombol WhatsApp, lalu di panel Preview cek:
   - event `wa_klik` muncul,
   - tag `JR - GA4 Event (semua event)` **Fired**,
   - Event name = `wa_klik`, parameter `link_location` terisi.
4. Buka GA4 → **Admin → DebugView** saat Preview masih aktif; event yang sama harus muncul dengan parameter.
5. Setelah publish, cek GA4 → **Realtime** sambil melakukan klik di situs produksi.

Catatan: GTM Preview biasanya meneruskan event ke DebugView. Jika tidak muncul, tambahkan sementara parameter `debug_mode` dengan nilai `true` pada tag hanya untuk pengujian, lalu hapus sebelum publish akhir.

## 9. Troubleshooting

| Gejala | Penyebab likely | Perbaikan |
| --- | --- | --- |
| Event ada di `dataLayer`, tapi tidak ada tag yang fire di Preview | Trigger regex salah / belum publish | Pastikan regex persis seperti langkah 5, lalu publish ulang |
| Tag fire, tapi GA4 Realtime kosong | Measurement ID salah atau GTM belum publish | Cek Tag ID di langkah 3 dan status publish |
| Tidak ada event sama sekali di Preview | Cookie Analytics belum disetujui (SureCookie membekukan GTM) | Terima kategori Analytics atau uji di mode Preview setelah consent |
| Parameter kosong di GA4 | Nama Data Layer Variable salah | Samakan persis dengan tabel langkah 4 |
| Event dulunya ada, sekarang hilang | Ad blocker / browser privacy setting | Uji di profil browser bersih atau nonaktifkan blocker untuk pengujian |

## 10. Setelah selesai

Catat di sini versi GTM yang sudah di-publish dan tanggal verifikasi:

- Versi GTM: __________
- Tanggal verifikasi DebugView: __________
- Measurement ID GA4: `G-08HP2WJY16`

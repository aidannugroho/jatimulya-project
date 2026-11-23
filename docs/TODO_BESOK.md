# Tugas lanjutan — besok

Disimpan dari laporan eksekusi optimalisasi Google Search Console, 22 November 2026.

## Google Search Console

- [ ] Cek ulang status sitemap `https://jatimulya-project.pages.dev/sitemap.xml` di **Sitemaps**. Status terakhir masih `Couldn't fetch` dengan `Discovered pages = 0`, meskipun Live Test GSC menyatakan URL tersedia untuk Google dan respons Googlebot `200`.
- [ ] Jika masih gagal, periksa log crawler Cloudflare Pages / coba submit ulang sitemap.
- [ ] Lanjutkan **Request Indexing** untuk 4 URL yang tertunda karena kuota harian Google habis:
  - `https://jatimulya-project.pages.dev/tentang-kami/`
  - `https://jatimulya-project.pages.dev/layanan/`
  - `https://jatimulya-project.pages.dev/kontak/`
  - `https://jatimulya-project.pages.dev/brosur`
  - Homepage sudah berhasil masuk priority crawl queue.
- [ ] Setelah Google selesai memproses data, cek Performance 28 hari: `Query`, `Url Clicks`, `Impressions`, `URL CTR`, `Average Position`. Status terakhir: `Processing data, please check again in a day or so`.
- [ ] Cek Indexing → Pages dan URL Inspection untuk kelima URL setelah kuota tersedia.

## Looker Studio

- [ ] Selesaikan chart dan kontrol pada `Dashboard Jatimulya Residence` (`ea0713a6-06c2-45f0-91f8-1091d035fe7c`) sesuai `docs/LOOKER_STUDIO_PANDUAN.md` bagian 6.
- [ ] Ganti nama 3 halaman menjadi **Lead & Booking**, **Intent Pengunjung**, **Traffic Organik**.
- [ ] Pastikan parameter `Metric Mode` berfungsi: `User Unik` memakai `Total users`, `Event` memakai `Event count`.
- [ ] QA akhir: filter GA4 `Host name` exactly `jatimulya-project.pages.dev`, `form_sukses` tetap Key event, tidak ada dobel `page_view`.

## Konten

- [ ] Ulasan asli Jatimulya Residence belum tersedia. Slot testimoni saat ini memakai ulasan Grand Wisma Residence yang sudah diberi label sebagai proyek sebelumnya. Jangan mengarang testimoni.

## Selesai pada 23 November 2026

- [x] Halaman baru `/pilih-rumah-anda/` berisi `#jr-kalkulator`, `#jr-unit-picker`, dan `#jr-survei`; menu dan Tautan Cepat diperbarui di semua halaman utama.
- [x] Urutan halaman Kontak: Detail Kontak → Konsultasi Gratis → Diskusikan Rumah Impianmu + gambar. Paragraf deskripsi lama diarsipkan di `docs/arsip/kontak-deskripsi-lama.txt`.
- [x] Sitemap, robots, dan indeks pencarian diperbarui untuk halaman baru.
- [x] Backend admin `/admin/` + Pages Functions (`/api/leads`, `/api/admin/*`) dengan D1 `JR_LEADS_DB` dan KV `JR_ADMIN_KV`.
- [x] Form kontak kini mengirim ke `/api/leads`, menyimpan arsip lead ke D1, lalu meneruskan notifikasi ke Formspree.
- [x] Secret `ADMIN_PASSWORD_HASH` dan `ADMIN_SESSION_SECRET` disimpan sebagai Pages secret; nilai tidak pernah ditulis ke repo.

## Masih perlu tindak lanjut

- [ ] Pasang secret `GA4_SERVICE_ACCOUNT_JSON` setelah service account dibuat dan diberi akses **Viewer** pada property GA4.
- [ ] Isi data asli ke worksheet `leads`, `biaya`, `target` dan hapus semua baris `CONTOH - hapus`.
- [ ] Tambahkan URL `https://jatimulya-project.pages.dev/pilih-rumah-anda/` ke antrean Request Indexing GSC setelah kuota harian tersedia.
- [ ] Verifikasi `page_view` halaman baru di GA4 Realtime setelah deploy produksi.

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

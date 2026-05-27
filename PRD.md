# PRD - Panin DocFlow

## 1. Ringkasan Produk

Panin DocFlow adalah web app SaaS internal untuk membantu kantor Panin Bank mengelola surat masuk dan invoice masuk secara rapi, cepat, aman, dan real time. Aplikasi ini digunakan oleh Admin dan Resepsionis untuk mencatat dokumen, mengunggah lampiran, mencari data, memantau status, melihat aktivitas terbaru, dan membuat laporan operasional.

Produk ini berfokus pada kebutuhan kerja harian resepsionis: input cepat, pencarian cepat, status dokumen jelas, data tersusun rapi, dan dashboard yang mudah dipindai.

## 2. Tujuan Produk

- Membuat sistem pencatatan surat masuk dan invoice masuk yang terpusat.
- Mengurangi pencatatan manual dan risiko data tercecer.
- Memudahkan resepsionis melacak status dokumen secara real time.
- Memudahkan Admin mengelola user, departemen, kategori, dan audit log.
- Menyediakan dashboard operasional yang clean, terang, profesional, dan cocok untuk lingkungan bank.
- Menyediakan aplikasi yang production-ready, deployable ke Vercel, dan siap disimpan ke GitHub.

## 3. Target Pengguna

### Admin

Admin adalah pengguna dengan akses penuh untuk mengelola sistem, data master, dokumen, laporan, dan audit log.

### Resepsionis

Resepsionis adalah pengguna operasional utama yang bertugas mencatat surat masuk dan invoice masuk, mengunggah lampiran, mencari dokumen, serta memperbarui status dokumen.

## 4. Role dan Hak Akses

### Admin

Admin memiliki hak akses sebagai berikut:

- Mengelola user.
- Mengelola departemen.
- Mengelola kategori dokumen.
- Melihat semua data surat dan invoice.
- Membuat, membaca, mengubah, menghapus, dan mengarsipkan dokumen.
- Melihat audit log global.
- Melihat dan mengekspor laporan.

### Resepsionis

Resepsionis memiliki hak akses sebagai berikut:

- Membuat surat masuk.
- Membuat invoice masuk.
- Mengunggah lampiran atau scan dokumen.
- Melihat semua dokumen operasional.
- Mencari dan memfilter dokumen.
- Memperbarui status dokumen.
- Mengedit dokumen yang dibuat sendiri.
- Melihat dashboard operasional.
- Melihat laporan terbatas.

Resepsionis tidak boleh:

- Menghapus dokumen secara permanen.
- Mengelola user.
- Mengelola departemen.
- Mengelola kategori.
- Melihat audit log global.

## 5. Scope Produk

### In Scope

- Authentication dan protected route.
- Role-based access control untuk Admin dan Resepsionis.
- Dashboard operasional.
- Manajemen surat masuk.
- Manajemen invoice masuk.
- Upload dan preview lampiran.
- Pencarian global dan filter cepat.
- Realtime update untuk data baru dan perubahan status.
- Timeline aktivitas per dokumen.
- Audit log untuk Admin.
- Laporan dan export CSV/XLSX.
- Database PostgreSQL via Supabase.
- Supabase Auth, Storage, Realtime, dan Row Level Security.
- Deployment-ready untuk Vercel.
- Dokumentasi setup project.

### Out of Scope

Fitur berikut tidak dibuat pada versi ini:

- Role Finance.
- Role Manager atau Viewer.
- Prioritas surat.
- Kerahasiaan surat.
- Tanggal invoice.
- Tanggal jatuh tempo invoice.
- Mata uang invoice.
- Nomor PO/SPK.
- NPWP.
- Status invoice khusus.
- Payment tracking.
- Overdue invoice.
- Due soon invoice.
- Dark mode sebagai default.
- Landing page marketing.

## 6. Tech Stack

- Framework: Next.js terbaru dengan App Router.
- Language: TypeScript.
- Styling: Tailwind CSS.
- UI library: shadcn/ui.
- Icons: lucide-react.
- Database: PostgreSQL menggunakan Supabase.
- Authentication: Supabase Auth.
- File upload: Supabase Storage.
- Realtime tracking: Supabase Realtime.
- Form: react-hook-form.
- Validation: zod.
- Table: TanStack Table.
- Chart: Recharts.
- Deployment: Vercel.
- Source control: GitHub.
- Package manager: pnpm.

## 7. Prinsip UI/UX

Panin DocFlow harus terasa seperti aplikasi kerja internal bank yang matang: terang, rapi, cepat, dan profesional. Aplikasi tidak boleh terasa seperti demo sederhana atau template generik.

Prinsip desain:

- Gunakan layout sidebar kiri dan top bar.
- Halaman pertama setelah login adalah dashboard, bukan landing page.
- Gunakan warna putih, abu muda, biru navy/royal, dan aksen merah Panin secukupnya.
- Dashboard harus padat namun mudah dipindai.
- Gunakan card hanya untuk metrik penting dan item berulang.
- Gunakan tabel utama yang kuat untuk pencarian, filter, sorting, dan pagination.
- Gunakan ikon lucide pada tombol yang relevan.
- Gunakan bahasa Indonesia yang profesional.
- Pastikan tampilan responsive untuk desktop, tablet, dan mobile.
- Sediakan loading state, empty state, error state, success state, dan confirmation dialog.
- Hindari teks instruksi panjang di dalam aplikasi.
- Hindari tampilan terlalu gelap, terlalu ramai, atau terlalu dekoratif.

## 8. Struktur Navigasi

Halaman yang harus tersedia:

- `/login`
- `/dashboard`
- `/documents`
- `/documents/new`
- `/documents/[id]`
- `/invoices`
- `/reports`
- `/settings/users`
- `/settings/departments`
- `/settings/categories`
- `/audit-log`

Hak akses halaman:

- `/dashboard`: Admin dan Resepsionis.
- `/documents`: Admin dan Resepsionis.
- `/documents/new`: Admin dan Resepsionis.
- `/documents/[id]`: Admin dan Resepsionis.
- `/invoices`: Admin dan Resepsionis.
- `/reports`: Admin dan Resepsionis, dengan akses terbatas untuk Resepsionis.
- `/settings/users`: hanya Admin.
- `/settings/departments`: hanya Admin.
- `/settings/categories`: hanya Admin.
- `/audit-log`: hanya Admin.

## 9. Fitur Authentication

### Deskripsi

Sistem login digunakan untuk memastikan hanya user terdaftar yang dapat mengakses aplikasi.

### Requirement

- User dapat login.
- User dapat logout.
- Route penting harus protected.
- Session harus aman dan otomatis dikenali.
- Role user harus menentukan akses halaman dan aksi.
- Hanya role `ADMIN` dan `RECEPTIONIST` yang digunakan.

### Acceptance Criteria

- User tanpa session diarahkan ke `/login`.
- User login diarahkan ke `/dashboard`.
- Resepsionis tidak dapat membuka halaman khusus Admin.
- Service role key tidak pernah terekspos ke client.

## 10. Fitur Dashboard

### Deskripsi

Dashboard adalah halaman utama setelah login. Dashboard menampilkan ringkasan aktivitas surat dan invoice secara real time.

### Komponen Dashboard

Top row:

- Total Surat Hari Ini.
- Total Invoice Hari Ini.
- Dokumen Bulan Ini.
- Dokumen Diproses.

Middle section:

- Chart tren surat dan invoice.
- Aktivitas terbaru realtime.

Bottom section:

- Tabel dokumen terbaru dengan filter cepat.

Quick actions:

- Tambah Surat.
- Tambah Invoice.
- Export Laporan.

### Metrik Dashboard

- Total surat masuk hari ini.
- Total invoice masuk hari ini.
- Total dokumen bulan ini.
- Dokumen baru.
- Dokumen sedang diproses.
- Dokumen selesai.
- Dokumen diarsipkan.
- Grafik tren surat/invoice per minggu atau bulan.
- Aktivitas terbaru secara real time.

### Acceptance Criteria

- Dashboard tampil langsung setelah login.
- Data dashboard mengikuti role user.
- Data baru dan perubahan status muncul tanpa refresh jika realtime aktif.
- Dashboard tetap informatif ketika data kosong.

## 11. Fitur Manajemen Surat Masuk

### Deskripsi

Fitur ini digunakan untuk mencatat, melihat, mengedit, mencari, memperbarui status, dan mengarsipkan surat masuk.

### Field Surat Masuk

Field wajib:

- Nomor agenda otomatis.
- Tanggal dan waktu diterima.
- Pengirim.
- Ditujukan kepada.
- Departemen tujuan.
- Perihal.
- Kategori.
- Status.

Field opsional:

- Instansi/perusahaan pengirim.
- Catatan.
- Upload lampiran PDF/JPG/PNG.

Field yang tidak digunakan:

- Prioritas.
- Kerahasiaan.

### Status Surat

Surat menggunakan status dokumen umum:

- Baru.
- Didistribusikan.
- Diproses.
- Selesai.
- Diarsipkan.

### Flow Surat Masuk

1. User membuka halaman tambah surat.
2. User mengisi data surat.
3. Sistem membuat nomor agenda otomatis dengan format `SM/YYYY/MM/0001`.
4. User mengunggah lampiran jika ada.
5. Sistem menyimpan data ke tabel `documents`.
6. Sistem membuat event di `document_events`.
7. Dokumen muncul di dashboard, tabel dokumen, dan activity feed.

### Acceptance Criteria

- Nomor agenda surat dibuat otomatis.
- Surat baru memiliki status default `BARU`.
- Surat dapat dilihat di daftar dokumen.
- Detail surat menampilkan timeline aktivitas.
- Perubahan status membuat catatan event.
- Admin dapat edit, archive, dan delete.
- Resepsionis dapat edit dokumen yang dibuat sendiri dan update status.

## 12. Fitur Manajemen Invoice Masuk

### Deskripsi

Fitur ini digunakan untuk mencatat, melihat, mengedit, mencari, memperbarui status, dan mengarsipkan invoice masuk.

### Field Invoice Masuk

Field wajib:

- Nomor agenda otomatis.
- Nomor invoice.
- Vendor/pengirim.
- Tanggal diterima.
- Nominal.
- Departemen tujuan.
- PIC/penerima internal.

Field opsional:

- Catatan.
- Upload file invoice PDF/JPG/PNG.

Field yang tidak digunakan:

- Tanggal invoice.
- Tanggal jatuh tempo.
- Mata uang.
- Nomor PO/SPK.
- NPWP.
- Status invoice khusus.

Invoice mengikuti status dokumen umum dari tabel `documents`.

### Status Invoice

Invoice menggunakan status dokumen umum:

- Baru.
- Didistribusikan.
- Diproses.
- Selesai.
- Diarsipkan.

### Flow Invoice Masuk

1. User membuka halaman tambah invoice.
2. User mengisi data invoice.
3. Sistem membuat nomor agenda otomatis dengan format `INV/YYYY/MM/0001`.
4. User mengunggah file invoice jika ada.
5. Sistem menyimpan data utama ke tabel `documents`.
6. Sistem menyimpan detail invoice ke tabel `invoice_details`.
7. Sistem membuat event di `document_events`.
8. Invoice muncul di dashboard, tabel invoice, tabel dokumen, dan activity feed.

### Acceptance Criteria

- Nomor agenda invoice dibuat otomatis.
- Invoice baru memiliki status default `BARU`.
- Invoice dapat dilihat di daftar invoice dan daftar dokumen.
- Detail invoice menampilkan timeline aktivitas.
- Perubahan status membuat catatan event.
- Tidak ada fitur overdue, due soon, pembayaran, mata uang, atau status invoice khusus.

## 13. Status Dokumen Umum

Surat dan invoice menggunakan satu daftar status yang sama:

- `BARU`
- `DIDISTRIBUSIKAN`
- `DIPROSES`
- `SELESAI`
- `DIARSIPKAN`

Aturan status:

- Dokumen baru selalu default ke `BARU`.
- Perubahan status harus dicatat di `document_events`.
- Dokumen dengan status `DIARSIPKAN` disembunyikan dari tampilan default.
- Dokumen diarsipkan tetap dapat ditemukan melalui filter arsip.
- Delete permanen hanya dapat dilakukan Admin.

## 14. Pencarian dan Filter

### Global Search

User dapat mencari dokumen berdasarkan:

- Nomor agenda.
- Nomor invoice.
- Pengirim/vendor.
- Perihal.
- Departemen.
- Status.

### Filter

Filter yang tersedia:

- Jenis dokumen: Surat atau Invoice.
- Tanggal diterima.
- Status.
- Departemen.
- Pengirim/vendor.
- Kategori.

Filter yang tidak boleh dibuat:

- Prioritas.
- Kerahasiaan.
- Jatuh tempo.
- Mata uang.
- PO/SPK.
- NPWP.
- Status invoice khusus.

### Tabel Dokumen

Kolom tabel:

- Nomor agenda.
- Jenis.
- Tanggal diterima.
- Pengirim/vendor.
- Perihal.
- Departemen tujuan.
- Status.
- PIC/Penerima internal.
- Dibuat oleh.
- Aksi.

Aksi tabel:

- Lihat detail.
- Update status.
- Edit.
- Archive.
- Delete, hanya Admin.

### Acceptance Criteria

- Search berjalan cepat dan mudah digunakan.
- Filter dapat dikombinasikan.
- Tabel mendukung sorting.
- Tabel mendukung pagination.
- User dapat export CSV/XLSX dari hasil laporan.

## 15. Realtime Tracking

### Deskripsi

Realtime tracking digunakan agar dashboard dan activity feed selalu mencerminkan data terbaru tanpa perlu refresh manual.

### Requirement

- Dokumen baru muncul di dashboard dan tabel.
- Perubahan status muncul di activity feed.
- Toast notification muncul untuk perubahan penting.
- Aktivitas terbaru tampil tanpa refresh.

### Acceptance Criteria

- Jika user lain membuat dokumen baru, data muncul secara realtime.
- Jika status dokumen berubah, activity feed ikut berubah.
- Jika realtime gagal, aplikasi tetap dapat digunakan dengan data fetch biasa.

## 16. Timeline dan Audit Log

### Timeline Dokumen

Setiap dokumen memiliki timeline yang menampilkan:

- Dokumen dibuat oleh siapa.
- Kapan dokumen diterima.
- Kapan status berubah.
- Status sebelumnya.
- Status baru.
- Catatan perubahan.

### Audit Log Global

Audit log global hanya dapat diakses Admin dan berisi aktivitas penting di sistem.

Aktivitas yang dicatat:

- Dokumen dibuat.
- Dokumen diedit.
- Status dokumen berubah.
- Dokumen diarsipkan.
- Dokumen dihapus.
- Lampiran ditambahkan atau diubah.
- Data master dibuat atau diubah.

### Acceptance Criteria

- Timeline muncul di halaman detail dokumen.
- Semua perubahan status dicatat.
- Admin dapat membuka audit log global.
- Resepsionis tidak dapat membuka audit log global.

## 17. File Management

### Deskripsi

File management digunakan untuk menyimpan scan surat dan invoice.

### Requirement

- Upload file ke Supabase Storage.
- Format file yang diterima: PDF, JPG, PNG.
- Ukuran file harus dibatasi.
- Preview file PDF/gambar jika memungkinkan.
- File hanya dapat diakses user terautentikasi sesuai role.

### Acceptance Criteria

- User dapat upload lampiran saat membuat atau mengedit dokumen.
- File type tidak valid ditolak.
- File terlalu besar ditolak.
- Link file tidak terbuka untuk user tanpa izin.

## 18. Reports

### Deskripsi

Reports digunakan untuk melihat rekap surat dan invoice berdasarkan rentang tanggal dan filter operasional.

### Filter Reports

- Rentang tanggal.
- Jenis dokumen.
- Departemen.
- Status.
- Kategori.

### Output Reports

- Ringkasan jumlah surat.
- Ringkasan jumlah invoice.
- Tabel hasil laporan.
- Export CSV/XLSX.

### Tidak Dibuat

Reports tidak menampilkan:

- Overdue.
- Due soon.
- Jatuh tempo.
- Mata uang.
- Pembayaran.

### Acceptance Criteria

- Admin dapat melihat laporan lengkap.
- Resepsionis dapat melihat laporan terbatas.
- Export CSV/XLSX sesuai filter yang dipilih.

## 19. Database Schema Minimum

### `profiles`

- `id`
- `full_name`
- `email`
- `role`: `ADMIN` atau `RECEPTIONIST`
- `department_id`
- `avatar_url`
- `created_at`
- `updated_at`

### `departments`

- `id`
- `name`
- `code`
- `created_at`
- `updated_at`

### `document_categories`

- `id`
- `name`
- `type`: `LETTER`, `INVOICE`, atau `BOTH`
- `created_at`
- `updated_at`

### `documents`

- `id`
- `agenda_number`
- `type`: `LETTER` atau `INVOICE`
- `received_at`
- `sender_name`
- `sender_organization`
- `recipient_name`
- `department_id`
- `subject`
- `category_id`
- `status`: `BARU`, `DIDISTRIBUSIKAN`, `DIPROSES`, `SELESAI`, atau `DIARSIPKAN`
- `notes`
- `attachment_url`
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`
- `archived_at`

### `invoice_details`

- `id`
- `document_id`
- `invoice_number`
- `amount`
- `internal_pic`
- `created_at`
- `updated_at`

### `document_events`

- `id`
- `document_id`
- `actor_id`
- `event_type`
- `previous_status`
- `new_status`
- `message`
- `created_at`

### `document_comments`

- `id`
- `document_id`
- `actor_id`
- `comment`
- `created_at`

## 20. Business Logic

- Nomor agenda surat otomatis menggunakan format `SM/YYYY/MM/0001`.
- Nomor agenda invoice otomatis menggunakan format `INV/YYYY/MM/0001`.
- Nomor agenda berurutan per jenis dokumen, tahun, dan bulan.
- Surat dan invoice menggunakan status dokumen umum.
- Setiap perubahan status membuat record di `document_events`.
- Setiap dokumen baru muncul di realtime activity.
- Data yang diarsipkan tidak hilang, hanya disembunyikan dari tampilan default.
- Delete permanen hanya untuk Admin.
- Delete permanen wajib menggunakan confirmation dialog.

## 21. Validasi Form

### Surat Masuk

- `received_at` wajib.
- `sender_name` wajib.
- `sender_organization` opsional.
- `recipient_name` wajib.
- `department_id` wajib.
- `subject` wajib.
- `category_id` wajib.
- `status` default `BARU`.
- `notes` opsional.
- `attachment` opsional.
- Jika attachment diupload, format harus PDF/JPG/PNG.

### Invoice Masuk

- `received_at` wajib.
- `invoice_number` wajib.
- `sender_name` atau vendor wajib.
- `amount` wajib dan harus angka positif.
- `department_id` wajib.
- `internal_pic` wajib.
- `notes` opsional.
- `attachment` opsional.
- Jika attachment diupload, format harus PDF/JPG/PNG.
- `status` default `BARU` dari tabel `documents`.

## 22. Security Requirement

- Aktifkan Row Level Security pada tabel Supabase.
- Buat policy berdasarkan role Admin dan Resepsionis.
- Jangan expose service role key ke client.
- Semua input divalidasi dengan zod.
- Semua route penting harus protected.
- File upload dibatasi type dan size.
- Gunakan environment variables.
- Tambahkan audit log untuk perubahan status dan data penting.
- User hanya dapat menjalankan aksi sesuai permission.

## 23. Komponen UI Utama

- `AppSidebar`
- `Topbar`
- `MetricCard`
- `StatusBadge`
- `DocumentTypeBadge`
- `DocumentTable`
- `DocumentForm`
- `InvoiceForm`
- `SearchCommand`
- `FilterBar`
- `ActivityTimeline`
- `FileUploader`
- `ConfirmDialog`
- `EmptyState`
- `LoadingSkeleton`
- `RealtimeActivityFeed`
- `ExportButton`

## 24. Non-Functional Requirement

### Performance

- Dashboard dan tabel harus cepat dibuka.
- Search dan filter harus responsif.
- Pagination wajib digunakan pada daftar besar.

### Reliability

- Aplikasi tetap dapat digunakan walaupun realtime sementara gagal.
- Error harus ditampilkan dengan pesan yang jelas.
- Data penting tidak boleh hilang tanpa confirmation dialog.

### Maintainability

- Kode harus modular.
- Komponen UI reusable.
- Validasi form dipusatkan dengan zod schema.
- Database schema dan RLS policy didokumentasikan.

### Responsiveness

- Desktop adalah target utama.
- Tablet dan mobile tetap harus usable.
- Tabel harus memiliki strategi responsive yang baik.

## 25. Testing Requirement

Minimal testing:

- Unit test untuk zod schema.
- Unit test untuk helper nomor agenda.
- Integration test untuk create surat.
- Integration test untuk create invoice.
- E2E test untuk login.
- E2E test untuk tambah surat.
- E2E test untuk mencari surat.
- E2E test untuk update status dokumen.

Quality gate:

- Tidak ada TypeScript error.
- Build production berhasil.
- Halaman utama responsive.
- Empty state, loading state, error state, dan success state tersedia.

## 26. Deployment Requirement

Project harus siap deploy ke Vercel dan siap push ke GitHub.

Dokumentasi yang harus tersedia:

- Cara install dependency.
- Cara setup Supabase.
- Cara isi `.env.example`.
- Cara menjalankan migration atau SQL schema.
- Cara menjalankan development server.
- Cara menjalankan test.
- Cara build production.
- Cara deploy ke Vercel.
- Cara push ke GitHub.

Command yang harus didukung:

```bash
pnpm install
pnpm dev
pnpm build
pnpm test
```

## 27. Output Akhir

Output akhir development harus mencakup:

- Full source code web app.
- Database schema atau migration SQL.
- RLS policies.
- Seed data contoh.
- README.
- UI profesional, clean, terang, responsive.
- Tidak ada error build.
- Siap deploy ke Vercel.
- Siap disimpan ke GitHub.

## 28. Kriteria Sukses

Panin DocFlow dianggap berhasil jika:

- Admin dan Resepsionis dapat login sesuai role.
- Resepsionis dapat mencatat surat masuk dengan cepat.
- Resepsionis dapat mencatat invoice masuk dengan cepat.
- Dokumen dapat dicari dan difilter dengan mudah.
- Status dokumen jelas dan bisa diperbarui.
- Timeline aktivitas dokumen tercatat.
- Dashboard menampilkan data operasional yang berguna.
- Data baru dan perubahan status dapat muncul secara realtime.
- Admin dapat mengelola user, departemen, kategori, laporan, dan audit log.
- UI terlihat profesional, terang, bersih, dan cocok untuk aplikasi internal bank.
- Aplikasi dapat dibuild tanpa error dan siap dideploy.

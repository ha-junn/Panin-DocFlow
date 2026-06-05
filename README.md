# Panin DocFlow

Panin DocFlow adalah web app internal untuk mencatat, mencari, memonitor, melaporkan, dan membackup dokumen masuk serta invoice masuk untuk operasional Panin Bank HRM-GA.

Aplikasi ini memakai Next.js App Router, TypeScript, Tailwind CSS, Supabase Auth, Supabase PostgreSQL, Supabase Storage, dan Supabase Realtime.

## Fitur

- Login dengan Supabase Auth.
- Dashboard operasional dengan metric cards, tren mingguan, distribusi departemen, dan dokumen terbaru dari data real Supabase.
- Tambah dokumen masuk.
- Tambah invoice masuk.
- Tambah surat keluar batch untuk beberapa amplop sekaligus.
- Upload lampiran PDF, JPG, dan PNG.
- Detail dan edit dokumen.
- Detail invoice khusus di halaman invoice.
- Pencarian terpusat untuk dokumen dan invoice berdasarkan keyword, jenis, dan kategori.
- Laporan, backup bulanan, dan export CSV dalam satu halaman Laporan.
- Pengaturan departemen dan kategori.

## Struktur Project

```text
src/app/page.tsx                      Dashboard
src/app/documents/page.tsx            Daftar dokumen
src/app/documents/new/page.tsx        Tambah dokumen
src/app/documents/[id]/page.tsx       Detail dokumen
src/app/documents/[id]/edit/page.tsx  Edit dokumen
src/app/invoices/page.tsx             Daftar invoice
src/app/invoices/new/page.tsx         Tambah invoice
src/app/invoices/[id]/page.tsx        Detail invoice
src/app/outgoing/page.tsx             Daftar surat keluar
src/app/outgoing/new/page.tsx         Tambah surat keluar batch
src/app/outgoing/[id]/page.tsx        Detail surat keluar
src/app/search/page.tsx               Pencarian
src/app/reports/page.tsx              Laporan dan backup bulanan
src/app/backups/page.tsx              Redirect ke Laporan
src/app/backups/export/route.ts       Export CSV backup bulanan
src/app/settings/departments/page.tsx Pengaturan departemen
src/app/settings/categories/page.tsx  Pengaturan kategori
src/components/AppLayout.tsx          Layout utama aplikasi
supabase-schema.sql                   Schema utama Supabase
supabase-add-outgoing-letters.sql     Schema tambahan Surat Keluar
```

## Ringkasan Halaman

- **Dashboard**: metrik harian, tren dokumen/invoice 7 hari, distribusi departemen, dan dokumen terbaru.
- **Pencarian**: pencarian cepat berdasarkan keyword, jenis, dan kategori.
- **Dokumen**: daftar dan input dokumen masuk.
- **Invoice Masuk**: daftar dan input invoice masuk.
- **Surat Keluar**: daftar dan input surat keluar secara batch.
- **Laporan**: rekap fleksibel, export laporan, dan backup bulanan.
- **Pengaturan**: kelola departemen dan kategori.

## Kebutuhan

- Node.js LTS terbaru.
- npm.
- Akun Supabase.
- Akun Vercel jika ingin deploy.

## Setup Lokal

Install dependency:

```bash
npm install
```

Copy file environment:

```bash
cp .env.example .env.local
```

Isi `.env.local` memakai data dari Supabase Dashboard > Project Settings > API:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

Jalankan aplikasi:

```bash
npm run dev
```

Buka:

```text
http://localhost:3000
```

Jika port 3000 sedang dipakai, Next.js akan memberi port lain seperti `http://localhost:3001`.

## Environment Variables

| Nama | Isi | Catatan |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL Supabase | Gunakan format `https://xxxx.supabase.co`, jangan pakai `/rest/v1`. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon public key / publishable key | Aman untuk frontend jika RLS Supabase aktif. |

Jangan pernah memasukkan secret key atau service role key ke `.env.local`, Vercel env, atau kode frontend.

Gunakan hanya variable yang diawali `NEXT_PUBLIC_` untuk kebutuhan client Supabase. Project ini tidak membutuhkan service role key.

File env yang tidak boleh dicommit:

```text
.env
.env.local
.env.local.save
.env*.local
.env*.save
```

## Setup Supabase

1. Buat project baru di Supabase.
2. Buka SQL Editor.
3. Jalankan isi file `supabase-schema.sql`.
4. Buka Authentication > Users.
5. Buat user pertama.
6. Jadikan user pertama sebagai admin:

```sql
update public.profiles
set role = 'ADMIN', full_name = 'Ha Junn'
where email = 'email-kamu@example.com';
```

Jika database sudah pernah dibuat dan butuh patch tambahan, jalankan file SQL tambahan yang relevan:

```text
supabase-add-letter-fields.sql
supabase-fix-letter-form-schema.sql
supabase-update-departments.sql
supabase-update-letter-categories.sql
supabase-make-invoice-fields-optional.sql
supabase-single-operator-admin.sql
supabase-remove-archive-feature.sql
supabase-add-outgoing-letters.sql
```

Untuk optimasi query daftar dokumen/invoice, pastikan index berikut sudah ada di database live:

```sql
create index if not exists documents_type_received_at_idx
on public.documents(type, received_at desc);
```

## Supabase Storage

Bucket lampiran dibuat dari schema Supabase. File yang diterima:

- PDF
- JPG
- PNG

Batas ukuran upload aplikasi: 10 MB.

Jika upload gagal, cek:

- User sudah login.
- Bucket storage sudah dibuat.
- Policy storage aktif.
- File bukan selain PDF/JPG/PNG.
- Ukuran file tidak lebih dari 10 MB.

## Command

```bash
npm run dev
npm run lint
npm run build
npm run start
```

## Deploy ke Vercel

1. Push project ke GitHub.
2. Buka Vercel.
3. Import repository.
4. Isi environment variables di Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

5. Deploy.
6. Test login, tambah dokumen, tambah invoice, tambah surat keluar, upload lampiran, pencarian, laporan, dan backup.

## Checklist Sebelum Deploy

- `npm run lint` berhasil.
- `npm run build` berhasil.
- Login berhasil.
- Dashboard menampilkan metric cards, tren, distribusi departemen, dan dokumen terbaru.
- Tambah dokumen berhasil.
- Tambah invoice berhasil.
- Tambah surat keluar batch berhasil.
- Detail invoice membuka halaman `/invoices/[id]`.
- Detail surat keluar membuka halaman `/outgoing/[id]`.
- Upload lampiran berhasil.
- Pencarian menampilkan dokumen dan invoice berdasarkan keyword, jenis, dan kategori.
- Laporan bisa difilter.
- Export CSV berhasil.
- Backup bulanan dari halaman Laporan berhasil.

## Keamanan

- Row Level Security wajib aktif di Supabase.
- Gunakan anon/publishable key hanya bersama RLS policy.
- Jangan expose service role key.
- Jangan commit `.env.local`.
- Jangan commit file backup env.
- Hapus user test jika tidak dipakai.

## GitHub

Inisialisasi git jika belum:

```bash
git init
git add .
git commit -m "Initial Panin DocFlow app"
```

Push ke repository GitHub:

```bash
git branch -M main
git remote add origin https://github.com/username/panin-docflow.git
git push -u origin main
```

## Troubleshooting

Jika localhost tidak bisa dibuka:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
```

Jika ada proses lama yang macet, hentikan prosesnya:

```bash
kill PID
```

Jika logo/foto belum berubah di browser, lakukan hard refresh:

```text
Cmd + Shift + R
```

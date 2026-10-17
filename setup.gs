/**
 * ALFA TOUR - PT ALFA MUTIARA ALMADI
 * File: setup.gs
 * Fungsi: Inisialisasi Database Google Sheets & Migrasi Aman (Safe Migration)
 * Standar: ZettBOT by Zettbos (Idempoten & Non-Destruktif)
 */

// Konstanta Nama Sheet (DILARANG menggunakan underscore '_' sesuai aturan ZettBOT)
const SHEET_NAMES = {
  TRANSAKSI: 'TransaksiKas',
  PENGATURAN: 'Pengaturan',
  CONFIG: 'Config',
  MEDIA: 'KelolaMedia',
  PAKET: 'KelolaPaket',
  REVIEW: 'KelolaReview',
  KONTAK: 'KelolaKontak'
};

// Header Baku Kolom TransaksiKas
const HEADERS_TRANSAKSI = [
  'ID Transaksi',
  'Tanggal',
  'Tipe',
  'Kategori',
  'Nominal',
  'Keterangan',
  'Metode Pembayaran',
  'Waktu Input'
];

// Header Baku Kolom KelolaMedia
const HEADERS_MEDIA = [
  'Kategori',
  'Kunci Aset (Jangan Diubah)',
  'Nama / Keterangan Aset',
  'Link Gambar (Google Drive / URL Langsung)',
  'Petunjuk Pengisian Link'
];

// Header Baku Kolom KelolaPaket
const HEADERS_PAKET = [
  'ID Paket (Jangan Diubah)',
  'Kategori Filter (promo-2026 / promo-2027 / ramadhan)',
  'Judul Paket',
  'Harga Paket (IDR)',
  'Label Harga',
  'Tanggal Keberangkatan',
  'Durasi Hari',
  'Maskapai Penerbangan',
  'Hotel Makkah',
  'Hotel Madinah',
  'Bintang Hotel',
  'Deskripsi & Fasilitas (Gunakan Titik Koma ; untuk Baris Baru)',
  'Link Brosur (Opsional)',
  'Status (Tampilkan / Sembunyikan)'
];

// Data Default Paket Umroh Resmi ALFA TOUR
const DEFAULT_PAKET_ITEMS = [
  [
    'okt2026',
    'promo-2026',
    'Promo Umroh 10 Hari (Oktober 2026)',
    31900000,
    'Mulai Dari (Quad / Sekamar Ber-4)',
    '24 Oktober 2026',
    '10 HARI PERJALANAN',
    'Garuda Indonesia Direct',
    'Amjad Al Jazeera / Setaraf',
    'Kharam Al Khair / Setaraf',
    'Bintang 4 / Setaraf',
    'Tiket PP Pesawat Garuda Indonesia Direct; Visa Umroh Resmi & Asuransi Perjalanan; Koper Fiber Eksklusif, Kain Ihram & Batik; Ziarah City Tour Makkah & Madinah',
    'https://drive.google.com/file/d/1Kyc1hKCQQz2SXyzKuPCzHQt9dkCSMtF7/view?usp=sharing',
    'Tampilkan'
  ],
  [
    'nov2026',
    'promo-2026',
    'Promo Umroh 13 Hari (November 2026)',
    33900000,
    'Mulai Dari (Quad / Sekamar Ber-4)',
    '09 November 2026',
    '13 HARI PERJALANAN',
    'Saudia Airlines Direct',
    'Amjad Al Jazeera / Setaraf',
    'Kharam Al Khair / Setaraf',
    'Bintang 4 / Setaraf',
    'Tiket PP Saudia Airlines Direct JED/MED; Bimbingan Muthawwif & Tour Leader Berpengalaman; Makan 3x Sehari Masakan Khas Indonesia; Air Zam-Zam 5 Liter & Album Kenangan',
    'https://drive.google.com/file/d/1vwmrPcOCnRdeZXs3ohDZdrXzQa6-F9UH/view?usp=sharing',
    'Tampilkan'
  ],
  [
    'des2026',
    'promo-2026',
    'Umroh 13 Hari 2x Jumatan (Desember 2026)',
    34500000,
    'Mulai Dari (Quad / Sekamar Ber-4)',
    '09 Desember 2026',
    '13 HARI (SPESIAL 2X JUMATAN)',
    'Saudia Airlines Direct',
    'Amjad Al Jazeera / Setaraf',
    'Kharam Al Khair / Setaraf',
    'Bintang 4 / Setaraf',
    'Kesempatan Langka 2x Shalat Jumat di Masjidil Haram; Direct Flight Saudia Airlines Tanpa Transit; Manasik Intensif Teori & Praktik Sebelum Terbang; Fasilitas Bus AC Eksekutif Terbaru di Saudi',
    'https://drive.google.com/file/d/1vwmrPcOCnRdeZXs3ohDZdrXzQa6-F9UH/view?usp=sharing',
    'Tampilkan'
  ],
  [
    'jan2027',
    'promo-2027',
    'Umroh Awal Tahun 13 Hari (Januari 2027)',
    30500000,
    'Mulai Dari (Quad / Sekamar Ber-4)',
    '23 Januari 2027',
    '13 HARI PERJALANAN',
    'Lion Air Direct',
    'Amjad Al Jazeera / Setaraf',
    'Kharam Al Khair / Setaraf',
    'Bintang 4 / Setaraf',
    'Keberangkatan Awal Musim Sejuk di Makkah & Madinah; Bimbingan Muthawwifat Khusus Jamaah Wanita; Handling Bandara & Bagasi Aman Sampai Kamar Hotel; Termasuk City Tour Bersejarah Lengkap',
    'https://drive.google.com/file/d/18c9yPuacqW3N_z_u5eMTHvPh-nDE0Xu3/view?usp=drive_link',
    'Tampilkan'
  ],
  [
    'ramadhan2027',
    'ramadhan',
    'Umroh Awal Ramadhan 14 Hari (Februari 2027)',
    37900000,
    'Mulai Dari (Quad / Sekamar Ber-4)',
    '11 Februari 2027',
    '14 HARI (SPESIAL AWAL RAMADHAN)',
    'Saudia Airlines Direct',
    'Amjad Al Jazeera / Setaraf',
    'Kharam Al Khair / Setaraf',
    'Bintang 4 / Setaraf',
    'Pahala Umroh di Bulan Ramadhan Senilai Ibadah Haji; Suasana Buka Puasa Bersama di Pelataran Ka\'bah & Raudhah; Shalat Tarawih & Witir Berjamaah di Masjidil Haram; Direct Saudia Airlines & Menu Sahur-Buka Khas Nusantara',
    'https://drive.google.com/file/d/1CSFx3-uJVgrtOMvR4CYW5i-zlg5AfKZY/view?usp=drive_link',
    'Tampilkan'
  ]
];

// Data Default Pemetaan Media Website ALFA TOUR
const DEFAULT_MEDIA_ITEMS = [
  // Latar Belakang & Logo
  ['1. Latar Belakang & Logo', 'hero_background', 'Background Utama Ka`bah (Hero Section)', '', 'Paste link share Google Drive ("Siapa saja yang memiliki link") atau URL foto langsung'],
  ['1. Latar Belakang & Logo', 'logo_brand', 'Logo Resmi ALFA TOUR (PNG Transparan)', 'https://drive.google.com/file/d/1TA_ARGJiT3EIrp1joArNxXVs-ZPWyX3g/view?usp=sharing', 'Ganti logo utama website di navbar dan footer'],
  
  // Brosur Promo Paket Umroh
  ['2. Brosur Paket Umroh', 'brosur_okt2026', 'Brosur Promo Umroh 10 Hari (24 Okt 2026)', 'https://drive.google.com/file/d/1Kyc1hKCQQz2SXyzKuPCzHQt9dkCSMtF7/view?usp=sharing', 'Foto flyer/brosur saat tombol "Lihat Brosur" diklik'],
  ['2. Brosur Paket Umroh', 'brosur_nov2026', 'Brosur Promo Umroh 13 Hari (09 Nov 2026)', 'https://drive.google.com/file/d/1vwmrPcOCnRdeZXs3ohDZdrXzQa6-F9UH/view?usp=sharing', 'Foto flyer/brosur saat tombol "Lihat Brosur" diklik'],
  ['2. Brosur Paket Umroh', 'brosur_des2026', 'Brosur Promo Umroh 13 Hari 2x Jumatan (09 Des 2026)', 'https://drive.google.com/file/d/1vwmrPcOCnRdeZXs3ohDZdrXzQa6-F9UH/view?usp=sharing', 'Foto flyer/brosur saat tombol "Lihat Brosur" diklik'],
  ['2. Brosur Paket Umroh', 'brosur_jan2027', 'Brosur Promo Umroh Awal Tahun (23 Jan 2027)', 'https://drive.google.com/file/d/18c9yPuacqW3N_z_u5eMTHvPh-nDE0Xu3/view?usp=drive_link', 'Foto flyer/brosur saat tombol "Lihat Brosur" diklik'],
  ['2. Brosur Paket Umroh', 'brosur_ramadhan2027', 'Brosur Promo Umroh Awal Ramadhan (11 Feb 2027)', 'https://drive.google.com/file/d/1CSFx3-uJVgrtOMvR4CYW5i-zlg5AfKZY/view?usp=drive_link', 'Foto flyer/brosur saat tombol "Lihat Brosur" diklik'],

  // Perizinan & Legalitas Resmi
  ['3. Legalitas & Sertifikat', 'legal_akreditasi', 'Sertifikat Akreditasi A Kemenag RI (KAN)', '', 'Foto sertifikat akreditasi resmi untuk popup zoom'],
  ['3. Legalitas & Sertifikat', 'legal_nib', 'Nomor Induk Berusaha (NIB OSS 9120104612458)', '', 'Foto dokumen legalitas NIB untuk popup zoom'],
  ['3. Legalitas & Sertifikat', 'legal_ppiu', 'Izin Resmi PPIU Kementerian Agama RI', '', 'Foto surat izin resmi PPIU Kemenag'],
  ['3. Legalitas & Sertifikat', 'legal_asphurindo', 'Sertifikat Keanggotaan Asphurindo (153/DPP/2021)', '', 'Foto sertifikat keanggotaan asosiasi'],

  // Foto Direktur & Tim Manajemen
  ['4. Tim Manajemen', 'tim_direktur', 'MUALIF, S.Pd (Direktur Utama)', '', 'Foto potret resmi Direktur Utama'],
  ['4. Tim Manajemen', 'tim_kh_budiyanto', 'KH. BUDIYANTO (Pembimbing Ibadah)', '', 'Foto potret pengurus'],
  ['4. Tim Manajemen', 'tim_m_zaini_dahlan', 'M ZAINI DAHLAN, S.PD (Pembimbing Ibadah)', '', 'Foto potret pengurus'],
  ['4. Tim Manajemen', 'tim_mukromin', 'MUKROMIN, AH (Pembimbing Ibadah)', '', 'Foto potret pengurus'],
  ['4. Tim Manajemen', 'tim_munawir_ahmad', 'MUNAWIR AHMAD SIROJ, S.PD.I (Pembimbing Ibadah)', '', 'Foto potret pengurus'],
  ['4. Tim Manajemen', 'tim_ahmad_muttaqin', 'AHMAD MUTTAQIN (Pembimbing Ibadah)', '', 'Foto potret pengurus'],
  ['4. Tim Manajemen', 'tim_muh_ubaidillah', 'MUH UBAIDILLAH (Pembimbing Ibadah)', '', 'Foto potret pengurus'],
  ['4. Tim Manajemen', 'tim_zaenal_arifin', 'ZAENAL ARIFIN (Pembimbing Ibadah)', '', 'Foto potret pengurus'],
  ['4. Tim Manajemen', 'tim_ratna_pancarini', 'RATNA PANCARINI, S.PSI (Staf Administrasi & Keuangan)', '', 'Foto staf kantor'],
  ['4. Tim Manajemen', 'tim_puji_astuti', 'PUJI ASTUTI, A.MD KEB (Tenaga Medis & Kesehatan)', '', 'Foto tenaga medis'],
  ['4. Tim Manajemen', 'tim_ustadzah_mukrimah', 'USTADZAH MUKRIMAH, S.AG (Pembimbing Ibadah Wanita)', '', 'Foto pembimbing wanita'],
  ['4. Tim Manajemen', 'tim_ustadzah_imroatun', 'USTADZAH IMROATUN KHASANAH, S.PD (Pembimbing)', '', 'Foto pembimbing wanita'],
  ['4. Tim Manajemen', 'tim_ustadzah_endang', 'USTADZAH ENDANG PURWANTI (Pembimbing)', '', 'Foto pembimbing wanita'],
  ['4. Tim Manajemen', 'tim_bersama', 'Foto Kebersamaan Seluruh Tim Manajemen', '', 'Foto bersama seluruh jajaran manajemen'],

  // Galeri Dokumentasi Jamaah
  ['5. Galeri Dokumentasi', 'galeri_manasik_gedung', 'Manasik Umroh Akbar di Gedung Pertemuan', '', 'Foto galeri dokumentasi kegiatan'],
  ['5. Galeri Dokumentasi', 'galeri_gerbang_saudi', 'Rombongan Jamaah di Gerbang Kota Suci Saudi', '', 'Foto galeri dokumentasi kegiatan'],
  ['5. Galeri Dokumentasi', 'galeri_bandara_koper', 'Keberangkatan Bandara & Perlengkapan Koper Oranye', '', 'Foto galeri dokumentasi kegiatan'],
  ['5. Galeri Dokumentasi', 'galeri_ziarah_unta', 'Wisata Unta & Napak Tilas Sejarah Islam', '', 'Foto galeri dokumentasi kegiatan'],
  ['5. Galeri Dokumentasi', 'galeri_taman_madinah', 'Ziarah Kebun Kurma & Istirahat di Madinah', '', 'Foto galeri dokumentasi kegiatan'],
  ['5. Galeri Dokumentasi', 'galeri_pelataran_nabawi', 'Jamaah di Pelataran Payung Raksasa Masjid Nabawi', '', 'Foto galeri dokumentasi kegiatan'],
  ['5. Galeri Dokumentasi', 'galeri_panggung_manasik', 'Pelepasan & Doa Bersama Tokoh Agama', '', 'Foto galeri dokumentasi kegiatan'],
  ['5. Galeri Dokumentasi', 'galeri_jabal_rahmah', 'Napak Tilas Jamaah di Jabal Rahmah & Padang Arafah', '', 'Foto galeri dokumentasi kegiatan'],

  // Layanan & Profil
  ['6. Layanan & Profil', 'layanan_umroh', 'Kartu Layanan Program Umroh', '', 'Foto kartu layanan umroh'],
  ['6. Layanan & Profil', 'layanan_haji', 'Kartu Layanan Program Haji Khusus', '', 'Foto kartu layanan haji'],
  ['6. Layanan & Profil', 'layanan_manasik', 'Kartu Layanan Tambahan & Manasik', '', 'Foto kartu layanan manasik'],
  ['6. Layanan & Profil', 'layanan_profil_kaaba', 'Foto Thawaf di Depan Ka`bah (Seksi Tentang)', '', 'Foto profil tentang perusahaan'],
  ['7. Dokumen Unduhan', 'dokumen_compro_pdf', 'File Company Profile PDF Resmi', '', 'Paste link Google Drive PDF Company Profile agar tombol unduh langsung mengarah ke file Anda'],
  // 8. Video Sosial Media
  ['8. Video Sosial Media', 'video_utama', 'Video Utama (Makkah & Ka`bah)', 'https://www.youtube.com/watch?v=K4TOrB7at0Y', 'Paste link YouTube / Google Drive video untuk diputar langsung di website'],
  ['8. Video Sosial Media', 'video_item_1', 'Video Playlist 1 (Tanah Suci Makkah)', 'https://www.youtube.com/watch?v=K4TOrB7at0Y', 'URL video playlist 1'],
  ['8. Video Sosial Media', 'video_item_2', 'Video Playlist 2 (Madinah Nabawi)', 'https://www.youtube.com/watch?v=vmgkMfqh2Bw', 'URL video playlist 2'],
  ['8. Video Sosial Media', 'video_item_3', 'Video Playlist 3 (Bimbingan Manasik)', 'https://www.youtube.com/watch?v=9No-FiEInLA', 'URL video playlist 3'],
  ['8. Video Sosial Media', 'video_item_4', 'Video Playlist 4 (Testimoni Jamaah)', 'https://www.youtube.com/watch?v=8Z1eMy2FoX4', 'URL video playlist 4']
];

// Header Baku Kolom KelolaReview
const HEADERS_REVIEW = ['ID Review', 'Nama Jamaah', 'Program / Asal Kota', 'Rating (1-5)', 'Isi Review', 'Status (Tampilkan / Sembunyikan)', 'Waktu Input'];

// Review awal (sama dengan testimoni yang sebelumnya tertulis di website)
const DEFAULT_REVIEW_ITEMS = [
  ['REV-202610-001', 'Hj. Fatimah Zahra', 'Jamaah Umroh Reguler 2026 (Grobogan)', 5, "Alhamdulillah pelayanan ALFA TOUR sangat memuaskan! Hotelnya benar-benar dekat ke Masjidil Haram, keluar lift jalan kaki beberapa langkah sudah sampai pelataran. Muthowwifnya sabar dan sangat membimbing.", 'Tampilkan', new Date('2026-10-01T09:00:00.000Z')],
  ['REV-202610-002', 'H. Ahmad Firdaus & Keluarga', 'Jamaah Umroh Spesial 2x Jumatan (Semarang)', 5, "Bimbingan manasik dari para Ustadz sangat mendalam dan sesuai dalil sunnah. Dari manasik di asrama sampai tawaf dan sa'i di Tanah Suci selalu didampingi dengan kehangatan kekeluargaan.", 'Tampilkan', new Date('2026-10-01T09:05:00.000Z')],
  ['REV-202610-003', 'Hj. Aminah Mansyur', 'Jamaah Umroh Ramadhan (Purwodadi)', 5, "Sangat amanah dan transparan sejak awal pendaftaran. Koper oranye, seragam batik, visa, sampai tiket penerbangan Saudia Airlines direct semuanya beres tepat waktu tanpa ada biaya tersembunyi.", 'Tampilkan', new Date('2026-10-01T09:10:00.000Z')]
];

// Header & isi awal KelolaKontak (nomor CS, email, TikTok, Instagram)
const HEADERS_KONTAK = ['Kunci (Jangan Diubah)', 'Keterangan', 'Nilai (Isi / Ubah di Sini)', 'Petunjuk Pengisian'];
const DEFAULT_KONTAK_ITEMS = [
  ['WHATSAPP_CS', 'Nomor WhatsApp Admin / CS', '6281225167123', 'Boleh ditulis 0812-2516-7123, +62 812-2516-7123, atau 6281225167123. Dipakai di tombol WhatsApp, top bar, kontak & footer.'],
  ['EMAIL_RESMI', 'Email Resmi Perusahaan', 'alfatourjaya@gmail.com', 'Alamat email yang tampil di bagian Kontak.'],
  ['TIKTOK_URL', 'Akun TikTok', 'https://www.tiktok.com/@alfatour01', 'Link lengkap (https://www.tiktok.com/@username) atau cukup @username.'],
  ['INSTAGRAM_URL', 'Akun Instagram', 'https://www.instagram.com/alfatour01', 'Link lengkap (https://www.instagram.com/username) atau cukup @username.'],
  ['ALAMAT_KANTOR', 'Alamat Kantor Pusat', 'Jl. Dr. Sutomo, Kalongan, Kec. Purwodadi, Kabupaten Grobogan, Jawa Tengah 58114', 'Alamat lengkap kantor pusat yang tampil di bagian Kontak dan footer.'],
  ['MAPS_URL', 'Link Google Maps Lokasi', 'https://maps.app.goo.gl/ji5ZHz5hFUYee5LN6', 'Link petunjuk arah Google Maps saat tombol rute diklik.'],
  ['REKENING_BSI', 'Rekening Bank Syariah Indonesia (BSI)', '722-006-5629 a.n. PT ALFA MUTIARA ALMADANI', 'Rekening utama penerimaan DP & pelunasan paket umroh.'],
  ['REKENING_MUAMALAT', 'Rekening Bank Muamalat', '501-009-8877 a.n. PT ALFA MUTIARA ALMADANI', 'Rekening kedua opsi transfer bank syariah.'],
  ['REKENING_MANDIRI', 'Rekening Bank Mandiri', '136-00-1234567-8 a.n. PT ALFA MUTIARA ALMADANI', 'Rekening penerimaan via Bank Mandiri.']
];

/**
 * Jalankan fungsi ini SATU KALI saat pertama kali memasang sistem di Google Sheets.
 * Aman dijalankan berulang kali (Safe Migration) tanpa menghapus data riil yang ada.
 */
function setupDatabase() {
  const ss = (typeof getAlfaSpreadsheet === 'function') ? getAlfaSpreadsheet() : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('Spreadsheet tidak ditemukan. Pastikan script terhubung dengan Google Sheets atau isi SPREADSHEET_ID.');
  }

  // 1. Inisialisasi Tab TransaksiKas
  let sheetTrx = (typeof getSheetFlexible === 'function') ? getSheetFlexible(ss, SHEET_NAMES.TRANSAKSI) : ss.getSheetByName(SHEET_NAMES.TRANSAKSI);
  if (!sheetTrx) {
    sheetTrx = ss.insertSheet(SHEET_NAMES.TRANSAKSI);
  }

  // Cek Header & Tambah Kolom yang Belum Ada (Non-Destruktif)
  const lastCol = sheetTrx.getLastColumn();
  if (lastCol === 0) {
    // Sheet baru kosong, pasang seluruh header
    sheetTrx.appendRow(HEADERS_TRANSAKSI);
    formatHeaderRow(sheetTrx);
  } else {
    // Sinkronisasi kolom baru ke posisi paling kanan jika ada update
    const currentHeaders = sheetTrx.getRange(1, 1, 1, lastCol).getValues()[0];
    HEADERS_TRANSAKSI.forEach((h, idx) => {
      if (idx >= currentHeaders.length) {
        sheetTrx.getRange(1, idx + 1).setValue(h);
      }
    });
    formatHeaderRow(sheetTrx);
  }

  // 2. Isi Data Sampel Awal PT ALFA MUTIARA ALMADANI (HANYA jika sheet masih kosong)
  if (sheetTrx.getLastRow() <= 1) {
    const sampleData = [
      [
        'TRX-202610-001',
        '2026-10-02',
        'pemasukan',
        'DP Paket Umroh',
        30000000,
        'DP Umroh VIP Bintang 5 (Bpk. H. Sulaiman & Istri)',
        'Transfer Bank Syariah (BSI)',
        new Date('2026-10-02T09:15:00.000Z')
      ],
      [
        'TRX-202610-002',
        '2026-10-05',
        'pemasukan',
        'Pelunasan Paket Umroh',
        29500000,
        'Pelunasan Umroh Reguler 9H (Ibu Hj. Aminah)',
        'Transfer Bank Mandiri',
        new Date('2026-10-05T11:30:00.000Z')
      ],
      [
        'TRX-202610-003',
        '2026-10-06',
        'pengeluaran',
        'Tiket Pesawat Maskapai (Saudia/Garuda)',
        67500000,
        'Deposit Tiket Saudia Airlines Direct JED (Grup Oktober - 45 Pax)',
        'Transfer Bank Syariah (BSI)',
        new Date('2026-10-06T14:20:00.000Z')
      ],
      [
        'TRX-202610-004',
        '2026-10-09',
        'pemasukan',
        'Pendaftaran Haji Khusus / Furoda',
        100000000,
        'DP Pendaftaran Haji Khusus Furoda 1448H (Keluarga Dr. Hendra)',
        'Transfer Bank Syariah (BSI)',
        new Date('2026-10-09T10:45:00.000Z')
      ],
      [
        'TRX-202610-005',
        '2026-10-10',
        'pengeluaran',
        'Booking Hotel Makkah & Madinah',
        42000000,
        'Booking Hotel Pullman Zamzam Tower Makkah (Blok Kamar)',
        'Swift Transfer Internasional (SAR/USD)',
        new Date('2026-10-10T16:00:00.000Z')
      ],
      [
        'TRX-202610-006',
        '2026-10-12',
        'pemasukan',
        'Badal Haji / Badal Umroh',
        12500000,
        'Badal Umroh Musim 1448H (5 Jiwa Titipan Jamaah)',
        'Kasir Tunai / Cash',
        new Date('2026-10-12T13:10:00.000Z')
      ],
      [
        'TRX-202610-007',
        '2026-10-13',
        'pengeluaran',
        'Handling Bandara & Perlengkapan Koper',
        17500000,
        'Pengadaan Koper Fiber Eksklusif, Batik & Ihram (50 Set)',
        'Transfer Bank BCA',
        new Date('2026-10-13T15:30:00.000Z')
      ]
    ];

    sheetTrx.getRange(2, 1, sampleData.length, HEADERS_TRANSAKSI.length).setValues(sampleData);
    
    // Format Kolom Nominal (Kolom E / Indeks 5) ke Rupiah
    sheetTrx.getRange(2, 5, sampleData.length, 1).setNumberFormat('"Rp"#,##0');
    // Format Kolom Tanggal (Kolom B / Indeks 2)
    sheetTrx.getRange(2, 2, sampleData.length, 1).setNumberFormat('yyyy-mm-dd');
  }

  // 3. Inisialisasi Tab Pengaturan
  let sheetConfig = (typeof getSheetFlexible === 'function') ? getSheetFlexible(ss, SHEET_NAMES.PENGATURAN) : ss.getSheetByName(SHEET_NAMES.PENGATURAN);
  if (!sheetConfig) {
    sheetConfig = ss.insertSheet(SHEET_NAMES.PENGATURAN);
    sheetConfig.appendRow(['Kunci Parameter', 'Nilai Parameter', 'Keterangan']);
    formatHeaderRow(sheetConfig);
    sheetConfig.appendRow(['ADMIN_PIN', '1234', 'PIN Akses Masuk Dashboard Admin']);
    sheetConfig.appendRow(['NAMA_BRAND', 'ALFA TOUR', 'Nama Brand Travel']);
    sheetConfig.appendRow(['NAMA_PT', 'PT ALFA MUTIARA ALMADANI', 'Nama Badan Hukum']);
    sheetConfig.appendRow(['TIKTOK_URL', 'www.tiktok.com/@alfatour01', 'Akun TikTok Resmi']);
    sheetConfig.appendRow(['WHATSAPP_CS', '6281225167123', 'Nomor Hotline CS WhatsApp']);
  }

  // 4. Inisialisasi Tab Config / KelolaMedia (Untuk ganti gambar dari Google Sheets)
  let sheetMedia = (typeof getSheetFlexible === 'function') 
    ? (getSheetFlexible(ss, 'Config') || getSheetFlexible(ss, SHEET_NAMES.MEDIA)) 
    : (ss.getSheetByName('Config') || ss.getSheetByName(SHEET_NAMES.MEDIA));
  if (!sheetMedia) {
    sheetMedia = ss.insertSheet('Config');
    sheetMedia.appendRow(['Kategori', 'Aset', 'Nama / Keterangan Aset', 'URL Photo (Link Drive)', 'Petunjuk Pengisian Link']);
    formatHeaderRow(sheetMedia);
    sheetMedia.getRange(2, 1, DEFAULT_MEDIA_ITEMS.length, HEADERS_MEDIA.length).setValues(DEFAULT_MEDIA_ITEMS);
    
    // Styling kolom Link (Kolom D) agar mencolok dan mudah diisi
    const linkRange = sheetMedia.getRange(2, 4, DEFAULT_MEDIA_ITEMS.length, 1);
    linkRange.setBackground('#FBF9F5');
    linkRange.setFontFamily('Consolas');
  } else {
    // Sinkronisasi baris data jika sheet media sudah ada tapi masih kosong
    if (sheetMedia.getLastRow() <= 1) {
      sheetMedia.getRange(2, 1, DEFAULT_MEDIA_ITEMS.length, HEADERS_MEDIA.length).setValues(DEFAULT_MEDIA_ITEMS);
    } else {
      // Periksa apakah logo_brand atau kunci lain belum terisi di sheet pengguna
      try {
        const mediaVals = sheetMedia.getDataRange().getValues();
        for (let r = 1; r < mediaVals.length; r++) {
          const k = String(mediaVals[r][1] || '').trim();
          const currentLink = String(mediaVals[r][3] || '').trim();
          if (k === 'logo_brand' && !currentLink) {
            sheetMedia.getRange(r + 1, 4).setValue('https://drive.google.com/file/d/1TA_ARGJiT3EIrp1joArNxXVs-ZPWyX3g/view?usp=sharing');
          }
        }
      } catch (e) {
        Logger.log('Sync logo_brand warning: ' + e.message);
      }
    }
  }

  // 5. Inisialisasi Tab KelolaPaket (Untuk ubah judul, harga, dan deskripsi paket dari Google Sheets)
  let sheetPaket = (typeof getSheetFlexible === 'function') ? getSheetFlexible(ss, SHEET_NAMES.PAKET) : ss.getSheetByName(SHEET_NAMES.PAKET);
  if (!sheetPaket) {
    sheetPaket = ss.insertSheet(SHEET_NAMES.PAKET);
    sheetPaket.appendRow(HEADERS_PAKET);
    formatHeaderRow(sheetPaket);
    sheetPaket.getRange(2, 1, DEFAULT_PAKET_ITEMS.length, HEADERS_PAKET.length).setValues(DEFAULT_PAKET_ITEMS);
    
    // Format Kolom Harga (Kolom D) sebagai Rupiah
    sheetPaket.getRange(2, 4, DEFAULT_PAKET_ITEMS.length, 1).setNumberFormat('"Rp"#,##0');
    
    // Highlight kolom yang sering diedit (Judul, Harga, Deskripsi/Fasilitas)
    sheetPaket.getRange(2, 3, DEFAULT_PAKET_ITEMS.length, 2).setBackground('#FBF9F5');
    sheetPaket.getRange(2, 12, DEFAULT_PAKET_ITEMS.length, 1).setBackground('#FBF9F5');
  } else {
    if (sheetPaket.getLastRow() <= 1) {
      sheetPaket.getRange(2, 1, DEFAULT_PAKET_ITEMS.length, HEADERS_PAKET.length).setValues(DEFAULT_PAKET_ITEMS);
      sheetPaket.getRange(2, 4, DEFAULT_PAKET_ITEMS.length, 1).setNumberFormat('"Rp"#,##0');
    }
  }

  // 6. Inisialisasi Tab KelolaReview (testimoni jamaah di website) - non-destruktif
  let sheetReview = (typeof getSheetFlexible === 'function') ? getSheetFlexible(ss, SHEET_NAMES.REVIEW) : ss.getSheetByName(SHEET_NAMES.REVIEW);
  if (!sheetReview) {
    sheetReview = ss.insertSheet(SHEET_NAMES.REVIEW);
    sheetReview.appendRow(HEADERS_REVIEW);
    formatHeaderRow(sheetReview);
  }
  if (sheetReview.getLastRow() <= 1) {
    sheetReview.getRange(2, 1, DEFAULT_REVIEW_ITEMS.length, HEADERS_REVIEW.length).setValues(DEFAULT_REVIEW_ITEMS);
  }
  [130, 200, 260, 90, 500, 140, 160].forEach(function (w, i) { sheetReview.setColumnWidth(i + 1, w); });

  // 7. Inisialisasi Tab KelolaKontak (nomor CS, email, TikTok, Instagram) - non-destruktif
  let sheetKontak = (typeof getSheetFlexible === 'function') ? getSheetFlexible(ss, SHEET_NAMES.KONTAK) : ss.getSheetByName(SHEET_NAMES.KONTAK);
  if (!sheetKontak) {
    sheetKontak = ss.insertSheet(SHEET_NAMES.KONTAK);
    sheetKontak.appendRow(HEADERS_KONTAK);
    formatHeaderRow(sheetKontak);
    sheetKontak.getRange(2, 3, 50, 1).setNumberFormat('@'); // teks: nol di depan nomor HP tidak hilang
  }
  const kontakKeys = sheetKontak.getLastRow() > 1
    ? sheetKontak.getRange(2, 1, sheetKontak.getLastRow() - 1, 1).getValues().map(function (r) { return String(r[0]).trim(); })
    : [];
  DEFAULT_KONTAK_ITEMS.forEach(function (row) { // hanya tambah kunci yang belum ada
    if (kontakKeys.indexOf(row[0]) === -1) sheetKontak.appendRow(row);
  });
  [170, 230, 380, 520].forEach(function (w, i) { sheetKontak.setColumnWidth(i + 1, w); });

  // Rapikan lebar kolom
  sheetTrx.autoResizeColumns(1, HEADERS_TRANSAKSI.length);
  sheetConfig.autoResizeColumns(1, 3);
  sheetMedia.autoResizeColumns(1, HEADERS_MEDIA.length);
  sheetMedia.setColumnWidth(1, 180); // Kategori
  sheetMedia.setColumnWidth(2, 180); // Kunci Aset
  sheetMedia.setColumnWidth(3, 290); // Nama / Keterangan
  sheetMedia.setColumnWidth(4, 400); // Link Gambar
  sheetMedia.setColumnWidth(5, 360); // Petunjuk

  sheetPaket.setColumnWidth(1, 130); // ID Paket
  sheetPaket.setColumnWidth(2, 140); // Kategori Filter
  sheetPaket.setColumnWidth(3, 300); // Judul Paket
  sheetPaket.setColumnWidth(4, 150); // Harga Paket (IDR)
  sheetPaket.setColumnWidth(5, 220); // Label Harga
  sheetPaket.setColumnWidth(6, 170); // Tanggal Keberangkatan
  sheetPaket.setColumnWidth(7, 180); // Durasi Hari
  sheetPaket.setColumnWidth(8, 180); // Maskapai Penerbangan
  sheetPaket.setColumnWidth(9, 180); // Hotel Makkah
  sheetPaket.setColumnWidth(10, 180); // Hotel Madinah
  sheetPaket.setColumnWidth(11, 150); // Bintang Hotel
  sheetPaket.setColumnWidth(12, 450); // Deskripsi & Fasilitas
  sheetPaket.setColumnWidth(13, 260); // Link Brosur
  sheetPaket.setColumnWidth(14, 120); // Status

  Logger.log('Inisialisasi Database, Tab Media & Tab Paket ALFA TOUR Selesai dengan Sukses!');
  return 'Database, Tab KelolaMedia & Tab KelolaPaket ALFA TOUR berhasil diinisialisasi!';
}

/**
 * Helper untuk styling baris header tabel Google Sheets
 */
function formatHeaderRow(sheet) {
  const lastCol = sheet.getLastColumn();
  if (lastCol > 0) {
    const headerRange = sheet.getRange(1, 1, 1, lastCol);
    headerRange.setBackground('#16382B'); // Deep Forest Green tema Alfa Tour
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    headerRange.setFontSize(10);
    headerRange.setHorizontalAlignment('center');
    sheet.setFrozenRows(1);
  }
}

/**
 * Trigger Otomatis saat Google Sheets dibuka
 * Menampilkan Menu Khusus ALFA TOUR untuk inisialisasi & sinkronisasi database
 */
function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('🚀 ALFA TOUR')
      .addItem('🛠️ Update / Inisialisasi Tab Database', 'setupDatabase')
      .addToUi();
  } catch (e) {
    Logger.log('onOpen notice: ' + e.message);
  }
}

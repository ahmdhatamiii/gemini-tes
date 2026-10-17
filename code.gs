/**
 * ALFA TOUR - PT ALFA MUTIARA ALMADANI
 * File: code.gs
 * Fungsi: Backend Controller, Routing Web App & API Data Kas Transaksi
 * Standar: ZettBOT by Zettbos (Index-Based Mapping & Concurrency Lock)
 */

// Konstanta Nama Sheet & Konfigurasi
const DB_CONFIG = {
  SHEET_TRANSAKSI: 'TransaksiKas',
  SHEET_PENGATURAN: 'Pengaturan',
  SHEET_CONFIG: 'Config',
  SHEET_MEDIA: 'KelolaMedia',
  SHEET_PAKET: 'KelolaPaket',
  SHEET_REVIEW: 'KelolaReview',
  SHEET_KONTAK: 'KelolaKontak'
};

/**
 * Konfigurasi ID Spreadsheet Google Sheets
 * - Jika script dibuka langsung dari menu Google Sheets (Ekstensi > Apps Script), biarkan kosong: ''
 * - Jika Anda membuat Google Apps Script Standalone di script.google.com, tempelkan ID Spreadsheet Anda di sini.
 *   Contoh ID: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms' (ambil dari URL Google Sheets di antara /d/ dan /edit)
 */
const SPREADSHEET_ID = '';

/**
 * Helper untuk mengambil Spreadsheet yang aktif secara aman (Container-Bound maupun Standalone)
 */
function getAlfaSpreadsheet() {
  let ss = null;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    Logger.log('getActiveSpreadsheet notice: ' + e.message);
  }
  if (!ss) {
    try {
      const storedId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      if (storedId && storedId.trim().length > 0) {
        ss = SpreadsheetApp.openById(storedId.trim());
      }
    } catch (e) {
      Logger.log('ScriptProperties openById notice: ' + e.message);
    }
  }
  if (!ss && typeof SPREADSHEET_ID === 'string' && SPREADSHEET_ID.trim().length > 0) {
    try {
      ss = SpreadsheetApp.openById(SPREADSHEET_ID.trim());
    } catch (e) {
      Logger.log('openById error: ' + e.message);
    }
  }
  return ss;
}

/**
 * Pencarian sheet fleksibel (kebal terhadap spasi, huruf besar/kecil, atau underscore)
 */
function getSheetFlexible(ss, targetName) {
  if (!ss) return null;
  let sheet = ss.getSheetByName(targetName);
  if (sheet) return sheet;
  const targetNorm = String(targetName).toLowerCase().replace(/[\s_-]/g, '');
  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    const sName = sheets[i].getName();
    if (sName.toLowerCase().replace(/[\s_-]/g, '') === targetNorm) {
      return sheets[i];
    }
  }
  return null;
}

// Konstanta Pemetaan Indeks Kolom TransaksiKas (0-based Index) Sesuai Standar Mutlak ZettBOT
const COL = {
  ID: 0,        // Kolom A: ID Transaksi (TRX-YYYYMM-XXX)
  TANGGAL: 1,   // Kolom B: Tanggal Transaksi (YYYY-MM-DD)
  TIPE: 2,      // Kolom C: Tipe Arus Kas (pemasukan / pengeluaran)
  KATEGORI: 3,  // Kolom D: Kategori Transaksi
  NOMINAL: 4,   // Kolom E: Nominal Uang (IDR)
  KETERANGAN: 5,// Kolom F: Keterangan / Nama Jamaah / Vendor
  METODE: 6,    // Kolom G: Metode Pembayaran
  CREATED_AT: 7 // Kolom H: Waktu Input Sistem
};

// Konstanta Pemetaan Indeks Kolom KelolaPaket (0-based Index)
const COL_PAKET = {
  ID: 0,            // Kolom A: ID Paket (okt2026, nov2026, dll.)
  KATEGORI: 1,      // Kolom B: Kategori Filter (promo-2026, promo-2027, ramadhan)
  JUDUL: 2,         // Kolom C: Judul Paket
  HARGA: 3,         // Kolom D: Harga Paket (IDR)
  LABEL_HARGA: 4,   // Kolom E: Label Harga (Mulai Dari...)
  TANGGAL: 5,       // Kolom F: Tanggal Keberangkatan
  DURASI: 6,        // Kolom G: Durasi Hari
  MASKAPAI: 7,      // Kolom H: Maskapai Penerbangan
  HOTEL_MAKKAH: 8,  // Kolom I: Hotel Makkah
  HOTEL_MADINAH: 9, // Kolom J: Hotel Madinah
  BINTANG_HOTEL: 10,// Kolom K: Bintang Hotel
  FASILITAS: 11,    // Kolom L: Deskripsi / Fasilitas (pemisah ;)
  BROSUR_URL: 12,   // Kolom M: Link Brosur (Opsional)
  STATUS: 13        // Kolom N: Status (Tampilkan / Sembunyikan)
};

/**
 * Controller Utama Penampil Antarmuka Web App
 * Dilengkapi Server-Side Rendering (SSR) Injection agar foto & paket dari Google Sheets langsung tampil seketika
 */
function doGet(e) {
  // Pastikan database dan seluruh tab siap saat web dibuka
  try {
    ensureDatabaseReady();
  } catch (err) {
    Logger.log('ensureDatabaseReady warning: ' + err.message);
  }

  let html = HtmlService.createHtmlOutputFromFile('index').getContent();

  // Injeksi data media kustom langsung ke dalam HTML agar foto langsung tampil tanpa jeda (SSR)
  try {
    const mediaRes = getMediaAssets();
    if (mediaRes && mediaRes.success && mediaRes.data && Object.keys(mediaRes.data).length > 0) {
      const mediaJson = JSON.stringify(mediaRes.data).replace(/</g, '\\u003c');
      html = html.replace('window.SERVER_MEDIA_DATA = {};', function () { return 'window.SERVER_MEDIA_DATA = ' + mediaJson + ';'; });
    }
  } catch (err) {
    Logger.log('Injeksi SERVER_MEDIA_DATA warning: ' + err.message);
  }

  // Injeksi data paket umroh langsung ke dalam HTML agar paket terbaru langsung ter-render (SSR)
  try {
    const pkgRes = getPackageList();
    if (pkgRes && pkgRes.success && pkgRes.data && pkgRes.data.length > 0) {
      const pkgJson = JSON.stringify(pkgRes.data).replace(/</g, '\\u003c');
      html = html.replace('window.SERVER_PACKAGES_DATA = [];', function () { return 'window.SERVER_PACKAGES_DATA = ' + pkgJson + ';'; });
    }
  } catch (err) {
    Logger.log('Injeksi SERVER_PACKAGES_DATA warning: ' + err.message);
  }

  // Injeksi review jamaah (SSR) - hanya yang berstatus Tampilkan
  try {
    const revRes = getReviewList();
    if (revRes && revRes.success && Array.isArray(revRes.data)) {
      const revJson = JSON.stringify(revRes.data).replace(/</g, '\\u003c');
      html = html.replace('window.SERVER_REVIEWS_DATA = null;', function () { return 'window.SERVER_REVIEWS_DATA = ' + revJson + ';'; });
    }
  } catch (err) {
    Logger.log('Injeksi SERVER_REVIEWS_DATA warning: ' + err.message);
  }

  // Injeksi kontak & sosial media (SSR)
  try {
    const kRes = getContactSettings();
    if (kRes && kRes.success && kRes.data && Object.keys(kRes.data).length > 0) {
      const kJson = JSON.stringify(kRes.data).replace(/</g, '\\u003c');
      html = html.replace('window.SERVER_CONTACT_DATA = null;', function () { return 'window.SERVER_CONTACT_DATA = ' + kJson + ';'; });
    }
  } catch (err) {
    Logger.log('Injeksi SERVER_CONTACT_DATA warning: ' + err.message);
  }

  return HtmlService.createHtmlOutput(html)
    .setTitle('ALFA TOUR - PT ALFA MUTIARA ALMADANI')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Helper untuk menyertakan berkas HTML parsial jika diperlukan
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Normalisasi Link Gambar Google Drive ke Format CDN Cepat & Anti-CORS
 * Mendukung berbagai format link share Google Drive dan mengubahnya menjadi URL CDN lh3 direct:
 * https://lh3.googleusercontent.com/d/FILE_ID
 */
function formatDriveUrl(rawUrl, key) {
  if (!rawUrl) return '';
  let url = String(rawUrl).trim();
  if (!url) return '';

  // Jika sudah merupakan link CDN lh3 googleusercontent, langsung gunakan
  if (url.indexOf('lh3.googleusercontent.com/d/') !== -1) {
    return url;
  }

  let fileId = null;

  // Pola 1: /file/d/FILE_ID atau /d/FILE_ID
  let match = url.match(/\/(?:file\/)?d\/([a-zA-Z0-9_-]{20,})/);
  if (match && match[1]) fileId = match[1];

  // Pola 2: ?id=FILE_ID atau &id=FILE_ID
  if (!fileId) {
    match = url.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
    if (match && match[1]) fileId = match[1];
  }

  // Pola 3: Hanya berupa File ID Google Drive langsung (alphanumeric minimal 20 karakter)
  if (!fileId && /^[a-zA-Z0-9_-]{20,}$/.test(url)) {
    fileId = url;
  }

  if (fileId) {
    // Dokumen PDF: arahkan ke Google Drive Viewer resmi
    if (key === 'dokumen_compro_pdf' || url.toLowerCase().indexOf('.pdf') !== -1) {
      return 'https://drive.google.com/file/d/' + fileId + '/view?usp=sharing';
    }
    // Video Google Drive: arahkan ke /preview untuk disematkan dalam iframe
    if (key && key.indexOf('video_') === 0) {
      return 'https://drive.google.com/file/d/' + fileId + '/preview';
    }
    // Gambar Web: gunakan CDN direct lh3.googleusercontent.com/d/ID (kecepatan tinggi, tanpa limit login)
    return 'https://lh3.googleusercontent.com/d/' + fileId;
  }

  return url;
}

/**
 * API: Mengambil Data Pemetaan Media & Gambar Kustom dari Tab Config / KelolaMedia
 * Mengambil link gambar dari:
 * - Nama Sheet: Config (atau KelolaMedia)
 * - B2 = Aset (Kunci Aset)
 * - D2 = URL Photo (Link Drive)
 * Mengonversi ke https://lh3.googleusercontent.com/d/FILE_ID
 * Dipanggil oleh SSR doGet() maupun oleh frontend via google.script.run
 */
function getMediaAssets(customSpreadsheetId) {
  try {
    let ss = null;
    if (customSpreadsheetId && typeof customSpreadsheetId === 'string' && customSpreadsheetId.trim()) {
      try { ss = SpreadsheetApp.openById(customSpreadsheetId.trim()); } catch (e) { Logger.log('openById notice: ' + e.message); }
    }
    if (!ss) ss = getAlfaSpreadsheet();
    if (!ss) {
      return { success: false, error: 'Spreadsheet tidak ditemukan. Pastikan script terhubung dengan Google Sheets (Container-Bound) atau isi SPREADSHEET_ID di code.gs.', data: {} };
    }

    let sheet = getSheetFlexible(ss, DB_CONFIG.SHEET_CONFIG) || getSheetFlexible(ss, DB_CONFIG.SHEET_MEDIA);
    if (!sheet) {
      setupDatabase();
      sheet = getSheetFlexible(ss, DB_CONFIG.SHEET_CONFIG) || getSheetFlexible(ss, DB_CONFIG.SHEET_MEDIA);
    }
    if (!sheet || sheet.getLastRow() <= 1) {
      return { success: true, message: 'Sheet belum memiliki baris data.', sheetName: sheet ? sheet.getName() : 'Config', data: {}, count: 0 };
    }

    const values = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
    const headers = values[0].map(function (h) { return String(h || '').toLowerCase().trim(); });

    // Kolom kunci = "Aset" / "Kunci Aset"; kolom link = diawali "URL" / "Link Gambar".
    // Kolom "Nama / Keterangan Aset" dan "Petunjuk ... Link" sengaja TIDAK dipakai.
    let colKey = -1, colUrl = -1;
    headers.forEach(function (h, c) {
      if (colKey === -1 && (h === 'aset' || h === 'key' || h.indexOf('kunci') === 0)) colKey = c;
      if (colUrl === -1 && (h.indexOf('url') === 0 || h.indexOf('link gambar') === 0 || h === 'link drive')) colUrl = c;
    });
    if (colKey === -1) colKey = 1; // kolom B
    if (colUrl === -1) colUrl = 3; // kolom D

    const mediaMap = {};
    for (let i = 1; i < values.length; i++) {
      const key = String(values[i][colKey] || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
      const raw = String(values[i][colUrl] || '').trim();
      if (!key || !raw) continue;
      // abaikan teks biasa; hanya terima URL atau File ID Google Drive
      if (!/^https?:\/\//i.test(raw) && !/^[a-zA-Z0-9_-]{20,}$/.test(raw)) continue;
      mediaMap[key] = formatDriveUrl(raw, key);
    }

    return { success: true, count: Object.keys(mediaMap).length, sheetName: sheet.getName(), data: mediaMap };
  } catch (error) {
    Logger.log('Error in getMediaAssets: ' + error.message);
    return { success: false, error: error.message, data: {} };
  }
}

/**
 * API: Mengambil Daftar Detail Media untuk Portal Admin
 * Mengembalikan informasi lengkap tiap aset foto: Kategori, Kunci, Nama, Link Mentah, Link CDN, Petunjuk
 */
function getMediaListDetailed(adminPin) {
  try {
    if (!isAdminPinValid_(adminPin)) {
      return { success: false, error: 'PIN admin tidak valid.' };
    }
    const ss = getAlfaSpreadsheet();
    if (!ss) {
      return { success: false, error: 'Spreadsheet tidak ditemukan.', data: [] };
    }
    let sheet = getSheetFlexible(ss, DB_CONFIG.SHEET_CONFIG) || getSheetFlexible(ss, DB_CONFIG.SHEET_MEDIA);
    if (!sheet) {
      if (typeof setupDatabase === 'function') setupDatabase();
      sheet = getSheetFlexible(ss, DB_CONFIG.SHEET_CONFIG) || getSheetFlexible(ss, DB_CONFIG.SHEET_MEDIA);
    }
    if (!sheet || sheet.getLastRow() <= 1) {
      return { success: true, count: 0, sheetName: sheet ? sheet.getName() : 'Config', data: [] };
    }

    const values = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
    const headers = values[0].map(function (h) { return String(h || '').toLowerCase().trim(); });

    let colCat = -1, colKey = -1, colName = -1, colUrl = -1, colNote = -1;
    headers.forEach(function (h, c) {
      if (colCat === -1 && h.indexOf('kategori') === 0) colCat = c;
      if (colKey === -1 && (h === 'aset' || h === 'key' || h.indexOf('kunci') === 0)) colKey = c;
      if (colName === -1 && (h.indexOf('nama') === 0 || h.indexOf('keterangan') === 0)) colName = c;
      if (colUrl === -1 && (h.indexOf('url') === 0 || h.indexOf('link gambar') === 0 || h === 'link drive')) colUrl = c;
      if (colNote === -1 && h.indexOf('petunjuk') === 0) colNote = c;
    });

    if (colCat === -1) colCat = 0;
    if (colKey === -1) colKey = 1;
    if (colName === -1) colName = 2;
    if (colUrl === -1) colUrl = 3;
    if (colNote === -1) colNote = 4;

    const items = [];
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const key = String(row[colKey] || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
      const name = String(row[colName] || '').trim();
      if (!key && !name) continue;
      const category = String(row[colCat] || 'Umum').trim();
      const rawUrl = String(row[colUrl] || '').trim();
      const note = colNote < row.length ? String(row[colNote] || '').trim() : '';
      const formattedUrl = formatDriveUrl(rawUrl, key);

      items.push({
        row: i + 1,
        category: category,
        key: key,
        name: name || key,
        rawUrl: rawUrl,
        formattedUrl: formattedUrl,
        note: note
      });
    }

    return { success: true, count: items.length, sheetName: sheet.getName(), data: items };
  } catch (error) {
    Logger.log('Error in getMediaListDetailed: ' + error.message);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * API: Memperbarui Link Foto / Media di Sheet Config / KelolaMedia
 * Dilindungi LockService & Validasi PIN Admin
 */
function updateMediaAsset(key, newUrl, adminPin) {
  if (!isAdminPinValid_(adminPin)) {
    return { success: false, error: 'PIN admin tidak valid.' };
  }
  const cleanKey = String(key || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!cleanKey) {
    return { success: false, error: 'Kunci aset tidak valid.' };
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    const ss = getAlfaSpreadsheet();
    if (!ss) return { success: false, error: 'Spreadsheet tidak ditemukan.' };

    let sheet = getSheetFlexible(ss, DB_CONFIG.SHEET_CONFIG) || getSheetFlexible(ss, DB_CONFIG.SHEET_MEDIA);
    if (!sheet) {
      if (typeof setupDatabase === 'function') setupDatabase();
      sheet = getSheetFlexible(ss, DB_CONFIG.SHEET_CONFIG) || getSheetFlexible(ss, DB_CONFIG.SHEET_MEDIA);
    }
    if (!sheet || sheet.getLastRow() <= 1) {
      return { success: false, error: 'Sheet media tidak memiliki data.' };
    }

    const values = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
    const headers = values[0].map(function (h) { return String(h || '').toLowerCase().trim(); });

    let colKey = -1, colUrl = -1;
    headers.forEach(function (h, c) {
      if (colKey === -1 && (h === 'aset' || h === 'key' || h.indexOf('kunci') === 0)) colKey = c;
      if (colUrl === -1 && (h.indexOf('url') === 0 || h.indexOf('link gambar') === 0 || h === 'link drive')) colUrl = c;
    });
    if (colKey === -1) colKey = 1;
    if (colUrl === -1) colUrl = 3;

    let targetRow = -1;
    for (let i = 1; i < values.length; i++) {
      const rowKey = String(values[i][colKey] || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
      if (rowKey === cleanKey) {
        targetRow = i + 1;
        break;
      }
    }

    if (targetRow === -1) {
      return { success: false, error: 'Aset dengan kunci "' + cleanKey + '" tidak ditemukan di sheet.' };
    }

    const cleanUrl = String(newUrl || '').trim();
    sheet.getRange(targetRow, colUrl + 1).setValue(cleanUrl);

    const formattedUrl = formatDriveUrl(cleanUrl, cleanKey);
    return {
      success: true,
      message: 'Foto berhasil diperbarui di spreadsheet!',
      key: cleanKey,
      rawUrl: cleanUrl,
      formattedUrl: formattedUrl
    };
  } catch (error) {
    Logger.log('Error in updateMediaAsset: ' + error.message);
    return { success: false, error: error.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * API untuk menyimpan SPREADSHEET_ID ke ScriptProperties
 */
function saveSpreadsheetId(id) {
  try {
    if (!id || typeof id !== 'string') return { success: false, error: 'ID Spreadsheet tidak valid' };
    PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', id.trim());
    return { success: true, message: 'ID Spreadsheet berhasil disimpan!' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Verifikasi & Ambil Tab Transaksi
 */
function getSheetTransaksi() {
  const ss = getAlfaSpreadsheet();
  if (!ss) throw new Error('Spreadsheet tidak dapat diakses.');
  let sheet = getSheetFlexible(ss, DB_CONFIG.SHEET_TRANSAKSI);
  if (!sheet) {
    setupDatabase();
    sheet = getSheetFlexible(ss, DB_CONFIG.SHEET_TRANSAKSI);
  }
  return sheet;
}

/**
 * API: Mengambil Seluruh Daftar Paket Umroh dari Tab KelolaPaket
 * Dipanggil oleh SSR doGet() maupun oleh frontend via google.script.run
 */
function getPackageList() {
  try {
    const ss = getAlfaSpreadsheet();
    if (!ss) {
      return { success: false, error: 'Spreadsheet tidak ditemukan', data: [] };
    }

    let sheet = getSheetFlexible(ss, DB_CONFIG.SHEET_PAKET);
    if (!sheet) {
      if (typeof setupDatabase === 'function') {
        setupDatabase();
      }
      sheet = getSheetFlexible(ss, DB_CONFIG.SHEET_PAKET);
    }

    if (!sheet || sheet.getLastRow() <= 1) {
      return { success: true, data: [] };
    }

    const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 14).getValues();
    const packages = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const status = String(row[COL_PAKET.STATUS] || 'Tampilkan').trim().toLowerCase();
      if (status === 'sembunyikan' || status === 'nonaktif' || status === 'false' || status === 'draft') {
        continue; // Lewati paket yang disembunyikan
      }

      const rawId = String(row[COL_PAKET.ID] || '').trim();
      const id = rawId.toLowerCase();
      const judul = String(row[COL_PAKET.JUDUL] || '').trim();
      if (!id && !judul) continue;

      const rawHarga = row[COL_PAKET.HARGA];
      let hargaNominal = 0;
      let hargaFormatted = '';
      if (typeof rawHarga === 'number') {
        hargaNominal = rawHarga;
        hargaFormatted = 'Rp ' + Number(rawHarga).toLocaleString('id-ID');
      } else {
        const cleaned = String(rawHarga || '').replace(/[^0-9]/g, '');
        hargaNominal = Number(cleaned) || 0;
        hargaFormatted = String(rawHarga || '');
      }

      // Fasilitas dipisahkan dengan titik koma (;) atau newline
      const rawFasilitas = String(row[COL_PAKET.FASILITAS] || '');
      const fasilitasArray = rawFasilitas
        .split(/;|\n/)
        .map(function(f) { return f.trim(); })
        .filter(function(f) { return f.length > 0; });

      const rawBrosur = String(row[COL_PAKET.BROSUR_URL] || '').trim();
      const formattedBrosur = rawBrosur ? formatDriveUrl(rawBrosur, id) : '';

      packages.push({
        id: id,
        rawId: rawId,
        kategori: String(row[COL_PAKET.KATEGORI] || 'promo-2026').trim(),
        judul: judul,
        harga: hargaNominal,
        hargaFormatted: hargaFormatted,
        labelHarga: String(row[COL_PAKET.LABEL_HARGA] || 'Mulai Dari (Quad / Sekamar Ber-4)').trim(),
        tanggal: String(row[COL_PAKET.TANGGAL] || '').trim(),
        durasi: String(row[COL_PAKET.DURASI] || '').trim(),
        maskapai: String(row[COL_PAKET.MASKAPAI] || '').trim(),
        hotelMakkah: String(row[COL_PAKET.HOTEL_MAKKAH] || '').trim(),
        hotelMadinah: String(row[COL_PAKET.HOTEL_MADINAH] || '').trim(),
        bintangHotel: String(row[COL_PAKET.BINTANG_HOTEL] || 'Bintang 4 / Setaraf').trim(),
        fasilitas: fasilitasArray,
        brosurUrl: formattedBrosur,
        status: status
      });
    }

    return { success: true, data: packages };
  } catch (error) {
    Logger.log('Error in getPackageList: ' + error.message);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Memastikan tabel terinisialisasi
 */
function ensureDatabaseReady() {
  const ss = getAlfaSpreadsheet();
  if (!ss) return;
  const hasMediaSheet = getSheetFlexible(ss, 'Config') || getSheetFlexible(ss, DB_CONFIG.SHEET_MEDIA);
  if (!getSheetFlexible(ss, DB_CONFIG.SHEET_TRANSAKSI) || 
      !hasMediaSheet || 
      !getSheetFlexible(ss, DB_CONFIG.SHEET_PAKET) ||
      !getSheetFlexible(ss, DB_CONFIG.SHEET_REVIEW) ||
      !getSheetFlexible(ss, DB_CONFIG.SHEET_KONTAK)) {
    if (typeof setupDatabase === 'function') {
      setupDatabase();
    }
  }
}

/**
 * API: Mengambil Seluruh Catatan Transaksi (Dipanggil oleh Frontend via google.script.run)
 * Menggunakan Index-Based Mapping (COL) yang aman dan kebal modifikasi label header.
 */
function getTransactions() {
  try {
    const sheet = getSheetTransaksi();
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      return { success: true, data: [] };
    }

    const lastCol = sheet.getLastColumn();
    const values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

    const results = [];
    for (let i = 0; i < values.length; i++) {
      const row = values[i];
      const rawDate = row[COL.TANGGAL];
      let formattedDate = '';
      
      if (rawDate instanceof Date) {
        formattedDate = Utilities.formatDate(rawDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      } else {
        formattedDate = String(rawDate || '');
      }

      results.push({
        id: String(row[COL.ID] || ''),
        tanggal: formattedDate,
        tipe: String(row[COL.TIPE] || '').toLowerCase().trim(),
        kategori: String(row[COL.KATEGORI] || ''),
        nominal: Number(row[COL.NOMINAL]) || 0,
        keterangan: String(row[COL.KETERANGAN] || ''),
        metode: String(row[COL.METODE] || ''),
        createdAt: row[COL.CREATED_AT] ? String(row[COL.CREATED_AT]) : new Date().toISOString()
      });
    }

    return { success: true, data: results };
  } catch (error) {
    Logger.log('Error in getTransactions: ' + error.message);
    return { success: false, error: error.message };
  }
}

/**
 * API: Menambah Transaksi Kas Baru
 * Dilindungi LockService untuk keamanan multi-user dan penomoran kode unik sekuensial anti-tabrakan.
 */
function addTransaction(trxData) {
  const lock = LockService.getScriptLock();
  try {
    // Kunci proses maksimal 10 detik agar penomoran ID tidak tabrakan
    lock.waitLock(10000);

    const sheet = getSheetTransaksi();
    
    // Generate ID Otomatis Sekuensial (TRX-YYYYMM-XXX)
    const newTrxId = generateNextTrxIdInternal(sheet);

    const rowData = [
      newTrxId,
      trxData.tanggal,
      trxData.tipe.toLowerCase().trim(),
      trxData.kategori,
      Number(trxData.nominal) || 0,
      trxData.keterangan,
      trxData.metode,
      new Date()
    ];

    sheet.appendRow(rowData);

    // Format Rupiah pada baris baru
    const newRowIndex = sheet.getLastRow();
    sheet.getRange(newRowIndex, COL.NOMINAL + 1).setNumberFormat('"Rp"#,##0');
    sheet.getRange(newRowIndex, COL.TANGGAL + 1).setNumberFormat('yyyy-mm-dd');

    return {
      success: true,
      message: 'Transaksi berhasil disimpan ke Google Sheets.',
      data: {
        id: newTrxId,
        tanggal: trxData.tanggal,
        tipe: trxData.tipe.toLowerCase().trim(),
        kategori: trxData.kategori,
        nominal: Number(trxData.nominal) || 0,
        keterangan: trxData.keterangan,
        metode: trxData.metode,
        createdAt: new Date().toISOString()
      }
    };
  } catch (error) {
    Logger.log('Error in addTransaction: ' + error.message);
    return { success: false, error: error.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * API: Menghapus Transaksi Berdasarkan ID
 */
function deleteTransaction(trxId) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    const sheet = getSheetTransaksi();
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      return { success: false, error: 'Data kosong' };
    }

    const idRange = sheet.getRange(2, COL.ID + 1, lastRow - 1, 1).getValues();
    let rowToDelete = -1;

    for (let i = 0; i < idRange.length; i++) {
      if (String(idRange[i][0]).trim() === String(trxId).trim()) {
        rowToDelete = i + 2; // Offset header baris 1
        break;
      }
    }

    if (rowToDelete !== -1) {
      sheet.deleteRow(rowToDelete);
      return { success: true, message: 'Transaksi ' + trxId + ' berhasil dihapus.' };
    } else {
      return { success: false, error: 'Transaksi tidak ditemukan.' };
    }
  } catch (error) {
    Logger.log('Error in deleteTransaction: ' + error.message);
    return { success: false, error: error.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Generator Kode Unik Sekuensial Internal di Backend: TRX-YYYYMM-XXX
 * Menjamin tidak terjadi nomor kembar jika ada baris yang pernah dihapus
 */
function generateNextTrxIdInternal(sheet) {
  const now = new Date();
  const year = now.getFullYear();
  const month = ('0' + (now.getMonth() + 1)).slice(-2);
  const prefix = 'TRX-' + year + month + '-';

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return prefix + '001';
  }

  const idValues = sheet.getRange(2, COL.ID + 1, lastRow - 1, 1).getValues();
  let maxSeq = 0;

  for (let i = 0; i < idValues.length; i++) {
    const idStr = String(idValues[i][0] || '').trim();
    if (idStr.indexOf(prefix) === 0) {
      const parts = idStr.split('-');
      if (parts.length === 3) {
        const seq = parseInt(parts[2], 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }
  }

  const nextSeq = ('000' + (maxSeq + 1)).slice(-3);
  return prefix + nextSeq;
}

/**
 * API: Verifikasi PIN Admin
 */
function verifyAdminPin(enteredPin) {
  try {
    const ss = getAlfaSpreadsheet();
    if (!ss) {
      return { success: true, isValid: (String(enteredPin).trim() === '1234') };
    }
    const sheetConfig = getSheetFlexible(ss, DB_CONFIG.SHEET_PENGATURAN);
    let validPin = '1234'; // Default PIN

    if (sheetConfig && sheetConfig.getLastRow() >= 2) {
      const configValues = sheetConfig.getRange(2, 1, sheetConfig.getLastRow() - 1, 2).getValues();
      for (let i = 0; i < configValues.length; i++) {
        if (String(configValues[i][0]).trim() === 'ADMIN_PIN') {
          validPin = String(configValues[i][1]).trim();
          break;
        }
      }
    }

    const isValid = (String(enteredPin).trim() === validPin);
    return { success: true, isValid: isValid };
  } catch (error) {
    return { success: true, isValid: (String(enteredPin).trim() === '1234') };
  }
}

// ===== REVIEW JAMAAH (Tab KelolaReview) =====
// Kolom: A ID | B Nama | C Asal/Program | D Rating (1-5) | E Isi Review | F Status (Tampilkan/Sembunyikan) | G Waktu Input
const COL_REVIEW = { ID: 0, NAMA: 1, ASAL: 2, RATING: 3, ISI: 4, STATUS: 5, CREATED_AT: 6 };

function isAdminPinValid_(pin) {
  const r = verifyAdminPin(pin);
  return !!(r && r.isValid);
}

function safeCell_(v) { return /^[=+\-@]/.test(v) ? "'" + v : v; } // cegah formula injection

function getSheetReview() {
  const ss = getAlfaSpreadsheet();
  if (!ss) throw new Error('Spreadsheet tidak dapat diakses.');
  let sheet = getSheetFlexible(ss, DB_CONFIG.SHEET_REVIEW);
  if (!sheet) {
    setupDatabase();
    sheet = getSheetFlexible(ss, DB_CONFIG.SHEET_REVIEW);
  }
  return sheet;
}

/** Publik: hanya review Tampilkan. Admin (PIN valid): semua review. */
function getReviewList(adminPin) {
  try {
    const showAll = !!adminPin && isAdminPinValid_(adminPin);
    const sheet = getSheetReview();
    if (!sheet || sheet.getLastRow() <= 1) return { success: true, data: [] };
    const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).getValues();
    const out = [];
    rows.forEach(function (row, i) {
      const nama = String(row[COL_REVIEW.NAMA] || '').trim();
      const isi = String(row[COL_REVIEW.ISI] || '').trim();
      if (!nama && !isi) return;
      const st = String(row[COL_REVIEW.STATUS] || 'Tampilkan').trim().toLowerCase();
      const hidden = (st === 'sembunyikan' || st === 'nonaktif' || st === 'false' || st === 'draft');
      if (hidden && !showAll) return;
      const created = row[COL_REVIEW.CREATED_AT];
      out.push({
        id: String(row[COL_REVIEW.ID] || '').trim() || 'ROW-' + (i + 2),
        nama: nama,
        asal: String(row[COL_REVIEW.ASAL] || '').trim(),
        rating: Math.max(1, Math.min(5, Math.round(Number(row[COL_REVIEW.RATING]) || 5))),
        isi: isi,
        status: hidden ? 'sembunyikan' : 'tampilkan',
        createdAt: created instanceof Date ? created.toISOString() : String(created || '')
      });
    });
    return { success: true, data: out };
  } catch (error) {
    Logger.log('Error in getReviewList: ' + error.message);
    return { success: false, error: error.message, data: [] };
  }
}

function generateNextReviewId_(sheet) {
  const now = new Date();
  const prefix = 'REV-' + now.getFullYear() + ('0' + (now.getMonth() + 1)).slice(-2) + '-';
  const last = sheet.getLastRow();
  let max = 0;
  if (last > 1) {
    sheet.getRange(2, 1, last - 1, 1).getValues().forEach(function (r) {
      const id = String(r[0] || '').trim();
      if (id.indexOf(prefix) === 0) {
        const n = parseInt(id.slice(prefix.length), 10);
        if (!isNaN(n) && n > max) max = n;
      }
    });
  }
  return prefix + ('000' + (max + 1)).slice(-3);
}

function findReviewRow_(sheet, id) {
  const last = sheet.getLastRow();
  if (last <= 1) return -1;
  const ids = sheet.getRange(2, 1, last - 1, 1).getValues();
  const m = /^ROW-(\d+)$/.exec(id);
  if (m) { // baris yang diketik manual di Sheet tanpa ID
    const r = Number(m[1]);
    return (r >= 2 && r <= last && !String(ids[r - 2][0] || '').trim()) ? r : -1;
  }
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === id) return i + 2;
  }
  return -1;
}

function addReview(data, pin) {
  if (!isAdminPinValid_(pin)) return { success: false, error: 'PIN admin tidak valid.' };
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const nama = String((data && data.nama) || '').trim().slice(0, 80);
    const asal = String((data && data.asal) || '').trim().slice(0, 100);
    const isi = String((data && data.isi) || '').trim().slice(0, 500);
    let rating = Math.round(Number(data && data.rating));
    if (!(rating >= 1 && rating <= 5)) rating = 5;
    if (!nama || !isi) return { success: false, error: 'Nama dan isi review wajib diisi.' };

    const sheet = getSheetReview();
    const id = generateNextReviewId_(sheet);
    const now = new Date();
    sheet.appendRow([id, safeCell_(nama), safeCell_(asal), rating, safeCell_(isi), 'Tampilkan', now]);
    return { success: true, data: { id: id, nama: nama, asal: asal, rating: rating, isi: isi, status: 'tampilkan', createdAt: now.toISOString() } };
  } catch (error) {
    Logger.log('Error in addReview: ' + error.message);
    return { success: false, error: error.message };
  } finally {
    lock.releaseLock();
  }
}

function deleteReview(id, pin) {
  if (!isAdminPinValid_(pin)) return { success: false, error: 'PIN admin tidak valid.' };
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getSheetReview();
    const row = findReviewRow_(sheet, String(id || '').trim());
    if (row === -1) return { success: false, error: 'Review tidak ditemukan.' };
    sheet.deleteRow(row);
    return { success: true, message: 'Review berhasil dihapus.' };
  } catch (error) {
    Logger.log('Error in deleteReview: ' + error.message);
    return { success: false, error: error.message };
  } finally {
    lock.releaseLock();
  }
}

// ===== KONTAK & SOSIAL MEDIA (Tab KelolaKontak) =====
// Kolom: A Kunci | B Keterangan | C Nilai | D Petunjuk
function getSheetKontak() {
  const ss = getAlfaSpreadsheet();
  if (!ss) throw new Error('Spreadsheet tidak dapat diakses.');
  let sheet = getSheetFlexible(ss, DB_CONFIG.SHEET_KONTAK);
  if (!sheet) {
    setupDatabase();
    sheet = getSheetFlexible(ss, DB_CONFIG.SHEET_KONTAK);
  }
  return sheet;
}

/** 0812-2516-7123 / +62 812... / 812... -> 6281225167123 (kosong jika tidak valid) */
function normalizeWa_(v) {
  let d = String(v || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.indexOf('0') === 0) d = '62' + d.slice(1);
  else if (d.indexOf('62') !== 0) d = '62' + d;
  return (d.length >= 10 && d.length <= 15) ? d : '';
}

/** Terima link lengkap, "tiktok.com/@user", atau "@user". Link di luar domain ditolak. */
function normalizeSocial_(v, site) {
  const s = String(v || '').trim();
  if (!s) return '';
  const host = site + '\\.com';
  if (/^https?:\/\//i.test(s)) {
    return new RegExp('^https?://([a-z0-9-]+\\.)*' + host + '(/|$)', 'i').test(s) ? s : '';
  }
  if (new RegExp('^(www\\.)?' + host + '/', 'i').test(s)) return 'https://' + s;
  const user = s.replace(/^@/, '');
  if (!/^[\w.]{1,30}$/.test(user)) return '';
  return site === 'tiktok' ? 'https://www.tiktok.com/@' + user : 'https://www.instagram.com/' + user;
}

/** Hanya nilai yang terisi & valid yang dikirim; sel kosong = pakai tampilan bawaan website. */
function getContactSettings() {
  try {
    const sheet = getSheetKontak();
    if (!sheet || sheet.getLastRow() <= 1) return { success: true, data: {} };
    const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues();
    const raw = {};
    rows.forEach(function (r) {
      const k = String(r[0] || '').trim().toUpperCase();
      const v = String(r[2] == null ? '' : r[2]).trim();
      if (k && v) raw[k] = v;
    });
    const data = {};
    const wa = normalizeWa_(raw.WHATSAPP_CS);
    if (wa) data.whatsapp = wa;
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.EMAIL_RESMI || '')) data.email = raw.EMAIL_RESMI;
    const tt = normalizeSocial_(raw.TIKTOK_URL, 'tiktok');
    if (tt) data.tiktok = tt;
    const ig = normalizeSocial_(raw.INSTAGRAM_URL, 'instagram');
    if (ig) data.instagram = ig;
    if (raw.ALAMAT_KANTOR) data.alamat = raw.ALAMAT_KANTOR;
    if (raw.MAPS_URL) data.mapsUrl = raw.MAPS_URL;
    return { success: true, data: data };
  } catch (error) {
    Logger.log('Error in getContactSettings: ' + error.message);
    return { success: false, error: error.message, data: {} };
  }
}

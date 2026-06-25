'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────
export type Lang = 'id' | 'en';

type Translations = Record<string, string>;
type TranslationDict = Record<Lang, Translations>;

// ─────────────────────────────────────────────────────────────────
// Translation Dictionary
// ─────────────────────────────────────────────────────────────────
export const TRANSLATIONS: TranslationDict = {
  id: {
    // ── Navbar ──
    'nav.logo':            'BINUSIAN-BUDGETING',
    'nav.live':            'LIVE',
    'nav.logout':          'KELUAR',
    'nav.lang.label':      'Bahasa',

    // ── Nav Tabs ──
    'tab.dashboard':       'Dasbor',
    'tab.history':         'Riwayat',
    'tab.analytics':       'Analitik',
    'tab.settings':        'Pengaturan',

    // ── Dashboard ──
    'dashboard.greeting_prefix': '// HALOO, SELAMAT',
    'dashboard.safe_funds':      '💰 Sisa Dana Aman Bulan Ini',
    'dashboard.safe_days':       '✓ Aman untuk ~{n} hari lagi',
    'dashboard.over_budget':     '⚠ Sudah over budget',
    'dashboard.see_analysis':    'LIHAT ANALISIS DETAIL →',
    'dashboard.today_txs':       '🕐 TRANSAKSI HARI INI',
    'dashboard.add_tx':          '➕ CATAT PENGELUARAN',
    'dashboard.more_txs':        '+{n} transaksi lainnya →',
    'dashboard.empty_title':     'Sistem Siap Monitor Arus Kasmu',
    'dashboard.empty_desc':      'Mulai dengan mencatat pengeluaran pertamamu hari ini —',
    'dashboard.empty_hint':      'mungkin pengeluaran untuk beli biji kopi V60, servis motor, atau top-up RDN?',
    'dashboard.start_now':       '➕ CATAT SEKARANG',
    'dashboard.no_today':        'Belum ada pengeluaran hari ini',
    'dashboard.no_today_hint':   'Catat pengeluaran kecil sekalipun — bubble tea, parkir, atau jajan pasar.',

    // ── Budget bar ──
    'budget.monthly':      'ANGGARAN BULAN INI',
    'budget.over_label':   '⚠ LIMIT TERLAMPAUI',
    'budget.remaining':    '● SISA BULAN INI',

    // ── History tab ──
    'history.title':       'Log Transaksi',
    'history.subtitle':    'Dapat diedit',
    'history.all_periods': 'SEMUA PERIODE',
    'history.filter_label':'⬡ PILIH TANGGAL / BULAN / TAHUN',
    'history.tx_found':    '{n} transaksi ditemukan',
    'history.budget_limit':'BATAS ANGGARAN',
    'history.over_limit':  '⚠ OVER LIMIT',
    'history.remaining':   '● SISA BUDGET',
    'history.cancel':      'Batal',
    'history.save':        'Simpan',
    'history.desc_label':  'Deskripsi',
    'history.amount_label':'Nominal (Rp)',
    'history.date_label':  'Tanggal & Waktu',
    'history.category_label':'Kategori',

    // ── Analytics tab ──
    'analytics.paylater':        'PAYLATER',
    'analytics.current_cash':    'KAS SAAT INI',
    'analytics.income_added':    'PENDAPATAN',
    'analytics.worth_remaining': 'SISA ASET',
    'analytics.debt_ratio':      'RASIO UTANG',
    'analytics.invest_growth':   'PERTUMBUHAN INVESTASI',
    'analytics.on_track':        'Sesuai rencana',
    'analytics.overrun':         'Melebihi anggaran',
    'analytics.active_debt':     'Utang aktif',
    'analytics.liquid':          'Likuid',
    'analytics.dividen':         'Dividen + Gaji',
    'analytics.paylater_vs':     'PayLater vs total',
    'analytics.est_income':      'Est. dari pendapatan',
    'analytics.allocation':      '🍩 ALOKASI PORTOFOLIO',
    'analytics.ai_short':        '🤖 ANALISIS SINGKAT · AI',
    'analytics.ai_generated':    'AI-GENERATED',
    'analytics.gate_title':      'HAEGUSA-AI Analisis Singkat',
    'analytics.gate_desc1':      'Analisis AI akan muncul setelah kamu mencatat minimal',
    'analytics.gate_desc2':      'transaksi. Saat ini:',
    'analytics.gate_progress':   'transaksi',
    'analytics.chat_btn':        '🤖 CHAT HAEGUSA-AI',
    'analytics.chat_header':     'HAEGUSA-AI · Gemini Flash',
    'analytics.chat_placeholder':'Tanya soal keuangan kamu...',
    'analytics.chat_welcome':    'Halo! Saya HAEGUSA-AI.\nTanya apa saja soal keuangan kamu.',
    'analytics.chat_q1':         'Budget bulan ini gimana?',
    'analytics.chat_q2':         'Saran untuk kurangi pengeluaran?',
    'analytics.chat_q3':         'Analisis utang PayLater ku.',
    'analytics.quant_title':     'Quantitative AI Analyst',
    'analytics.quant_sub':       'Strategi 10 Langkah Ke Depan · Penilaian Personal',
    'analytics.quant_badge':     '🤖 AI-Generated · Data Langsung',
    'analytics.generate_btn':    'Generate Assessment',
    'analytics.refresh_btn':     'Perbarui',
    'analytics.loading':         'MENGANALISIS PORTOFOLIO...',
    'analytics.strategic_rec':   'Rekomendasi Strategis',
    'analytics.debt_ratio_card': 'RASIO UTANG',
    'analytics.invest_growth_card':'PERTUMBUHAN INVESTASI',

    // ── Settings tab ──
    'settings.title':            'Pengaturan',
    'settings.subtitle':         'Profil · Keamanan · Rekening Utama',
    'settings.profile':          'Profil Pengguna',
    'settings.security':         'Perlindungan Akun',
    'settings.security_ok':      '✓ Aman Sentosa',
    'settings.edit_profile':     '✎ Ganti Profil',
    'settings.save':             'Simpan',
    'settings.cancel':           'Batal',
    'settings.avatar_hint':      'Tap avatar untuk ganti foto (PNG/JPG)',
    'settings.full_name':        'Nama Lengkap',
    'settings.nickname':         'Nama Panggilan',
    'settings.phone':            'Telepon',
    'settings.email':            'Email',
    'settings.address':          'Alamat',
    'settings.tx_form_title':    'Rekening Utama · Catat Transaksi Baru',
    'settings.debit_label':      'Pengeluaran / Utang',
    'settings.credit_label':     'Pendapatan',
    'settings.amount_label':     'Nominal (Rp)',
    'settings.desc_placeholder': 'Contoh: Beli Kopi / Gaji',
    'settings.desc_label':       'Keterangan',
    'settings.category_label':   'Kategori',
    'settings.save_enter':       'Simpan & Enter',
    'settings.language_section': 'Preferensi Bahasa',
    'settings.lang_id':          '🇮🇩 Indonesia',
    'settings.lang_en':          '🇬🇧 English',

    // ── FAB ──
    'fab.quick_record':    '⚡ CATAT CEPAT',
    'fab.ewallet':         'PELACAK E-WALLET',
    'fab.debit':           '− KELUAR',
    'fab.credit':          '+ MASUK',
    'fab.amount':          'Nominal (Rp)',
    'fab.desc':            'Keterangan...',
    'fab.save':            'CATAT ↓',

    // ── Ticker ──
    'ticker.remaining':    'SISA',
    'ticker.current':      'KAS',
    'ticker.income':       'PENDAPATAN',
    'ticker.paylater':     'PAYLATER',
    'ticker.budget':       'ANGGARAN',
    'ticker.portfolio':    'PORTOFOLIO',

    // ── Time greetings ──
    'greeting.SUBUH':  'SUBUH',
    'greeting.PAGI':   'PAGI',
    'greeting.SIANG':  'SIANG',
    'greeting.SORE':   'SORE',
    'greeting.MALAM':  'MALAM',

    // ── Misc ──
    'misc.network_error':  '⚠ Gagal terhubung. Cek koneksi.',
    'misc.ai_busy':        'Mohon maaf, layanan AI sedang sibuk atau data portofolio belum memadai. Silakan coba beberapa saat lagi.',
    'misc.conn_error':     'Terjadi kesalahan koneksi ke peladen AI.',
    'misc.loading':        'MEMUAT…',
    'misc.analyzing':      'MENGANALISIS PORTOFOLIO...',
    'misc.over_limit_short':'MELEBIHI LIMIT',
    'misc.cash_reserve':   'Cadangan Kas Likuid',
    'misc.utang':          'Utang',
    'misc.pemasukan':      'Pemasukan',
    'misc.pengeluaran':    'Pengeluaran',
    'misc.liquid_cash':    'Liquid Cash Reserve',
    
    // ── Landing Page ──
    'landing.nav.signin':    'Masuk',
    'landing.hero.tag':      'KELOMPOK1-LB53',
    'landing.hero.title1':   'Atur Kas Harian,',
    'landing.hero.title2':   'Tanpa Pusing.',
    'landing.hero.desc':     'Berhenti menebak ke mana perginya uang jajanmu. Pantau pengeluaran harian dengan mudah—mulai dari sekadar membeli biji kopi untuk diseduh menggunakan alat giling keramik manual di kos, menikmati semangkuk soto ayam, hingga menyisihkan kas untuk portofolio investasi saham. BINUSIAN-Daily Budgeting hadir dengan asisten AI cerdas untuk menjaga dompetmu tetap sehat.',
    'landing.hero.btn_load': 'Mengarahkan ke Google…',
    'landing.hero.btn':      'Lanjutkan dengan Google',
    'landing.hero.secured':  'Gratis · Tanpa kartu kredit · Diamankan oleh Supabase',
    'landing.stats.fees':    'Biaya Terselubung',
    'landing.stats.rotation':'Rotasi Kunci AI',
    'landing.stats.secure':  'Privasi & Aman',
    'landing.stats.txs':     'Transaksi',
    'landing.feat.tag':      '// FITUR UTAMA',
    'landing.feat.title1':   'Semua yang kamu butuhkan,',
    'landing.feat.title2':   'tanpa kerumitan.',
    'landing.feat.1.title':  'Dasbor Real-Time',
    'landing.feat.1.desc':   'Lacak setiap rupiah di semua dompetmu — ShopeePay, GoPay, BCA, dll — dalam satu pusat komando.',
    'landing.feat.2.title':  'Asisten HAEGUSA-AI',
    'landing.feat.2.desc':   'Tanya apapun soal keuanganmu dalam Bahasa Indonesia. Didukung oleh Gemini Flash dengan rotasi kunci cerdas.',
    'landing.feat.3.title':  'Analitik Pintar',
    'landing.feat.3.desc':   'Tren pengeluaran mingguan, rincian kategori, dan pelacakan utang PayLater agar kamu tidak kecolongan.',
    'landing.feat.4.title':  'Pencatatan Instan',
    'landing.feat.4.desc':   'Catat transaksi dalam 2 ketukan melalui tombol cepat melayang. Tanpa friksi, tanpa alasan.',
    'landing.feat.5.title':  'Peringatan Anggaran',
    'landing.feat.5.desc':   'Peringatan visual merah menyala saat anggaran bulananmu terlampaui. Tahu sebelum terlambat.',
    'landing.feat.6.title':  'Aman & Privat',
    'landing.feat.6.desc':   'Data kamu tersimpan di Supabase dengan keamanan tingkat baris. Masuk dengan Google — tanpa perlu password.',
    'landing.demo.tag':      'BINUSIAN-DAILY BUDGETING · KELOMPOK1-LB53',
    'landing.demo.paylater': 'PAYLATER',
    'landing.demo.cash':     'KAS',
    'landing.demo.income':   'PENDAPATAN',
    'landing.demo.remaining':'SISA',
    'landing.demo.hint':     '↑ Pratinjau dasbor langsung — milikmu setelah masuk',
    'landing.cta.title':     'Siap pegang kendali?',
    'landing.cta.desc':      'Hanya butuh 10 detik. Masuk dengan Google dan dasbormu siap.',
    'landing.cta.btn':       'Mulai Gratis Sekarang',
    'landing.footer.copy':   '© 2026 AI-Kelompok1 · BINUS Jakarta',
    'landing.footer.tech':   'Didukung oleh Next.js · Supabase · Gemini AI',
  },

  en: {
    // ── Navbar ──
    'nav.logo':            'BINUSIAN-BUDGETING',
    'nav.live':            'LIVE',
    'nav.logout':          'LOGOUT',
    'nav.lang.label':      'Language',

    // ── Nav Tabs ──
    'tab.dashboard':       'Dashboard',
    'tab.history':         'History',
    'tab.analytics':       'Analytics',
    'tab.settings':        'Settings',

    // ── Dashboard ──
    'dashboard.greeting_prefix': '// HELLO, GOOD',
    'dashboard.safe_funds':      '💰 Safe Remaining Funds This Month',
    'dashboard.safe_days':       '✓ Safe for ~{n} more days',
    'dashboard.over_budget':     '⚠ Over budget',
    'dashboard.see_analysis':    'VIEW DETAILED ANALYSIS →',
    'dashboard.today_txs':       '🕐 TODAY\'S TRANSACTIONS',
    'dashboard.add_tx':          '➕ RECORD EXPENSE',
    'dashboard.more_txs':        '+{n} more transactions →',
    'dashboard.empty_title':     'System Ready to Monitor Your Cash Flow',
    'dashboard.empty_desc':      'Start by recording your first expense today —',
    'dashboard.empty_hint':      'maybe your V60 coffee beans, bike service, or RDN top-up?',
    'dashboard.start_now':       '➕ RECORD NOW',
    'dashboard.no_today':        'No expenses recorded today',
    'dashboard.no_today_hint':   'Record even small expenses — bubble tea, parking, or snacks.',

    // ── Budget bar ──
    'budget.monthly':      'MONTHLY BUDGET',
    'budget.over_label':   '⚠ LIMIT EXCEEDED',
    'budget.remaining':    '● REMAINING THIS MONTH',

    // ── History tab ──
    'history.title':       'Transaction Log',
    'history.subtitle':    'Editable',
    'history.all_periods': 'ALL PERIODS',
    'history.filter_label':'⬡ SELECT DATE / MONTH / YEAR',
    'history.tx_found':    '{n} transactions found',
    'history.budget_limit':'BUDGET LIMIT',
    'history.over_limit':  '⚠ OVER LIMIT',
    'history.remaining':   '● REMAINING BUDGET',
    'history.cancel':      'Cancel',
    'history.save':        'Save',
    'history.desc_label':  'Description',
    'history.amount_label':'Amount (Rp)',
    'history.date_label':  'Date & Time',
    'history.category_label':'Category',

    // ── Analytics tab ──
    'analytics.paylater':        'PAYLATER',
    'analytics.current_cash':    'CURRENT CASH',
    'analytics.income_added':    'INCOME ADDED',
    'analytics.worth_remaining': 'WORTH REMAINING',
    'analytics.debt_ratio':      'DEBT RATIO',
    'analytics.invest_growth':   'INVEST GROWTH',
    'analytics.on_track':        'On track',
    'analytics.overrun':         'Overrun',
    'analytics.active_debt':     'Active debt',
    'analytics.liquid':          'Liquid',
    'analytics.dividen':         'Dividend + Salary',
    'analytics.paylater_vs':     'PayLater vs total',
    'analytics.est_income':      'Est. from income',
    'analytics.allocation':      '🍩 ALLOCATION BREAKDOWN',
    'analytics.ai_short':        '🤖 SHORT-ANALYSIS · AI',
    'analytics.ai_generated':    'AI-GENERATED',
    'analytics.gate_title':      'HAEGUSA-AI Short Analysis',
    'analytics.gate_desc1':      'AI analysis will appear after you record at least',
    'analytics.gate_desc2':      'transactions. Current:',
    'analytics.gate_progress':   'transactions',
    'analytics.chat_btn':        '🤖 CHAT HAEGUSA-AI',
    'analytics.chat_header':     'HAEGUSA-AI · Gemini Flash',
    'analytics.chat_placeholder':'Ask about your finances...',
    'analytics.chat_welcome':    'Hello! I\'m HAEGUSA-AI.\nAsk me anything about your finances.',
    'analytics.chat_q1':         'How\'s my budget this month?',
    'analytics.chat_q2':         'Tips to reduce my spending?',
    'analytics.chat_q3':         'Analyze my PayLater debt.',
    'analytics.quant_title':     'Quantitative AI Analyst',
    'analytics.quant_sub':       'Holistic 10-Step Ahead Strategy · Personalized Assessment',
    'analytics.quant_badge':     '🤖 AI-Generated · Live Data',
    'analytics.generate_btn':    'Generate Assessment',
    'analytics.refresh_btn':     'Refresh',
    'analytics.loading':         'ANALYZING PORTFOLIO...',
    'analytics.strategic_rec':   'Strategic Recommendations',
    'analytics.debt_ratio_card': 'DEBT RATIO',
    'analytics.invest_growth_card':'INVEST GROWTH',

    // ── Settings tab ──
    'settings.title':            'Settings',
    'settings.subtitle':         'Profile · Security · Account Master',
    'settings.profile':          'User Profile',
    'settings.security':         'Account Protection',
    'settings.security_ok':      '✓ All Secure',
    'settings.edit_profile':     '✎ Edit Profile',
    'settings.save':             'Save',
    'settings.cancel':           'Cancel',
    'settings.avatar_hint':      'Tap avatar to change photo (PNG/JPG)',
    'settings.full_name':        'Full Name',
    'settings.nickname':         'Nickname',
    'settings.phone':            'Phone',
    'settings.email':            'Email',
    'settings.address':          'Address',
    'settings.tx_form_title':    'Account Master · Record New Transaction',
    'settings.debit_label':      'Expense / Debt',
    'settings.credit_label':     'Income',
    'settings.amount_label':     'Amount (Rp)',
    'settings.desc_placeholder': 'e.g. Buy Coffee / Salary',
    'settings.desc_label':       'Description',
    'settings.category_label':   'Category',
    'settings.save_enter':       'Save & Enter',
    'settings.language_section': 'Language Preference',
    'settings.lang_id':          '🇮🇩 Indonesia',
    'settings.lang_en':          '🇬🇧 English',

    // ── FAB ──
    'fab.quick_record':    '⚡ QUICK RECORD',
    'fab.ewallet':         'E-WALLET TRACKER',
    'fab.debit':           '− OUT',
    'fab.credit':          '+ IN',
    'fab.amount':          'Amount (Rp)',
    'fab.desc':            'Description...',
    'fab.save':            'RECORD ↓',

    // ── Ticker ──
    'ticker.remaining':    'REMAINING',
    'ticker.current':      'CURRENT',
    'ticker.income':       'INCOME',
    'ticker.paylater':     'PAYLATER',
    'ticker.budget':       'BUDGET',
    'ticker.portfolio':    'PORTFOLIO',

    // ── Time greetings ──
    'greeting.SUBUH':  'DAWN',
    'greeting.PAGI':   'MORNING',
    'greeting.SIANG':  'NOON',
    'greeting.SORE':   'AFTERNOON',
    'greeting.MALAM':  'EVENING',

    // ── Misc ──
    'misc.network_error':  '⚠ Network error. Check connection.',
    'misc.ai_busy':        'Sorry, the AI service is busy or your portfolio data is insufficient. Please try again later.',
    'misc.conn_error':     'Connection error while reaching AI server.',
    'misc.loading':        'LOADING…',
    'misc.analyzing':      'ANALYZING PORTFOLIO...',
    'misc.over_limit_short':'OVER LIMIT',
    'misc.cash_reserve':   'Liquid Cash Reserve',
    'misc.utang':          'Debt',
    'misc.pemasukan':      'Income',
    'misc.pengeluaran':    'Expense',
    'misc.liquid_cash':    'Liquid Cash Reserve',

    // ── Landing Page ──
    'landing.nav.signin':    'Sign In',
    'landing.hero.tag':      'KELOMPOK1-LB53',
    'landing.hero.title1':   'Manage Daily Cash,',
    'landing.hero.title2':   'Without the Headache.',
    'landing.hero.desc':     'Stop guessing where your allowance goes. Track your daily spending easily—from buying coffee beans for manual ceramic brewing at the dorm, enjoying a bowl of soto ayam, to setting aside cash for your stock investment portfolio. BINUSIAN-Daily Budgeting is here with a smart AI assistant to keep your wallet healthy.',
    'landing.hero.btn_load': 'Redirecting to Google…',
    'landing.hero.btn':      'Continue with Google',
    'landing.hero.secured':  'Free · No credit card · Secured by Supabase',
    'landing.stats.fees':    'Hidden Fees',
    'landing.stats.rotation':'AI Key Rotation',
    'landing.stats.secure':  'Private & Secure',
    'landing.stats.txs':     'Transactions',
    'landing.feat.tag':      '// FEATURES',
    'landing.feat.title1':   'Everything you need,',
    'landing.feat.title2':   'nothing you don\'t.',
    'landing.feat.1.title':  'Real-Time Dashboard',
    'landing.feat.1.desc':   'Track every rupiah across all your wallets — ShopeePay, GoPay, BCA, and more — in one live command center.',
    'landing.feat.2.title':  'HAEGUSA-AI Assistant',
    'landing.feat.2.desc':   'Ask anything about your finances. Powered by Gemini Flash with 8-key rotation for zero downtime.',
    'landing.feat.3.title':  'Smart Analytics',
    'landing.feat.3.desc':   'Weekly spend trends, category breakdowns, and PayLater debt tracking so you never get blindsided.',
    'landing.feat.4.title':  'Instant Record',
    'landing.feat.4.desc':   'Log a transaction in 2 taps with the floating quick-record button. No friction, no excuses.',
    'landing.feat.5.title':  'Budget Alerts',
    'landing.feat.5.desc':   'Glowing red warnings when your monthly budget is breached. Know before it\'s too late.',
    'landing.feat.6.title':  'Secure & Private',
    'landing.feat.6.desc':   'Your data lives in Supabase with row-level security. Sign in with Google — zero passwords needed.',
    'landing.demo.tag':      'BINUSIAN-DAILY BUDGETING · KELOMPOK1-LB53',
    'landing.demo.paylater': 'PAYLATER',
    'landing.demo.cash':     'CASH',
    'landing.demo.income':   'INCOME',
    'landing.demo.remaining':'REMAINING',
    'landing.demo.hint':     '↑ Live dashboard preview — yours after sign in',
    'landing.cta.title':     'Ready to take control?',
    'landing.cta.desc':      'It takes 10 seconds. Sign in with Google and your dashboard is ready.',
    'landing.cta.btn':       'Get Started Free',
    'landing.footer.copy':   '© 2026 AI-Kelompok1 · BINUS Jakarta',
    'landing.footer.tech':   'Powered by Next.js · Supabase · Gemini AI',
  },
};

// ─────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────
interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Translate a key; supports {n} placeholder replacement */
  t: (key: string, vars?: Record<string, string | number>) => string;
}

export const LanguageContext = createContext<LanguageContextValue>({
  lang: 'id',
  setLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('id');

  const t = (key: string, vars?: Record<string, string | number>): string => {
    let str = TRANSLATIONS[lang][key] ?? TRANSLATIONS['id'][key] ?? key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(`{${k}}`, String(v));
      });
    }
    return str;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

/** Convenience hook */
export function useLanguage() {
  return useContext(LanguageContext);
}

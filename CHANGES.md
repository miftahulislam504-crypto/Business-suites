# পরিবর্তনের তালিকা

## ধাপ ১ — বিক্রয়, স্টক ও কাস্টমারের বাকি + একাধিক মালিক
- `lib/firestore.ts` — `createSaleWithStock` (sale + stock + বাকি এক transaction-এ), `collectDuePayment` transaction, মালিক/স্টাফ বদলের transaction
- `app/sales/new/page.tsx` — কাস্টমার সিলেক্ট; বাকিতে বিক্রিতে কাস্টমার বাধ্যতামূলক; স্টকের বেশি বিক্রি আটকায়
- `components/business/StaffModal.tsx` — মালিক যোগ, ভূমিকা বদল, ইমেইল দিয়ে খোঁজা
- `hooks/useAuth.ts`, `lib/types.ts`

## ধাপ ৭ — Firestore rules ও ভূমিকা
- `firestore.rules` — ব্যবসা অনুযায়ী ডেটা আলাদা, ভূমিকা অনুযায়ী লেখার অনুমতি
- `lib/permissions.ts` (নতুন), `components/layout/Sidebar.tsx`, `components/layout/MainLayout.tsx`

## ধাপ ৩ — সিরিয়াল নম্বর + ক্রয়ও transaction-এ
- `lib/firestore.ts` — ইনভয়েস/ক্রয়ের নম্বর এখন সিরিয়াল (`INV-2026-00001`, `PUR-2026-00001`), প্রতি ব্যবসা ও বছরে আলাদা। নম্বর বসে সেভের একই transaction-এ, তাই ডুপ্লিকেট হয় না।
- `createPurchaseWithStock` (নতুন) — ক্রয় + স্টক বাড়ানো + ক্রয়মূল্য + সাপ্লায়ারের বাকি এক transaction-এ
- পুরনো `createSale`, `createPurchase`, `generateInvoiceNo`, `generatePurchaseNo`, `updateCustomerDue`, `updateSupplierDue` মুছে ফেলা হয়েছে (ভুল হিসাবের ঝুঁকি ছিল)
- `app/sales/new/page.tsx`, `app/purchase/new/page.tsx`
- `firestore.rules` — নতুন `counters` collection-এর নিয়ম (শুধু ১ করে বাড়ে)

## ধাপ ৯ — AI এখন Groq (ফ্রি) দিয়েও চলে
- `app/api/ai/route.ts` — `GROQ_API_KEY` থাকলে Groq, নাহলে `ANTHROPIC_API_KEY` (Claude)। দুটো থাকলে `AI_PROVIDER=groq|anthropic` দিয়ে বাছা যায়।
- ডিফল্ট মডেল `openai/gpt-oss-120b` (পরিবর্তন: `GROQ_MODEL`)। `llama-3.3-70b-versatile` ১৬ আগস্ট ২০২৬ থেকে বন্ধ, তাই ব্যবহার করা হয়নি।
- Groq ফ্রি সীমা (প্রতি মিনিটে ৮,০০০ টোকেন, দিনে ২ লাখ) মাথায় রেখে: উত্তরের সীমা ১৫০০ টোকেন, পুরনো কথোপকথন আগে বাদ, সীমা পেরোলে বাংলায় "কত সেকেন্ড পর চেষ্টা করো" বার্তা
- `app/ai/page.tsx` — "Powered by Claude" লেখা সরানো
- `.env.example`

**Vercel-এ বসান:** `GROQ_API_KEY` (console.groq.com থেকে ফ্রি, কার্ড লাগে না) — তারপর Redeploy।

## ধাপ ৮ — বাকি কাজ: ভূমিকা অনুযায়ী বোতাম, বেতন পোস্টিং, স্টক সমন্বয়
- `lib/permissions.ts` — `can(role, action)`: পণ্য যোগ/সম্পাদনা/মোছা ও স্টক সমন্বয় (মালিক, ম্যানেজার), কাস্টমার সম্পাদনা/মোছা, সাপ্লায়ার ও কর্মচারী মোছা — বিক্রয়কর্মী/হিসাবরক্ষক এখন যে বোতামে permission error পেত সেগুলো দেখে না
  - `app/inventory/page.tsx`, `components/inventory/ProductCard.tsx`, `app/customers/page.tsx`, `app/suppliers/page.tsx`, `app/employees/page.tsx`
- বেতন: `addPayrollRecord` এখন transaction; অটো-পোস্টিং চালু থাকলে বেতন ব্যয় ডেবিট, নগদ/ব্যাংক ক্রেডিট
- হাতে স্টক সমন্বয়: `adjustStock` (নতুন, `updateStock` মুছে ফেলা হয়েছে)
  - স্টক Firestore-এর বর্তমান সংখ্যা থেকে হিসাব হয় (আগে ব্রাউজারের পুরনো সংখ্যা সেভ হতো — দুজন একসাথে বদলালে ভুল)
  - "ক্ষতিগ্রস্ত", "মেয়াদ উত্তীর্ণ" ও "এডজাস্টমেন্ট" থেকে ক্ষতি/লাভ (ক্রয়মূল্য × পরিমাণ) হিসাবে ধরা হয়; অটো-পোস্টিং চালু থাকলে জার্নালে (ক্ষতি: COGS ডেবিট, মজুত পণ্য ক্রেডিট)
  - "নতুন ক্রয়", "বিক্রয়", "রিটার্ন" ইত্যাদিতে শুধু স্টক বদলায় — হিসাবে কিছু বসে না (এগুলো ক্রয়/বিক্রয় পাতা দিয়ে করতে হবে)
  - লাভ-ক্ষতির রিপোর্ট ও AI-তে "স্টক ক্ষতি ও সংশোধন" আলাদা লাইনে আসে (`lib/finance.ts`, `lib/reports.ts`, `components/reports/ProfitLossReport.tsx`, `app/reports/page.tsx`, `lib/ai-context.ts`)
  - `components/inventory/StockAdjustModal.tsx` — কত টাকা ক্ষতি ধরা হবে আগে থেকে দেখায়
- `lib/types.ts`

নতুন Firestore index লাগে না।

**করা হয়নি:** সার্ভার-সাইড Firebase Admin দিয়ে সব লেখা সামলানো (rules-এ সদস্যদের `balance` বদলানোর অনুমতির দুর্বলতা পুরোপুরি বন্ধ করতে)। এর জন্য firebase-admin, service account key ও প্রায় সব লেখার পথ নতুন করে লিখতে হয় — আলাদা বড় প্রকল্প।

## ধাপ ৫ — রিপোর্ট, dashboard ও AI-র হিসাব সঠিক
- `lib/finance.ts` (নতুন) — লাভ-ক্ষতির সব হিসাব এক জায়গায়, তাই রিপোর্ট, dashboard ও AI-তে একই সংখ্যা আসে
- `lib/reports.ts` (নতুন) — তারিখ ধরে সব রেকর্ড আনে (৫০০টা করে পাতা, সর্বোচ্চ ১০,০০০; ছাড়ালে সতর্কবার্তা)
- `app/reports/page.tsx`, `components/reports/ProfitLossReport.tsx`, `SalesReport.tsx`
- `app/dashboard/page.tsx`, `components/dashboard/SalesChart.tsx`, `CashFlowChart.tsx`
- `lib/ai-context.ts` — এই মাস ও গত মাসের পুরো ডেটা, গত মাসের সাথে তুলনা, মজুত পণ্যের মূল্য

যা ঠিক হয়েছে:
- রিপোর্ট আগে শুধু শেষ ৫০০টা রেকর্ড টেনে তারপর তারিখ ছাঁকত; "এই বছর" বা "গত মাস" বাদ পড়ত। এখন নির্বাচিত তারিখের সব রেকর্ড আসে।
- রাজস্ব থেকে ভ্যাট বাদ (ভ্যাট সরকারের দেনা, আয় নয়)।
- বেতন লাভ-ক্ষতিতে আসে: পে-রোল রেকর্ড থাকলে সেখান থেকে (এই সময়ের 'বেতন ও মজুরি' ব্যয় তখন বাদ, দুইবার গোনা এড়াতে); না থাকলে ওই ক্যাটাগরির ব্যয় থেকে।
- dashboard "আজকের লাভ" `i.qty` (ভুল ফিল্ড) ব্যবহার করায় NaN দেখাত; সাপ্তাহিক চার্টে ক্রয়মূল্য কাটা পড়ত না (লাভ = বিক্রয় দেখাত)। এখন ঠিক।
- মাসিক লাভ-ক্ষতির চার্ট উল্টো ক্রমে (নতুন থেকে পুরনো) দেখাত; এখন পুরনো থেকে নতুন।
- বিক্রয় রিপোর্টের লাভে ডিসকাউন্ট ও ভ্যাট ধরা হতো না; এখন P&L-এর সাথে মেলে।
- ব্যয় তার আসল তারিখে (date) গোনা হয়; পিছনের তারিখে ওঠানো ব্যয় ঠিক মাসে যায়।
- ক্যাশ ফ্লো চার্ট শুধু মালিক/ম্যানেজার/হিসাবরক্ষক দেখেন।

নতুন Firestore index লাগে না (আগের `businessId + createdAt` index-ই ব্যবহার হয়)।

## ধাপ ৪ — অটো-পোস্টিং (বিক্রয়/ক্রয়/বাকি আদায়/ব্যয় থেকে জার্নাল)
- `lib/firestore.ts` — মালিক চালু করলে প্রতিটি বিক্রয়, ক্রয়, বাকি আদায় ও ব্যয় একই transaction-এ জার্নাল এন্ট্রি ও অ্যাকাউন্ট ব্যালেন্সে বসে
  - বিক্রয়: নগদ/ব্যাংক + পাওনা ডেবিট; বিক্রয় আয় (VAT বাদে) + ভ্যাট দায় ক্রেডিট; বিক্রীত পণ্যের ব্যয় ডেবিট, মজুত পণ্য ক্রেডিট
  - ক্রয়: মজুত পণ্য ডেবিট; নগদ/ব্যাংক + বকেয়া ক্রেডিট
  - ব্যয় মুছলে উল্টো এন্ট্রি বসে (জার্নাল কখনও মোছা হয় না)
- `addJournalEntry` এখন transaction (আগে একটা একটা করে ব্যালেন্স বদলাত); ডেবিট-ক্রেডিট পয়সা পর্যন্ত মেলানো হয়
- নতুন সিস্টেম অ্যাকাউন্ট: মজুত পণ্য, ভ্যাট দায়, বিক্রীত পণ্যের ব্যয় — পুরনো অ্যাকাউন্ট নাম মিলিয়ে চেনা হয়, কিছু মোছা বা বদলানো হয় না
- `app/accounting/page.tsx` — অটো-পোস্টিং চালু/বন্ধ ব্যানার (শুধু মালিক), বাদ পড়া লেনদেনের সংখ্যা, নিট মুনাফায় ব্যয় দুইবার কাটা বন্ধ
- `components/accounting/ExpenseForm.tsx`, `JournalEntryForm.tsx`
- `lib/types.ts`, `firestore.rules` (সদস্যরা অ্যাকাউন্টের শুধু `balance` বদলাতে পারে; বিক্রয়/বাকি আদায়ের জার্নাল যেকোনো সদস্য লিখতে পারে)

**চালু করার পর করণীয়:** হিসাব-নিকাশ পাতা থেকে "অটো-পোস্টিং চালু করো" চাপুন, তারপর আগের ব্যালেন্স হাতে জার্নালে তুলুন:
নগদ/ব্যাংক (ডেবিট), মজুত পণ্যের মূল্য (ডেবিট মজুত পণ্য), পাওনা/বকেয়া, আর ক্রেডিটে মূলধন।

## ধাপ ৬ — AI এখন সার্ভার route দিয়ে
- `app/api/ai/route.ts` (নতুন) — লগইন + ব্যবসার সদস্য/ভূমিকা যাচাই, rate limit, API key শুধু সার্ভারে
- `lib/ai-client.ts` (নতুন)
- `app/ai/page.tsx`, `components/ai/AIInsightCard.tsx`, `AIReportAnalysis.tsx`, `AIForecast.tsx` — সরাসরি api.anthropic.com ডাকা বন্ধ

## Deploy-এর ক্রম
1. Vercel-এ `GROQ_API_KEY` বসান (ফ্রি; `.env.example` দেখুন), তারপর কোড push করুন
2. Firebase Console -> Firestore -> Rules-এ `firestore.rules` পুরোটা paste করে Publish (নতুন কোড চালুর আগেই করুন, নাহলে সিরিয়াল নম্বরের counter লেখা আটকাবে)
3. নিজে লগইন করে `/setup` একবার খুলুন (পুরনো ব্যবসায় memberIds/roles বসবে)
